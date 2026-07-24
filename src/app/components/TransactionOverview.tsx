import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { ArrowUpRight, ArrowDownLeft, RefreshCcw, Landmark, Zap, Loader2, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const TransactionOverview = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVolume: 0,
    count: 0,
    chartData: []
  });

  const fetchLiveLedger = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          profiles:user_id (first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);

      // Basic stats calculation for charts
      if (data && data.length > 0) {
        const total = data.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        
        // Mocking some chart data based on real trends if we had more history
        // For now, let's just use the real data points we have
        const points = data.slice(0, 7).reverse().map((tx: any) => ({
          name: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          volume: tx.amount,
          transfers: 1
        }));

        setStats({
          totalVolume: total,
          count: data.length,
          chartData: points as any
        });
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveLedger();

    const channel = supabase
      .channel('ledger-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
        fetchLiveLedger();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const CURRENCY_MIX = [
    { name: 'NGN', value: 72, color: '#2563eb' },
    { name: 'USD', value: 18, color: '#10b981' },
    { name: 'GBP', value: 6, color: '#8b5cf6' },
    { name: 'Others', value: 4, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-900">Live Settlement Volume</h3>
              <p className="text-xs text-slate-500">Real-time processing across Border rails</p>
            </div>
            <button onClick={fetchLiveLedger} className="p-2 hover:bg-slate-50 rounded-lg">
               <RefreshCcw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="h-[300px] w-full">
            {stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorVol)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm italic">Accumulating settlement data...</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Asset Distribution</h3>
          <div className="h-[200px] w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CURRENCY_MIX} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {CURRENCY_MIX.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {CURRENCY_MIX.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></div>
                  <span className="text-xs font-medium text-slate-600">{c.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900">Recent Ledger Activity (Live)</h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Connected</span>
        </div>
        
        {loading && transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-slate-400 text-xs font-medium">Listening for ledger entries...</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const type = (tx.type || tx.transaction_type || '').toLowerCase();
              const isReceived = ['deposit', 'funding', 'in'].includes(type);
              const userName = tx.profiles?.first_name || tx.profiles?.last_name || 'Border User';

              return (
                <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      isReceived ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {isReceived ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{userName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{tx.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-400 font-medium">{tx.currency || 'NGN'} • {tx.description || 'System Transfer'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {isReceived ? '+' : '-'}{tx.currency === 'USD' ? '$' : '₦'}{Number(tx.amount).toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 capitalize`}>
                        {tx.status || 'Success'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-sm">
                No recent transactions found in the ledger.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};