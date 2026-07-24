/**
 * Exchange Rate Service
 * 
 * Fetches real-time FX rates for currency conversions via backend
 * The backend handles all external API calls to avoid CORS issues
 */

import axios from 'axios';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

// ==================== CONFIGURATION ====================

const BACKEND_URL = `https://${projectId}.supabase.co/functions/v1/server`;

const CONFIG = {
  // Cache duration in milliseconds (5 minutes)
  CACHE_DURATION: 5 * 60 * 1000,
};

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  'NGN', // Nigerian Naira
  'USD', // US Dollar
  'GBP', // British Pound
  'EUR', // Euro
  'GHS', // Ghanaian Cedi
  'ZAR', // South African Rand
  'CAD', // Canadian Dollar
  'CNY', // Chinese Yuan
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

// ==================== CACHE ====================

interface RateCache {
  rate: number;
  timestamp: number;
  base: string;
  target: string;
}

// Cache for individual currency pairs
const rateCache = new Map<string, RateCache>();

function getCacheKey(base: string, target: string): string {
  return `${base}/${target}`;
}

function isCacheValid(cache: RateCache): boolean {
  const now = Date.now();
  return now - cache.timestamp < CONFIG.CACHE_DURATION;
}

// ==================== MOCK/FALLBACK RATES ====================

function getMockRate(base: string, target: string): number {
  // Static fallback rates (updated manually)
  const mockRates: Record<string, Record<string, number>> = {
    USD: { NGN: 1650, GBP: 0.79, EUR: 0.92, GHS: 15.5, ZAR: 18.5, CAD: 1.37, CNY: 7.24, USD: 1.0 },
    GBP: { NGN: 2088.61, USD: 1.27, EUR: 1.16, GHS: 19.62, ZAR: 23.42, CAD: 1.73, CNY: 9.18, GBP: 1.0 },
    EUR: { NGN: 1793.48, USD: 1.09, GBP: 0.86, GHS: 16.85, ZAR: 20.11, CAD: 1.49, CNY: 7.88, EUR: 1.0 },
    NGN: { USD: 0.000606, GBP: 0.000479, EUR: 0.000558, GHS: 0.0094, ZAR: 0.0112, CAD: 0.00083, CNY: 0.00439, NGN: 1.0 },
    GHS: { NGN: 106.45, USD: 0.0645, GBP: 0.051, EUR: 0.059, ZAR: 1.19, CAD: 0.088, CNY: 0.467, GHS: 1.0 },
    ZAR: { NGN: 89.19, USD: 0.054, GBP: 0.043, EUR: 0.050, GHS: 0.84, CAD: 0.074, CNY: 0.391, ZAR: 1.0 },
    CAD: { NGN: 1204.38, USD: 0.73, GBP: 0.58, EUR: 0.67, GHS: 11.35, ZAR: 13.51, CNY: 5.29, CAD: 1.0 },
    CNY: { NGN: 227.90, USD: 0.138, GBP: 0.109, EUR: 0.127, GHS: 2.14, ZAR: 2.56, CAD: 0.189, CNY: 1.0 }
  };
  
  return mockRates[base]?.[target] || 1.0;
}

// ==================== MAIN FETCH FUNCTION ====================

/**
 * Fetches exchange rate from backend API
 * The backend tries multiple forex providers and falls back to mock data
 */
export async function fetchExchangeRate(
  base: string,
  target: string
): Promise<number> {
  // Return 1.0 for same currency
  if (base === target) {
    return 1.0;
  }

  // Check cache first
  const cacheKey = getCacheKey(base, target);
  const cached = rateCache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.rate;
  }

  try {
    // Fetch from backend
    const response = await axios.get(
      `${BACKEND_URL}/fx/rate/${base}/${target}`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.rate) {
      const rate = response.data.rate;
      
      // Update cache
      rateCache.set(cacheKey, {
        rate,
        timestamp: Date.now(),
        base,
        target,
      });

      return rate;
    } else {
      throw new Error('Invalid response from backend');
    }
  } catch (error: any) {
    
    // If it's a 404, the backend endpoint doesn't exist yet (needs redeploy)
    if (error.response?.status === 404) {
    }
    
    // Use mock rate as final fallback
    const mockRate = getMockRate(base, target);
    
    // Cache the mock rate too (shorter duration)
    rateCache.set(cacheKey, {
      rate: mockRate,
      timestamp: Date.now() - (CONFIG.CACHE_DURATION * 0.9), // Cache for only 10% of normal duration
      base,
      target,
    });
    
    return mockRate;
  }
}

/**
 * Legacy function for backwards compatibility
 * Fetches all rates for a base currency
 */
export async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  const rates: Record<string, number> = {};
  
  // Fetch rates for all supported currencies
  const promises = SUPPORTED_CURRENCIES.map(async (currency) => {
    try {
      const rate = await fetchExchangeRate(baseCurrency, currency);
      rates[currency] = rate;
    } catch (error) {
      rates[currency] = getMockRate(baseCurrency, currency);
    }
  });

  await Promise.all(promises);
  return rates;
}

// ==================== CONVERSION FUNCTIONS ====================

/**
 * Converts amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rate = await fetchExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

/**
 * Gets exchange rate between two currencies
 */
export async function getExchangeRate(
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number> {
  return await fetchExchangeRate(fromCurrency, toCurrency);
}

/**
 * Gets all exchange rates for a base currency
 */
export async function getAllRates(baseCurrency: CurrencyCode = 'USD'): Promise<Record<string, number>> {
  return await fetchExchangeRates(baseCurrency);
}

/**
 * Calculates the spread/markup for display
 */
export function calculateSpread(rate: number, markupPercent: number = 0.5): {
  baseRate: number;
  ourRate: number;
  spread: number;
} {
  const ourRate = rate * (1 + markupPercent / 100);

  return {
    baseRate: rate,
    ourRate,
    spread: markupPercent,
  };
}

// ==================== UTILITIES ====================

/**
 * Formats a number as currency
 */
export function formatCurrency(amount: number, currency: CurrencyCode, locale: string = 'en-NG'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Gets currency symbol
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
    GHS: 'GH₵',
    ZAR: 'R',
    CAD: 'C$',
    CNY: '¥',
  };

  return symbols[currency] || currency;
}

/**
 * Clears the rate cache (useful for testing)
 */
export function clearCache(): void {
  rateCache.clear();
}