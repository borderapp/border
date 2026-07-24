import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { health } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Activity, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  RefreshCw,
  Zap
} from 'lucide-react';

export default function DiagnosticPanel() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [backendTest, setBackendTest] = useState<any>(null);
  const [testingBackend, setTestingBackend] = useState(false);

  const testBackendConnection = async () => {
    setTestingBackend(true);
    try {
      const response = await health.check();
      setBackendTest({ success: true, data: response });
      toast.success('✅ Backend connection successful!');
    } catch (error: any) {
      setBackendTest({ success: false, error: error.message });
      toast.error('❌ Backend connection failed');
    } finally {
      setTestingBackend(false);
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }


      // Check transactions for this user
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (txError) {
      }

      // Also check ALL transactions in database
      const { data: allTransactions, error: allTxError } = await supabase
        .from('transactions')
        .select('user_id, transaction_type, amount, currency, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (allTxError) {
      }
      if (allTransactions && allTransactions.length > 0) {
      }

      // Check notifications
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (notifError) {
      }

      // Check profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
      }

      setResults({
        userId: user.id,
        email: user.email,
        transactionCount: transactions?.length || 0,
        notificationCount: notifications?.length || 0,
        transactions: transactions?.slice(0, 5) || [],
        notifications: notifications?.slice(0, 5) || [],
        profile: profile,
        hasWallets: !!profile?.wallets,
        walletBalances: profile?.wallets || {},
        allTransactionsCount: allTransactions?.length || 0
      });

      toast.success('Diagnostics complete!');
    } catch (error: any) {
      toast.error('Diagnostic failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const syncTransactionsToNotifications = async () => {
    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }


      // First, try to get ALL transactions to see if any exist
      const { data: allTransactions, error: allTxError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (allTxError) {
      }

      // Get transactions for this user
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (txError) {
        toast.error('Error fetching transactions: ' + txError.message);
        return;
      }

      if (!transactions || transactions.length === 0) {
        toast.info('No transactions found for your account');
        return;
      }


      // Get existing notification transaction references
      const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('metadata')
        .eq('user_id', user.id);

      const existingRefs = new Set(
        existingNotifs?.map(n => n.metadata?.transaction_reference).filter(Boolean) || []
      );


      // Create notifications for transactions that don't have them
      const notificationsToCreate = [];
      
      for (const tx of transactions) {
        const ref = tx.transaction_reference || tx.reference;
        if (ref && !existingRefs.has(ref)) {
          let notifType = 'transaction';
          let title = '📝 Transaction';
          let message = tx.description || 'Transaction completed';

          if (tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'FUNDING') {
            notifType = 'deposit';
            title = '💰 Money Received';
            message = `You received ${tx.currency} ${tx.amount}`;
            
            if (tx.metadata?.type === 'p2p_received') {
              const sender = tx.metadata?.sender_name || 'someone';
              message = `You received ${tx.currency} ${tx.amount} from ${sender}`;
            }
          } else if (tx.transaction_type === 'TRANSFER' || tx.transaction_type === 'WITHDRAWAL') {
            notifType = 'transaction';
            title = '✅ Transfer Successful';
            const recipient = tx.recipient_name || 'recipient';
            message = `You sent ${tx.currency} ${tx.amount} to ${recipient}`;
          }

          notificationsToCreate.push({
            user_id: user.id,
            type: notifType,
            title: title,
            message: message,
            metadata: {
              transaction_id: tx.id,
              transaction_reference: ref,
              transaction_type: tx.transaction_type,
              amount: tx.amount,
              currency: tx.currency,
              status: tx.status,
              ...(tx.metadata || {})
            },
            read: false,
            created_at: tx.created_at
          });
        }
      }

      if (notificationsToCreate.length > 0) {
        
        const { error } = await supabase
          .from('notifications')
          .insert(notificationsToCreate);

        if (error) {
          toast.error('Failed to sync: ' + error.message);
        } else {
          toast.success(`Synced ${notificationsToCreate.length} notifications!`);
          // Re-run diagnostics to show updated counts
          await runDiagnostics();
        }
      } else {
        toast.info('All transactions already have notifications');
      }
    } catch (error: any) {
      toast.error('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runDiagnostics} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...</>
              ) : (
                <><Database className="w-4 h-4 mr-2" /> Run Diagnostics</>
              )}
            </Button>
            <Button 
              onClick={syncTransactionsToNotifications} 
              disabled={syncing}
              variant="outline"
              className="flex-1"
            >
              {syncing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Sync Notifications</>
              )}
            </Button>
            <Button 
              onClick={testBackendConnection} 
              disabled={testingBackend}
              variant="outline"
              className="flex-1"
            >
              {testingBackend ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" /> Test Backend</>
              )}
            </Button>
          </div>

          {results && (
            <div className="space-y-3 pt-4 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium">Transactions</p>
                  <p className="text-2xl font-bold text-blue-900">{results.transactionCount}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-700 font-medium">Notifications</p>
                  <p className="text-2xl font-bold text-purple-900">{results.notificationCount}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">User ID</span>
                  <Badge variant="outline" className="font-mono text-xs">{results.userId.slice(0, 8)}...</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-semibold">{results.email}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Has Wallets</span>
                  {results.hasWallets ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  )}
                </div>
              </div>

              {results.transactionCount > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-semibold mb-2">Recent Transactions:</p>
                  <div className="space-y-1">
                    {results.transactions.map((tx: any) => (
                      <div key={tx.id} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{tx.transaction_type}</span>
                          <span className="font-bold">{tx.currency} {tx.amount}</span>
                        </div>
                        <div className="text-gray-500 text-[10px] mt-1">
                          {tx.transaction_reference || 'No ref'} • {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.notificationCount > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-semibold mb-2">Recent Notifications:</p>
                  <div className="space-y-1">
                    {results.notifications.map((notif: any) => (
                      <div key={notif.id} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="font-medium">{notif.title}</div>
                        <div className="text-gray-600 text-[10px] mt-1">{notif.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {backendTest && (
            <div className="space-y-3 pt-4 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-700 font-medium">Backend Connection</p>
                  <p className="text-2xl font-bold text-green-900">{backendTest.success ? 'Success' : 'Failed'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant="outline" className="font-mono text-xs">{backendTest.success ? 'Connected' : 'Disconnected'}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Message</span>
                  <span className="text-sm font-semibold">{backendTest.success ? 'Backend is reachable' : backendTest.error}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}