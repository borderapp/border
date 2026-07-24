/**
 * Juicyway Service
 *
 * SANDBOX/TEST MODE - Testing before going live
 *
 * Main integration service for Juicyway liquidity and payment rails.
 * Works in conjunction with Openfort treasury for fund management.
 *
 * Services Available:
 * - FX conversion with real-time rates
 * - Liquidity management and monitoring
 * - On-ramp: Fiat → Crypto (bank/card → USDC/USDT)
 * - Off-ramp: Crypto → Fiat (USDC/USDT → bank account)
 * - Global bank payouts (160+ countries)
 * - Treasury operations
 *
 * Architecture:
 * - Juicyway: FX conversion, liquidity, on/off-ramp, bank payouts
 * - Openfort: Wallet infrastructure, custody, treasury balances
 * - Supabase Edge Functions: Proxy for secure API calls
 *
 * Flow:
 * - Off-ramp: Openfort → Juicyway → Bank account
 * - On-ramp: Bank account → Juicyway → Openfort
 *
 * API Configuration:
 * - Supabase Edge Function: https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-transfer
 * - Operations API: LIVE production key via Edge Function
 * - Mode: LIVE (not sandbox/test)
 */

import axios from 'axios';
import openfortTreasury from './openfort-treasury';
import juicywayRates from './juicyway-rates';
import { supabase } from '@/lib/supabase';

// ==================== TYPES ====================

export type FiatCurrency = 'NGN' | 'USD' | 'GBP' | 'EUR';
export type CryptoCurrency = 'USDC' | 'USDT';

export interface BankAccount {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  country: string; // ISO country code
  currency: FiatCurrency;
  routingNumber?: string; // For US banks
  iban?: string; // For European banks
  swiftCode?: string; // For international
}

export interface PayoutRequest {
  userId: string;
  amount: number;
  currency: FiatCurrency;
  cryptoCurrency: CryptoCurrency; // Source of funds
  bankAccount: BankAccount;
  reference?: string;
  quoteId?: string; // If using pre-fetched quote
}

export interface OnRampRequest {
  userId: string;
  amount: number;
  fiatCurrency: FiatCurrency;
  cryptoCurrency: CryptoCurrency; // Destination
  paymentMethod: 'bank_transfer' | 'card' | 'ach';
  reference?: string;
}

export interface PayoutOrder {
  orderId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  cryptoAmount: number;
  cryptoCurrency: CryptoCurrency;
  fiatAmount: number;
  fiatCurrency: FiatCurrency;
  exchangeRate: number;
  fee: number;
  bankAccount: BankAccount;
  openfortTxHash?: string; // Transaction from Openfort
  juicywayTxId?: string; // Transaction in Juicyway
  createdAt: number;
  completedAt?: number;
  failureReason?: string;
}

export interface OnRampOrder {
  orderId: string;
  userId: string;
  status: 'pending' | 'awaiting_payment' | 'processing' | 'completed' | 'failed';
  fiatAmount: number;
  fiatCurrency: FiatCurrency;
  cryptoAmount: number;
  cryptoCurrency: CryptoCurrency;
  exchangeRate: number;
  fee: number;
  paymentInstructions?: {
    accountNumber?: string;
    routingNumber?: string;
    reference: string;
    bankName?: string;
  };
  juicywayTxId?: string;
  openfortTxHash?: string; // Transaction to Openfort treasury
  createdAt: number;
  completedAt?: number;
  expiresAt: number;
  failureReason?: string;
}

