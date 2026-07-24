import { useState, useEffect } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Plus, Target, Repeat, Lock, TrendingUp, Wallet,
  ArrowUpRight, ArrowDownLeft, RefreshCw, ChevronRight,
  Loader2, Check, AlertCircle, Calendar, Pause, Play, X,
  PiggyBank, Zap,
} from 'lucide-react';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

interface SavingsModuleProps { onBack: () => void; }

type Screen = 'dashboard' | 'create' | 'detail' | 'deposit' | 'withdraw';

const PRODUCT_META: Record<string, { label: string; desc: string; icon: any; color: string; bg: string; accent: string }> = {
  flexible: { label: 'Flexible Savings', desc: 'Deposit and withdraw anytime', icon: Wallet,    color: 'text-blue-600',   bg: 'bg-blue-600',   accent: 'bg-blue-50 border-blue-100' },
  auto:     { label: 'Auto Savings',     desc: 'Automatic recurring deposits',  icon: Repeat,   color: 'text-purple-600', bg: 'bg-purple-600', accent: 'bg-purple-50 border-purple-100' },
  fixed:    { label: 'Fixed Savings',    desc: 'Locked for higher returns',      icon: Lock,     color: 'text-amber-600',  bg: 'bg-amber-600',  accent: 'bg-amber-50 border-amber-100' },
  goal:     { label: 'Goal Savings',     desc: 'Save towards a target',          icon: Target,   color: 'text-emerald-600',bg: 'bg-emerald-600',accent: 'bg-emerald-50 border-emerald-100' },
};

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON };
  if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
  return h;
}

