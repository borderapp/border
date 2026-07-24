/**
 * Webhook Handler System
 *
 * LIVE PRODUCTION MODE - Configured with live webhook secrets
 *
 * Handles incoming webhooks from Juicyway and other external services.
 * Ensures proper validation, processing, and reconciliation.
 *
 * Features:
 * - Signature verification with live webhook secret
 * - Idempotency (prevent duplicate processing)
 * - Automatic status updates
 * - Reconciliation with internal systems
 * - Audit logging
 * - Error handling and retries
 *
 * Webhook Events Supported:
 * - payout.completed: Off-ramp payment successfully delivered
 * - payout.failed: Off-ramp payment failed
 * - onramp.payment_received: Fiat received from customer
 * - onramp.completed: Crypto sent to customer's wallet
 * - onramp.failed: On-ramp order failed
 * - balance.updated: Liquidity balance changed
 *
 * Security:
 * - HMAC SHA-256 signature verification
 * - Webhook secret: Live production secret key
 * - Timing-safe comparison to prevent attacks
 */

import crypto from 'crypto';
import transferOrchestrator from './transfer-orchestrator';
import juicywayService from './juicyway-service';

// ==================== TYPES ====================

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  signature?: string;
}

export interface WebhookLog {
  id: string;
  event: WebhookEvent;
  status: 'received' | 'processing' | 'completed' | 'failed';
  processedAt?: number;
  error?: string;
  attempts: number;
  createdAt: number;
}

// ==================== STORAGE ====================

// In production: Use database
const webhookLogs: Map<string, WebhookLog> = new Map();
const processedEventIds: Set<string> = new Set(); // For idempotency

// ==================== CONFIGURATION ====================

const CONFIG = {
  // LIVE PRODUCTION WEBHOOK SECRET
  JUICYWAY_WEBHOOK_SECRET: 'WjkMCihbL04kyezRhPcZtYf9nd8G7dWtkRCxlB2c5+G9AMoI29lwXJa5rpiJqP6ULQeuIN1TUeMaZoNKKKB1FQ==', // LIVE SECRET for webhook verification
  MAX_RETRY_ATTEMPTS: 3,
  IDEMPOTENCY_WINDOW_MS: 86400000, // 24 hours
  JUICYWAY_MODE: 'LIVE', // PRODUCTION MODE ACTIVE
};

// ==================== SIGNATURE VERIFICATION ====================

/**
 * Verify Juicyway webhook signature
 */