export interface LiquidityBalance {
  currency: CryptoCurrency;
  available: number;
  reserved: number;
  total: number;
  source: 'openfort' | 'juicyway';
  lastUpdated: number;
}

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Juicyway API - SANDBOX/TEST MODE
  // Testing with sandbox environment before going live
  JUICYWAY_API_URL: 'https://api-sandbox.spendjuice.com', // SANDBOX ENDPOINT for testing
  JUICYWAY_API_KEY: 'WjkMCihbL04kyezRhPcZtYf9nd8G7dWtkRCxlB2c5+G9AMoI29lwXJa5rpiJqP6ULQeuIN1TUeMaZoNKKKB1FQ==', // TEST API KEY
  JUICYWAY_SECRET: 'WjkMCihbL04kyezRhPcZtYf9nd8G7dWtkRCxlB2c5+G9AMoI29lwXJa5rpiJqP6ULQeuIN1TUeMaZoNKKKB1FQ==', // TEST SECRET
  JUICYWAY_PARTNER_ID: 'BORDER_FINTECH',
  JUICYWAY_MODE: 'SANDBOX', // SANDBOX MODE ACTIVE
  
  // Webhook URLs (for Juicyway callbacks)
  WEBHOOK_URL: 'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-webhook',
  
  // Payout settings
  PAYOUT_FEES: {
    NGN: 0.5, // 0.5% fee
    USD: 1.0,
    GBP: 1.0,
    EUR: 1.0,
  } as Record<FiatCurrency, number>,
  
  MIN_PAYOUT: {
    NGN: 5000, // Minimum ₦5,000
    USD: 10,
    GBP: 10,
    EUR: 10,
  } as Record<FiatCurrency, number>,
  
  // On-ramp settings
  ON_RAMP_EXPIRY: 3600, // 1 hour for payment
  
  // Liquidity thresholds
  LOW_LIQUIDITY_THRESHOLD: {
    USDC: 10000, // Alert if < $10k
    USDT: 10000,
  } as Record<CryptoCurrency, number>,
};

// ==================== ORDER STORAGE ====================

// In production, use database (Supabase)
const payoutOrders: Map<string, PayoutOrder> = new Map();
const onRampOrders: Map<string, OnRampOrder> = new Map();

// ==================== UTILITY FUNCTIONS ====================

