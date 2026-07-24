import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ReceiptViewer from './ReceiptViewer';
import ScrollRow from './ScrollRow';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  ArrowLeft, Search, ArrowDownLeft, ArrowUpRight,
  Bell, ShieldCheck, CreditCard, Loader2, RefreshCw,
} from 'lucide-react';

interface TransactionHistoryProps {
  onBack: () => void;
}

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'received', label: 'Received' },
  { key: 'sent',     label: 'Sent' },
  { key: 'bills',    label: 'Bills' },
  { key: 'failed',   label: 'Failed' },
];

function getIconStyle(n: any) {
  const t = ((n.type || '') + (n.title || '')).toLowerCase();
  if (t.includes('fail') || t.includes('❌'))
    return { Icon: ArrowUpRight, bg: 'bg-red-50',    color: 'text-red-500' };
  if (t.includes('received') || t.includes('deposit') || t.includes('✅') && t.includes('fund'))
    return { Icon: ArrowDownLeft, bg: 'bg-emerald-50', color: 'text-emerald-600' };
  if (t.includes('sent') || t.includes('transfer') || t.includes('payment') || t.includes('bill') || t.includes('airtime') || t.includes('data') || t.includes('electricity') || t.includes('cable'))
    return { Icon: ArrowUpRight, bg: 'bg-rose-50',   color: 'text-rose-500' };
  if (t.includes('security') || t.includes('kyc') || t.includes('compliance'))
    return { Icon: ShieldCheck,  bg: 'bg-blue-50',   color: 'text-blue-600' };
  if (t.includes('card'))
    return { Icon: CreditCard,   bg: 'bg-purple-50', color: 'text-purple-600' };
  return   { Icon: Bell,          bg: 'bg-gray-50',   color: 'text-gray-500' };
}

function matchesFilter(n: any, filter: string): boolean {
  if (filter === 'all') return true;
  const t = ((n.type || '') + (n.title || '') + (n.message || '')).toLowerCase();
  if (filter === 'received') return t.includes('received') || t.includes('deposit') || t.includes('fund') || n.type === 'deposit';
  if (filter === 'sent')     return t.includes('sent') || t.includes('transfer') || t.includes('withdraw');
  if (filter === 'bills')    return t.includes('airtime') || t.includes('data') || t.includes('electricity') || t.includes('cable') || t.includes('education') || t.includes('bill');
  if (filter === 'failed')   return t.includes('fail') || t.includes('❌') || n.metadata?.status === 'failed';
  return true;
}

function formatTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: diff > 86400 * 365 ? 'numeric' : undefined });
}

function getAmount(n: any): { symbol: string; value: string; isCredit: boolean } | null {
  const m = n.metadata || {};
  const amount = m.amount;
  if (!amount) return null;
  const currency = m.currency || 'NGN';
  const symbols: Record<string, string> = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'C$' };
  const sym = symbols[currency] || currency;
  const t = ((n.type || '') + (n.title || '')).toLowerCase();
  const isCredit = t.includes('received') || t.includes('deposit') || n.type === 'deposit';
  return { symbol: sym, value: Number(amount).toLocaleString(), isCredit };
}

export default function TransactionHistory({ onBack }: TransactionHistoryProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');
  const [search, setSearch]               = useState('');
  const [receiptNotif, setReceiptNotif]   = useState<any | null>(null);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    let sub: any;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      sub = supabase
        .channel('tx-history-notifs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${session.user.id}` }, () => load())
        .subscribe();
    });
    return () => { sub?.unsubscribe(); };
  }, []);

  const visible = notifications.filter(n => {
    if (!matchesFilter(n, filter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (n.title || '').toLowerCase().includes(q) ||
             (n.message || '').toLowerCase().includes(q) ||
             (n.metadata?.reference || '').toLowerCase().includes(q);
    }
    return true;
  });

  const hasRef = (n: any) =>
    !!(n.metadata?.reference || n.metadata?.transaction_reference);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Transaction History</h1>
        <button onClick={() => { setLoading(true); load(); }}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="pl-9 bg-white rounded-xl"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <ScrollRow className="px-4 pb-3">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all
              ${filter === f.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}
          >
            {f.label}
          </button>
        ))}
      </ScrollRow>

      {/* List */}
      <div className="px-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">No transactions found</p>
            {search && <p className="text-sm text-gray-400 mt-1">Try a different search term</p>}
          </div>
        ) : (
          visible.map(n => {
            const { Icon, bg, color } = getIconStyle(n);
            const amt = getAmount(n);
            const clickable = hasRef(n);
            const isFailed = n.metadata?.status === 'failed' || (n.title || '').includes('❌') || (n.title || '').toLowerCase().includes('fail');

            return (
              <button
                key={n.id}
                className={`w-full text-left bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 transition-all
                  ${clickable ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : 'cursor-default'}
                  ${isFailed ? 'border-red-100' : 'border-gray-100'}`}
                onClick={clickable ? () => setReceiptNotif(n) : undefined}
                disabled={!clickable}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{n.message}</p>
                </div>

                <div className="text-right shrink-0 ml-2 space-y-1">
                  {amt && (
                    <p className={`text-sm font-bold ${amt.isCredit ? 'text-emerald-600' : isFailed ? 'text-red-500' : 'text-gray-800'}`}>
                      {amt.isCredit ? '+' : '-'}{amt.symbol}{amt.value}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">{formatTime(n.created_at)}</p>
                  {isFailed && (
                    <Badge className="text-[9px] bg-red-50 text-red-600 border-red-200 px-1.5 py-0">Failed</Badge>
                  )}
                  {!n.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Receipt overlay */}
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
