import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Loader2, RefreshCw, TrendingUp, Users, Wallet, Settings, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON };
  if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
  return h;
}

async function savingsAdminApi(action: string, payload = {}) {
  const headers = await getHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/savings`, {
    method: 'POST', headers, body: JSON.stringify({ action, ...payload }),
  });
  const d = await res.json();
  if (!d.success && d.error) throw new Error(d.error);
  return d;
}

function fmt(n: number) {
  return '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PRODUCT_COLORS: Record<string, string> = {
  flexible: 'bg-blue-100 text-blue-700 border-blue-200',
  auto:     'bg-purple-100 text-purple-700 border-purple-200',
  fixed:    'bg-amber-100 text-amber-700 border-amber-200',
  goal:     'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  closed:    'bg-gray-100 text-gray-500 border-gray-200',
};

// ── Settings Editor ───────────────────────────────────────────────────────────
function SettingsEditor({ settings, onSaved }: { settings: any[]; onSaved: () => void }) {
  const [editing, setEditing] = useState<Record<string, any>>({});
  const [saving, setSaving]   = useState<string | null>(null);

  const edit = (type: string, field: string, val: any) => {
    setEditing(prev => ({
      ...prev,
      [type]: { ...(prev[type] || {}), [field]: val },
    }));
  };

  const save = async (type: string) => {
    const cfg = editing[type];
    if (!cfg) return;
    setSaving(type);
    try {
      await savingsAdminApi('admin_update_settings', { product_type: type, settings: cfg });
      toast.success(`${type} settings saved`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {settings.map(s => {
        const e = editing[s.product_type] || {};
        return (
          <div key={s.product_type} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs font-bold border ${PRODUCT_COLORS[s.product_type]}`}>
                  {s.product_type.toUpperCase()}
                </Badge>
                <span className={`text-xs font-medium ${s.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                  {s.is_active ? '● Active' : '● Inactive'}
                </span>
              </div>
              <Button size="sm" onClick={() => save(s.product_type)} disabled={saving === s.product_type || !editing[s.product_type]}
                className="h-7 px-3 text-xs bg-blue-600">
                {saving === s.product_type ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-gray-500">Interest Rate (% p.a.)</Label>
                  <Input type="number" step="0.01"
                    defaultValue={s.interest_rate}
                    onChange={e => edit(s.product_type, 'interest_rate', parseFloat(e.target.value))}
                    className="h-9 mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500">Min Deposit (₦)</Label>
                  <Input type="number"
                    defaultValue={s.min_deposit}
                    onChange={e => edit(s.product_type, 'min_deposit', parseFloat(e.target.value))}
                    className="h-9 mt-1 text-sm" />
                </div>
                {(s.product_type === 'fixed') && (
                  <>
                    <div>
                      <Label className="text-[10px] text-gray-500">Min Lock Days</Label>
                      <Input type="number"
                        defaultValue={s.min_lock_days}
                        onChange={e => edit(s.product_type, 'min_lock_days', parseInt(e.target.value))}
                        className="h-9 mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Max Lock Days</Label>
                      <Input type="number"
                        defaultValue={s.max_lock_days}
                        onChange={e => edit(s.product_type, 'max_lock_days', parseInt(e.target.value))}
                        className="h-9 mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Early Withdrawal Penalty (%)</Label>
                      <Input type="number" step="0.1"
                        defaultValue={s.early_withdrawal_penalty_rate}
                        onChange={e => edit(s.product_type, 'early_withdrawal_penalty_rate', parseFloat(e.target.value))}
                        className="h-9 mt-1 text-sm" />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input type="checkbox"
                        defaultChecked={s.early_withdrawal_allowed}
                        onChange={e => edit(s.product_type, 'early_withdrawal_allowed', e.target.checked)}
                        className="w-4 h-4 rounded" id={`ewd-${s.product_type}`} />
                      <Label htmlFor={`ewd-${s.product_type}`} className="text-[10px] text-gray-500">Early Withdrawal Allowed</Label>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox"
                  defaultChecked={s.is_active}
                  onChange={e => edit(s.product_type, 'is_active', e.target.checked)}
                  className="w-4 h-4 rounded" id={`active-${s.product_type}`} />
                <Label htmlFor={`active-${s.product_type}`} className="text-[10px] text-gray-500">Product Available to Users</Label>
              </div>
              {s.notes && <p className="text-[10px] text-gray-400 italic">{s.notes}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main AdminSavings ─────────────────────────────────────────────────────────
export default function AdminSavings() {
  const [tab, setTab]               = useState<'overview' | 'accounts' | 'transactions' | 'settings'>('overview');
  const [loading, setLoading]       = useState(false);
  const [accounts, setAccounts]     = useState<any[]>([]);
  const [transactions, setTxns]     = useState<any[]>([]);
  const [settings, setSettings]     = useState<any[]>([]);
  const [summary, setSummary]       = useState<any>({});
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchEmail, setSearchEmail]   = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [acctRes, settingsRes, txRes] = await Promise.all([
        savingsAdminApi('admin_get_all', { limit: 200 }),
        savingsAdminApi('get_settings'),
        savingsAdminApi('admin_get_transactions', { limit: 100 }),
      ]);
      setAccounts(acctRes.accounts || []);
      setSummary(acctRes.summary || {});
      setSettings(settingsRes.settings || []);
      setTxns(txRes.transactions || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const runInterest = async () => {
    setLoading(true);
    try {
      const res = await savingsAdminApi('credit_interest');
      toast.success(`Interest credited to ${res.accounts_credited} accounts`);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const runAutoDebits = async () => {
    setLoading(true);
    try {
      const res = await savingsAdminApi('process_auto_debits');
      toast.success(`Auto debits: ${res.processed} processed, ${res.failed} failed`);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filteredAccounts = accounts.filter(a => {
    if (filterType   && a.product_type !== filterType)   return false;
    if (filterStatus && a.status        !== filterStatus) return false;
    if (searchEmail) {
      const email = a.profiles?.email || '';
      if (!email.toLowerCase().includes(searchEmail.toLowerCase())) return false;
    }
    return true;
  });

  const txnTypeColors: Record<string, string> = {
    deposit: 'bg-emerald-100 text-emerald-700',
    withdrawal: 'bg-rose-100 text-rose-700',
    interest_credit: 'bg-blue-100 text-blue-700',
    auto_debit: 'bg-purple-100 text-purple-700',
    auto_debit_failed: 'bg-red-100 text-red-700',
    penalty: 'bg-orange-100 text-orange-700',
    closure: 'bg-gray-100 text-gray-700',
    goal_completion: 'bg-emerald-100 text-emerald-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Savings Administration</h2>
          <p className="text-sm text-slate-500 mt-0.5">Monitor all savings plans, transactions, and configure products.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={runInterest} disabled={loading} variant="outline" size="sm" className="gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Credit Interest
          </Button>
          <Button onClick={runAutoDebits} disabled={loading} variant="outline" size="sm" className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5 text-purple-600" /> Run Auto Debits
          </Button>
          <Button onClick={load} disabled={loading} variant="outline" size="sm" className="gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Saved', value: fmt(summary.totalBalance || 0), icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Interest Earned', value: fmt(summary.totalInterest || 0), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Deposited', value: fmt(summary.totalDeposited || 0), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Active Plans', value: (summary.activePlans || 0).toString(), icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(tile => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className={`${tile.bg} rounded-2xl p-4 border border-opacity-50`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${tile.color}`} />
                <p className="text-xs font-semibold text-gray-500">{tile.label}</p>
              </div>
              <p className={`text-xl font-black ${tile.color}`}>{tile.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['overview','accounts','transactions','settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-700">Products Breakdown</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {['flexible','auto','fixed','goal'].map(pt => {
              const count = accounts.filter(a => a.product_type === pt).length;
              const total = accounts.filter(a => a.product_type === pt).reduce((s, a) => s + parseFloat(a.balance || 0), 0);
              return (
                <div key={pt} className="bg-white rounded-2xl border p-4 text-center">
                  <Badge className={`text-xs font-bold border mb-2 ${PRODUCT_COLORS[pt]}`}>{pt.toUpperCase()}</Badge>
                  <p className="text-2xl font-black text-gray-900">{count}</p>
                  <p className="text-xs text-gray-400">plans</p>
                  <p className="text-sm font-bold text-gray-700 mt-1">{fmt(total)}</p>
                </div>
              );
            })}
          </div>

          <h3 className="text-sm font-bold text-gray-700 mt-2">Recent Activity</h3>
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="divide-y">
              {transactions.slice(0, 15).map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <Badge className={`text-[9px] font-bold border shrink-0 ${txnTypeColors[tx.transaction_type] || 'bg-gray-100 text-gray-600'}`}>
                    {tx.transaction_type.replace(/_/g,' ').toUpperCase()}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{tx.description || tx.transaction_type}</p>
                    <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleString('en-NG')}</p>
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${['deposit','interest_credit','auto_debit','goal_completion'].includes(tx.transaction_type) ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {fmt(parseFloat(tx.amount))}
                  </p>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No transactions yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNTS TAB */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                placeholder="Search by email..."
                className="w-full h-9 pl-9 pr-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="h-9 px-3 border rounded-lg text-sm">
              <option value="">All Products</option>
              {['flexible','auto','fixed','goal'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="h-9 px-3 border rounded-lg text-sm">
              <option value="">All Status</option>
              {['active','paused','completed','closed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="text-xs text-gray-400 self-center">{filteredAccounts.length} plans</p>
          </div>

          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="divide-y">
              {filteredAccounts.map(acct => (
                <div key={acct.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === acct.id ? null : acct.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[9px] font-bold border ${PRODUCT_COLORS[acct.product_type]}`}>{acct.product_type.toUpperCase()}</Badge>
                        <span className="text-sm font-semibold text-gray-900 truncate">{acct.name}</span>
                        <Badge className={`text-[9px] font-bold border ${STATUS_COLORS[acct.status]}`}>{acct.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {acct.profiles?.email || acct.user_id?.slice(0,8)} ·
                        {acct.currency} · {acct.interest_rate}% p.a. ·
                        Created {new Date(acct.created_at).toLocaleDateString('en-NG')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{fmt(parseFloat(acct.balance))}</p>
                      {parseFloat(acct.total_interest_earned) > 0 && (
                        <p className="text-xs text-emerald-600">+{fmt(parseFloat(acct.total_interest_earned))} interest</p>
                      )}
                    </div>
                    {expandedId === acct.id ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {expandedId === acct.id && (
                    <div className="px-4 pb-4 bg-gray-50 border-t text-xs space-y-1 text-gray-600">
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {[
                          ['Plan ID', acct.id?.slice(0,12) + '…'],
                          ['User ID', acct.user_id?.slice(0,12) + '…'],
                          ['Total Deposited', fmt(parseFloat(acct.total_deposited || 0))],
                          ['Start Date', acct.start_date || '—'],
                          ['Maturity Date', acct.maturity_date || '—'],
                          ['Next Debit', acct.next_debit_date || '—'],
                          ['Frequency', acct.frequency || '—'],
                          ['Contribution', acct.contribution_amount ? fmt(parseFloat(acct.contribution_amount)) : '—'],
                          ['Target Amount', acct.target_amount ? fmt(parseFloat(acct.target_amount)) : '—'],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <span className="font-semibold text-gray-500">{k}: </span>
                            <span className="font-mono">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredAccounts.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">No savings plans found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {tab === 'transactions' && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">All Savings Transactions</p>
            <p className="text-xs text-gray-400">{transactions.length} records</p>
          </div>
          <div className="divide-y overflow-auto max-h-[600px]">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                <Badge className={`text-[9px] font-bold border shrink-0 mt-0.5 ${txnTypeColors[tx.transaction_type] || 'bg-gray-100 text-gray-600'}`}>
                  {tx.transaction_type.replace(/_/g,' ').toUpperCase()}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{tx.description || tx.transaction_type}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{tx.user_id?.slice(0,8)} · {new Date(tx.created_at).toLocaleString('en-NG')}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{tx.savings_account_id?.slice(0,12)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${['deposit','interest_credit','auto_debit','goal_completion'].includes(tx.transaction_type) ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {fmt(parseFloat(tx.amount))}
                  </p>
                  <p className="text-[10px] text-gray-400">Bal: {fmt(parseFloat(tx.balance_after))}</p>
                  <Badge className={`text-[9px] border mt-0.5 ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">No transactions yet</div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <Settings className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-800">No Hardcoded Rules</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  All savings product rules are configurable here. Changes take effect immediately for new savings plans.
                  Interest rates, lock durations, withdrawal penalties, and product availability are all controlled below.
                </p>
              </div>
            </div>
          </div>
          {settings.length > 0
            ? <SettingsEditor settings={settings} onSaved={load} />
            : <div className="text-center py-8 text-gray-400">Loading settings…</div>}
        </div>
      )}
    </div>
  );
}
