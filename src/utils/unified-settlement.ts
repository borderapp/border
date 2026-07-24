/**
 * Unified Settlement Service
 * 
 * This is the NEW primary settlement layer for Border.
 * Replaces blockchain-first architecture with ledger-first architecture.
 * 
 * Architecture:
 * - Internal Ledger: Primary source of truth for all balances
 * - Circle Treasury: Primary funding/withdrawal for supported countries
 * - Local Partners: 9PSB, Flutterwave for unsupported regions
 * - Celo Blockchain: DORMANT (code preserved but not used)
 * 
 * Flow:
 * 1. User action (deposit, transfer, withdrawal)
 * 2. Route to appropriate provider (Circle vs local)
 * 3. Update internal ledger (instant, atomic)
 * 4. Settle externally with provider (async)
 * 5. User sees updated balance immediately (from ledger)
 */

import InternalLedger, { Currency, TransactionType } from './internal-ledger';
import CircleTreasury from './circle-treasury';
import FundingRouter, { FundingProvider } from './funding-router';
import { getExchangeRate } from './exchange-rates';
import { psbTransfer } from './9psb-api';

// ==================== TYPES ====================

export interface DepositRequest {
  userId: string;
  amount: number;
  currency: Currency;
  country: string;
  paymentMethod?: 'ach' | 'wire' | 'card' | 'bank_transfer' | 'mobile_money';
  metadata?: Record<string, any>;
}

export interface DepositResult {
  success: boolean;
  transactionId: string;
  provider: FundingProvider;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  newBalance: number;
  estimatedCompletion?: string;
  reference: string;
}

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  currency: Currency;
  country: string;
  bankAccount: {
    accountNumber: string;
    accountName: string;
    bankCode?: string;
    bankName: string;
    routingNumber?: string;
    iban?: string;
    swiftCode?: string;
  };
  metadata?: Record<string, any>;
}

export interface WithdrawalResult {
  success: boolean;
  transactionId: string;
  provider: FundingProvider;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  newBalance: number;
  estimatedCompletion?: string;
  reference: string;
}

export interface P2PTransferRequest {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: Currency;
  description?: string;
  metadata?: Record<string, any>;
}

export interface P2PTransferResult {
  success: boolean;
  transactionId: string;
  fromBalance: number;
  toBalance: number;
  status: 'completed';
}

export interface ConversionRequest {
  userId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  amount: number;
}

export interface ConversionResult {
  success: boolean;
  transactionId: string;
  exchangeRate: number;
  fromAmount: number;
  toAmount: number;
  fromBalance: number;
  toBalance: number;
  status: 'completed';
}

// ==================== DEPOSIT OPERATIONS ====================

/**
 * Process user deposit
 * Routes to Circle (if supported) or local partner, then updates ledger
 */
export async function processDeposit(request: DepositRequest): Promise<DepositResult> {
  
  try {
    // Step 1: Route to appropriate provider
    const route = FundingRouter.routeFundingProvider({
      country: request.country,
      currency: request.currency,
      preferredMethod: request.paymentMethod,
    });
    
    
    let externalResult;
    let status: 'pending' | 'processing' | 'completed' = 'pending';
    let reference = `dep_${Date.now()}`;
    let estimatedCompletion = route.estimatedTime;
    
    // Step 2: Process with external provider
    if (route.provider === 'circle') {
      // Circle deposit
      const circleResult = await CircleTreasury.processDeposit({
        userId: request.userId,
        amount: request.amount,
        currency: request.currency as 'USD' | 'EUR' | 'GBP',
        paymentMethod: request.paymentMethod || 'card',
        metadata: request.metadata,
      });
      
      status = circleResult.status;
      reference = circleResult.reference;
      estimatedCompletion = circleResult.estimatedCompletion;
      
    } else if (route.provider === '9psb') {
      // 9PSB deposit (Nigeria)
      // In production, would initiate 9PSB virtual account funding
      status = 'processing';
      
    } else if (route.provider === 'flutterwave') {
      // Flutterwave deposit
      status = 'processing';
      
    } else {
      // Manual processing
      status = 'pending';
    }
    
    // Step 3: Update internal ledger IMMEDIATELY
    // User sees balance update instantly, even if external settlement pending
    const ledgerTx = await InternalLedger.updateBalance({
      userId: request.userId,
      currency: request.currency,
      amount: request.amount,
      type: 'deposit',
      description: `Deposit via ${route.provider}`,
      externalReference: reference,
      fundingSource: route.provider,
      metadata: request.metadata,
    });
    
    const newBalance = InternalLedger.getBalance(request.userId, request.currency);
    
    
    return {
      success: true,
      transactionId: ledgerTx.id,
      provider: route.provider,
      status: 'completed', // Ledger update is instant
      newBalance,
      estimatedCompletion,
      reference,
    };
    
  } catch (error: any) {
    
    return {
      success: false,
      transactionId: `error_${Date.now()}`,
      provider: 'manual',
      status: 'failed',
      newBalance: InternalLedger.getBalance(request.userId, request.currency),
      reference: `error_${Date.now()}`,
    };
  }
}

// ==================== WITHDRAWAL OPERATIONS ====================

/**
 * Process user withdrawal
 * Debits ledger first, then settles with external provider
 */
