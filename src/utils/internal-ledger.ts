/**
 * Border Internal Ledger Service
 * 
 * This is the PRIMARY SOURCE OF TRUTH for all user balances and transactions.
 * 
 * Architecture:
 * - All balances tracked off-chain in internal ledger
 * - Supports 8 currencies: NGN, USD, GBP, EUR, CAD, GHS, ZAR, CNY
 * - Instant, atomic balance updates
 * - Full audit trail for compliance
 * - No blockchain exposure to users
 * 
 * Blockchain Usage:
 * - Celo: Dormant (preserved but not used)
 * - Stablecoins: Internal treasury only via Circle (not user-facing)
 * 
 * Treasury:
 * - Circle API: Primary treasury and funding provider
 * - Local partners (9PSB, Flutterwave): Used where Circle unavailable
 */

import { v4 as uuidv4 } from 'uuid';

// ==================== TYPES ====================

export type Currency = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'CAD' | 'GHS' | 'ZAR' | 'CNY';

export type TransactionType = 
  | 'deposit'           // User funding their account
  | 'withdrawal'        // User withdrawing to bank
  | 'p2p_transfer'      // User to user transfer
  | 'currency_conversion' // FX conversion
  | 'bill_payment'      // Utility/service payment
  | 'escrow_hold'       // Funds held for escrow
  | 'escrow_release'    // Escrow funds released
  | 'escrow_refund'     // Escrow refund
  | 'service_fee'       // Platform fees
  | 'bank_transfer_in'  // Incoming bank transfer
  | 'bank_transfer_out' // Outgoing bank transfer
  | 'card_payment'      // Card payment
  | 'pos_payment'       // POS terminal payment
  | 'qr_payment';       // QR code payment

export type TransactionStatus = 
  | 'pending'           // Initiated, not yet processed
  | 'processing'        // Being processed
  | 'completed'         // Successfully completed
  | 'failed'            // Failed
  | 'reversed'          // Reversed/refunded
  | 'held';             // Held in escrow

export interface LedgerAccount {
  userId: string;
  balances: Record<Currency, number>; // All currency balances
  escrowBalances: Record<Currency, number>; // Funds held in escrow
  totalBalanceUSD: number; // Computed total in USD
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  
  // Financial details
  currency: Currency;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  fee: number;
  
  // Related party (for P2P, etc.)
  relatedUserId?: string;
  relatedUserName?: string;
  
  // Currency conversion details (if applicable)
  fromCurrency?: Currency;
  toCurrency?: Currency;
  exchangeRate?: number;
  convertedAmount?: number;
  
  // External references
  externalReference?: string; // Circle transaction ID, 9PSB ref, etc.
  fundingSource?: 'circle' | '9psb' | 'flutterwave' | 'manual';
  
