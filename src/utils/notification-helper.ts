/**
 * Notification Helper Utilities - REBUILT
 * 
 * Comprehensive helper functions to create and manage user notifications
 * with proper error handling and logging
 */

import { supabase } from '@/lib/supabase';

export type NotificationType = 
  | 'compliance' 
  | 'transaction' 
  | 'deposit' 
  | 'card' 
  | 'reward' 
  | 'promotion' 
  | 'security' 
  | 'system' 
  | 'kyc_upgrade' 
  | 'profile_upgrade';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  data: any | null;
  error: any | null;
}

/**
 * Create a notification for a user
 */
export async function createNotification(input: CreateNotificationInput): Promise<NotificationResult> {
  try {

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: input.metadata || {},
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Create a KYC approval notification
 */
export async function createKYCApprovalNotification(
  userId: string, 
  tierName: string, 
  tier: number
): Promise<NotificationResult> {
  return createNotification({
    userId,
    type: 'compliance',
    title: '🎉 KYC Verification Approved!',
    message: `Your account has been upgraded to ${tierName}. You now have access to enhanced features and higher transaction limits.`,
    metadata: {
      kyc_status: 'approved',
      new_tier: tier,
      tier_name: tierName,
      approved_at: new Date().toISOString()
    }
  });
}

/**
 * Create a KYC rejection notification
 */
export async function createKYCRejectionNotification(
  userId: string, 
  reason: string
): Promise<NotificationResult> {
  return createNotification({
    userId,
    type: 'compliance',
    title: '⚠️ KYC Verification Needs Attention',
    message: `Your verification documents need to be reviewed. Reason: ${reason}. Please resubmit with the correct documents.`,
    metadata: {
      kyc_status: 'rejected',
      rejection_reason: reason,
      rejected_at: new Date().toISOString()
    }
  });
}

/**
 * Create a transaction notification
 */
export async function createTransactionNotification(
  userId: string,
  type: 'sent' | 'received',
  amount: number,
  currency: string,
  recipientOrSender: string,
  transactionReference?: string
): Promise<NotificationResult> {
  const isReceived = type === 'received';
  
  return createNotification({
    userId,
    type: isReceived ? 'deposit' : 'transaction',
    title: isReceived ? '💰 Money Received' : '✅ Transfer Successful',
    message: isReceived 
      ? `You received ${currency} ${amount.toLocaleString()} from ${recipientOrSender}`
      : `You sent ${currency} ${amount.toLocaleString()} to ${recipientOrSender}`,
    metadata: {
      transaction_type: type,
      amount,
      currency,
      [isReceived ? 'sender' : 'recipient']: recipientOrSender,
      transaction_reference: transactionReference,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Create a card notification
 */
export async function createCardNotification(
  userId: string, 
  cardType: 'virtual' | 'physical', 
  action: 'created' | 'activated' | 'blocked'
): Promise<NotificationResult> {
  const titles = {
    created: '🎉 Card Created',
    activated: '✅ Card Activated',
    blocked: '🔒 Card Blocked'
  };

  const messages = {
    created: `Your ${cardType} card has been created successfully`,
    activated: `Your ${cardType} card is now active and ready to use`,
    blocked: `Your ${cardType} card has been blocked for security`
  };

  return createNotification({
    userId,
    type: 'card',
    title: titles[action],
    message: messages[action],
    metadata: {
      card_type: cardType,
      action,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Create a security notification
 */
export async function createSecurityNotification(
  userId: string, 
  event: string, 
  details: string
): Promise<NotificationResult> {
  return createNotification({
    userId,
    type: 'security',
    title: '🔒 Security Alert',
    message: `${event}: ${details}`,
    metadata: {
      event,
      details,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Create sample notifications for testing (DEVELOPMENT ONLY)
 */
export async function createSampleNotifications(userId: string): Promise<NotificationResult[]> {
  
  const notifications = [
    {
      type: 'compliance' as const,
      title: '🎉 Welcome to Border!',
      message: 'Your account has been created successfully. Complete your KYC verification to unlock all features.',
      metadata: { sample: true, onboarding: true }
    },
    {
      type: 'compliance' as const,
      title: '🎉 KYC Verification Approved!',
      message: 'Your account has been upgraded to Border Basic. You now have access to enhanced features and higher transaction limits.',
      metadata: { sample: true, kyc_status: 'approved', new_tier: 1, tier_name: 'Border Basic' }
    },
    {
      type: 'deposit' as const,
      title: '💰 Money Received',
      message: 'You received NGN 50,000 from John Doe',
      metadata: { sample: true, transaction_type: 'received', amount: 50000, currency: 'NGN', sender: 'John Doe' }
    },
    {
      type: 'transaction' as const,
      title: '✅ Transfer Successful',
      message: 'You sent USD 100 to Jane Smith',
      metadata: { sample: true, transaction_type: 'sent', amount: 100, currency: 'USD', recipient: 'Jane Smith' }
    },
    {
      type: 'card' as const,
      title: '🎉 Card Created',
      message: 'Your virtual card has been created successfully',
      metadata: { sample: true, card_type: 'virtual', action: 'created' }
    },
    {
      type: 'promotion' as const,
      title: '🎁 Special Offer',
      message: 'Send money to 5 friends and earn 500 bonus points!',
      metadata: { sample: true, promotion_type: 'referral', points: 500 }
    },
    {
      type: 'security' as const,
      title: '🔒 New Device Login',
      message: 'A new device logged into your account from Lagos, Nigeria',
      metadata: { sample: true, event: 'login', location: 'Lagos, Nigeria' }
    }
  ];

  const results: NotificationResult[] = [];
  
  for (const notif of notifications) {
    const result = await createNotification({
      userId,
      ...notif
    });
    results.push(result);
    
    // Add small delay between inserts
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const successCount = results.filter(r => r.data).length;
  
  return results;
}

/**
 * Check if notifications table exists and is accessible
 */
export async function checkNotificationsTableExists(): Promise<{ exists: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('count', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
        return { exists: false, error: 'Table does not exist - run migration 020' };
      }
      return { exists: false, error: error.message };
    }

    return { exists: true, error: null };
  } catch (error: any) {
    return { exists: false, error: error.message };
  }
}

/**
 * Create notification from transaction record
 */
export async function createNotificationFromTransaction(transaction: any): Promise<NotificationResult> {
  try {
    if (!transaction.user_id) {
      return { data: null, error: 'Missing user_id' };
    }


    // Determine notification type and content based on transaction
    const isDeposit = ['DEPOSIT', 'FUNDING'].includes(transaction.transaction_type?.toUpperCase());
    const isTransfer = ['TRANSFER', 'WITHDRAWAL', 'SEND'].includes(transaction.transaction_type?.toUpperCase());
    
    let notificationType: NotificationType = isDeposit ? 'deposit' : 'transaction';
    let title = '';
    let message = '';

    if (isDeposit) {
      title = '💰 Money Received';
      const senderName = transaction.metadata?.sender_name 
        || transaction.metadata?.sender 
        || transaction.recipient_name 
        || 'someone';
      
      message = transaction.metadata?.type === 'p2p_received' 
        ? `You received ${transaction.currency} ${transaction.amount.toLocaleString()} from ${senderName}`
        : `You added ${transaction.currency} ${transaction.amount.toLocaleString()} to your wallet`;
    } else if (isTransfer) {
      title = '✅ Transfer Successful';
      const recipientName = transaction.recipient_name 
        || transaction.metadata?.recipient_name 
        || 'recipient';
      message = `You sent ${transaction.currency} ${transaction.amount.toLocaleString()} to ${recipientName}`;
    } else if (transaction.transaction_type === 'CONVERSION') {
      title = '🔄 Currency Converted';
      message = transaction.description || `Converted ${transaction.currency} ${transaction.amount}`;
    } else if (transaction.transaction_type === 'BILL_PAYMENT') {
      title = '📱 Bill Payment';
      message = transaction.description || `Paid ${transaction.currency} ${transaction.amount}`;
    } else {
      title = '📝 Transaction Update';
      message = transaction.description || `${transaction.transaction_type}: ${transaction.currency} ${transaction.amount}`;
    }

    return createNotification({
      userId: transaction.user_id,
      type: notificationType,
      title,
      message,
      metadata: {
        transaction_id: transaction.id,
        transaction_reference: transaction.transaction_reference,
        transaction_type: transaction.transaction_type,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        ...transaction.metadata
      }
    });
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Sync all recent transactions to notifications
 * Useful for backfilling or ensuring all transactions have notifications
 */
export async function syncTransactionsToNotifications(
  userId: string, 
  daysBack: number = 30
): Promise<{ synced: number; total: number; error?: string }> {
  try {
    
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - daysBack);

    // Get recent transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', dateLimit.toISOString())
      .order('created_at', { ascending: false });

    if (txError) {
      throw txError;
    }

    if (!transactions || transactions.length === 0) {
      return { synced: 0, total: 0 };
    }


    // Get existing notifications to avoid duplicates
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('metadata')
      .eq('user_id', userId);

    const existingTxRefs = new Set(
      (existingNotifications || [])
        .map(n => n.metadata?.transaction_reference)
        .filter(Boolean)
    );


    let syncedCount = 0;

    // Create notifications for transactions that don't have them
    for (const transaction of transactions) {
      const txRef = transaction.transaction_reference || transaction.reference;
      
      if (!txRef) {
        continue;
      }

      if (!existingTxRefs.has(txRef)) {
        const result = await createNotificationFromTransaction(transaction);
        if (result.data) {
          syncedCount++;
        } else {
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return { synced: syncedCount, total: transactions.length };
  } catch (error: any) {
    return { synced: 0, total: 0, error: error.message };
  }
}

/**
 * Delete all sample/mock notifications for a user
 */
export async function deleteSampleNotifications(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    
    // Delete notifications that have the 'sample' flag in metadata
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('metadata->>sample', 'true');

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete all notifications for a user (use with caution)
 */
export async function deleteAllNotifications(userId: string): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .select();

    if (error) {
      throw error;
    }

    const deletedCount = data?.length || 0;
    return { success: true, deleted: deletedCount };
  } catch (error: any) {
    return { success: false, deleted: 0, error: error.message };
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      return 0;
    }

    return count || 0;
  } catch (error: any) {
    return 0;
  }
}