function verifyJuicywaySignature(
  payload: string,
  signature: string,
  secret: string = CONFIG.JUICYWAY_WEBHOOK_SECRET
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

// ==================== IDEMPOTENCY ====================

/**
 * Check if event has already been processed
 */
function isEventProcessed(eventId: string): boolean {
  return processedEventIds.has(eventId);
}

/**
 * Mark event as processed
 */
function markEventProcessed(eventId: string): void {
  processedEventIds.add(eventId);
  
  // Clean up old entries after 24 hours
  setTimeout(() => {
    processedEventIds.delete(eventId);
  }, CONFIG.IDEMPOTENCY_WINDOW_MS);
}

// ==================== WEBHOOK LOGGING ====================

/**
 * Create webhook log entry
 */
function createWebhookLog(event: WebhookEvent): WebhookLog {
  const log: WebhookLog = {
    id: `WHL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    event,
    status: 'received',
    attempts: 0,
    createdAt: Date.now(),
  };
  
  webhookLogs.set(log.id, log);
  return log;
}

/**
 * Update webhook log
 */
function updateWebhookLog(
  logId: string,
  updates: Partial<WebhookLog>
): void {
  const log = webhookLogs.get(logId);
  if (log) {
    Object.assign(log, updates);
    webhookLogs.set(logId, log);
  }
}

// ==================== EVENT HANDLERS ====================

/**
 * Handle payout completed event
 */
async function handlePayoutCompleted(data: any): Promise<void> {
  const { transactionId, orderId, status, completedAt } = data;
  
  
  // Find transfer by Juicyway transaction ID
  const allTransfers = transferOrchestrator.getAllTransfers();
  const transfer = allTransfers.find(t => t.juicywayTxId === orderId);
  
  if (!transfer) {
    return;
  }
  
  // Update transfer status
  await transferOrchestrator.updateTransferStatus(transfer.id, 'completed', {
    juicywayStatus: status,
    completedAt,
  });
  
  // Trigger reconciliation
  await transferOrchestrator.reconcileTransfer(transfer.id);
  
  // TODO: Notify user
}

/**
 * Handle payout failed event
 */
async function handlePayoutFailed(data: any): Promise<void> {
  const { orderId, reason, failedAt } = data;
  
  
  // Find transfer
  const allTransfers = transferOrchestrator.getAllTransfers();
  const transfer = allTransfers.find(t => t.juicywayTxId === orderId);
  
  if (!transfer) {
    return;
  }
  
  // Update status
  await transferOrchestrator.updateTransferStatus(transfer.id, 'failed', {
    error: reason,
    failedAt,
  });
  
  // Attempt automatic retry
  if (transfer.retryCount < transfer.maxRetries) {
    setTimeout(async () => {
      try {
        await transferOrchestrator.retryTransfer(transfer.id);
      } catch (error) {
      }
    }, 5000); // Wait 5 seconds before retry
  } else {
    // TODO: Refund crypto to user's Openfort balance
    // TODO: Notify user of failure
  }
}

/**
 * Handle on-ramp payment received event
 */
async function handleOnRampPaymentReceived(data: any): Promise<void> {
  const { orderId, fiatAmount, currency, receivedAt } = data;
  
  
  // Find transfer
  const allTransfers = transferOrchestrator.getAllTransfers();
  const transfer = allTransfers.find(t => t.juicywayTxId === orderId);
  
  if (!transfer) {
    return;
  }
  
  // Update status to processing
  await transferOrchestrator.updateTransferStatus(transfer.id, 'processing', {
    paymentReceived: true,
    receivedAt,
  });
  
  // TODO: Notify user that payment was received
}

/**
 * Handle on-ramp completed event
 */
async function handleOnRampCompleted(data: any): Promise<void> {
  const { orderId, cryptoAmount, currency, txHash, completedAt } = data;
  
  
  // Find transfer
  const allTransfers = transferOrchestrator.getAllTransfers();
  const transfer = allTransfers.find(t => t.juicywayTxId === orderId);
  
  if (!transfer) {
    return;
  }
  
  // Update transfer status
  await transferOrchestrator.updateTransferStatus(transfer.id, 'completed', {
    cryptoTxHash: txHash,
    completedAt,
  });
  
  // Credit user's internal balance
  // TODO: Call internal ledger service
  
  // Trigger reconciliation
  await transferOrchestrator.reconcileTransfer(transfer.id);
  
  // TODO: Notify user
}

/**
 * Handle on-ramp failed event
 */
async function handleOnRampFailed(data: any): Promise<void> {
  const { orderId, reason, failedAt } = data;
  
  
  // Find transfer
  const allTransfers = transferOrchestrator.getAllTransfers();
  const transfer = allTransfers.find(t => t.juicywayTxId === orderId);
  
  if (!transfer) {
    return;
  }
  
  // Update status
  await transferOrchestrator.updateTransferStatus(transfer.id, 'failed', {
    error: reason,
    failedAt,
  });
  
  // TODO: Process refund if payment was received
  // TODO: Notify user
}

/**
 * Handle balance update event
 */
async function handleBalanceUpdate(data: any): Promise<void> {
  const { currency, balance, availableBalance } = data;
  
  
  // TODO: Update liquidity dashboard
  // TODO: Check if balance is below threshold and alert
}

// ==================== MAIN WEBHOOK PROCESSOR ====================

/**
 * Process Juicyway webhook
 */
export async function processJuicywayWebhook(
  payload: string,
  signature: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Step 1: Verify signature
    if (!verifyJuicywaySignature(payload, signature)) {
      return { success: false, message: 'Invalid signature' };
    }
    
    // Step 2: Parse payload
    const event: WebhookEvent = JSON.parse(payload);
    
    // Step 3: Check idempotency
    if (isEventProcessed(event.id)) {
      return { success: true, message: 'Already processed' };
    }
    
    // Step 4: Create log entry
    const log = createWebhookLog(event);
    updateWebhookLog(log.id, { status: 'processing', attempts: 1 });
    
    try {
      // Step 5: Route to appropriate handler
      switch (event.type) {
        case 'payout.completed':
          await handlePayoutCompleted(event.data);
          break;
        
        case 'payout.failed':
          await handlePayoutFailed(event.data);
          break;
        
        case 'onramp.payment_received':
          await handleOnRampPaymentReceived(event.data);
          break;
        
        case 'onramp.completed':
          await handleOnRampCompleted(event.data);
          break;
        
        case 'onramp.failed':
          await handleOnRampFailed(event.data);
          break;
        
        case 'balance.updated':
          await handleBalanceUpdate(event.data);
          break;
        
        default:
          updateWebhookLog(log.id, {
            status: 'completed',
            processedAt: Date.now(),
          });
          return { success: true, message: 'Unknown event type' };
      }
      
      // Step 6: Mark as processed
      markEventProcessed(event.id);
      updateWebhookLog(log.id, {
        status: 'completed',
        processedAt: Date.now(),
      });
      
      return { success: true, message: 'Processed successfully' };
    } catch (error) {
      // Step 7: Handle processing errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      updateWebhookLog(log.id, {
        status: 'failed',
        error: errorMessage,
        processedAt: Date.now(),
      });
      
      // Retry logic
      if (log.attempts < CONFIG.MAX_RETRY_ATTEMPTS) {
        // TODO: Queue for retry
      }
      
      return { success: false, message: errorMessage };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== RECONCILIATION ====================

/**
 * Reconcile all pending transfers
 */
export async function reconcileAllPending(): Promise<{
  total: number;
  matched: number;
  mismatched: number;
  errors: Array<{ transferId: string; error: string }>;
}> {
  
  const pendingTransfers = transferOrchestrator.getTransfersByStatus('processing');
  const results = {
    total: pendingTransfers.length,
    matched: 0,
    mismatched: 0,
    errors: [] as Array<{ transferId: string; error: string }>,
  };
  
  for (const transfer of pendingTransfers) {
    try {
      const reconciliation = await transferOrchestrator.reconcileTransfer(transfer.id);
      
      if (reconciliation.discrepancies.length === 0) {
        results.matched++;
      } else {
        results.mismatched++;
      }
    } catch (error) {
      results.errors.push({
        transferId: transfer.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  
  return results;
}

/**
 * Schedule automatic reconciliation
 */
export function scheduleReconciliation(intervalMinutes: number = 15): void {
  
  setInterval(async () => {
    try {
      await reconcileAllPending();
    } catch (error) {
    }
  }, intervalMinutes * 60 * 1000);
}

// ==================== WEBHOOK LOGS ====================

/**
 * Get webhook logs
 */
export function getWebhookLogs(limit: number = 100): WebhookLog[] {
  return Array.from(webhookLogs.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/**
 * Get failed webhook logs
 */
export function getFailedWebhooks(): WebhookLog[] {
  return Array.from(webhookLogs.values())
    .filter(log => log.status === 'failed')
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get webhook statistics
 */
export function getWebhookStats() {
  const logs = Array.from(webhookLogs.values());
  
  return {
    total: logs.length,
    byStatus: {
      received: logs.filter(l => l.status === 'received').length,
      processing: logs.filter(l => l.status === 'processing').length,
      completed: logs.filter(l => l.status === 'completed').length,
      failed: logs.filter(l => l.status === 'failed').length,
    },
    averageProcessingTime: logs
      .filter(l => l.processedAt)
      .reduce((sum, l) => sum + (l.processedAt! - l.createdAt), 0) / logs.filter(l => l.processedAt).length || 0,
  };
}

/**
 * Retry failed webhook
 */
export async function retryWebhook(logId: string): Promise<{ success: boolean; message: string }> {
  const log = webhookLogs.get(logId);
  if (!log) {
    return { success: false, message: 'Log not found' };
  }
  
  if (log.status !== 'failed') {
    return { success: false, message: 'Can only retry failed webhooks' };
  }
  
  if (log.attempts >= CONFIG.MAX_RETRY_ATTEMPTS) {
    return { success: false, message: 'Max retry attempts exceeded' };
  }
  
  
  // Reset status and increment attempts
  log.status = 'processing';
  log.attempts++;
  log.error = undefined;
  webhookLogs.set(logId, log);
  
  // Re-process the event
  return processJuicywayWebhook(
    JSON.stringify(log.event),
    log.event.signature || ''
  );
}

// ==================== EXPORTS ====================

export const webhookHandler = {
  // Main processor
  processJuicywayWebhook,
  
  // Reconciliation
  reconcileAllPending,
  scheduleReconciliation,
  
  // Logs
  getWebhookLogs,
  getFailedWebhooks,
  getWebhookStats,
  retryWebhook,
};

export default webhookHandler;
