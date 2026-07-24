/**
 * Juicyway FX Rate Service
 *
 * LIVE PRODUCTION MODE
 *
 * Handles real-time foreign exchange rates for Border platform.
 * Integrates with Juicyway Production API for liquidity-backed rates.
 *
 * Features:
 * - Real-time FX rates from Juicyway (read rates API)
 * - Custom rate publishing to Juicyway (write rates API)
 * - Dynamic margin control and management
 * - Rate caching with TTL for performance
 * - Indicative and firm quotes support
 *
 * Architecture:
 * - Fetches base rates from Juicyway Production API via Supabase Edge Function
 * - Applies Border's custom margin/markup
 * - Publishes custom rates to Juicyway (write rates API)
 * - Caches rates with TTL for performance
 * - Supports indicative and firm quotes
 *
 * Currency Support:
 * - Fiat: NGN, USD, GBP, EUR, GHS, ZAR, CAD, CNY
 * - Crypto: USDC, USDT
 *
 * Rate Types:
 * - Indicative: For UI display, no commitment
 * - Firm: For execution, locked for duration
 * - Custom: Border-published rates sent to Juicyway
 *
 * API Configuration:
 * - Proxied through Supabase Edge Function
 * - Production API Key stored in Supabase environment
 * - Mode: PRODUCTION (LIVE)
 */

import axios from 'axios';
import { publicAnonKey } from '../../utils/supabase/info';

// ==================== TYPES ====================

export type FiatCurrency = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'GHS' | 'ZAR' | 'CAD' | 'CNY';
export type CryptoCurrency = 'USDC' | 'USDT';
export type Currency = FiatCurrency | CryptoCurrency;

export interface CurrencyPair {
  from: Currency;
  to: Currency;
}

export interface BaseRate {
  pair: string; // e.g., "USDC_NGN"
  rate: number; // Base rate from Juicyway
  timestamp: number;
  source: 'juicyway';
}

export interface AdjustedRate extends BaseRate {
  margin: number; // Percentage markup (e.g., 2.5 = 2.5%)
  finalRate: number; // Rate shown to customer
  corridor: string; // e.g., "USDC_NGN"
}

export interface RateQuote {
  quoteId: string;
  pair: string;
  baseRate: number;
  margin: number;
  finalRate: number;
  type: 'indicative' | 'firm';
  expiresAt: number; // Unix timestamp
  createdAt: number;
  ttl: number; // Seconds until expiry
}

export interface RateFetchOptions {
  pair: CurrencyPair;
  amount?: number;
  type?: 'indicative' | 'firm';
}

export interface MarginConfig {
  corridor: string; // e.g., "USDC_NGN"
  margin: number; // Percentage (e.g., 2.5)
  minMargin: number;
  maxMargin: number;
}

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Juicyway API Configuration - LIVE PRODUCTION MODE
  // All API calls proxied through Supabase Edge Function
  JUICYWAY_API_URL: 'https://api.spendjuice.com/v1', // PRODUCTION ENDPOINT (not directly called - for reference only)
  JUICYWAY_API_KEY: '', // API Key stored in Supabase environment variables (not used here)
  JUICYWAY_MODE: 'PRODUCTION', // LIVE PRODUCTION MODE

  // Supabase Edge Function proxy (to avoid CORS)
  SUPABASE_PROJECT_ID: 'ulolufsmjdlramdtstrr',
  SUPABASE_RATES_ENDPOINT: 'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-rates',

  // Rate caching (seconds)
  CACHE_TTL: {
    INDICATIVE: 30, // 30 seconds for indicative rates
    FIRM: 60, // 60 seconds for firm quotes
  },
  
  // Default margins per corridor (percentage)
  DEFAULT_MARGINS: {
    'USD_NGN': 2.0,
    'NGN_USD': 2.0,
    'NGN_GBP': 2.0,
    'NGN_CAD': 2.0,
    'USD_USDC': 0.5,
    'GBP_NGN': 2.0,
    'CAD_NGN': 2.0,
    'EUR_NGN': 2.0,
    'USDC_NGN': 2.5,
    'USD_USDT': 0.5,
    'USDT_NGN': 2.5,
    'USDC_USDT': 0.5,
  } as Record<string, number>,
  
  // Rate boundaries
  MIN_MARGIN: 0.5, // Minimum 0.5%
  MAX_MARGIN: 5.0, // Maximum 5%
};

