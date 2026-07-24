import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to manage unread notification count with real-time updates
 */
export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (countError) {
        // If table doesn't exist, silently fail
        if (countError.code === '42P01') {
          setUnreadCount(0);
        } else {
          setError(countError.message);
          setUnreadCount(0);
        }
      } else {
        setUnreadCount(count || 0);
      }
    } catch (error: any) {
      setError(error.message);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('unread-notifications-count')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications'
        }, 
        (payload) => {
          fetchUnreadCount();
        }
      )
      .subscribe((status) => {
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { unreadCount, loading, error, refresh: fetchUnreadCount };
}

/**
 * Hook to manage recent activities/transactions with real-time updates
 */
export function useRecentActivities(limit = 8) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // Fetch transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (txError) {
        throw txError;
      }

      setActivities(transactions || []);
    } catch (err: any) {
      setError(err.message);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time transaction changes
    const subscription = supabase
      .channel('recent-transactions-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'transactions'
        }, 
        (payload) => {
          fetchActivities();
        }
      )
      .subscribe((status) => {
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [limit]);

  return { activities, loading, error, refresh: fetchActivities };
}