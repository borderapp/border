/**
 * Transfer Orchestration Service
 * 
 * Central coordination layer for all transfer operations.
 * Handles off-ramp, on-ramp, and cross-border transfers.
 * Ensures idempotency, traceability, and proper error handling.
 * 
 * Architecture:
 * - Single source of truth for all transfers
 * - Coordinates between Openfort (treasury) and Juicyway (rails)
 * - Maintains audit trail for compliance
 * - Handles retries and failure scenarios
 */

import { v4 as uuidv4 } from 'uuid';
import openfortTreasury from './openfort-treasury';
import juicywayService from './juicyway-service';
import juicywayRates from './juicyway-rates';

// ==================== TYPES ====================

export type TransferType = 'off-ramp' | 'on-ramp' | 'cross-border';
export type TransferStatus = 'pending' | 'quoted' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type CryptoCurrency = 'USDC' | 'USDT';
export type FiatCurrency = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'CAD' | 'KES' | 'GHS' | 'ZAR';

export interface Recipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  bankAccount: {
    accountName: string;
    accountNumber: string;
    bankCode: string;
    bankName: string;
    country: string; // ISO code
    currency: FiatCurrency;
    routingNumber?: string;
    iban?: string;
    swiftCode?: string;
    sortCode?: string;
    bsbCode?: string; // Australia
    ifscCode?: string; // India
  };
  savedAt: number;
}

export interface TransferQuote {
  quoteId: string;
  transferId: string;
  type: TransferType;
  fromAmount: number;
  fromCurrency: CryptoCurrency | FiatCurrency;
  toAmount: number;
  toCurrency: CryptoCurrency | FiatCurrency;
  exchangeRate: number;
  baseRate: number;
  margin: number;
  fees: {
    network: number;
    processing: number;
    fx: number;
    total: number;
  };
  estimatedDelivery: string; // e.g., "1-3 business days"
  expiresAt: number;
  createdAt: number;
}

export interface Transfer {
  id: string;
  userId: string;
  type: TransferType;
  status: TransferStatus;
  
  // Amounts
  sourceAmount: number;
  sourceCurrency: CryptoCurrency | FiatCurrency;
  destinationAmount: number;
  destinationCurrency: CryptoCurrency | FiatCurrency;
  
  // Rates and fees
  exchangeRate: number;
  fees: TransferQuote['fees'];
  
  // Recipient (for off-ramp/cross-border)
  recipient?: Recipient;
  
  // References
  quoteId?: string;
  openfortTxHash?: string;
  juicywayTxId?: string;
  
  // Timestamps
  createdAt: number;
  quotedAt?: number;
  processedAt?: number;
  completedAt?: number;
  failedAt?: number;
  
  // Error handling
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  
  // Metadata
  reference?: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Audit trail
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: number;
  action: string;
  status: TransferStatus;
  details: any;
  actor: string; // 'user' | 'system' | 'admin'
}

// ==================== STORAGE ====================

// In production: Use Supabase or PostgreSQL
const transfers: Map<string, Transfer> = new Map();
const recipients: Map<string, Recipient> = new Map();

// ==================== CONFIGURATION ====================

const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000, // 5 seconds
  QUOTE_EXPIRY_MS: 60000, // 60 seconds
  
  SUPPORTED_CORRIDORS: [
    // Africa
    { from: 'USDC', to: 'NGN', country: 'NG' },
    { from: 'USDT', to: 'NGN', country: 'NG' },
    { from: 'USDC', to: 'KES', country: 'KE' },
    { from: 'USDC', to: 'GHS', country: 'GH' },
    { from: 'USDC', to: 'ZAR', country: 'ZA' },
    
    // North America
    { from: 'USDC', to: 'USD', country: 'US' },
    { from: 'USDT', to: 'USD', country: 'US' },
    { from: 'USDC', to: 'CAD', country: 'CA' },
    
    // Europe
    { from: 'USDC', to: 'GBP', country: 'GB' },
    { from: 'USDC', to: 'EUR', country: 'DE' },
    { from: 'USDC', to: 'EUR', country: 'FR' },
    
    // Reverse (on-ramp)
    { from: 'USD', to: 'USDC', country: 'US' },
    { from: 'USD', to: 'USDT', country: 'US' },
  ],
};

