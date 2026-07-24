import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, CreditCard, Eye, EyeOff, Lock, Unlock,
  Plus, Copy, Check, Loader2, RefreshCw,
  ArrowUpRight, ArrowDownLeft, Snowflake, Zap,
} from 'lucide-react';

interface CardsManagementProps { onBack: () => void; }

const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
const SUPABASE_ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

type Screen = 'list' | 'info' | 'detail' | 'create' | 'fund' | 'create_ngn' | 'ngn_detail' | 'ngn_pin' | 'ngn_dispute';

export default function CardsManagement({ onBack }: CardsManagementProps) {
  const { walletBalances } = useWallet();
  const [screen, setScreen]           = useState<Screen>('list');
  const [cards, setCards]             = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [cardDetail, setCardDetail]   = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied]           = useState<string | null>(null);
  const [fundAmount, setFundAmount]   = useState('');
  const [fundType, setFundType]       = useState<'fund' | 'withdraw'>('fund');
  const [userId, setUserId]           = useState('');
  const [selectedNgnCard, setSelectedNgnCard] = useState<any>(null);
  const [ngnCardDetail, setNgnCardDetail]     = useState<any>(null);
  const [ngnHistory, setNgnHistory]           = useState<any[]>([]);
  const [ngnDetailLoading, setNgnDetailLoading] = useState(false);
  // NGN form — two steps: customer → card
  const [ngnForm, setNgnForm] = useState({
    firstname: '', lastname: '', email: '', phone: '',
    bvn: '', nin: '', dob: '', name: '',
    line1: '', city: '', state: 'lg',
    provider: 'black', brand: 'Verve',
  });
  const [ngnStep, setNgnStep]         = useState<'customer' | 'card'>('customer');
  const [ngnCustomerId, setNgnCustomerId] = useState('');
  // PIN management
  const [oldPin, setOldPin]           = useState('');
  const [newPin, setNewPin]           = useState('');
  const [confirmPin, setConfirmPin]   = useState('');
  // Dispute
  const [disputeReason, setDisputeReason] = useState('fraudulent');
  const [disputeExplanation, setDisputeExplanation] = useState('');
  const [disputeTxId, setDisputeTxId] = useState('');

  // Create USD card form
  const [form, setForm] = useState({
    first_name: '', last_name: '', dob: '',
    id_type: 'passport', id_number: '',
    email: '', phone: '',
    line1: '', city: '', state: '', postal_code: '',
    country: 'NGA', amount_usd: '5',
  });

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const h: Record<string, string> = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON };
    if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
    return h;
  };

  const api = async (action: string, payload: Record<string, any> = {}) => {
    const headers = await getHeaders();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/strowallet-cards`, {
      method: 'POST', headers, body: JSON.stringify({ action, ...payload }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) throw new Error(d.error || 'Request failed');
    return d;
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const m = user.user_metadata || {};
      const fn = m.first_name || '';
      const ln = m.last_name  || '';
      // Normalise phone to international format (2348...)
      let phone = m.phone || '';
      if (phone) {
        phone = phone.replace(/\s/g, '').replace(/^\+/, '');
        if (phone.startsWith('0')) phone = '234' + phone.slice(1);
      }
      setForm(f => ({
        ...f,
        first_name: fn,
        last_name:  ln,
        email:      user.email || f.email,
        phone:      phone || f.phone,
      }));
      setNgnForm(f => ({
        ...f,
        firstname: fn,
        lastname:  ln,
        email:     user.email || f.email,
        phone:     m.phone    || f.phone,
        name:      `border_${user.id.replace(/-/g,'').substring(0,8)}`,
      }));
      loadCards(user.id);
    });
  }, []);

  const loadCards = async (uid: string) => {
    setLoading(true);
    try {
      const d = await api('get_user_cards', { user_id: uid });
      setCards(d.data || []);
    } catch { } finally { setLoading(false); }
  };

  const openCard = async (card: any) => {
    setSelectedCard(card);
    setScreen('detail');
    setDetailLoading(true);
    setShowDetails(false);
    try {
      const [det, txs] = await Promise.all([
        api('fetch_card', { card_id: card.card_id }),
        api('card_transactions', { card_id: card.card_id }),
      ]);
      setCardDetail(det.data);
      setTransactions(txs.data || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setDetailLoading(false); }
  };

  const handleCreate = async () => {
    const required = ['first_name','last_name','dob','id_number','email','phone','line1','city','state','postal_code'];
    const missing = required.filter(k => !(form as any)[k]);
    if (missing.length) { toast.error(`Please fill: ${missing.join(', ')}`); return; }

    setLoading(true);
    try {
      const created = await api('create_card', {
        ...form,
        country: 'NGA',
        name: `${form.first_name} ${form.last_name}`,
        user_id: userId,
      });

      toast.success('Virtual USD card created!');

      // Immediately fetch full card details from Strowallet and show detail screen
      const cardId = created.data?.card_id;
      if (cardId) {
        try {
          const detail = await api('fetch_card', { card_id: cardId });
          const stub = { card_id: cardId, card_holder_name: `${form.first_name} ${form.last_name}`, card_type: 'usd_nfc', currency: 'USD', card_balance: 0 };
          setSelectedCard(stub);
          setCardDetail(detail.data || detail);
          setTransactions([]);
          setScreen('detail');
        } catch {
          // fallback — go to list and refresh
          setScreen('list');
          loadCards(userId);
        }
      } else {
        setScreen('list');
        loadCards(userId);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleFundWithdraw = async () => {
    const amt = parseFloat(fundAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }

    const card     = selectedCard || selectedNgnCard;
    const currency = card?.currency || (card?.card_type === 'usd_nfc' ? 'USD' : 'NGN');
    const mainBal  = parseFloat(String(walletBalances[currency] || 0));
    const cardBal  = parseFloat(String(card?.card_balance || cardDetail?.balance || 0));

    if (fundType === 'fund' && mainBal < amt) {
      toast.error(`Insufficient ${currency} wallet balance (${currency === 'NGN' ? '₦' : '$'}${mainBal.toLocaleString()} available)`);
      return;
    }
    if (fundType === 'withdraw' && cardBal < amt) {
      toast.error(`Insufficient card balance (${currency === 'NGN' ? '₦' : '$'}${cardBal.toLocaleString()} on card)`);
      return;
    }

    setLoading(true);
    try {
      const action = fundType === 'fund' ? 'fund_card' : 'withdraw_card';
      await api(action, { card_id: card.card_id, amount: String(amt), currency, user_id: userId });
      toast.success(fundType === 'fund'
        ? `${currency} ${amt.toLocaleString()} moved from wallet to card`
        : `${currency} ${amt.toLocaleString()} returned from card to wallet`);
      setFundAmount('');
      if (selectedCard)    { setScreen('detail');     openCard(selectedCard); }
      else if (selectedNgnCard) { setScreen('ngn_detail'); openNgnCard(selectedNgnCard); }
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleToggleFreeze = async () => {
    if (!cardDetail) return;
    const newStatus = cardDetail.card_status === 'active' ? 'frozen' : 'active';
    setLoading(true);
    try {
      await api('set_status', { card_id: selectedCard.card_id, status: newStatus });
      setCardDetail((d: any) => ({ ...d, card_status: newStatus }));
      toast.success(`Card ${newStatus === 'frozen' ? 'frozen' : 'activated'}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const openNgnCard = async (card: any) => {
    setSelectedNgnCard(card);
    setScreen('ngn_detail');
    setNgnDetailLoading(true);
    try {
      const [det, hist] = await Promise.all([
        api('ngn_view_card',    { card_id: card.card_id }),
        api('ngn_card_history', { card_id: card.card_id }),
      ]);
      setNgnCardDetail(det.data);
      setNgnHistory(hist.data || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setNgnDetailLoading(false); }
  };

  const handleCreateNgnCustomer = async () => {
    const required = ['firstname','lastname','email','phone','dob','line1','city','state'];
    const missing = required.filter(k => !(ngnForm as any)[k]);
    if (missing.length) { toast.error(`Please fill: ${missing.join(', ')}`); return; }
    setLoading(true);
    try {
      const payload = {
        ...ngnForm,
        // auto-derive full name if not set
        name: ngnForm.name || `${ngnForm.firstname} ${ngnForm.lastname}`.trim(),
        user_id: userId,
      };
      const d = await api('ngn_create_customer', payload);
      setNgnCustomerId(d.customer_id);
      setNgnStep('card');
      toast.success('Customer profile created');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleCreateNgnCard = async () => {
    if (!ngnCustomerId) { toast.error('Complete customer profile first'); return; }
    setLoading(true);
    try {
      await api('ngn_create_card', {
        customerId: ngnCustomerId,
        brand: ngnForm.brand,
        provider: ngnForm.provider,
        user_id: userId,
        card_holder_name: `${ngnForm.firstname} ${ngnForm.lastname}`,
      });
      toast.success('Naira card created!');
      setScreen('list');
      setNgnStep('customer');
      setNgnCustomerId('');
      loadCards(userId);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleNgnToggleStatus = async () => {
    if (!selectedNgnCard) return;
    const current = ngnCardDetail?.status || selectedNgnCard.status;
    const next = current === 'active' ? 'inactive' : 'active';
    setLoading(true);
    try {
      await api('ngn_set_status', { card_id: selectedNgnCard.card_id, status: next });
      setNgnCardDetail((d: any) => ({ ...d, status: next }));
      toast.success(`Card ${next === 'inactive' ? 'deactivated' : 'activated'}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleNgnResetPin = async () => {
    if (!newPin || newPin.length !== 4) { toast.error('Enter a 4-digit PIN'); return; }
    if (newPin !== confirmPin) { toast.error('PINs do not match'); return; }
    setLoading(true);
    try {
      await api('ngn_reset_pin', {
        card_id: selectedNgnCard.card_id,
        new_pin: newPin,
        provider: selectedNgnCard.provider || 'black',
      });
      toast.success('Card PIN set successfully');
      setOldPin(''); setNewPin(''); setConfirmPin('');
      setScreen('ngn_detail');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleNgnDispute = async () => {
    if (!disputeExplanation || !disputeTxId) { toast.error('Fill all dispute fields'); return; }
    setLoading(true);
    try {
      await api('ngn_create_dispute', {
        reason: disputeReason, explanation: disputeExplanation,
        transactionId: disputeTxId, user_id: userId,
      });
      toast.success('Dispute submitted — our team will review it');
      setDisputeExplanation(''); setDisputeTxId('');
      setScreen('ngn_detail');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success('Copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const maskNumber = (n?: string) =>
    n ? n.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 **** **** $4') : '**** **** **** ****';

  // ── FUND / WITHDRAW ────────────────────────────────────────────────────────
  if (screen === 'fund') {
    const card      = selectedCard || selectedNgnCard;
    const isNgn     = !!selectedNgnCard;
    const currency  = isNgn ? 'NGN' : 'USD';
    const sym       = currency === 'NGN' ? '₦' : '$';
    const mainBal   = parseFloat(String(walletBalances[currency] || 0));
    const cardBal   = parseFloat(String(card?.card_balance || cardDetail?.balance || 0));
    const quickAmts = currency === 'NGN' ? ['500','1000','2000','5000'] : ['5','10','20','50'];
    const cardLabel = isNgn
      ? (selectedNgnCard?.card_name || 'Naira Card')
      : (selectedCard?.card_name || 'USD Card');
    const accentFrom = isNgn ? 'from-emerald-600' : 'from-blue-600';
    const accentTo   = isNgn ? 'to-green-700' : 'to-indigo-700';

    return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${accentFrom} ${accentTo} px-4 pt-12 pb-6`}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setScreen(isNgn ? 'ngn_detail' : 'detail')}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Card Wallet</h1>
            <p className="text-white/60 text-xs">{cardLabel}</p>
          </div>
        </div>

        {/* Two wallet boxes */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-2xl p-4 border-2 transition-all ${fundType === 'fund' ? 'border-white/60 bg-white/20' : 'border-white/10 bg-white/10'}`}>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">
              {currency} Wallet
            </p>
            <p className="text-2xl font-black text-white">{sym}{mainBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-white/50 mt-1">Available to move</p>
          </div>
          <div className={`rounded-2xl p-4 border-2 transition-all ${fundType === 'withdraw' ? 'border-white/60 bg-white/20' : 'border-white/10 bg-white/10'}`}>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">
              Card Balance
            </p>
            <p className="text-2xl font-black text-white">{sym}{cardBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-white/50 mt-1">On this card only</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Direction toggle */}
        <div className="bg-white rounded-2xl border p-1 flex gap-1">
          {(['fund','withdraw'] as const).map(t => (
            <button key={t} onClick={() => setFundType(t)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                ${fundType === t
                  ? `${isNgn ? 'bg-emerald-600' : 'bg-blue-600'} text-white shadow-md`
                  : 'text-gray-500 hover:bg-gray-50'}`}>
              {t === 'fund'
                ? <><ArrowUpRight className="w-4 h-4" /> Wallet → Card</>
                : <><ArrowDownLeft className="w-4 h-4" /> Card → Wallet</>}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 text-center">
          {fundType === 'fund'
            ? `Transfer from your ${currency} wallet into this card's balance`
            : 'Withdraw the card balance back into your main wallet'}
        </p>

        {/* Amount entry */}
        <div className="bg-white rounded-2xl border p-4 space-y-4">
          <Label className="text-sm font-semibold text-gray-700">Amount ({currency})</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">{sym}</span>
            <Input type="number" value={fundAmount} onChange={e => setFundAmount(e.target.value)}
              placeholder="0.00" className="pl-8 h-14 text-xl font-bold" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {quickAmts.map(a => (
              <button key={a} onClick={() => setFundAmount(a)}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${fundAmount === a ? (isNgn ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-blue-50 border-blue-400 text-blue-700') : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                {sym}{a}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {fundAmount && parseFloat(fundAmount) > 0 && (
          <div className="bg-gray-50 rounded-xl border p-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {fundType === 'fund' ? `${currency} Wallet after` : 'Card balance after'}
            </span>
            <span className="font-bold text-gray-900">
              {sym}{(fundType === 'fund'
                ? mainBal - parseFloat(fundAmount)
                : cardBal - parseFloat(fundAmount)
              ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <Button
          onClick={handleFundWithdraw}
          disabled={loading || !fundAmount || parseFloat(fundAmount) <= 0}
          className={`w-full h-13 py-3.5 font-bold text-base ${isNgn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {loading
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : fundType === 'fund'
              ? `Move ${sym}${fundAmount ? parseFloat(fundAmount).toLocaleString() : '0'} to Card`
              : `Withdraw ${sym}${fundAmount ? parseFloat(fundAmount).toLocaleString() : '0'} to Wallet`}
        </Button>
      </div>
    </div>
  );}

  // ── CREATE USD CARD ────────────────────────────────────────────────────────
  // ── USD CARD INFO (fee disclosure) ────────────────────────────────────────
  if (screen === 'info') return (
    <div className="min-h-screen bg-[#050d1f] flex flex-col">
      <div className="px-4 py-5 flex items-center gap-3">
        <button onClick={() => setScreen('list')} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <span className="text-white/60 text-sm font-medium">Virtual USD Card</span>
      </div>

      {/* Preview card */}
      <div className="px-6 mb-8">
        <div className="relative w-full aspect-[1.586/1] max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-blue-950"
          style={{ background: 'linear-gradient(135deg, #0f1f4a 0%, #0d2060 40%, #0a1540 100%)' }}>
          {/* Holographic shimmer circles */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
          <div className="absolute inset-0 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-black text-lg tracking-tight" style={{ fontFamily: 'system-ui' }}>border</p>
                <p className="text-blue-300/60 text-[10px] uppercase tracking-[0.2em] mt-0.5">Virtual Card</p>
              </div>
              <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300/80 to-yellow-500/60 flex items-center justify-center">
                <div className="w-6 h-4 rounded-sm border border-yellow-200/40 grid grid-cols-2 gap-px p-0.5">
                  <div className="bg-yellow-200/30 rounded-[1px]" /><div className="bg-yellow-200/30 rounded-[1px]" />
                  <div className="bg-yellow-200/30 rounded-[1px]" /><div className="bg-yellow-200/30 rounded-[1px]" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-white/90 font-mono text-base tracking-[0.18em] mb-3">5061 •••• •••• 4582</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white/30 text-[9px] uppercase tracking-widest">Card Holder</p>
                  <p className="text-white/80 text-xs font-semibold mt-0.5 uppercase tracking-wide">Your Name</p>
                </div>
                <div className="text-center">
                  <p className="text-white/30 text-[9px] uppercase tracking-widest">Expires</p>
                  <p className="text-white/80 text-xs font-mono mt-0.5">12/29</p>
                </div>
                <p className="text-white/40 text-xl font-black italic">VISA</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Get your virtual dollar card</h2>
          <p className="text-gray-500 text-sm mt-1">Shop globally, subscribe to services, pay online — all in USD.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-4 bg-red-50 border border-red-100 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-900">One-time creation fee</p>
                <p className="font-black text-red-600 text-lg">$4.00</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Non-refundable. Charged once when your card is issued.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-900">Minimum initial funding</p>
                <p className="font-black text-blue-600 text-lg">$5.00</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">This is <span className="font-semibold text-blue-700">your money</span> — it stays in your card and is yours to spend anywhere.</p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-900 rounded-2xl px-5 py-4">
            <p className="text-white font-bold">Total required today</p>
            <p className="text-white font-black text-xl">$9.00</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-500">
          {['Accepted by all merchants that accept Visa', 'Instant top-ups from your Border USD wallet', 'Freeze or unfreeze instantly from the app', 'Auto-masked for security — reveal only when needed'].map(f => (
            <div key={f} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-emerald-600" />
              </div>
              <p>{f}</p>
            </div>
          ))}
        </div>

        {(() => {
          const usdBal = parseFloat(String(walletBalances['USD'] || 0));
          const hasEnough = usdBal >= 9;
          return (
            <>
              {!hasEnough && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
                  <p className="text-red-700 font-semibold text-sm">Insufficient USD balance</p>
                  <p className="text-red-500 text-xs mt-0.5">You have ${usdBal.toFixed(2)} — you need $9.00 to continue.</p>
                </div>
              )}
              <Button onClick={() => hasEnough && setScreen('create')}
                disabled={!hasEnough}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-base rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed">
                {hasEnough ? 'Continue — Create My Card' : 'Insufficient Balance'}
              </Button>
              <p className="text-center text-xs text-gray-400">
                {hasEnough
                  ? `Your current USD balance: $${usdBal.toFixed(2)} ✓`
                  : <><button onClick={() => setScreen('list')} className="underline text-blue-500">Fund my USD wallet</button> to continue</>}
              </p>
            </>
          );
        })()}
      </div>
    </div>
  );

  if (screen === 'create') return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => setScreen('list')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Create Virtual USD Card</h1>
      </div>
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm text-blue-800 font-medium">💳 Virtual Visa Card — make online payments worldwide</p>
          <p className="text-xs text-blue-600 mt-1">One-time creation fee + initial balance required.</p>
        </div>

        <div className="bg-white rounded-2xl border p-4 space-y-4">
          <p className="font-semibold text-gray-800">Personal Information</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} className="h-11 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} className="h-11 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Date of Birth</Label>
            <Input type="date" value={form.dob} onChange={e => setForm(f => ({...f, dob: e.target.value}))} className="h-11 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">ID Type</Label>
              <select value={form.id_type} onChange={e => setForm(f => ({...f, id_type: e.target.value}))}
                className="w-full h-11 mt-1 px-3 border rounded-lg text-sm">
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver's License</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">ID Number</Label>
              <Input value={form.id_number} onChange={e => setForm(f => ({...f, id_number: e.target.value}))} className="h-11 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="h-11 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Phone (international format, e.g. 2348012345678)</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="2348012345678" className="h-11 mt-1" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 space-y-4">
          <p className="font-semibold text-gray-800">Address</p>
          <div>
            <Label className="text-xs">Street Address</Label>
            <Input value={form.line1} onChange={e => setForm(f => ({...f, line1: e.target.value}))} className="h-11 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} className="h-11 mt-1" />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} className="h-11 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Postal Code</Label>
            <Input value={form.postal_code} onChange={e => setForm(f => ({...f, postal_code: e.target.value}))} className="h-11 mt-1" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <p className="font-semibold text-gray-800">Initial Funding</p>
          <div>
            <Label className="text-xs">Amount (USD) — minimum $5</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <Input type="number" value={form.amount_usd} min="5"
                onChange={e => setForm(f => ({...f, amount_usd: e.target.value}))}
                className="pl-7 h-11" />
            </div>
          </div>
        </div>

        <Button onClick={handleCreate} disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-bold">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Virtual USD Card'}
        </Button>
      </div>
    </div>
  );

  // ── USD CARD DETAIL ────────────────────────────────────────────────────────
  if (screen === 'detail' && selectedCard) {
    const cd = cardDetail || {};
    const status = cd.card_status || cd.status || selectedCard.status || 'processing';
    const holderName = cd.card_holder_name || cd.holder_name || selectedCard.card_holder_name || '';
    const maskedPan  = cd.masked_pan || cd.maskedPan || '';
    const expiry     = cd.expiry || cd.expiry_date || '';
    const cardBal    = parseFloat(String(selectedCard?.card_balance ?? cd.balance ?? 0));
    const walletBal  = parseFloat(String(walletBalances['USD'] || 0));
    const isFrozen   = status === 'frozen';

    const formatPan = (pan: string, reveal: boolean) => {
      if (!pan) return '•••• •••• •••• ••••';
      if (reveal && cd.card_number) {
        const n = cd.card_number.replace(/\s/g,'');
        return `${n.slice(0,4)} ${n.slice(4,8)} ${n.slice(8,12)} ${n.slice(12)}`;
      }
      // show first 4 + mask middle + last 4
      const clean = pan.replace(/\*/g,'').replace(/\s/g,'');
      const first = clean.slice(0,4) || '••••';
      const last  = clean.slice(-4) || '••••';
      return `${first} •••• •••• ${last}`;
    };

    return (
      <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #050d1f 0%, #0a1635 45%, #f1f5f9 45%)' }}>
        {/* Top nav */}
        <div className="px-4 pt-5 pb-2 flex items-center gap-3">
          <button onClick={() => { setScreen('list'); setCardDetail(null); }}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-white/70 text-sm font-medium flex-1">Border Virtual Card</span>
          <button onClick={() => openCard(selectedCard)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <RefreshCw className={`w-4 h-4 text-white ${detailLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Premium card */}
        <div className="px-5 mt-2 mb-6">
          <div className="relative w-full aspect-[1.586/1] max-w-sm mx-auto rounded-[28px] overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f1f4a 0%, #0d2060 35%, #0a1540 70%, #070d2e 100%)', boxShadow: '0 30px 60px rgba(0,0,128,0.5), 0 0 0 1px rgba(255,255,255,0.07)' }}>
            {/* Animated glow orbs */}
            <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full animate-pulse"
              style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.25) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.18) 0%, transparent 70%)' }} />
            {/* Frozen overlay */}
            {isFrozen && (
              <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-blue-400/20 border border-blue-400/40 rounded-full px-4 py-2">
                  <Snowflake className="w-4 h-4 text-blue-300" />
                  <span className="text-blue-200 text-sm font-bold tracking-widest uppercase">Frozen</span>
                </div>
              </div>
            )}
            <div className="absolute inset-0 p-5 flex flex-col justify-between z-[5]">
              {/* Top row: wordmark + status + chip */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-black text-[17px] tracking-tight leading-none">border</p>
                  <p className="text-blue-300/50 text-[9px] uppercase tracking-[0.22em] mt-0.5">Virtual Card</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                    isFrozen ? 'bg-blue-400/20 border-blue-400/40 text-blue-300' :
                    status === 'active' ? 'bg-emerald-400/20 border-emerald-400/40 text-emerald-300' :
                    'bg-yellow-400/20 border-yellow-400/40 text-yellow-300'
                  }`}>{status}</div>
                  {/* EMV chip */}
                  <div className="w-8 h-6 rounded-[4px] bg-gradient-to-br from-yellow-300/70 to-yellow-500/50 grid grid-cols-2 gap-[2px] p-[3px]">
                    {[0,1,2,3].map(i => <div key={i} className="bg-yellow-200/30 rounded-[1px]" />)}
                  </div>
                </div>
              </div>
              {/* PAN */}
              <p className="text-white/90 font-mono text-[15px] tracking-[0.18em] mt-auto">
                {formatPan(maskedPan, showDetails)}
              </p>
              {/* Bottom row */}
              <div className="flex justify-between items-end mt-2">
                <div>
                  <p className="text-white/30 text-[8px] uppercase tracking-[0.15em]">Card Holder</p>
                  <p className="text-white/85 text-[11px] font-semibold mt-0.5 uppercase tracking-wide">{holderName || 'YOUR NAME'}</p>
                </div>
                <div>
                  <p className="text-white/30 text-[8px] uppercase tracking-[0.15em]">Expires</p>
                  <p className="text-white/85 font-mono text-[11px] mt-0.5">
                    {showDetails && expiry ? expiry : '••/••'}
                  </p>
                </div>
                <p className="text-white/35 text-2xl font-black italic tracking-tight">VISA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rest of screen — white card area */}
        <div className="max-w-md mx-auto px-4 space-y-3">
          {/* Balances */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">USD Wallet</p>
              <p className="text-lg font-black text-gray-800 mt-1">${walletBal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
              <p className="text-[10px] text-gray-400">Available</p>
            </div>
            <div className="bg-blue-600 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-[10px] font-bold text-blue-200/70 uppercase tracking-widest">Card Balance</p>
              <p className="text-lg font-black text-white mt-1">${cardBal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
              <p className="text-[10px] text-blue-200/60">This card</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setShowDetails(v => !v)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${showDetails ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
              {showDetails
                ? <EyeOff className="w-5 h-5 text-white" />
                : <Eye className="w-5 h-5 text-gray-700" />}
              <span className={`text-xs font-semibold ${showDetails ? 'text-white' : 'text-gray-700'}`}>{showDetails ? 'Hide' : 'View Card'}</span>
            </button>
            <button onClick={() => { setFundType('fund'); setScreen('fund'); }}
              disabled={isFrozen || selectedCard.status === 'processing'}
              className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl border border-blue-200 hover:border-blue-400 transition-all disabled:opacity-40">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-600">Fund</span>
            </button>
            <button onClick={handleToggleFreeze}
              disabled={loading || selectedCard.status === 'processing'}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all disabled:opacity-40 ${isFrozen ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 hover:border-blue-200'}`}>
              {isFrozen
                ? <><Unlock className="w-5 h-5 text-emerald-600" /><span className="text-xs font-semibold text-emerald-600">Unfreeze</span></>
                : <><Snowflake className="w-5 h-5 text-blue-600" /><span className="text-xs font-semibold text-blue-600">Freeze</span></>}
            </button>
          </div>

          {/* Revealed card details */}
          {showDetails && (
            <div className="bg-gray-900 rounded-2xl p-4 space-y-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Card Details</p>
              {[
                { label: 'Card Number', value: cd.card_number?.replace(/(\d{4})/g,'$1 ').trim() || '—', key: 'num' },
                { label: 'CVV', value: cd.cvv || '—', key: 'cvv' },
                { label: 'Expiry', value: expiry || '—', key: 'exp' },
                { label: 'Billing Name', value: holderName || '—', key: 'name' },
              ].map(row => (
                <div key={row.key} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{row.label}</p>
                    <p className="font-mono font-semibold text-sm text-white mt-0.5">{row.value}</p>
                  </div>
                  <button onClick={() => copy(row.value, row.key)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                    {copied === row.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Transactions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Card Transactions</p>
            {detailLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-1">💳</p>
                <p className="text-sm text-gray-400">No transactions yet</p>
                <p className="text-xs text-gray-300 mt-0.5">Use this card online to see activity here</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {transactions.map((tx: any, i: number) => (
                  <div key={tx.id || i} className="flex items-center gap-3 py-2.5 border-b last:border-0 border-gray-50">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'credit' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      {tx.type === 'credit'
                        ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                        : <ArrowUpRight className="w-4 h-4 text-rose-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.narrative || tx.description || 'Transaction'}</p>
                      <p className="text-xs text-gray-400">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-NG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'credit' ? '+' : '-'}${tx.amount}
                      </p>
                      <p className={`text-[9px] font-semibold mt-0.5 ${tx.status === 'success' ? 'text-emerald-500' : 'text-red-400'}`}>{tx.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── NGN DISPUTE ────────────────────────────────────────────────────────────
  if (screen === 'ngn_dispute') return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => setScreen('ngn_detail')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Raise a Dispute</h1>
      </div>
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm text-amber-800 font-medium">⚠️ Disputes are reviewed by the Border support team within 3–5 business days.</p>
        </div>
        <div className="bg-white rounded-2xl border p-4 space-y-4">
          <div>
            <Label className="text-xs">Reason</Label>
            <select value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
              className="w-full h-11 mt-1 px-3 border rounded-lg text-sm">
              {['fraudulent','not_received','duplicate','canceled','product_not_as_described','service_not_as_described','other'].map(r => (
                <option key={r} value={r}>{r.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Transaction ID</Label>
            <Input value={disputeTxId} onChange={e => setDisputeTxId(e.target.value)}
              placeholder="Transaction reference from your history" className="h-11 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Explanation</Label>
            <textarea value={disputeExplanation} onChange={e => setDisputeExplanation(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full mt-1 p-3 border rounded-lg text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <Button onClick={handleNgnDispute} disabled={loading || !disputeExplanation || !disputeTxId}
            className="w-full h-11 bg-red-600 hover:bg-red-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Dispute'}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── NGN PIN MANAGEMENT ─────────────────────────────────────────────────────
  if (screen === 'ngn_pin') return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => setScreen('ngn_detail')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Set / Reset Card PIN</h1>
      </div>
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm text-blue-800">Set a 4-digit PIN for your Naira card. This PIN is used for ATM and POS transactions.</p>
        </div>
        <div className="bg-white rounded-2xl border p-4 space-y-4">
          <div>
            <Label className="text-xs">New PIN (4 digits)</Label>
            <Input type="password" inputMode="numeric" maxLength={4} value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g,'').slice(0,4))}
              className="h-11 mt-1 text-center text-xl tracking-[0.5em]" />
          </div>
          <div>
            <Label className="text-xs">Confirm PIN</Label>
            <Input type="password" inputMode="numeric" maxLength={4} value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,4))}
              className="h-11 mt-1 text-center text-xl tracking-[0.5em]" />
          </div>
          <Button onClick={handleNgnResetPin}
            disabled={loading || newPin.length < 4 || confirmPin.length < 4}
            className="w-full h-11 bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set PIN'}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── NGN CARD DETAIL ────────────────────────────────────────────────────────
  if (screen === 'ngn_detail' && selectedNgnCard) return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => { setScreen('list'); setNgnCardDetail(null); }}
          className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold flex-1">Naira Card</h1>
        <button onClick={() => openNgnCard(selectedNgnCard)} className="p-2 hover:bg-gray-100 rounded-full">
          <RefreshCw className={`w-4 h-4 ${ngnDetailLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-2xl shadow-green-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-xs opacity-60 uppercase tracking-widest">Naira Virtual Card</p>
              <p className="font-bold text-lg mt-0.5">{selectedNgnCard.card_holder_name}</p>
            </div>
            <Badge className={`text-[10px] font-bold border ${
              (ngnCardDetail?.status || selectedNgnCard.status) === 'active'
                ? 'bg-green-400/20 text-green-200 border-green-400/30'
                : 'bg-red-400/20 text-red-200 border-red-400/30'
            }`}>{(ngnCardDetail?.status || selectedNgnCard.status || 'active').toUpperCase()}</Badge>
          </div>
          <p className="text-lg font-mono tracking-widest mb-4 opacity-80">
            {ngnCardDetail?.maskedPan || selectedNgnCard.masked_pan || '•••• •••• •••• ••••'}
          </p>
          <div className="flex justify-between">
            <div>
              <p className="text-[10px] opacity-60 uppercase tracking-widest">Expires</p>
              <p className="font-mono font-bold">{selectedNgnCard.expiry_month}/{selectedNgnCard.expiry_year || '••••'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] opacity-60 uppercase">Brand</p>
              <p className="font-bold">{selectedNgnCard.card_brand || 'Verve'}</p>
            </div>
          </div>
          <div className="absolute bottom-4 right-6 opacity-30 text-2xl font-black">NGN</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-100 rounded-xl p-3 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">NGN Wallet</p>
            <p className="text-base font-extrabold text-gray-700">₦{parseFloat(String(walletBalances['NGN'] || 0)).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">Main balance</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Card Balance</p>
            <p className="text-base font-extrabold text-green-700">₦{parseFloat(String(selectedNgnCard?.card_balance || 0)).toLocaleString()}</p>
            <p className="text-[10px] text-green-400">This card only</p>
          </div>
        </div>

        <button onClick={() => { setFundType('fund'); setScreen('fund'); }}
          className="w-full flex items-center justify-between bg-green-600 text-white rounded-2xl px-4 py-3 hover:bg-green-700 transition-all active:scale-[0.99]">
          <span className="font-bold text-sm">Fund this card from NGN Wallet</span>
          <span className="text-xs opacity-80">Wallet → Card →</span>
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={handleNgnToggleStatus} disabled={loading}
            className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl border hover:border-gray-300 transition-all disabled:opacity-40">
            {(ngnCardDetail?.status || selectedNgnCard.status) === 'active'
              ? <><Snowflake className="w-5 h-5 text-blue-500" /><span className="text-xs font-medium text-blue-500">Deactivate</span></>
              : <><Unlock className="w-5 h-5 text-green-600" /><span className="text-xs font-medium text-green-600">Activate</span></>}
          </button>
          <button onClick={() => setScreen('ngn_pin')}
            className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl border hover:border-gray-300 transition-all">
            <Lock className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">Set PIN</span>
          </button>
          <button onClick={() => setScreen('ngn_dispute')}
            className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl border hover:border-red-200 transition-all">
            <ArrowUpRight className="w-5 h-5 text-red-500" />
            <span className="text-xs font-medium text-red-500">Dispute</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">Card Transactions</p>
          {ngnDetailLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
          ) : ngnHistory.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {ngnHistory.map((tx: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-50' : 'bg-rose-50'}`}>
                    {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> : <ArrowUpRight className="w-4 h-4 text-rose-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{tx.narrative || tx.description}</p>
                    <p className="text-xs text-gray-400">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-NG') : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-rose-600'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₦{Number(tx.amount || 0).toLocaleString()}
                    </p>
                    <Badge className={`text-[9px] ${tx.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── CREATE NGN CARD ────────────────────────────────────────────────────────
  if (screen === 'create_ngn') return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => { setScreen('list'); setNgnStep('customer'); setNgnCustomerId(''); }}
          className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Create Naira Virtual Card</h1>
      </div>
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {['Customer Profile','Card Setup'].map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${(i === 0 && ngnStep === 'customer') || (i === 1 && ngnStep === 'card')
                  ? 'bg-green-600 text-white' : i === 0 && ngnStep === 'card' ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                {i === 0 && ngnStep === 'card' ? '✓' : i + 1}
              </div>
              <span className="text-xs font-medium text-gray-600">{s}</span>
              {i < 1 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {ngnStep === 'customer' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-sm text-green-800 font-medium">🇳🇬 Verve / AfriGo Virtual Card — works for online & POS payments in Nigeria</p>
            </div>
            <div className="bg-white rounded-2xl border p-4 space-y-4">
              <p className="font-semibold text-gray-800">Personal Information</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">First Name</Label>
                  <Input value={ngnForm.firstname} onChange={e => setNgnForm(f => ({...f, firstname: e.target.value}))} className="h-11 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Last Name</Label>
                  <Input value={ngnForm.lastname} onChange={e => setNgnForm(f => ({...f, lastname: e.target.value}))} className="h-11 mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">BVN (11 digits)</Label>
                  <Input value={ngnForm.bvn} onChange={e => setNgnForm(f => ({...f, bvn: e.target.value.replace(/\D/g,'').slice(0,11)}))} placeholder="22345678901" inputMode="numeric" className="h-11 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">NIN (11 digits)</Label>
                  <Input value={ngnForm.nin} onChange={e => setNgnForm(f => ({...f, nin: e.target.value.replace(/\D/g,'').slice(0,11)}))} placeholder="12345678901" inputMode="numeric" className="h-11 mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Date of Birth (YYYY/MM/DD)</Label>
                <Input value={ngnForm.dob} onChange={e => setNgnForm(f => ({...f, dob: e.target.value}))} placeholder="1995/01/15" className="h-11 mt-1" />
              </div>

              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={ngnForm.email} onChange={e => setNgnForm(f => ({...f, email: e.target.value}))} className="h-11 mt-1" />
              </div>

              <div>
                <Label className="text-xs">Phone (international format)</Label>
                <Input value={ngnForm.phone} onChange={e => setNgnForm(f => ({...f, phone: e.target.value}))} placeholder="2348012345678" className="h-11 mt-1" />
              </div>

              <p className="font-semibold text-gray-800 pt-2">Address</p>

              <div>
                <Label className="text-xs">Street Address</Label>
                <Input value={ngnForm.line1} onChange={e => setNgnForm(f => ({...f, line1: e.target.value}))} className="h-11 mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">City</Label>
                  <Input value={ngnForm.city} onChange={e => setNgnForm(f => ({...f, city: e.target.value}))} className="h-11 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">State code (e.g. lg)</Label>
                  <Input value={ngnForm.state} onChange={e => setNgnForm(f => ({...f, state: e.target.value}))} placeholder="lg" className="h-11 mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Card Network Provider</Label>
                <select value={ngnForm.provider} onChange={e => setNgnForm(f => ({...f, provider: e.target.value}))}
                  className="w-full h-11 mt-1 px-3 border rounded-lg text-sm">
                  <option value="black">Black (Verve/AfriGo)</option>
                  <option value="white">White</option>
                </select>
              </div>

              <Button onClick={handleCreateNgnCustomer} disabled={loading} className="w-full h-12 bg-green-600 hover:bg-green-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue to Card Setup →'}
              </Button>
            </div>
          </div>
        )}

        {ngnStep === 'card' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium">Customer profile created. Now choose your card brand.</p>
            </div>
            <div className="bg-white rounded-2xl border p-4 space-y-4">
              <p className="font-semibold text-gray-800">Select Card Brand</p>
              <div className="grid grid-cols-2 gap-3">
                {['Verve','AfriGo'].map(b => (
                  <button key={b} onClick={() => setNgnForm(f => ({...f, brand: b}))}
                    className={`p-4 rounded-2xl border-2 text-center font-bold transition-all
                      ${ngnForm.brand === b ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    <p className="text-lg">{b === 'Verve' ? '🟥' : '🟩'}</p>
                    <p className="text-sm mt-1">{b}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{b === 'Verve' ? 'Most popular' : 'AfriGo network'}</p>
                  </button>
                ))}
              </div>
              <Button onClick={handleCreateNgnCard} disabled={loading} className="w-full h-12 bg-green-600 hover:bg-green-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Create ${ngnForm.brand} Virtual Card`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── CARD LIST ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold flex-1">My Cards</h1>
        <button onClick={() => loadCards(userId)} className="p-2 hover:bg-gray-100 rounded-full">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} text-gray-500`} />
        </button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <button onClick={() => setScreen('info')}
          className="w-full flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-left hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-blue-200">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base">Create Virtual USD Card</p>
            <p className="text-blue-100 text-xs mt-0.5">Virtual Visa — shop online, pay globally</p>
          </div>
        </button>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-blue-400" /></div>
        ) : (
          <>
            {cards.filter(c => c.card_type === 'usd_nfc' || !c.card_type || c.currency === 'USD').map(card => (
              <button key={card.id} onClick={() => openCard(card)}
                className="w-full text-left rounded-3xl overflow-hidden hover:opacity-95 active:scale-[0.99] transition-all"
                style={{ background: 'linear-gradient(135deg, #0f1f4a 0%, #0d2060 40%, #070d2e 100%)', boxShadow: '0 16px 40px rgba(0,0,128,0.35), 0 0 0 1px rgba(255,255,255,0.06)' }}>
                <div className="relative p-5">
                  <div className="absolute top-0 right-0 w-36 h-36 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
                  <div className="flex justify-between items-center mb-5 relative z-10">
                    <div>
                      <p className="text-white font-black text-sm tracking-tight">border</p>
                      <p className="text-blue-300/50 text-[9px] uppercase tracking-[0.2em]">Virtual Card</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                      card.status === 'active' ? 'bg-emerald-400/20 border-emerald-400/40 text-emerald-300' :
                      card.status === 'frozen' ? 'bg-blue-400/20 border-blue-400/40 text-blue-300' :
                      'bg-yellow-400/20 border-yellow-400/40 text-yellow-300'
                    }`}>{(card.status || 'processing')}</div>
                  </div>
                  <p className="font-mono text-white/80 tracking-[0.16em] text-sm relative z-10">
                    {card.masked_pan
                      ? `${card.masked_pan.replace(/\*/g,'').slice(0,4) || '••••'} •••• •••• ${card.masked_pan.slice(-4) || '••••'}`
                      : `•••• •••• •••• ${card.last_four || '••••'}`}
                  </p>
                  <div className="flex justify-between items-end mt-3 relative z-10">
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{card.card_holder_name}</p>
                    <p className="text-white/30 text-base font-black italic">VISA</p>
                  </div>
                </div>
              </button>
            ))}

            {cards.filter(c => c.card_type === 'ngn_virtual' || c.currency === 'NGN').map(card => (
              <button key={card.id} onClick={() => openNgnCard(card)}
                className="w-full text-left bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-green-100">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <p className="text-xs opacity-60 uppercase tracking-widest">Naira Virtual Card</p>
                    <p className="font-bold mt-0.5">{card.card_holder_name}</p>
                  </div>
                  <Badge className={`text-[10px] font-bold border ${
                    card.status === 'active' ? 'bg-green-400/20 text-green-200 border-green-400/30' :
                    'bg-red-400/20 text-red-200 border-red-400/30'
                  }`}>{(card.status || 'active').toUpperCase()}</Badge>
                </div>
                <p className="font-mono text-base tracking-widest opacity-80">
                  {card.masked_pan || '•••• •••• •••• ••••'}
                </p>
                <div className="flex justify-between mt-3 text-xs opacity-60">
                  <span>{card.card_brand || 'Verve'}</span>
                  <span>NGN · Virtual</span>
                </div>
              </button>
            ))}

            {cards.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border">
                <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-500">No cards yet</p>
                <p className="text-sm text-gray-400 mt-1">Create your first virtual card above</p>
              </div>
            )}
          </>
        )}

        <div className="w-full flex items-center gap-4 bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl p-5 text-left opacity-70 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full tracking-widest uppercase rotate-[-2deg] shadow-lg">Coming Soon</span>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6 text-white/50" />
          </div>
          <div>
            <p className="text-white/60 font-bold text-base">Naira Virtual Card</p>
            <p className="text-white/30 text-xs mt-0.5">Verve / AfriGo — launching soon</p>
          </div>
        </div>
      </div>

    </div>
  );
}