function generateOrderId(type: 'payout' | 'onramp'): string {
  const prefix = type === 'payout' ? 'PO' : 'OR';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function calculateFee(amount: number, currency: FiatCurrency): number {
  const feePercent = CONFIG.PAYOUT_FEES[currency] || 1.0;
  return (amount * feePercent) / 100;
}

// ==================== JUICYWAY API CALLS ====================

/**
 * Create payout order in Juicyway (via Supabase Edge Function)
 */
async function createJuicywayPayout(
  cryptoAmount: number,
  cryptoCurrency: CryptoCurrency,
  fiatAmount: number,
  fiatCurrency: FiatCurrency,
  bankAccount: BankAccount,
  reference: string
): Promise<{ txId: string; status: string }> {
  try {
    
    // Get auth session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      throw new Error('Not authenticated. Please sign in to create payouts.');
    }

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('juicyway-transfer/create-offramp', {
      body: {
        amount: cryptoAmount,
        cryptoCurrency,
        fiatCurrency,
        bankAccount: {
          accountName: bankAccount.accountName,
          accountNumber: bankAccount.accountNumber,
          bankCode: bankAccount.bankCode,
          country: bankAccount.country,
          routingNumber: bankAccount.routingNumber,
          iban: bankAccount.iban,
          swiftCode: bankAccount.swiftCode,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create payout');
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Payout creation failed');
    }


    return {
      txId: data.order_id,
      status: data.status || 'processing',
    };
  } catch (error: any) {
    throw new Error(`Payout creation failed: ${error.message}`);
  }
}

/**
 * Create on-ramp order in Juicyway (via Supabase Edge Function)
 */
async function createJuicywayOnRamp(
  fiatAmount: number,
  fiatCurrency: FiatCurrency,
  cryptoCurrency: CryptoCurrency,
  reference: string
): Promise<{
  txId: string;
  status: string;
  paymentInstructions: OnRampOrder['paymentInstructions'];
}> {
  try {
    
    // Get auth session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      throw new Error('Not authenticated. Please sign in to create on-ramps.');
    }

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('juicyway-transfer/create-onramp', {
      body: {
        amount: fiatAmount,
        fiatCurrency,
        cryptoCurrency,
        paymentMethod: 'bank_transfer',
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create on-ramp');
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'On-ramp creation failed');
    }


    return {
      txId: data.order_id,
      status: data.status || 'awaiting_payment',
      paymentInstructions: data.payment_instructions || {
        reference: reference,
      },
    };
  } catch (error: any) {
    throw new Error(`On-ramp creation failed: ${error.message}`);
  }
}

/**
 * Get payout status from Juicyway
 */
async function getJuicywayPayoutStatus(txId: string): Promise<string> {
  try {
    const response = await axios.get(
      `${CONFIG.JUICYWAY_API_URL}/payouts/${txId}`,
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.JUICYWAY_API_KEY}`,
        },
      }
    );

    return response.data.status;
  } catch (error) {
    return 'unknown';
  }
}

// ==================== OFF-RAMP (CRYPTO → FIAT) ====================

/**
 * Process withdrawal: USDC/USDT → Bank account
 * 
 * Flow:
 * 1. Validate request and get rate quote
 * 2. Deduct crypto from Openfort treasury
 * 3. Create payout order in Juicyway
 * 4. Juicyway converts crypto to fiat
 * 5. Juicyway sends fiat to bank account
 */
export async function createPayout(request: PayoutRequest): Promise<PayoutOrder> {
  // Validate minimum amount
  const minAmount = CONFIG.MIN_PAYOUT[request.currency];
  if (request.amount < minAmount) {
    throw new Error(`Minimum payout is ${minAmount} ${request.currency}`);
  }

  // Get exchange rate (use provided quote or fetch new)
  let rate: number;
  if (request.quoteId) {
    const quote = juicywayRates.validateQuote(request.quoteId);
    if (!quote) {
      throw new Error('Quote expired or invalid');
    }
    rate = quote.finalRate;
  } else {
    const rateData = await juicywayRates.getIndicativeRate(request.cryptoCurrency, request.currency);
    rate = rateData.finalRate;
  }

  // Calculate crypto amount needed
  const cryptoAmount = request.amount / rate;
  const fee = calculateFee(request.amount, request.currency);
  const fiatAmount = request.amount - fee;

  // Check Openfort treasury balance
  const balance = await openfortTreasury.getTreasuryBalance(request.cryptoCurrency);
  if (balance.available < cryptoAmount) {
    throw new Error('Insufficient treasury balance');
  }

  // Create order record
  const orderId = generateOrderId('payout');
  const order: PayoutOrder = {
    orderId,
    userId: request.userId,
    status: 'pending',
    cryptoAmount,
    cryptoCurrency: request.cryptoCurrency,
    fiatAmount,
    fiatCurrency: request.currency,
    exchangeRate: rate,
    fee,
    bankAccount: request.bankAccount,
    createdAt: Date.now(),
  };

  payoutOrders.set(orderId, order);

  try {
    // Step 1: Deduct from Openfort treasury
    // Note: In production, send to Juicyway's deposit address
    const openfortTx = await openfortTreasury.executeTreasuryWithdrawal({
      userId: request.userId,
      amount: cryptoAmount,
      currency: request.cryptoCurrency,
      destinationType: 'juicyway',
      destination: {
        address: 'JUICYWAY_DEPOSIT_ADDRESS', // TODO: Get from Juicyway
        memo: orderId,
      },
    });

    order.openfortTxHash = openfortTx.transactionHash;
    order.status = 'processing';
    payoutOrders.set(orderId, order);

    // Step 2: Create payout in Juicyway
    const juicywayTx = await createJuicywayPayout(
      cryptoAmount,
      request.cryptoCurrency,
      fiatAmount,
      request.currency,
      request.bankAccount,
      request.reference || orderId
    );

    order.juicywayTxId = juicywayTx.txId;
    payoutOrders.set(orderId, order);


    return order;
  } catch (error) {
    order.status = 'failed';
    order.failureReason = error instanceof Error ? error.message : 'Unknown error';
    payoutOrders.set(orderId, order);
    throw error;
  }
}

/**
 * Get payout order status
 */
export async function getPayoutStatus(orderId: string): Promise<PayoutOrder | null> {
  const order = payoutOrders.get(orderId);
  if (!order) return null;

  // If processing, check Juicyway status
  if (order.status === 'processing' && order.juicywayTxId) {
    const status = await getJuicywayPayoutStatus(order.juicywayTxId);
    
    if (status === 'completed') {
      order.status = 'completed';
      order.completedAt = Date.now();
      payoutOrders.set(orderId, order);
    } else if (status === 'failed') {
      order.status = 'failed';
      order.failureReason = 'Juicyway payout failed';
      payoutOrders.set(orderId, order);
    }
  }

  return order;
}

// ==================== ON-RAMP (FIAT → CRYPTO) ====================

/**
 * Process deposit: Bank account → USDC/USDT → Openfort
 * 
 * Flow:
 * 1. Create on-ramp order in Juicyway
 * 2. User sends fiat to Juicyway bank account
 * 3. Juicyway confirms receipt and converts to crypto
 * 4. Juicyway sends crypto to Openfort treasury
 * 5. Border credits user's balance
 */
export async function createOnRamp(request: OnRampRequest): Promise<OnRampOrder> {
  // Get exchange rate
  const rateData = await juicywayRates.getIndicativeRate(request.fiatCurrency, request.cryptoCurrency);
  const cryptoAmount = request.amount / rateData.finalRate;
  const fee = calculateFee(request.amount, request.fiatCurrency);

  const orderId = generateOrderId('onramp');
  const reference = `BORDER-${orderId}`;

  // Create order in Juicyway
  const juicywayOrder = await createJuicywayOnRamp(
    request.amount,
    request.fiatCurrency,
    request.cryptoCurrency,
    reference
  );

  const order: OnRampOrder = {
    orderId,
    userId: request.userId,
    status: juicywayOrder.status as OnRampOrder['status'],
    fiatAmount: request.amount,
    fiatCurrency: request.fiatCurrency,
    cryptoAmount,
    cryptoCurrency: request.cryptoCurrency,
    exchangeRate: rateData.finalRate,
    fee,
    paymentInstructions: juicywayOrder.paymentInstructions,
    juicywayTxId: juicywayOrder.txId,
    createdAt: Date.now(),
    expiresAt: Date.now() + CONFIG.ON_RAMP_EXPIRY * 1000,
  };

  onRampOrders.set(orderId, order);


  return order;
}

/**
 * Handle on-ramp completion webhook
 * Called by Juicyway when fiat is received and crypto is sent
 */
export async function handleOnRampCompletion(
  orderId: string,
  cryptoTxHash: string
): Promise<void> {
  const order = onRampOrders.get(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  // Update order status
  order.status = 'completed';
  order.completedAt = Date.now();
  order.openfortTxHash = cryptoTxHash;
  onRampOrders.set(orderId, order);

  
  // Note: Internal ledger credit happens separately in backend
}

/**
 * Get on-ramp order status
 */
export async function getOnRampStatus(orderId: string): Promise<OnRampOrder | null> {
  return onRampOrders.get(orderId) || null;
}

// ==================== LIQUIDITY MANAGEMENT ====================

/**
 * Get current liquidity across Openfort and Juicyway
 */
export async function getLiquidityStatus(): Promise<{
  openfort: LiquidityBalance[];
  juicyway: LiquidityBalance[];
  total: Record<CryptoCurrency, number>;
  alerts: string[];
}> {
  try {
    // Get Openfort balances (now returns zero if not configured)
    const usdcBalance = await openfortTreasury.getTreasuryBalance('USDC');
    const usdtBalance = await openfortTreasury.getTreasuryBalance('USDT');

    const openfortBalances: LiquidityBalance[] = [
      {
        currency: 'USDC',
        available: usdcBalance.available,
        reserved: usdcBalance.pending, // Use pending as reserved
        total: usdcBalance.total,
        source: 'openfort',
        lastUpdated: Date.now(),
      },
      {
        currency: 'USDT',
        available: usdtBalance.available,
        reserved: usdtBalance.pending, // Use pending as reserved
        total: usdtBalance.total,
        source: 'openfort',
        lastUpdated: Date.now(),
      },
    ];

    // TODO: Get Juicyway balances via API
    const juicywayBalances: LiquidityBalance[] = [];

    // Calculate totals
    const total = {
      USDC: usdcBalance.total,
      USDT: usdtBalance.total,
    };

    // Check for low liquidity alerts
    const alerts: string[] = [];
    if (total.USDC < CONFIG.LOW_LIQUIDITY_THRESHOLD.USDC) {
      alerts.push(`⚠️ Low USDC liquidity: $${total.USDC.toFixed(2)}`);
    }
    if (total.USDT < CONFIG.LOW_LIQUIDITY_THRESHOLD.USDT) {
      alerts.push(`⚠️ Low USDT liquidity: $${total.USDT.toFixed(2)}`);
    }

    return {
      openfort: openfortBalances,
      juicyway: juicywayBalances,
      total,
      alerts,
    };
  } catch (error: any) {
    // Return zero liquidity on error instead of crashing
    return {
      openfort: [
        { currency: 'USDC', available: 0, reserved: 0, total: 0, source: 'openfort', lastUpdated: Date.now() },
        { currency: 'USDT', available: 0, reserved: 0, total: 0, source: 'openfort', lastUpdated: Date.now() },
      ],
      juicyway: [],
      total: { USDC: 0, USDT: 0 },
      alerts: ['⚠️ Unable to fetch liquidity status'],
    };
  }
}

// ==================== WEBHOOK HANDLERS ====================

/**
 * Handle Juicyway webhook events
 */
export async function handleJuicywayWebhook(payload: any): Promise<void> {
  const { event, data } = payload;

  switch (event) {
    case 'payout.completed':
      await handlePayoutCompleted(data);
      break;
    
    case 'payout.failed':
      await handlePayoutFailed(data);
      break;
    
    case 'onramp.payment_received':
      await handleOnRampPaymentReceived(data);
      break;
    
    case 'onramp.completed':
      await handleOnRampCompletion(data.orderId, data.cryptoTxHash);
      break;
    
    default:
  }
}

async function handlePayoutCompleted(data: any): Promise<void> {
  const order = Array.from(payoutOrders.values()).find(
    o => o.juicywayTxId === data.transactionId
  );
  
  if (order) {
    order.status = 'completed';
    order.completedAt = Date.now();
    payoutOrders.set(order.orderId, order);
  }
}

async function handlePayoutFailed(data: any): Promise<void> {
  const order = Array.from(payoutOrders.values()).find(
    o => o.juicywayTxId === data.transactionId
  );
  
  if (order) {
    order.status = 'failed';
    order.failureReason = data.reason || 'Unknown failure';
    payoutOrders.set(order.orderId, order);
    
    // TODO: Refund crypto to Openfort treasury
  }
}

async function handleOnRampPaymentReceived(data: any): Promise<void> {
  const order = Array.from(onRampOrders.values()).find(
    o => o.juicywayTxId === data.transactionId
  );
  
  if (order) {
    order.status = 'processing';
    onRampOrders.set(order.orderId, order);
  }
}

// ==================== ADMIN FUNCTIONS ====================

/**
 * Get all payout orders (admin)
 */
export function getAllPayouts(): PayoutOrder[] {
  return Array.from(payoutOrders.values());
}

/**
 * Get all on-ramp orders (admin)
 */
export function getAllOnRamps(): OnRampOrder[] {
  return Array.from(onRampOrders.values());
}

/**
 * Get service health status
 */
export function getHealthStatus() {
  return {
    status: 'healthy',
    payouts: {
      total: payoutOrders.size,
      pending: Array.from(payoutOrders.values()).filter(o => o.status === 'pending').length,
      processing: Array.from(payoutOrders.values()).filter(o => o.status === 'processing').length,
      completed: Array.from(payoutOrders.values()).filter(o => o.status === 'completed').length,
    },
    onramps: {
      total: onRampOrders.size,
      awaiting: Array.from(onRampOrders.values()).filter(o => o.status === 'awaiting_payment').length,
      processing: Array.from(onRampOrders.values()).filter(o => o.status === 'processing').length,
      completed: Array.from(onRampOrders.values()).filter(o => o.status === 'completed').length,
    },
    timestamp: Date.now(),
  };
}

// ==================== EXPORTS ====================

export const juicywayService = {
  // Off-ramp (crypto → fiat)
  createPayout,
  getPayoutStatus,
  
  // On-ramp (fiat → crypto)
  createOnRamp,
  getOnRampStatus,
  handleOnRampCompletion,
  
  // Liquidity
  getLiquidityStatus,
  
  // Webhooks
  handleJuicywayWebhook,
  
  // Admin
  getAllPayouts,
  getAllOnRamps,
  getHealthStatus,
};

export default juicywayService;