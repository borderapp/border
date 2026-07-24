import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { supabase } from '@/lib/supabase';
import { 
  ArrowUpRight, ArrowDownLeft, Filter, Search, Download,
  TrendingUp, TrendingDown, Wallet, CreditCard, RefreshCw, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalVolume: 0,
    successfulTxns: 0,
    pendingTxns: 0,
    failedTxns: 0
  });

  useEffect(() => {
    fetchTransactions();
    
    // Real-time subscription for new transactions
    const subscription = supabase
      .channel('admin-transactions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' }, 
        (payload) => {
          fetchTransactions(true);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTransactions = async (silent = false) => {
    if (!silent) setLoading(true);
    try {

      const { data, error, status, statusText } = await supabase
        .from('transactions')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
      }

      setTransactions(data || []);

      // Calculate stats
      const volume = data?.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount || 0), 0) || 0;
      const successful = data?.filter((tx: any) => tx.status === 'completed').length || 0;
      const pending = data?.filter((tx: any) => tx.status === 'pending').length || 0;
      const failed = data?.filter((tx: any) => tx.status === 'failed').length || 0;

      setStats({
        totalVolume: volume,
        successfulTxns: successful,
        pendingTxns: pending,
        failedTxns: failed
      });

      if (data && data.length > 0) {
        toast.success(`Loaded ${data.length} transactions`);
      }
    } catch (error: any) {
      toast.error('Failed to load transactions', {
        description: error.message || 'Check console for details'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    const matchesSearch =
      tx.transaction_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'send':
      case 'withdrawal':
      case 'transfer_out':
        return <ArrowUpRight className="w-4 h-4 text-rose-600" />;
      case 'receive':
      case 'deposit':
      case 'transfer_in':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'exchange':
      case 'conversion':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default:
        return <Wallet className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6 isolate">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Volume</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${(stats.totalVolume / 1000).toFixed(1)}k
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Successful</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.successfulTxns}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pendingTxns}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Failed</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.failedTxns}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Transaction Monitor</CardTitle>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, description, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No transactions found</p>
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 shrink-0 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          {getTypeIcon(tx.transaction_type)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{tx.description || tx.transaction_type?.replace('_', ' ') || 'Transaction'}</p>
                          <p className="text-xs text-slate-400 truncate">{tx.profiles?.email || 'Unknown user'}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-900 text-sm">{formatCurrency(parseFloat(tx.amount), tx.currency)}</p>
                        <Badge className={`${getStatusColor(tx.status)} border-0 text-xs`}>{tx.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="capitalize">{tx.transaction_type?.replace('_', ' ')}</span>
                      <span>{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Transaction</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">User</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">{getTypeIcon(tx.transaction_type)}</div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{tx.transaction_reference}</p>
                              <p className="text-xs text-slate-500">{tx.description || tx.narration || 'No description'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-slate-900">{tx.profiles?.first_name} {tx.profiles?.last_name}</p>
                          <p className="text-xs text-slate-500">{tx.profiles?.email}</p>
                        </td>
                        <td className="py-4 px-4"><span className="text-sm text-slate-900 capitalize">{tx.transaction_type?.replace('_', ' ')}</span></td>
                        <td className="py-4 px-4 text-right"><p className="font-bold text-slate-900">{formatCurrency(parseFloat(tx.amount), tx.currency)}</p></td>
                        <td className="py-4 px-4"><Badge className={`${getStatusColor(tx.status)} border-0`}>{tx.status}</Badge></td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-slate-900">{new Date(tx.created_at).toLocaleDateString()}</p>
                          <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleTimeString()}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}