async function savingsApi(action: string, payload: Record<string, any> = {}) {
  const headers = await getHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/savings`, {
    method: 'POST', headers, body: JSON.stringify({ action, ...payload }),
  });
  const d = await res.json();
  if (!d.success && d.error) throw new Error(d.error);
  return d;
}

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysLeft(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

function progressPct(balance: number, target: number | null) {
  if (!target || target <= 0) return 0;
  return Math.min(100, (balance / target) * 100);
}

export default function SavingsModule({ onBack }: SavingsModuleProps) {
  const { walletBalances } = useWallet();
  const [screen, setScreen]           = useState<Screen>('dashboard');
  const [userId, setUserId]           = useState('');
  const [accounts, setAccounts]       = useState<any[]>([]);
  const [summary, setSummary]         = useState<any>({});
  const [settings, setSettings]       = useState<any[]>([]);
  const [selectedAccount, setSelected] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [txLoading, setTxLoading]     = useState(false);

  // Create form
  const [createType, setCreateType]   = useState<string | null>(null);
  const [form, setForm]               = useState({
    name: '', initial_deposit: '', target_amount: '',
    contribution_amount: '', frequency: 'monthly', duration_days: '90',
  });

  // Deposit / Withdraw
  const [fundAmt, setFundAmt]         = useState('');
  const [fundType, setFundType]       = useState<'deposit' | 'withdraw'>('deposit');

  const walletNGN = parseFloat(String(walletBalances['NGN'] || 0));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      loadDashboard(user.id);
    });
    loadSettings();
  }, []);

  const loadDashboard = async (uid: string) => {
    setLoading(true);
    try {
      const d = await savingsApi('get_dashboard', { user_id: uid });
      setAccounts(d.accounts || []);
      setSummary(d.summary || {});
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const loadSettings = async () => {
    try {
      const d = await savingsApi('get_settings');
      setSettings(d.settings || []);
    } catch {}
  };

  const openPlan = async (acct: any) => {
    setSelected(acct);
    setScreen('detail');
    setTxLoading(true);
    try {
      const d = await savingsApi('get_transactions', { user_id: userId, savings_account_id: acct.id });
      setTransactions(d.transactions || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setTxLoading(false); }
  };

  const handleCreate = async () => {
    if (!createType) return;
    const s = settings.find(s => s.product_type === createType);

    const required: string[] = ['name'];
    if (createType === 'auto' || createType === 'goal') required.push('contribution_amount');
    if (createType === 'goal') required.push('target_amount');

    for (const f of required) {
      if (!(form as any)[f]) { toast.error(`Please fill in: ${f.replace(/_/g, ' ')}`); return; }
    }

    setLoading(true);
    try {
      await savingsApi('create_plan', {
        user_id: userId,
        product_type: createType,
        name: form.name,
        currency: 'NGN',
        initial_deposit: form.initial_deposit ? parseFloat(form.initial_deposit) : undefined,
        target_amount: form.target_amount ? parseFloat(form.target_amount) : undefined,
        contribution_amount: form.contribution_amount ? parseFloat(form.contribution_amount) : undefined,
        frequency: (createType === 'auto' || createType === 'goal') ? form.frequency : undefined,
        duration_days: createType === 'fixed' ? parseInt(form.duration_days) : undefined,
      });
      toast.success('Savings plan created!');
      setCreateType(null);
      setForm({ name: '', initial_deposit: '', target_amount: '', contribution_amount: '', frequency: 'monthly', duration_days: '90' });
      setScreen('dashboard');
      loadDashboard(userId);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleFund = async () => {
    const amt = parseFloat(fundAmt);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setLoading(true);
    try {
      const res = await savingsApi(fundType, {
        user_id: userId,
        savings_account_id: selectedAccount.id,
        amount: amt,
      });
      toast.success(fundType === 'deposit'
        ? `${fmt(amt)} added to savings`
        : `${fmt(res.withdrawn)} returned to wallet${res.penalty > 0 ? ` (penalty: ${fmt(res.penalty)})` : ''}`);
      setFundAmt('');
      // Refresh plan
      const updated = { ...selectedAccount, balance: res.new_balance ?? selectedAccount.balance };
      setSelected(updated);
      setAccounts(prev => prev.map(a => a.id === selectedAccount.id ? updated : a));
      setScreen('detail');
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleTogglePause = async () => {
    setLoading(true);
    try {
      const res = await savingsApi('toggle_pause', { user_id: userId, savings_account_id: selectedAccount.id });
      toast.success(`Plan ${res.status === 'paused' ? 'paused' : 'resumed'}`);
      const updated = { ...selectedAccount, status: res.status };
      setSelected(updated);
      setAccounts(prev => prev.map(a => a.id === selectedAccount.id ? updated : a));
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleClose = async () => {
    if (!confirm(`Close "${selectedAccount.name}"? The balance will be returned to your NGN wallet.`)) return;
    setLoading(true);
    try {
      const res = await savingsApi('close_plan', { user_id: userId, savings_account_id: selectedAccount.id });
      toast.success(`Plan closed. ${fmt(res.returned_to_wallet)} returned to your wallet.`);
      setScreen('dashboard');
      loadDashboard(userId);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  // ── DEPOSIT / WITHDRAW SCREEN ─────────────────────────────────────────────
  if (screen === 'deposit' || screen === 'withdraw') {
    const isPlan = selectedAccount;
    const meta   = isPlan ? PRODUCT_META[isPlan.product_type] || PRODUCT_META.flexible : PRODUCT_META.flexible;
    const cardBal = parseFloat(String(isPlan?.balance || 0));
    const s       = settings.find(s => s.product_type === isPlan?.product_type);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className={`${meta.bg} px-4 pt-12 pb-6`}>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setScreen('detail')}
              className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-white font-bold text-lg">{fundType === 'deposit' ? 'Add to Savings' : 'Withdraw'}</h1>
              <p className="text-white/60 text-xs">{isPlan?.name}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-2xl p-4 border-2 transition-all ${fundType === 'deposit' ? 'border-white/60 bg-white/20' : 'border-white/10 bg-white/10'}`}>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">NGN Wallet</p>
              <p className="text-2xl font-black text-white">{fmt(walletNGN)}</p>
            </div>
            <div className={`rounded-2xl p-4 border-2 transition-all ${fundType === 'withdraw' ? 'border-white/60 bg-white/20' : 'border-white/10 bg-white/10'}`}>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Savings Balance</p>
              <p className="text-2xl font-black text-white">{fmt(cardBal)}</p>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto p-4 space-y-4">
          <div className="bg-white rounded-2xl border p-1 flex gap-1">
            {(['deposit','withdraw'] as const).map(t => (
              <button key={t} onClick={() => setFundType(t)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                  ${fundType === t ? `${meta.bg} text-white shadow-md` : 'text-gray-500 hover:bg-gray-50'}`}>
                {t === 'deposit' ? <><ArrowUpRight className="w-4 h-4" /> Deposit</> : <><ArrowDownLeft className="w-4 h-4" /> Withdraw</>}
              </button>
            ))}
          </div>

          {fundType === 'withdraw' && isPlan?.product_type === 'fixed' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-700">Early Withdrawal</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {s?.early_withdrawal_allowed
                    ? `${s.early_withdrawal_penalty_rate}% penalty applies. Matures: ${isPlan.maturity_date}`
                    : 'Early withdrawal not allowed. Matures: ' + isPlan.maturity_date}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border p-4">
            <Label className="text-sm font-semibold text-gray-700">Amount (NGN)</Label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
              <Input type="number" value={fundAmt} onChange={e => setFundAmt(e.target.value)}
                placeholder="0.00" className="pl-8 h-14 text-xl font-bold" />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {['1000','5000','10000','50000'].map(a => (
                <button key={a} onClick={() => setFundAmt(a)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${fundAmt === a ? `${meta.accent} text-gray-800` : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                  ₦{parseInt(a).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleFund} disabled={loading || !fundAmt || parseFloat(fundAmt) <= 0}
            className={`w-full h-13 py-3.5 font-bold text-base ${meta.bg}`}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" />
              : `${fundType === 'deposit' ? 'Add' : 'Withdraw'} ₦${fundAmt ? parseFloat(fundAmt).toLocaleString() : '0'}`}
          </Button>
        </div>
      </div>
    );
  }

  // ── PLAN DETAIL SCREEN ────────────────────────────────────────────────────
  if (screen === 'detail' && selectedAccount) {
    const acct = selectedAccount;
    const meta = PRODUCT_META[acct.product_type] || PRODUCT_META.flexible;
    const Icon = meta.icon;
    const bal  = parseFloat(String(acct.balance));
    const pct  = progressPct(bal, acct.target_amount);
    const days = daysLeft(acct.maturity_date || acct.next_debit_date);
    const isFixed = acct.product_type === 'fixed';

    return (
      <div className="min-h-screen pb-24" style={{ background: `linear-gradient(180deg, ${acct.product_type === 'fixed' ? '#92400e' : acct.product_type === 'goal' ? '#065f46' : acct.product_type === 'auto' ? '#4c1d95' : '#1e3a8a'} 0%, #f1f5f9 45%)` }}>
        {/* Nav */}
        <div className="px-4 pt-5 pb-2 flex items-center gap-3">
          <button onClick={() => { setScreen('dashboard'); loadDashboard(userId); }}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-white/80 text-sm font-medium flex-1">{meta.label}</span>
          {(acct.product_type === 'auto' || acct.product_type === 'goal') && (
            <button onClick={handleTogglePause} disabled={loading}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
              {acct.status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Plan card */}
        <div className="px-4 pb-4">
          <div className="bg-white/10 rounded-3xl p-5 backdrop-blur-sm border border-white/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">{meta.label}</p>
                <p className="text-white font-bold text-xl mt-0.5">{acct.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {acct.status !== 'active' && (
                  <Badge className={`text-[9px] font-bold border ${acct.status === 'paused' ? 'bg-yellow-400/20 border-yellow-400/40 text-yellow-300' : acct.status === 'completed' ? 'bg-emerald-400/20 border-emerald-400/40 text-emerald-300' : 'bg-red-400/20 border-red-400/40 text-red-300'}`}>
                    {acct.status.toUpperCase()}
                  </Badge>
                )}
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Balance</p>
            <p className="text-white font-black text-4xl mt-1">{fmt(bal)}</p>

            {/* Progress bar for goals */}
            {acct.product_type === 'goal' && acct.target_amount && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>{pct.toFixed(1)}% of goal</span>
                  <span>Target: {fmt(parseFloat(acct.target_amount))}</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div>
                <p className="text-white/40 text-[9px] uppercase tracking-widest">Interest</p>
                <p className="text-white/80 font-bold text-sm">{acct.interest_rate}% p.a.</p>
              </div>
              <div>
                <p className="text-white/40 text-[9px] uppercase tracking-widest">Earned</p>
                <p className="text-white/80 font-bold text-sm">{fmt(parseFloat(acct.total_interest_earned || 0))}</p>
              </div>
              <div>
                <p className="text-white/40 text-[9px] uppercase tracking-widest">
                  {isFixed ? 'Matures' : acct.next_debit_date ? 'Next Debit' : 'Deposited'}
                </p>
                <p className="text-white/80 font-bold text-sm">
                  {isFixed && acct.maturity_date ? (days !== null && days > 0 ? `${days}d` : 'Matured') :
                   acct.next_debit_date ? (days !== null ? `${days}d` : '—') :
                   fmt(parseFloat(acct.total_deposited || 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="max-w-md mx-auto px-4 space-y-3">
          {acct.status === 'active' && (
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => { setFundType('deposit'); setScreen('deposit'); }}
                className={`${meta.bg} h-12 font-bold gap-2`}>
                <ArrowUpRight className="w-4 h-4" /> Add Money
              </Button>
              <Button onClick={() => { setFundType('withdraw'); setScreen('withdraw'); }}
                variant="outline" className="h-12 font-bold gap-2">
                <ArrowDownLeft className="w-4 h-4" /> Withdraw
              </Button>
            </div>
          )}

          {/* Auto info */}
          {acct.product_type === 'auto' && acct.contribution_amount && (
            <div className={`${meta.accent} border rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <Repeat className="w-4 h-4 text-purple-600" />
                <p className="text-sm font-bold text-purple-800">Auto Debit Schedule</p>
              </div>
              <p className="text-xs text-purple-600">
                {fmt(parseFloat(acct.contribution_amount))} every {acct.frequency}
                {acct.next_debit_date ? ` · Next: ${new Date(acct.next_debit_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}
              </p>
              {acct.status === 'paused' && (
                <p className="text-xs text-amber-600 font-semibold mt-1">⏸ Auto debit paused</p>
              )}
            </div>
          )}

          {/* Transactions */}
          <div className="bg-white rounded-2xl border">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-bold text-gray-900">Transaction History</p>
              <RefreshCw className={`w-4 h-4 text-gray-400 ${txLoading ? 'animate-spin' : ''}`} />
            </div>
            {txLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-1">📊</p>
                <p className="text-sm text-gray-400">No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {transactions.map((tx: any) => {
                  const isCredit = ['deposit','auto_debit','interest_credit','goal_completion'].includes(tx.transaction_type);
                  const typeLabel: Record<string, string> = {
                    deposit: 'Deposit', withdrawal: 'Withdrawal', interest_credit: 'Interest',
                    auto_debit: 'Auto Debit', auto_debit_failed: 'Auto Debit Failed',
                    penalty: 'Penalty', closure: 'Plan Closed', goal_completion: 'Goal Complete!',
                  };
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-50' : tx.transaction_type === 'auto_debit_failed' ? 'bg-red-50' : 'bg-gray-50'}`}>
                        {isCredit ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{typeLabel[tx.transaction_type] || tx.transaction_type}</p>
                        <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-gray-700'}`}>
                          {isCredit ? '+' : '-'}{fmt(parseFloat(tx.amount))}
                        </p>
                        <p className="text-xs text-gray-400">Bal: {fmt(parseFloat(tx.balance_after))}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Close plan */}
          {acct.status === 'active' && (
            <button onClick={handleClose} disabled={loading}
              className="w-full text-red-500 text-sm font-medium py-2 hover:text-red-700 transition-colors">
              Close this savings plan
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── CREATE SCREEN ─────────────────────────────────────────────────────────
  if (screen === 'create') {
    const meta = createType ? PRODUCT_META[createType] : null;
    const s    = createType ? settings.find(s => s.product_type === createType) : null;

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => { setCreateType(null); setScreen('dashboard'); }}
            className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold">New Savings Plan</h1>
        </div>

        {!createType ? (
          <div className="max-w-md mx-auto p-4 space-y-3">
            <p className="text-sm text-gray-500 mt-2">Choose a savings type:</p>
            {Object.entries(PRODUCT_META).map(([type, m]) => {
              const Icon = m.icon;
              const s2 = settings.find(s => s.product_type === type);
              return (
                <button key={type} onClick={() => setCreateType(type)}
                  className={`w-full flex items-center gap-4 ${m.accent} border rounded-2xl p-5 text-left hover:shadow-md transition-all active:scale-[0.99]`}>
                  <div className={`w-12 h-12 ${m.bg} rounded-2xl flex items-center justify-center shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-gray-900`}>{m.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                    {s2 && <p className={`text-xs font-bold mt-1 ${m.color}`}>{s2.interest_rate}% annual interest</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="max-w-md mx-auto p-4 space-y-4">
            {/* Back to type selector */}
            <button onClick={() => setCreateType(null)} className="text-sm text-blue-600 font-medium flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Change type
            </button>

            {s && (
              <div className={`${meta!.accent} border rounded-2xl p-4`}>
                <p className={`font-bold ${meta!.color}`}>{meta!.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.interest_rate}% p.a. · Min deposit: {fmt(s.min_deposit)}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl border p-4 space-y-4">
              <div>
                <Label className="text-xs">Plan Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder={createType === 'goal' ? 'e.g. Vacation Fund' : createType === 'fixed' ? 'e.g. 6-Month Fixed' : 'e.g. Emergency Fund'}
                  className="h-11 mt-1" />
              </div>

              <div>
                <Label className="text-xs">Initial Deposit (optional)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                  <Input type="number" value={form.initial_deposit}
                    onChange={e => setForm(f => ({...f, initial_deposit: e.target.value}))}
                    placeholder="0" className="pl-7 h-11" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Your NGN wallet: {fmt(walletNGN)} available</p>
              </div>

              {createType === 'goal' && (
                <div>
                  <Label className="text-xs">Target Amount</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                    <Input type="number" value={form.target_amount}
                      onChange={e => setForm(f => ({...f, target_amount: e.target.value}))}
                      placeholder="1,000,000" className="pl-7 h-11" />
                  </div>
                </div>
              )}

              {(createType === 'auto' || createType === 'goal') && (
                <>
                  <div>
                    <Label className="text-xs">Auto Contribution Amount</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                      <Input type="number" value={form.contribution_amount}
                        onChange={e => setForm(f => ({...f, contribution_amount: e.target.value}))}
                        placeholder="5,000" className="pl-7 h-11" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Frequency</Label>
                    <select value={form.frequency} onChange={e => setForm(f => ({...f, frequency: e.target.value}))}
                      className="w-full h-11 mt-1 px-3 border rounded-lg text-sm">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </>
              )}

              {createType === 'fixed' && (
                <div>
                  <Label className="text-xs">Lock Duration</Label>
                  <select value={form.duration_days} onChange={e => setForm(f => ({...f, duration_days: e.target.value}))}
                    className="w-full h-11 mt-1 px-3 border rounded-lg text-sm">
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                    <option value="180">180 Days (6 Months)</option>
                    <option value="365">365 Days (1 Year)</option>
                  </select>
                  {s && (
                    <p className="text-xs text-gray-500 mt-1">
                      Early withdrawal: {s.early_withdrawal_allowed ? `${s.early_withdrawal_penalty_rate}% penalty` : 'Not allowed'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button onClick={handleCreate} disabled={loading}
              className={`w-full h-12 ${meta!.bg} font-bold text-base`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create {meta!.label}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── DASHBOARD SCREEN ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-4 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack}
            className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-black text-2xl">Savings</h1>
            <p className="text-white/50 text-xs mt-0.5">Grow your money with interest</p>
          </div>
          <button onClick={() => loadDashboard(userId)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Summary tiles */}
        {loading && accounts.length === 0 ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Total Saved</p>
              <p className="text-white font-black text-lg mt-1">{fmt(summary.totalBalance || 0)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Interest Earned</p>
              <p className="text-emerald-300 font-black text-lg mt-1">{fmt(summary.totalInterest || 0)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Active Plans</p>
              <p className="text-white font-black text-lg mt-1">{summary.activePlans || 0}</p>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 space-y-4">
        {/* Add new plan button */}
        <button onClick={() => setScreen('create')}
          className="w-full flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-left hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-blue-200">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base">Create Savings Plan</p>
            <p className="text-blue-100 text-xs mt-0.5">Flexible · Auto · Fixed · Goal</p>
          </div>
        </button>

        {/* Plans list */}
        {accounts.length === 0 && !loading ? (
          <div className="text-center py-12 bg-white rounded-2xl border">
            <PiggyBank className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">No savings plans yet</p>
            <p className="text-sm text-gray-400 mt-1">Start your first plan to begin growing your money</p>
          </div>
        ) : (
          accounts.map(acct => {
            const meta = PRODUCT_META[acct.product_type] || PRODUCT_META.flexible;
            const Icon = meta.icon;
            const bal  = parseFloat(String(acct.balance));
            const pct  = progressPct(bal, acct.target_amount);

            return (
              <button key={acct.id} onClick={() => openPlan(acct)}
                className={`w-full text-left ${meta.accent} border rounded-2xl p-5 hover:shadow-md transition-all active:scale-[0.99]`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 ${meta.bg} rounded-2xl flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 truncate">{acct.name}</p>
                      {acct.status !== 'active' && (
                        <Badge className="text-[9px] py-0 px-1.5 bg-amber-100 text-amber-700 border-amber-200">
                          {acct.status}
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs font-semibold ${meta.color} mt-0.5`}>{meta.label} · {acct.interest_rate}% p.a.</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-gray-900 text-base">{fmt(bal)}</p>
                    {acct.total_interest_earned > 0 && (
                      <p className="text-xs text-emerald-600 font-semibold">+{fmt(parseFloat(acct.total_interest_earned))}</p>
                    )}
                  </div>
                </div>

                {/* Goal progress */}
                {acct.product_type === 'goal' && acct.target_amount && (
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                      <span>{pct.toFixed(0)}% saved</span>
                      <span>Goal: {fmt(parseFloat(acct.target_amount))}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {/* Fixed maturity */}
                {acct.product_type === 'fixed' && acct.maturity_date && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Matures {new Date(acct.maturity_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}

                {/* Auto next debit */}
                {(acct.product_type === 'auto' || acct.product_type === 'goal') && acct.next_debit_date && acct.status === 'active' && (
                  <div className="flex items-center gap-1.5 text-xs text-purple-600 mt-1">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Next auto debit: {new Date(acct.next_debit_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