// ==================== UTILITY FUNCTIONS ====================

function generateTransferId(): string {
  return `TXN-${Date.now()}-${uuidv4().split('-')[0].toUpperCase()}`;
}

function addAuditEntry(transfer: Transfer, action: string, details: any, actor: string = 'system'): void {
  transfer.auditLog.push({
    timestamp: Date.now(),
    action,
    status: transfer.status,
    details,
    actor,
  });
}

function isCrypto(currency: string): currency is CryptoCurrency {
  return currency === 'USDC' || currency === 'USDT';
}

function estimateDeliveryTime(country: string, currency: FiatCurrency): string {
  // Instant for USD rail
  if (currency === 'USD') return 'Instant - 1 hour';
  
  // Same day for local transfers in major countries
  if (['NG', 'KE', 'GH'].includes(country)) return 'Same day';
  
  // International
  return '1-3 business days';
}

// ==================== RECIPIENT MANAGEMENT ====================

/**
 * Save recipient for future transfers
 */
export function saveRecipient(userId: string, recipientData: Omit<Recipient, 'id' | 'savedAt'>): Recipient {
  const recipient: Recipient = {
    id: `RCP-${Date.now()}-${uuidv4().split('-')[0].toUpperCase()}`,
    ...recipientData,
    savedAt: Date.now(),
  };
  
  recipients.set(recipient.id, recipient);
  
  return recipient;
}

/**
 * Get saved recipients for user
 */
export function getUserRecipients(userId: string): Recipient[] {
  // In production: Query database by userId
  return Array.from(recipients.values());
}

/**
 * Get recipient by ID
 */
export function getRecipient(recipientId: string): Recipient | null {
  return recipients.get(recipientId) || null;
}

// ==================== QUOTE GENERATION ====================

/**
 * Generate quote for off-ramp transfer
 */
export async function generateOffRampQuote(
  userId: string,
  cryptoAmount: number,
  cryptoCurrency: CryptoCurrency,
  fiatCurrency: FiatCurrency,
  country: string
): Promise<TransferQuote> {
  // Validate corridor
  const corridor = CONFIG.SUPPORTED_CORRIDORS.find(
    c => c.from === cryptoCurrency && c.to === fiatCurrency
  );
  
  if (!corridor) {
    throw new Error(`Corridor ${cryptoCurrency} → ${fiatCurrency} not supported`);
  }
  
  // Get FX rate
  const rate = await juicywayRates.getFirmQuote(cryptoCurrency, fiatCurrency, cryptoAmount);
  
  // Calculate amounts
  const grossFiatAmount = cryptoAmount * rate.finalRate;
  
  // Calculate fees
  const networkFee = 0; // Openfort handles network fees
  const processingFee = grossFiatAmount * 0.01; // 1% processing
  const fxFee = grossFiatAmount * (rate.margin / 100); // FX margin as fee
  const totalFees = networkFee + processingFee + fxFee;
  
  const netFiatAmount = grossFiatAmount - totalFees;
  
  // Create transfer record
  const transferId = generateTransferId();
  
  const quote: TransferQuote = {
    quoteId: rate.quoteId,
    transferId,
    type: 'off-ramp',
    fromAmount: cryptoAmount,
    fromCurrency: cryptoCurrency,
    toAmount: netFiatAmount,
    toCurrency: fiatCurrency,
    exchangeRate: rate.finalRate,
    baseRate: rate.baseRate,
    margin: rate.margin,
    fees: {
      network: networkFee,
      processing: processingFee,
      fx: fxFee,
      total: totalFees,
    },
    estimatedDelivery: estimateDeliveryTime(country, fiatCurrency),
    expiresAt: rate.expiresAt,
    createdAt: Date.now(),
  };
  
  
  return quote;
}

