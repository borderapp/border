import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  ArrowLeft, Bell, Shield,
  ArrowUpRight, ArrowDownLeft, CreditCard, Gift, Loader2,
  Database, Trash2, Sparkles, AlertTriangle
} from 'lucide-react';
import ReceiptViewer from './ReceiptViewer';
import ScrollRow from './ScrollRow';
import { toast } from 'sonner';
import { 
  checkNotificationsTableExists, 
  createSampleNotifications,
  syncTransactionsToNotifications,
  deleteSampleNotifications,
  deleteAllNotifications
} from '@/utils/notification-helper';

interface NotificationsProps {
  onBack: () => void;
}

export default function Notifications({ onBack }: NotificationsProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingsamples, setCreatingsamples] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'incoming' | 'outgoing' | 'system'>('all');
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [receiptNotif, setReceiptNotif] = useState<any | null>(null);

  useEffect(() => {
    checkTableAndFetchNotifications();

    // Real-time subscription for new notifications
    const subscription = supabase
      .channel('user-notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications' }, 
        (payload) => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkTableAndFetchNotifications = async () => {
    try {
      // First check if table exists
      const tableCheck = await checkNotificationsTableExists();
      setTableExists(tableCheck.exists);
      
      if (tableCheck.exists) {
        await fetchNotifications();
      } else {
        setError('Notifications table not found. Please run database migration 020.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setError(null);
      
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw new Error('Authentication error: ' + authError.message);
      }
      
      if (!user) {
        throw new Error('Please sign in to view notifications');
      }


      const { data, error: queryError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (queryError) {
        throw queryError;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error: any) {
      setError(error.message || 'Failed to load notifications');
      
      // Only show toast if it's not a table missing error (we'll handle that with UI)
      if (!error.message?.includes('relation') && error.code !== '42P01') {
        toast.error('Failed to load notifications', {
          description: error.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSamples = async () => {
    setCreatingsamples(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        return;
      }

      const results = await createSampleNotifications(user.id);
      const successCount = results.filter(r => r.data).length;
      
      if (successCount > 0) {
        toast.success(`Created ${successCount} sample notifications!`);
        await fetchNotifications();
      } else {
        toast.error('Failed to create sample notifications');
      }
    } catch (error: any) {
      toast.error('Failed to create samples', {
        description: error.message
      });
    } finally {
      setCreatingsamples(false);
    }
  };

  const handleSyncTransactions = async () => {
    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        return;
      }

      const result = await syncTransactionsToNotifications(user.id);
      
      if (result.error) {
        toast.error('Sync failed', { description: result.error });
      } else if (result.synced > 0) {
        toast.success(`Synced ${result.synced} transaction${result.synced > 1 ? 's' : ''} to notifications!`);
        await fetchNotifications();
      } else if (result.total === 0) {
        toast.info('No transactions found to sync');
      } else {
        toast.info('All transactions already have notifications');
      }
    } catch (error: any) {
      toast.error('Failed to sync transactions', {
        description: error.message
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClearSamples = async () => {
    setClearing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        return;
      }

      const result = await deleteSampleNotifications(user.id);
      
      if (result.success) {
        toast.success('Sample notifications cleared!');
        await fetchNotifications();
      } else {
        toast.error('Failed to clear samples', { description: result.error });
      }
    } catch (error: any) {
      toast.error('Failed to clear samples', {
        description: error.message
      });
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('⚠️ Are you sure you want to delete ALL notifications? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        return;
      }

      const result = await deleteAllNotifications(user.id);
      
      if (result.success) {
        toast.success(`Deleted ${result.deleted} notifications`);
        await fetchNotifications();
      } else {
        toast.error('Failed to delete notifications', { description: result.error });
      }
    } catch (error: any) {
      toast.error('Failed to delete notifications', {
        description: error.message
      });
    } finally {
      setDeleting(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'compliance':
      case 'kyc_upgrade':
      case 'profile_upgrade':
        return <Shield className="w-5 h-5 text-purple-600" />;
      case 'transaction':
        return <ArrowUpRight className="w-5 h-5 text-blue-600" />;
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />;
      case 'card':
        return <CreditCard className="w-5 h-5 text-slate-600" />;
      case 'reward':
      case 'promotion':
        return <Gift className="w-5 h-5 text-amber-600" />;
      case 'security':
        return <Shield className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'compliance':
      case 'kyc_upgrade':
      case 'profile_upgrade':
        return 'bg-purple-50';
      case 'transaction':
        return 'bg-blue-50';
      case 'deposit':
        return 'bg-green-50';
      case 'card':
        return 'bg-slate-50';
      case 'reward':
      case 'promotion':
        return 'bg-amber-50';
      case 'security':
        return 'bg-red-50';
      default:
        return 'bg-slate-50';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter notifications based on active filter
  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'incoming') {
      return ['deposit', 'reward', 'promotion'].includes(notification.type);
    }
    if (activeFilter === 'outgoing') {
      return ['transaction'].includes(notification.type);
    }
    if (activeFilter === 'system') {
      return ['compliance', 'security', 'card', 'system', 'kyc_upgrade', 'profile_upgrade'].includes(notification.type);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24" style={{width:'100%',overflowX:'hidden',position:'relative'}}>

      {/* Sticky header — ALL inline styles, immune to CSS cascade */}
      <div style={{
        position:'sticky', top:0, zIndex:20,
        width:'100%', overflowX:'hidden',
        background:'linear-gradient(135deg, #2563eb, #7c3aed)',
      }}>
        {/* Back + badge */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'56px 16px 8px'}}>
          <button
            onClick={onBack}
            style={{width:40,height:40,flexShrink:0,borderRadius:'50%',background:'rgba(255,255,255,0.2)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',cursor:'pointer'}}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {unreadCount > 0 && (
            <span style={{background:'#fff',color:'#7c3aed',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:999,flexShrink:0}}>
              {unreadCount} New
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{padding:'0 16px 12px'}}>
          <h1 style={{color:'#fff',fontSize:20,fontWeight:700,margin:0}}>Notifications</h1>
          <p style={{color:'rgba(255,255,255,0.7)',fontSize:12,margin:'2px 0 0'}}>Stay updated with your account activity</p>
        </div>

        {/* Filter chips — outer clips, inner scrolls, 100% inline */}
        <div style={{width:'100%',overflowX:'hidden',padding:'0 16px 12px',boxSizing:'border-box'}}>
          <div style={{display:'flex',gap:8,overflowX:'auto',overflowY:'visible',scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
            {[
              { key: 'all',      label: 'All',      Icon: Bell },
              { key: 'incoming', label: 'Incoming', Icon: ArrowDownLeft },
              { key: 'outgoing', label: 'Outgoing', Icon: ArrowUpRight },
              { key: 'system',   label: 'System',   Icon: Shield },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key as any)}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  background: activeFilter === key ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: activeFilter === key ? '#2563eb' : '#fff',
                  boxShadow: activeFilter === key ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <Icon style={{width:12,height:12,flexShrink:0}} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div style={{width:'100%',overflowX:'hidden',padding:'16px 16px 0',boxSizing:'border-box'}}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="w-10 h-10 text-slate-300" />
              </div>
              <p className="font-bold text-slate-900 mb-2">
                {notifications.length === 0 ? 'No notifications yet' : `No ${activeFilter} notifications`}
              </p>
              <p className="text-sm text-slate-500 mb-6">
                {notifications.length === 0 
                  ? "We'll notify you when something important happens"
                  : `Try selecting a different filter to see more notifications`
                }
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  onClick={handleSyncTransactions}
                  variant="default"
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Sync from Transactions
                </Button>
                <Button
                  onClick={handleCreateSamples}
                  variant="outline"
                  disabled={creatingsamples}
                >
                  {creatingsamples ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4 mr-2" />
                  )}
                  Create Samples
                </Button>
                {false && (
                  <Button variant="outline" disabled>
                    Clear Mock Data
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Action buttons above notifications */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <Button
                onClick={handleSyncTransactions}
                variant="outline"
                size="sm"
                disabled={syncing}
                className="flex-1 min-w-[140px]"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Sync Transactions
              </Button>
            </div>
            
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`border-0 shadow-sm rounded-2xl cursor-pointer transition-all ${
                    notification.read ? 'bg-white' : 'bg-blue-50/50 shadow-md'
                  } hover:shadow-lg`}
                  onClick={() => {
                    if (!notification.read) markAsRead(notification.id);
                    // Open receipt for any transaction-type notification
                    const ref = notification.metadata?.reference
                      || notification.metadata?.transaction_reference
                      || notification.metadata?.tx_reference;
                    if (ref || notification.type === 'transaction' || notification.type === 'deposit') {
                      setReceiptNotif(notification);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 shrink-0 ${getNotificationBgColor(notification.type)} rounded-xl flex items-center justify-center`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 text-sm truncate">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-slate-400 font-medium">
                            {formatTime(notification.created_at)}
                          </p>
                          {notification.type && (
                            <Badge variant="outline" className="text-[10px] font-bold uppercase border-slate-200 shrink-0">
                              {notification.type.replace('_', ' ')}
                            </Badge>
                          )}
                          {notification.metadata?.transaction_reference && (
                            <Badge variant="outline" className="text-[10px] font-mono border-green-200 text-green-700 shrink-0">
                              Ref: {notification.metadata.transaction_reference.slice(-8)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Receipt overlay — uses notification metadata as fallback if no DB record */}
      {receiptNotif && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <ReceiptViewer
            txId={receiptNotif.metadata?.reference || receiptNotif.metadata?.transaction_reference}
            notification={receiptNotif}
            onClose={() => setReceiptNotif(null)}
          />
        </div>
      )}
    </div>
  );
}