  // Metadata
  description: string;
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

export interface BalanceUpdateRequest {
  userId: string;
  currency: Currency;
  amount: number; // Positive for credit, negative for debit
  type: TransactionType;
  description: string;
  relatedUserId?: string;
  externalReference?: string;
  fundingSource?: 'circle' | '9psb' | 'flutterwave' | 'manual';
  metadata?: Record<string, any>;
}

export interface TransferRequest {
  fromUserId: string;
  toUserId: string;
  currency: Currency;
  amount: number;
  description: string;
  metadata?: Record<string, any>;
}

export interface ConversionRequest {
  userId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  amount: number;
  exchangeRate: number;
}

export interface EscrowRequest {
  userId: string;
  currency: Currency;
  amount: number;
  description: string;
  metadata?: Record<string, any>;
}

// ==================== IN-MEMORY LEDGER ====================
// In production, this would be PostgreSQL with ACID transactions

const ledgerAccounts = new Map<string, LedgerAccount>();
const ledgerTransactions = new Map<string, LedgerTransaction>();

// ==================== LEDGER OPERATIONS ====================

/**
 * Get or create ledger account for user
 */
export function getOrCreateAccount(userId: string): LedgerAccount {
  let account = ledgerAccounts.get(userId);
  
  if (!account) {
    account = {
      userId,
      balances: {
        NGN: 0,
        USD: 0,
        GBP: 0,
        EUR: 0,
        CAD: 0,
        GHS: 0,
        ZAR: 0,
        CNY: 0,
      },
      escrowBalances: {
        NGN: 0,
        USD: 0,
        GBP: 0,
        EUR: 0,
        CAD: 0,
        GHS: 0,
        ZAR: 0,
        CNY: 0,
      },
      totalBalanceUSD: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    ledgerAccounts.set(userId, account);
  }
  
  return account;
}

/**
 * Get user balance for specific currency
 */
export function getBalance(userId: string, currency: Currency): number {
  const account = getOrCreateAccount(userId);
  return account.balances[currency] || 0;
}

/**
 * Get all balances for user
 */
export function getAllBalances(userId: string): Record<Currency, number> {
  const account = getOrCreateAccount(userId);
  return { ...account.balances };
}

/**
 * Get escrow balance for user
 */
export function getEscrowBalance(userId: string, currency: Currency): number {
  const account = getOrCreateAccount(userId);
  return account.escrowBalances[currency] || 0;
}

/**
 * Update user balance (atomic operation)
 * This is the core function - all balance changes go through here
 */
export async function updateBalance(request: BalanceUpdateRequest): Promise<LedgerTransaction> {
  const account = getOrCreateAccount(request.userId);
  const currency = request.currency;
  
  // Get current balance
  const balanceBefore = account.balances[currency];
  const balanceAfter = balanceBefore + request.amount;
  
  // Validate sufficient funds for debits
  if (request.amount < 0 && balanceAfter < 0) {
    throw new Error(`Insufficient balance: ${currency} ${balanceBefore}, attempted debit: ${Math.abs(request.amount)}`);
  }
  
  // Create transaction record
  const transaction: LedgerTransaction = {
    id: uuidv4(),
    userId: request.userId,
    type: request.type,
    status: 'completed',
    currency,
    amount: request.amount,
    balanceBefore,
    balanceAfter,
    fee: 0,
    description: request.description,
    relatedUserId: request.relatedUserId,
    externalReference: request.externalReference,
    fundingSource: request.fundingSource,
    metadata: request.metadata,
    createdAt: new Date(),
    processedAt: new Date(),
    completedAt: new Date(),
  };
  
  // Update balance atomically
  account.balances[currency] = balanceAfter;
  account.updatedAt = new Date();
  
  // Store transaction
  ledgerTransactions.set(transaction.id, transaction);
  
  
  return transaction;
}

/**
 * P2P Transfer between users
 */
export async function p2pTransfer(request: TransferRequest): Promise<{
  debitTx: LedgerTransaction;
  creditTx: LedgerTransaction;
}> {
  // Validate sender has sufficient balance
  const senderBalance = getBalance(request.fromUserId, request.currency);
  if (senderBalance < request.amount) {
    throw new Error(`Insufficient balance for P2P transfer: ${request.currency} ${senderBalance}, required: ${request.amount}`);
  }
  
  // Get recipient name for description
  const recipientAccount = getOrCreateAccount(request.toUserId);
  
  // Debit sender
  const debitTx = await updateBalance({
    userId: request.fromUserId,
    currency: request.currency,
    amount: -request.amount,
    type: 'p2p_transfer',
    description: `Transfer to user ${request.toUserId}`,
    relatedUserId: request.toUserId,
    fundingSource: 'manual',
    metadata: request.metadata,
  });
  
  // Credit recipient
  const creditTx = await updateBalance({
    userId: request.toUserId,
    currency: request.currency,
    amount: request.amount,
    type: 'p2p_transfer',
    description: `Received from user ${request.fromUserId}`,
    relatedUserId: request.fromUserId,
    fundingSource: 'manual',
    metadata: request.metadata,
  });
  
  
  return { debitTx, creditTx };
}

/**
 * Currency conversion
 */
export async function currencyConversion(request: ConversionRequest): Promise<{
  debitTx: LedgerTransaction;
  creditTx: LedgerTransaction;
}> {
  // Validate sender has sufficient balance
  const fromBalance = getBalance(request.userId, request.fromCurrency);
  if (fromBalance < request.amount) {
    throw new Error(`Insufficient balance for conversion: ${request.fromCurrency} ${fromBalance}, required: ${request.amount}`);
  }
  
  // Calculate converted amount
  const convertedAmount = request.amount * request.exchangeRate;
  
  // Debit source currency
  const debitTx = await updateBalance({
    userId: request.userId,
    currency: request.fromCurrency,
    amount: -request.amount,
    type: 'currency_conversion',
    description: `Converted ${request.fromCurrency} to ${request.toCurrency}`,
    fundingSource: 'manual',
    metadata: {
      exchangeRate: request.exchangeRate,
      convertedAmount,
      toCurrency: request.toCurrency,
    },
  });
  
  // Credit destination currency
  const creditTx = await updateBalance({
    userId: request.userId,
    currency: request.toCurrency,
    amount: convertedAmount,
    type: 'currency_conversion',
    description: `Converted from ${request.fromCurrency}`,
    fundingSource: 'manual',
    metadata: {
      exchangeRate: request.exchangeRate,
      fromAmount: request.amount,
      fromCurrency: request.fromCurrency,
    },
  });
  
  
  return { debitTx, creditTx };
}

/**
 * Hold funds in escrow
 */
export async function holdEscrow(request: EscrowRequest): Promise<LedgerTransaction> {
  const account = getOrCreateAccount(request.userId);
  
  // Validate sufficient balance
  const balance = account.balances[request.currency];
  if (balance < request.amount) {
    throw new Error(`Insufficient balance for escrow: ${request.currency} ${balance}, required: ${request.amount}`);
  }
  
  // Move from balance to escrow
  account.balances[request.currency] -= request.amount;
  account.escrowBalances[request.currency] += request.amount;
  account.updatedAt = new Date();
  
  const transaction: LedgerTransaction = {
    id: uuidv4(),
    userId: request.userId,
    type: 'escrow_hold',
    status: 'held',
    currency: request.currency,
    amount: request.amount,
    balanceBefore: balance,
    balanceAfter: balance - request.amount,
    fee: 0,
    description: request.description,
    metadata: request.metadata,
    createdAt: new Date(),
    processedAt: new Date(),
  };
  
  ledgerTransactions.set(transaction.id, transaction);
  
  
  return transaction;
}

/**
 * Release funds from escrow
 */
export async function releaseEscrow(
  userId: string,
  currency: Currency,
  amount: number,
  description: string,
  toUserId?: string
): Promise<LedgerTransaction> {
  const account = getOrCreateAccount(userId);
  
  // Validate sufficient escrow balance
  const escrowBalance = account.escrowBalances[currency];
  if (escrowBalance < amount) {
    throw new Error(`Insufficient escrow balance: ${currency} ${escrowBalance}, required: ${amount}`);
  }
  
  // Remove from escrow
  account.escrowBalances[currency] -= amount;
  account.updatedAt = new Date();
  
  // If releasing to another user, credit them
  if (toUserId) {
    await updateBalance({
      userId: toUserId,
      currency,
      amount,
      type: 'escrow_release',
      description: `Escrow payment from ${userId}`,
      relatedUserId: userId,
      fundingSource: 'manual',
    });
  } else {
    // Release back to user's own balance
    account.balances[currency] += amount;
  }
  
  const transaction: LedgerTransaction = {
    id: uuidv4(),
    userId,
    type: 'escrow_release',
    status: 'completed',
    currency,
    amount,
    balanceBefore: escrowBalance,
    balanceAfter: escrowBalance - amount,
    fee: 0,
    description,
    relatedUserId: toUserId,
    createdAt: new Date(),
    processedAt: new Date(),
    completedAt: new Date(),
  };
  
  ledgerTransactions.set(transaction.id, transaction);
  
  
  return transaction;
}

/**
 * Get transaction history for user
 */
export function getTransactionHistory(
  userId: string,
  options?: {
    currency?: Currency;
    type?: TransactionType;
    limit?: number;
    offset?: number;
  }
): LedgerTransaction[] {
  const allTxs = Array.from(ledgerTransactions.values())
    .filter(tx => tx.userId === userId || tx.relatedUserId === userId);
  
  let filtered = allTxs;
  
  if (options?.currency) {
    filtered = filtered.filter(tx => tx.currency === options.currency);
  }
  
  if (options?.type) {
    filtered = filtered.filter(tx => tx.type === options.type);
  }
  
  // Sort by date descending
  filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  // Apply pagination
  const offset = options?.offset || 0;
  const limit = options?.limit || 50;
  
  return filtered.slice(offset, offset + limit);
}

/**
 * Get transaction by ID
 */
export function getTransaction(transactionId: string): LedgerTransaction | undefined {
  return ledgerTransactions.get(transactionId);
}

/**
 * Get account summary
 */
export function getAccountSummary(userId: string): {
  balances: Record<Currency, number>;
  escrowBalances: Record<Currency, number>;
  totalBalanceUSD: number;
  recentTransactions: LedgerTransaction[];
} {
  const account = getOrCreateAccount(userId);
  const recentTxs = getTransactionHistory(userId, { limit: 10 });
  
  // Calculate total in USD (simplified - would use real FX rates in production)
  const totalBalanceUSD = Object.entries(account.balances).reduce((total, [curr, amount]) => {
    // Simplified conversion - use real FX API in production
    const conversionRates: Record<Currency, number> = {
      NGN: 0.00060606, // 1 NGN = 0.00060606 USD (1650 NGN/USD)
      USD: 1,
      GBP: 1.27,
      EUR: 1.08,
      CAD: 0.71,
      GHS: 0.063,
      ZAR: 0.052,
      CNY: 0.14,
    };
    
    return total + (amount * (conversionRates[curr as Currency] || 1));
  }, 0);
  
  return {
    balances: account.balances,
    escrowBalances: account.escrowBalances,
    totalBalanceUSD,
    recentTransactions: recentTxs,
  };
}

/**
 * Reconciliation check
 * Returns true if ledger is internally consistent
 */
export function reconcileAccount(userId: string): {
  isValid: boolean;
  issues: string[];
} {
  const account = getOrCreateAccount(userId);
  const issues: string[] = [];
  
  // Check for negative balances
  Object.entries(account.balances).forEach(([currency, balance]) => {
    if (balance < 0) {
      issues.push(`Negative balance: ${currency} ${balance}`);
    }
  });
  
  // Check for negative escrow
  Object.entries(account.escrowBalances).forEach(([currency, balance]) => {
    if (balance < 0) {
      issues.push(`Negative escrow balance: ${currency} ${balance}`);
    }
  });
  
  // Check transaction consistency
  const txs = getTransactionHistory(userId);
  const balanceCheck: Record<Currency, number> = {
    NGN: 0, USD: 0, GBP: 0, EUR: 0, CAD: 0, GHS: 0, ZAR: 0, CNY: 0,
  };
  
  txs.forEach(tx => {
    if (tx.userId === userId) {
      balanceCheck[tx.currency] += tx.amount;
    }
  });
  
  // Compare computed vs actual (within rounding tolerance)
  Object.entries(balanceCheck).forEach(([currency, computed]) => {
    const actual = account.balances[currency as Currency];
    if (Math.abs(computed - actual) > 0.01) {
      issues.push(`Balance mismatch for ${currency}: Computed ${computed}, Actual ${actual}`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

// ==================== ADMIN FUNCTIONS ====================

/**
 * Get all accounts (admin only)
 */
export function getAllAccounts(): LedgerAccount[] {
  return Array.from(ledgerAccounts.values());
}

/**
 * Get ledger statistics
 */
export function getLedgerStats(): {
  totalAccounts: number;
  totalTransactions: number;
  totalBalanceByurrency: Record<Currency, number>;
  transactionsByType: Record<TransactionType, number>;
} {
  const accounts = getAllAccounts();
  const transactions = Array.from(ledgerTransactions.values());
  
  const totalBalanceByCurrency: Record<Currency, number> = {
    NGN: 0, USD: 0, GBP: 0, EUR: 0, CAD: 0, GHS: 0, ZAR: 0, CNY: 0,
  };
  
  accounts.forEach(account => {
    Object.entries(account.balances).forEach(([currency, balance]) => {
      totalBalanceByCurrency[currency as Currency] += balance;
    });
  });
  
  const transactionsByType: Record<string, number> = {};
  transactions.forEach(tx => {
    transactionsByType[tx.type] = (transactionsByType[tx.type] || 0) + 1;
  });
  
  return {
    totalAccounts: accounts.length,
    totalTransactions: transactions.length,
    totalBalanceByurrency: totalBalanceByCurrency,
    transactionsByType: transactionsByType as Record<TransactionType, number>,
  };
}

/**
 * Manual balance adjustment (admin only - use with caution)
 */
export async function adminAdjustBalance(
  userId: string,
  currency: Currency,
  amount: number,
  reason: string
): Promise<LedgerTransaction> {
  
  return updateBalance({
    userId,
    currency,
    amount,
    type: 'deposit', // Use deposit type for manual adjustments
    description: `Admin adjustment: ${reason}`,
    fundingSource: 'manual',
    metadata: {
      adminAdjustment: true,
      reason,
    },
  });
}

// ==================== EXPORTS ====================

export const InternalLedger = {
  // Account operations
  getOrCreateAccount,
  getBalance,
  getAllBalances,
  getEscrowBalance,
  getAccountSummary,
  
  // Transaction operations
  updateBalance,
  p2pTransfer,
  currencyConversion,
  holdEscrow,
  releaseEscrow,
  
  // History & queries
  getTransactionHistory,
  getTransaction,
  
  // Reconciliation
  reconcileAccount,
  
  // Admin
  getAllAccounts,
  getLedgerStats,
  adminAdjustBalance,
};

export default InternalLedger;