/**
 * Generate quote for on-ramp transfer
 */
export async function generateOnRampQuote(
  userId: string,
  fiatAmount: number,
  fiatCurrency: FiatCurrency,
  cryptoCurrency: CryptoCurrency
): Promise<TransferQuote> {
  // Validate corridor
  const corridor = CONFIG.SUPPORTED_CORRIDORS.find(
    c => c.from === fiatCurrency && c.to === cryptoCurrency
  );
  
  if (!corridor) {
    throw new Error(`Corridor ${fiatCurrency} → ${cryptoCurrency} not supported`);
  }
  
  // Get FX rate
  const rate = await juicywayRates.getFirmQuote(fiatCurrency, cryptoCurrency, fiatAmount);
  
  // Calculate amounts
  const processingFee = fiatAmount * 0.01; // 1% processing fee
  const netFiatAmount = fiatAmount - processingFee;
  const cryptoAmount = netFiatAmount / rate.finalRate;
  
  const transferId = generateTransferId();
  
  const quote: TransferQuote = {
    quoteId: rate.quoteId,
    transferId,
    type: 'on-ramp',
    fromAmount: fiatAmount,
    fromCurrency: fiatCurrency,
    toAmount: cryptoAmount,
    toCurrency: cryptoCurrency,
    exchangeRate: rate.finalRate,
    baseRate: rate.baseRate,
    margin: rate.margin,
    fees: {
      network: 0,
      processing: processingFee,
      fx: 0,
      total: processingFee,
    },
    estimatedDelivery: estimateDeliveryTime('US', fiatCurrency),
    expiresAt: rate.expiresAt,
    createdAt: Date.now(),
  };
  
  
  return quote;
}

// ==================== TRANSFER EXECUTION ====================

/**
 * Execute off-ramp transfer (crypto → fiat)
 */
export async function executeOffRamp(
  userId: string,
  quote: TransferQuote,
  recipient: Recipient,
  reference?: string
): Promise<Transfer> {
  // Validate quote
  const validQuote = juicywayRates.validateQuote(quote.quoteId);
  if (!validQuote) {
    throw new Error('Quote expired. Please generate a new quote.');
  }
  
  // Create transfer record
  const transfer: Transfer = {
    id: quote.transferId,
    userId,
    type: 'off-ramp',
    status: 'pending',
    sourceAmount: quote.fromAmount,
    sourceCurrency: quote.fromCurrency as CryptoCurrency,
    destinationAmount: quote.toAmount,
    destinationCurrency: quote.toCurrency as FiatCurrency,
    exchangeRate: quote.exchangeRate,
    fees: quote.fees,
    recipient,
    quoteId: quote.quoteId,
    createdAt: Date.now(),
    quotedAt: quote.createdAt,
    retryCount: 0,
    maxRetries: CONFIG.MAX_RETRIES,
    reference,
    auditLog: [],
  };
  
  addAuditEntry(transfer, 'transfer_created', { quote }, 'user');
  transfers.set(transfer.id, transfer);
  
  try {
    // Step 1: Check Openfort balance
    addAuditEntry(transfer, 'checking_balance', {}, 'system');
    const balance = await openfortTreasury.getTreasuryBalance(transfer.sourceCurrency);
    
    if (balance.available < transfer.sourceAmount) {
      throw new Error('Insufficient treasury balance');
    }
    
    // Step 2: Deduct from Openfort
    transfer.status = 'processing';
    addAuditEntry(transfer, 'deducting_funds', { amount: transfer.sourceAmount }, 'system');
    
    const openfortTx = await openfortTreasury.executeTreasuryWithdrawal({
      userId: transfer.userId,
      amount: transfer.sourceAmount,
      currency: transfer.sourceCurrency,
      destinationType: 'juicyway',
      destination: {
        address: 'JUICYWAY_SETTLEMENT_ADDRESS',
        memo: transfer.id,
      },
    });
    
    transfer.openfortTxHash = openfortTx.transactionHash;
    transfer.processedAt = Date.now();
    addAuditEntry(transfer, 'openfort_withdrawal', { txHash: openfortTx.transactionHash }, 'system');
    transfers.set(transfer.id, transfer);
    
    // Step 3: Create payout in Juicyway
    addAuditEntry(transfer, 'creating_payout', {}, 'system');
    
    const payout = await juicywayService.createPayout({
      userId: transfer.userId,
      amount: transfer.destinationAmount,
      currency: transfer.destinationCurrency,
      cryptoCurrency: transfer.sourceCurrency,
      bankAccount: recipient.bankAccount,
      reference: reference || transfer.id,
      quoteId: quote.quoteId,
    });
    
    transfer.juicywayTxId = payout.orderId;
    addAuditEntry(transfer, 'payout_created', { orderId: payout.orderId }, 'system');
    transfers.set(transfer.id, transfer);
    
    
    return transfer;
  } catch (error) {
    transfer.status = 'failed';
    transfer.failedAt = Date.now();
    transfer.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addAuditEntry(transfer, 'transfer_failed', { error: transfer.errorMessage }, 'system');
    transfers.set(transfer.id, transfer);
    
    throw error;
  }
}