// ==================== RATE CACHE ====================

interface CacheEntry {
  rate: AdjustedRate;
  expiresAt: number;
}

class RateCache {
  private cache: Map<string, CacheEntry> = new Map();

  set(key: string, rate: AdjustedRate, ttl: number): void {
    this.cache.set(key, {
      rate,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  get(key: string): AdjustedRate | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.rate;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

const rateCache = new RateCache();

// ==================== QUOTE STORAGE ====================

interface QuoteEntry {
  quote: RateQuote;
  expiresAt: number;
}

class QuoteStore {
  private quotes: Map<string, QuoteEntry> = new Map();

  set(quote: RateQuote): void {
    this.quotes.set(quote.quoteId, {
      quote,
      expiresAt: quote.expiresAt,
    });
  }

  get(quoteId: string): RateQuote | null {
    const entry = this.quotes.get(quoteId);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.quotes.delete(quoteId);
      return null;
    }
    
    return entry.quote;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, entry] of this.quotes.entries()) {
      if (now > entry.expiresAt) {
        this.quotes.delete(id);
      }
    }
  }
}

const quoteStore = new QuoteStore();

// Cleanup expired quotes every minute
setInterval(() => quoteStore.cleanup(), 60000);

// ==================== UTILITY FUNCTIONS ====================

function formatPair(from: Currency, to: Currency): string {
  return `${from}_${to}`;
}

function generateQuoteId(): string {
  return `QTE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function calculateFinalRate(baseRate: number, margin: number, direction: 'buy' | 'sell'): number {
  // Apply margin based on direction
  // Buy: Add margin (customer buys crypto, we sell)
  // Sell: Subtract margin (customer sells crypto, we buy)
  const multiplier = direction === 'buy' ? (1 + margin / 100) : (1 - margin / 100);
  return baseRate * multiplier;
}

// ==================== API FUNCTIONS ====================

/**
 * Fetch base rate from Juicyway API via Supabase Edge Function
 * This avoids CORS issues by proxying through our backend
 * PRODUCTION MODE - Using Juicyway Production API
 */
async function fetchBaseRateFromJuicyway(from: Currency, to: Currency, amount?: number): Promise<BaseRate> {
  // Same-currency pair always = 1
  if (from === to) {
    return { pair: `${from}_${to}`, rate: 1, timestamp: Date.now(), source: 'juicyway' };
  }

  // NGN→foreign: Juicyway doesn't support NGN as source currency.
  // Derive by fetching foreign→NGN and inverting.
  const ngnOutMap: Partial<Record<string, Currency>> = {
    'NGN_USD': 'USD', 'NGN_GBP': 'GBP', 'NGN_CAD': 'CAD', 'NGN_EUR': 'EUR',
  };
  const foreign = ngnOutMap[`${from}_${to}`];
  if (foreign) {
    const base = await fetchBaseRateFromJuicyway(foreign, 'NGN' as Currency, amount);
    const rate = base.rate > 0 ? 1 / base.rate : 0;
    return { pair: `${from}_${to}`, rate, timestamp: Date.now(), source: 'juicyway' };
  }

  try {

    // Call admin/live-rate endpoint (SAME AS USD-NGN TESTING PANEL)
    const response = await axios.get(`${CONFIG.SUPABASE_RATES_ENDPOINT}/admin/live-rate`, {
      params: {
        from,
        to,
      },
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'apikey': publicAnonKey,
      },
      timeout: 10000, // 10 second timeout
    });

    const rateData = response.data;

    // Admin endpoint returns live_rate (converted from kobo) and raw_rate
    const liveRate = rateData.live_rate;
    const rawRate = rateData.raw_rate;

    if (!liveRate) {
      throw new Error('No live_rate found in response');
    }


    return {
      pair: `${from}_${to}`,
      rate: liveRate,
      timestamp: rateData.timestamp || Date.now(),
      source: 'juicyway',
    };
  } catch (error: any) {

    if (error.response) {
    }

    // THROW ERROR - DO NOT FALLBACK TO MOCK
    throw new Error(`Failed to fetch LIVE rate: ${error.message}`);
  }
}

/**
 * Mock rates - DISABLED IN SANDBOX MODE
 * These are no longer used - API calls are required
 */
function getMockRate(from: Currency, to: Currency): number {
  // Mock rates disabled - forcing real API usage
  throw new Error('Mock rates disabled - real API required');
}

// ==================== MARGIN MANAGEMENT ====================

/**
 * Get margin configuration for a corridor
 */
function getMarginForCorridor(from: Currency, to: Currency): number {
  const pair = formatPair(from, to);
  return CONFIG.DEFAULT_MARGINS[pair] || 2.0; // Default 2%
}

/**
 * Update margin for a specific corridor
 * Future: Can be exposed as admin API
 */
export function updateMargin(from: Currency, to: Currency, margin: number): void {
  if (margin < CONFIG.MIN_MARGIN || margin > CONFIG.MAX_MARGIN) {
    throw new Error(`Margin must be between ${CONFIG.MIN_MARGIN}% and ${CONFIG.MAX_MARGIN}%`);
  }
  
  const pair = formatPair(from, to);
  CONFIG.DEFAULT_MARGINS[pair] = margin;
  
  // Clear cache for this pair
  rateCache.clear();
  
}

/**
 * Get all margin configurations
 */
export function getMarginConfigs(): MarginConfig[] {
  return Object.entries(CONFIG.DEFAULT_MARGINS).map(([corridor, margin]) => ({
    corridor,
    margin,
    minMargin: CONFIG.MIN_MARGIN,
    maxMargin: CONFIG.MAX_MARGIN,
  }));
}

// ==================== RATE FETCHING ====================

/**
 * Get indicative rate (for UI display)
 * Cached aggressively, no commitment
 */
export async function getIndicativeRate(from: Currency, to: Currency): Promise<AdjustedRate> {
  const cacheKey = `indicative:${formatPair(from, to)}`;
  
  // Check cache first
  const cached = rateCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  

  // Fetch from Juicyway
  const baseRate = await fetchBaseRateFromJuicyway(from, to);
  const margin = getMarginForCorridor(from, to);
  const finalRate = calculateFinalRate(baseRate.rate, margin, 'buy');
  
  const adjustedRate: AdjustedRate = {
    ...baseRate,
    margin,
    finalRate,
    corridor: formatPair(from, to),
  };
  
  // Cache it
  rateCache.set(cacheKey, adjustedRate, CONFIG.CACHE_TTL.INDICATIVE);
  
  
  return adjustedRate;
}

/**
 * Get firm quote (for execution)
 * Locked rate with expiry, customer can execute within TTL
 */
export async function getFirmQuote(from: Currency, to: Currency, amount: number): Promise<RateQuote> {
  // Fetch fresh rate from Juicyway
  const baseRate = await fetchBaseRateFromJuicyway(from, to, amount);
  const margin = getMarginForCorridor(from, to);
  const finalRate = calculateFinalRate(baseRate.rate, margin, 'buy');
  
  const quote: RateQuote = {
    quoteId: generateQuoteId(),
    pair: formatPair(from, to),
    baseRate: baseRate.rate,
    margin,
    finalRate,
    type: 'firm',
    createdAt: Date.now(),
    expiresAt: Date.now() + CONFIG.CACHE_TTL.FIRM * 1000,
    ttl: CONFIG.CACHE_TTL.FIRM,
  };
  
  // Store quote
  quoteStore.set(quote);
  
  return quote;
}

/**
 * Validate and retrieve a firm quote
 */
export function validateQuote(quoteId: string): RateQuote | null {
  return quoteStore.get(quoteId);
}

/**
 * Get multiple rates at once (for dashboard)
 * Uses Promise.allSettled to ensure partial failures don't block everything
 */
export async function getMultipleRates(pairs: CurrencyPair[]): Promise<AdjustedRate[]> {
  
  const promises = pairs.map(pair => 
    getIndicativeRate(pair.from, pair.to)
      .catch(error => {
        // Return a placeholder rate instead of failing completely
        return {
          pair: formatPair(pair.from, pair.to),
          rate: 0,
          timestamp: Date.now(),
          source: 'juicyway' as const,
          margin: 0,
          finalRate: 0,
          corridor: formatPair(pair.from, pair.to),
        };
      })
  );
  
  const results = await Promise.all(promises);

  // Return ALL pairs including failed ones (rate=0 means unavailable, shown as N/A in UI)
  // Don't filter — the caller decides what to display
  const working = results.filter(r => r.rate > 0).length;

  if (working === 0) {
    throw new Error('Failed to fetch any rates from Juicyway');
  }

  return results;
}

/**
 * Calculate conversion amount
 */
export function calculateConversion(
  fromAmount: number,
  rate: number,
  fromCurrency: Currency,
  toCurrency: Currency
): {
  fromAmount: number;
  toAmount: number;
  rate: number;
  fromCurrency: Currency;
  toCurrency: Currency;
} {
  return {
    fromAmount,
    toAmount: fromAmount * rate,
    rate,
    fromCurrency,
    toCurrency,
  };
}

// ==================== RATE MONITORING ====================

/**
 * Get rate history for analytics
 * Future: Store in database
 */
export interface RateSnapshot {
  pair: string;
  baseRate: number;
  finalRate: number;
  margin: number;
  timestamp: number;
}

const rateHistory: RateSnapshot[] = [];
const MAX_HISTORY = 1000;

/**
 * Record rate snapshot for analytics
 */
function recordRateSnapshot(rate: AdjustedRate): void {
  rateHistory.push({
    pair: rate.pair,
    baseRate: rate.rate,
    finalRate: rate.finalRate,
    margin: rate.margin,
    timestamp: rate.timestamp,
  });
  
  // Keep only last N entries
  if (rateHistory.length > MAX_HISTORY) {
    rateHistory.shift();
  }
}

/**
 * Get rate history for a pair
 */
export function getRateHistory(pair: string, limit: number = 100): RateSnapshot[] {
  return rateHistory
    .filter(r => r.pair === pair)
    .slice(-limit);
}

// ==================== WRITE RATES (CUSTOM RATE PUBLISHING) ====================

export interface CustomRate {
  pair: string;
  rate: number;
  validUntil: number; // Unix timestamp
  source: 'border';
  publishedAt: number;
  publishedBy: string; // Admin user ID
}

const customRates: Map<string, CustomRate> = new Map();

/**
 * Push custom rate to Juicyway (Write Rates API)
 * Allows Border to set its own rates for liquidity management
 */
export async function publishCustomRate(
  from: Currency,
  to: Currency,
  rate: number,
  validForMinutes: number = 60,
  publishedBy: string = 'admin'
): Promise<CustomRate> {
  const pair = formatPair(from, to);
  
  // Validate rate
  if (rate <= 0) {
    throw new Error('Rate must be greater than 0');
  }
  
  // Validate duration
  if (validForMinutes < 1 || validForMinutes > 1440) {
    throw new Error('Valid duration must be between 1 and 1440 minutes (24 hours)');
  }
  
  const validUntil = Date.now() + validForMinutes * 60 * 1000;
  
  try {
    // Call Juicyway Write Rates API
    const response = await axios.post(
      `${CONFIG.JUICYWAY_API_URL}/rates/custom`,
      {
        pair,
        from,
        to,
        rate,
        validUntil,
        source: 'border',
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.JUICYWAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const customRate: CustomRate = {
      pair,
      rate,
      validUntil,
      source: 'border',
      publishedAt: Date.now(),
      publishedBy,
    };
    
    // Store locally
    customRates.set(pair, customRate);
    
    // Clear cache to force refresh
    rateCache.clear();
    
    
    return customRate;
  } catch (error) {
    
    // Fallback: Store locally even if API fails
    const customRate: CustomRate = {
      pair,
      rate,
      validUntil,
      source: 'border',
      publishedAt: Date.now(),
      publishedBy,
    };
    
    customRates.set(pair, customRate);
    rateCache.clear();
    
    return customRate;
  }
}

/**
 * Get active custom rate for a pair
 */
export function getCustomRate(pair: string): CustomRate | null {
  const rate = customRates.get(pair);
  if (!rate) return null;
  
  // Check if expired
  if (Date.now() > rate.validUntil) {
    customRates.delete(pair);
    return null;
  }
  
  return rate;
}

/**
 * Get all active custom rates
 */
export function getAllCustomRates(): CustomRate[] {
  const now = Date.now();
  const active: CustomRate[] = [];
  
  for (const [pair, rate] of customRates.entries()) {
    if (now <= rate.validUntil) {
      active.push(rate);
    } else {
      customRates.delete(pair);
    }
  }
  
  return active;
}

/**
 * Revoke/delete custom rate
 */
export async function revokeCustomRate(from: Currency, to: Currency): Promise<void> {
  const pair = formatPair(from, to);
  
  try {
    // Call Juicyway API to revoke
    await axios.delete(`${CONFIG.JUICYWAY_API_URL}/rates/custom/${pair}`, {
      headers: {
        'Authorization': `Bearer ${CONFIG.JUICYWAY_API_KEY}`,
      },
    });
    
  } catch (error) {
  }
  
  // Remove locally
  customRates.delete(pair);
  rateCache.clear();
  
}

/**
 * Bulk publish rates
 */
export async function publishBulkRates(
  rates: Array<{ from: Currency; to: Currency; rate: number }>,
  validForMinutes: number = 60,
  publishedBy: string = 'admin'
): Promise<CustomRate[]> {
  const results: CustomRate[] = [];
  
  for (const { from, to, rate } of rates) {
    try {
      const customRate = await publishCustomRate(from, to, rate, validForMinutes, publishedBy);
      results.push(customRate);
    } catch (error) {
    }
  }
  
  return results;
}

/**
 * Sync custom rates to Juicyway (for recovery)
 */
export async function syncCustomRatesToJuicyway(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    synced: 0,
    failed: 0,
    errors: [] as string[],
  };
  
  for (const [pair, rate] of customRates.entries()) {
    // Skip expired rates
    if (Date.now() > rate.validUntil) continue;
    
    try {
      await axios.post(
        `${CONFIG.JUICYWAY_API_URL}/rates/custom`,
        {
          pair: rate.pair,
          rate: rate.rate,
          validUntil: rate.validUntil,
          source: 'border',
        },
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.JUICYWAY_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      results.synced++;
    } catch (error) {
      results.failed++;
      const errorMsg = `Failed to sync ${pair}: ${error}`;
      results.errors.push(errorMsg);
    }
  }
  
  return results;
}

// ==================== ADMIN FUNCTIONS ====================

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return rateCache.getStats();
}

/**
 * Clear rate cache (admin function)
 */
export function clearRateCache(): void {
  rateCache.clear();
}

/**
 * Get rate service health
 */
export function getHealthStatus() {
  return {
    status: 'healthy',
    cache: rateCache.getStats(),
    quotes: {
      active: quoteStore['quotes'].size,
    },
    margins: Object.keys(CONFIG.DEFAULT_MARGINS).length,
    timestamp: Date.now(),
  };
}

// ==================== EXPORTS ====================

export const juicywayRates = {
  // Rate fetching (read)
  getIndicativeRate,
  getFirmQuote,
  validateQuote,
  getMultipleRates,
  
  // Calculations
  calculateConversion,
  
  // Margin management
  updateMargin,
  getMarginConfigs,
  
  // Custom rates (write)
  publishCustomRate,
  getCustomRate,
  getAllCustomRates,
  revokeCustomRate,
  publishBulkRates,
  syncCustomRatesToJuicyway,
  
  // History & analytics
  getRateHistory,
  
  // Admin
  getCacheStats,
  clearRateCache,
  getHealthStatus,
};

export default juicywayRates;