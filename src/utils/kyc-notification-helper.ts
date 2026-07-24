/**
 * KYC Notification Helper
 * 
 * This utility helps add KYC approval/rejection notifications
 * to the user's notification feed.
 */

import { supabase } from '@/lib/supabase';

interface KYCNotificationData {
  userId: string;
  status: 'approved' | 'rejected';
  tier: number;
  rejectionReason?: string;
}

/**
 * Creates a notification for KYC status update
 * This should be called from the approval/rejection functions
 */
export async function createKYCNotification(data: KYCNotificationData) {
  const { userId, status, tier, rejectionReason } = data;

  const tierNames = ['Guest', 'Basic', 'Plus', 'Pro', 'Business'];
  const tierName = tierNames[tier] || `Tier ${tier}`;

  let notificationData;

  if (status === 'approved') {
    notificationData = {
      user_id: userId,
      type: 'compliance',
      title: '🎉 KYC Verification Approved!',
      message: `Your account has been upgraded to ${tierName}. You now have access to enhanced features and higher transaction limits.`,
      metadata: {
        kyc_status: 'approved',
        new_tier: tier,
        tier_name: tierName
      },
      read: false,
      created_at: new Date().toISOString()
    };
  } else {
    notificationData = {
      user_id: userId,
      type: 'compliance',
      title: '❌ KYC Verification Needs Attention',
      message: rejectionReason || 'Your verification documents need to be resubmitted. Please check the requirements and try again.',
      metadata: {
        kyc_status: 'rejected',
        rejection_reason: rejectionReason,
        tier: tier
      },
      read: false,
      created_at: new Date().toISOString()
    };
  }

  // Insert notification into transactions or notifications table
  // Adjust table name based on your schema
  try {
    const { error } = await supabase
      .from('transactions') // or 'notifications' if you have a separate table
      .insert(notificationData);

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

/**
 * Fetches KYC verification status for a user
 */
export async function getUserKYCStatus(userId: string) {
  try {
    const { data, error } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err };
  }
}

/**
 * Checks if user has any pending KYC verifications
 */
export async function hasPendingKYC(userId: string) {
  try {
    const { data, error } = await supabase
      .from('kyc_verifications')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (error) throw error;

    return { success: true, hasPending: (data?.length || 0) > 0 };
  } catch (err) {
    return { success: false, hasPending: false };
  }
}