/**
 * Execute on-ramp transfer (fiat → crypto)
 */
export async function executeOnRamp(
  userId: string,
  quote: TransferQuote,
  paymentMethod: 'bank_transfer' | 'card' = 'bank_transfer'
): Promise<Transfer> {
  // Validate quote
  const validQuote = juicywayRates.validateQuote(quote.quoteId);
  if (!validQuote) {
    throw new Error('Quote expired. Please generate a new quote.');
  }
  
  // Create transfer record
  const transfer: Transfer = {
    id: quote.transferId,
    userId,
    type: 'on-ramp',
    status: 'pending',
    sourceAmount: quote.fromAmount,
    sourceCurrency: quote.fromCurrency as FiatCurrency,
    destinationAmount: quote.toAmount,
    destinationCurrency: quote.toCurrency as CryptoCurrency,
    exchangeRate: quote.exchangeRate,
    fees: quote.fees,
    quoteId: quote.quoteId,
    createdAt: Date.now(),
    quotedAt: quote.createdAt,
    retryCount: 0,
    maxRetries: CONFIG.MAX_RETRIES,
    auditLog: [],
  };
  
  addAuditEntry(transfer, 'transfer_created', { quote }, 'user');
  transfers.set(transfer.id, transfer);
  
  try {
    // Create on-ramp order in Juicyway
    addAuditEntry(transfer, 'creating_onramp', {}, 'system');
    
    const onramp = await juicywayService.createOnRamp({
      userId: transfer.userId,
      amount: transfer.sourceAmount,
      fiatCurrency: transfer.sourceCurrency,
      cryptoCurrency: transfer.destinationCurrency,
      paymentMethod,
      reference: transfer.id,
    });
    
    transfer.juicywayTxId = onramp.orderId;
    transfer.status = 'processing';
    addAuditEntry(transfer, 'onramp_created', {
      orderId: onramp.orderId,
      paymentInstructions: onramp.paymentInstructions,
    }, 'system');
    transfers.set(transfer.id, transfer);
    
    
    return transfer;
  } catch (error) {
    transfer.status = 'failed';
    transfer.failedAt = Date.now();
    transfer.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addAuditEntry(transfer, 'transfer_failed', { error: transfer.errorMessage }, 'system');
    transfers.set(transfer.id, transfer);
    
    throw error;
  }
}

// ==================== STATUS TRACKING ====================

/**
 * Get transfer by ID
 */
export function getTransfer(transferId: string): Transfer | null {
  return transfers.get(transferId) || null;
}

/**
 * Get user transfers
 */