export async function processWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResult> {
  
  try {
    // Step 1: Validate sufficient balance
    const currentBalance = InternalLedger.getBalance(request.userId, request.currency);
    if (currentBalance < request.amount) {
      throw new Error(`Insufficient balance: ${request.currency} ${currentBalance}, required: ${request.amount}`);
    }
    
    // Step 2: Route to appropriate provider
    const route = FundingRouter.routeFundingProvider({
      country: request.country,
      currency: request.currency,
    });
    
    
    let reference = `wd_${Date.now()}`;
    let estimatedCompletion = route.estimatedTime;
    
    // Step 3: Debit internal ledger FIRST (prevents double-spending)
    const ledgerTx = await InternalLedger.updateBalance({
      userId: request.userId,
      currency: request.currency,
      amount: -request.amount,
      type: 'withdrawal',
      description: `Withdrawal to ${request.bankAccount.bankName}`,
      externalReference: reference,
      fundingSource: route.provider,
      metadata: request.metadata,
    });
    
    // Step 4: Process with external provider (async)
    if (route.provider === 'circle') {
      // Circle withdrawal
      const circleResult = await CircleTreasury.processWithdrawal({
        userId: request.userId,
        amount: request.amount,
        currency: request.currency as 'USD' | 'EUR' | 'GBP',
        bankAccount: request.bankAccount,
        metadata: request.metadata,
      });
      
      reference = circleResult.reference;
      estimatedCompletion = circleResult.estimatedCompletion;
      
    } else if (route.provider === '9psb') {
      // 9PSB withdrawal (Nigeria)
      // Would call 9PSB transfer API
      
    } else if (route.provider === 'flutterwave') {
      // Flutterwave withdrawal
      
    }
    
    const newBalance = InternalLedger.getBalance(request.userId, request.currency);
    
    
    return {
      success: true,
      transactionId: ledgerTx.id,
      provider: route.provider,
      status: 'processing',
      newBalance,
      estimatedCompletion,
      reference,
    };
    
  } catch (error: any) {
    
    return {
      success: false,
      transactionId: `error_${Date.now()}`,
      provider: 'manual',
      status: 'failed',
      newBalance: InternalLedger.getBalance(request.userId, request.currency),
      reference: `error_${Date.now()}`,
    };
  }
}

// ==================== P2P TRANSFER ====================

/**
 * Process P2P transfer between users
 * Entirely on internal ledger - no external settlement needed
 */
export async function processP2PTransfer(request: P2PTransferRequest): Promise<P2PTransferResult> {
  
  try {
    // Execute atomic P2P transfer on ledger
    const { debitTx, creditTx } = await InternalLedger.p2pTransfer({
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      currency: request.currency,
      amount: request.amount,
      description: request.description || 'P2P Transfer',
      metadata: request.metadata,
    });
    
    const fromBalance = InternalLedger.getBalance(request.fromUserId, request.currency);
    const toBalance = InternalLedger.getBalance(request.toUserId, request.currency);
    
    
    // NOTE: No blockchain transaction needed - purely ledger-based
    // Celo blockchain remains DORMANT
    
    return {
      success: true,
      transactionId: debitTx.id,
      fromBalance,
      toBalance,
      status: 'completed',
    };
    
  } catch (error: any) {
    throw error;
  }
}

// ==================== CURRENCY CONVERSION ====================

/**
 * Process currency conversion
 * Entirely on internal ledger using live FX rates
 */
export async function processCurrencyConversion(request: ConversionRequest): Promise<ConversionResult> {
  
  try {
    // Step 1: Get live exchange rate
    const exchangeRate = await getExchangeRate(request.fromCurrency, request.toCurrency);
    
    // Step 2: Execute conversion on ledger
    const { debitTx, creditTx } = await InternalLedger.currencyConversion({
      userId: request.userId,
      fromCurrency: request.fromCurrency,
      toCurrency: request.toCurrency,
      amount: request.amount,
      exchangeRate,
    });
    
    const convertedAmount = request.amount * exchangeRate;
    const fromBalance = InternalLedger.getBalance(request.userId, request.fromCurrency);
    const toBalance = InternalLedger.getBalance(request.userId, request.toCurrency);
    
    
    // NOTE: No stablecoin conversion needed - purely ledger-based
    // Stablecoins used only for Circle treasury, not exposed to users
    
    return {
      success: true,
      transactionId: debitTx.id,
      exchangeRate,
      fromAmount: request.amount,
      toAmount: convertedAmount,
      fromBalance,
      toBalance,
      status: 'completed',
    };
    
  } catch (error: any) {
    throw error;
  }
}

// ==================== BALANCE QUERIES ====================

/**
 * Get user balance (from internal ledger)
 */
export function getBalance(userId: string, currency: Currency): number {
  return InternalLedger.getBalance(userId, currency);
}

/**
 * Get all balances for user
 */
export function getAllBalances(userId: string): Record<Currency, number> {
  return InternalLedger.getAllBalances(userId);
}

/**
 * Get account summary
 */
export function getAccountSummary(userId: string) {
  return InternalLedger.getAccountSummary(userId);
}

/**
 * Get transaction history
 */
export function getTransactionHistory(userId: string, options?: {
  currency?: Currency;
  limit?: number;
  offset?: number;
}) {
  return InternalLedger.getTransactionHistory(userId, options);
}

// ==================== EXPORTS ====================

export const UnifiedSettlement = {
  // Funding
  processDeposit,
  processWithdrawal,
  
  // Transfers
  processP2PTransfer,
  processCurrencyConversion,
  
  // Queries
  getBalance,
  getAllBalances,
  getAccountSummary,
  getTransactionHistory,
};

export default UnifiedSettlement;