export function getUserTransfers(userId: string, limit: number = 50): Transfer[] {
  return Array.from(transfers.values())
    .filter(t => t.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/**
 * Update transfer status (called by webhooks)
 */
export async function updateTransferStatus(
  transferId: string,
  status: TransferStatus,
  details?: any
): Promise<void> {
  const transfer = transfers.get(transferId);
  if (!transfer) {
    throw new Error('Transfer not found');
  }
  
  const previousStatus = transfer.status;
  transfer.status = status;
  
  if (status === 'completed') {
    transfer.completedAt = Date.now();
  } else if (status === 'failed') {
    transfer.failedAt = Date.now();
    if (details?.error) {
      transfer.errorMessage = details.error;
    }
  }
  
  addAuditEntry(transfer, 'status_updated', {
    from: previousStatus,
    to: status,
    ...details,
  }, 'system');
  
  transfers.set(transferId, transfer);
  
}

// ==================== RETRY LOGIC ====================

/**
 * Retry failed transfer
 */
export async function retryTransfer(transferId: string): Promise<Transfer> {
  const transfer = transfers.get(transferId);
  if (!transfer) {
    throw new Error('Transfer not found');
  }
  
  if (transfer.status !== 'failed') {
    throw new Error('Can only retry failed transfers');
  }
  
  if (transfer.retryCount >= transfer.maxRetries) {
    throw new Error('Maximum retry attempts exceeded');
  }
  
  transfer.retryCount++;
  transfer.status = 'pending';
  transfer.errorMessage = undefined;
  
  addAuditEntry(transfer, 'retry_initiated', {
    attempt: transfer.retryCount,
  }, 'system');
  
  transfers.set(transferId, transfer);
  
  
  // Wait before retry
  await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
  
  // Re-execute based on type
  if (transfer.type === 'off-ramp' && transfer.recipient) {
    const quote = await generateOffRampQuote(
      transfer.userId,
      transfer.sourceAmount,
      transfer.sourceCurrency as CryptoCurrency,
      transfer.destinationCurrency as FiatCurrency,
      transfer.recipient.bankAccount.country
    );
    
    return executeOffRamp(
      transfer.userId,
      quote,
      transfer.recipient,
      transfer.reference
    );
  } else if (transfer.type === 'on-ramp') {
    const quote = await generateOnRampQuote(
      transfer.userId,
      transfer.sourceAmount,
      transfer.sourceCurrency as FiatCurrency,
      transfer.destinationCurrency as CryptoCurrency
    );
    
    return executeOnRamp(transfer.userId, quote);
  }
  
  throw new Error('Unsupported transfer type for retry');
}

// ==================== RECONCILIATION ====================

/**
 * Reconcile transfer with external systems
 */
export async function reconcileTransfer(transferId: string): Promise<{
  openfortMatch: boolean;
  juicywayMatch: boolean;
  discrepancies: string[];
}> {
  const transfer = transfers.get(transferId);
  if (!transfer) {
    throw new Error('Transfer not found');
  }
  
  const discrepancies: string[] = [];
  let openfortMatch = true;
  let juicywayMatch = true;
  
  // Check Openfort
  if (transfer.openfortTxHash) {
    try {
      // In production: Query Openfort API for transaction status
    } catch (error) {
      openfortMatch = false;
      discrepancies.push(`Openfort transaction not found: ${transfer.openfortTxHash}`);
    }
  }
  
  // Check Juicyway
  if (transfer.juicywayTxId) {
    try {
      if (transfer.type === 'off-ramp') {
        const payout = await juicywayService.getPayoutStatus(transfer.juicywayTxId);
        if (!payout) {
          juicywayMatch = false;
          discrepancies.push(`Juicyway payout not found: ${transfer.juicywayTxId}`);
        } else if (payout.status !== transfer.status) {
          discrepancies.push(
            `Status mismatch: Internal=${transfer.status}, Juicyway=${payout.status}`
          );
        }
      } else if (transfer.type === 'on-ramp') {
        const onramp = juicywayService.getOnRampStatus(transfer.juicywayTxId);
        if (!onramp) {
          juicywayMatch = false;
          discrepancies.push(`Juicyway on-ramp not found: ${transfer.juicywayTxId}`);
        } else if (onramp.status !== transfer.status) {
          discrepancies.push(
            `Status mismatch: Internal=${transfer.status}, Juicyway=${onramp.status}`
          );
        }
      }
    } catch (error) {
      juicywayMatch = false;
      discrepancies.push(`Error checking Juicyway: ${error}`);
    }
  }
  
  if (discrepancies.length > 0) {
  } else {
  }
  
  return {
    openfortMatch,
    juicywayMatch,
    discrepancies,
  };
}

/**
 * Bulk reconciliation
 */
export async function reconcileAll(): Promise<Map<string, any>> {
  const results = new Map();
  
  for (const [id, transfer] of transfers.entries()) {
    if (transfer.status === 'processing' || transfer.status === 'completed') {
      const result = await reconcileTransfer(id);
      if (result.discrepancies.length > 0) {
        results.set(id, result);
      }
    }
  }
  
  return results;
}

// ==================== ADMIN FUNCTIONS ====================

/**
 * Get all transfers (admin)
 */
export function getAllTransfers(): Transfer[] {
  return Array.from(transfers.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get transfers by status
 */
export function getTransfersByStatus(status: TransferStatus): Transfer[] {
  return Array.from(transfers.values())
    .filter(t => t.status === status)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Cancel transfer (admin only)
 */
export function cancelTransfer(transferId: string, reason: string): void {
  const transfer = transfers.get(transferId);
  if (!transfer) {
    throw new Error('Transfer not found');
  }
  
  if (transfer.status === 'completed') {
    throw new Error('Cannot cancel completed transfer');
  }
  
  transfer.status = 'cancelled';
  addAuditEntry(transfer, 'transfer_cancelled', { reason }, 'admin');
  transfers.set(transferId, transfer);
  
}

/**
 * Get system statistics
 */
export function getSystemStats() {
  const allTransfers = Array.from(transfers.values());
  
  const stats = {
    total: allTransfers.length,
    byStatus: {
      pending: allTransfers.filter(t => t.status === 'pending').length,
      processing: allTransfers.filter(t => t.status === 'processing').length,
      completed: allTransfers.filter(t => t.status === 'completed').length,
      failed: allTransfers.filter(t => t.status === 'failed').length,
      cancelled: allTransfers.filter(t => t.status === 'cancelled').length,
    },
    byType: {
      'off-ramp': allTransfers.filter(t => t.type === 'off-ramp').length,
      'on-ramp': allTransfers.filter(t => t.type === 'on-ramp').length,
      'cross-border': allTransfers.filter(t => t.type === 'cross-border').length,
    },
    volume: {
      offRamp: allTransfers
        .filter(t => t.type === 'off-ramp' && t.status === 'completed')
        .reduce((sum, t) => sum + t.sourceAmount, 0),
      onRamp: allTransfers
        .filter(t => t.type === 'on-ramp' && t.status === 'completed')
        .reduce((sum, t) => sum + t.destinationAmount, 0),
    },
    successRate: allTransfers.length > 0
      ? (allTransfers.filter(t => t.status === 'completed').length / allTransfers.length) * 100
      : 0,
  };
  
  return stats;
}

// ==================== EXPORTS ====================

export const transferOrchestrator = {
  // Recipient management
  saveRecipient,
  getUserRecipients,
  getRecipient,
  
  // Quote generation
  generateOffRampQuote,
  generateOnRampQuote,
  
  // Transfer execution
  executeOffRamp,
  executeOnRamp,
  
  // Status tracking
  getTransfer,
  getUserTransfers,
  updateTransferStatus,
  
  // Retry logic
  retryTransfer,
  
  // Reconciliation
  reconcileTransfer,
  reconcileAll,
  
  // Admin
  getAllTransfers,
  getTransfersByStatus,
  cancelTransfer,
  getSystemStats,
};

export default transferOrchestrator;
