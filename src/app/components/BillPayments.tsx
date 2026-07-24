import { useState, useEffect } from 'react';
import {
  ArrowLeft, Smartphone, Tv, Zap, Wifi, BookOpen,
  CheckCircle, Loader2, Share2, Download, ChevronRight,
} from 'lucide-react';
import { ProviderBadge, getProviderIcon } from '@/utils/bill-icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createTransactionNotification } from '@/utils/notification-helper';
import DataPurchase from './DataPurchase';
import TransactionPinModal from './TransactionPinModal';

interface BillPaymentsProps { onBack: () => void; initialCategory?: string; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

type Category = 'airtime' | 'data' | 'electricity' | 'cable' | 'education';
// Step flow:
//   airtime/education → category → form → processing → success
//   electricity/cable → category → provider → form → processing → success
type Step = 'category' | 'provider' | 'form' | 'processing' | 'success';

const BILL_CATS = [
  { id: 'airtime'     as Category, label: 'Airtime',     icon: Smartphone, bg: '#EFF6FF', color: '#2563eb', emoji: '📱' },
  { id: 'data'        as Category, label: 'Data',        icon: Wifi,       bg: '#F5F3FF', color: '#7c3aed', emoji: '📶' },
  { id: 'electricity' as Category, label: 'Electricity', icon: Zap,        bg: '#FEFCE8', color: '#d97706', emoji: '⚡' },
  { id: 'cable'       as Category, label: 'Cable TV',    icon: Tv,         bg: '#FFF1F2', color: '#e11d48', emoji: '📺' },
  { id: 'education'   as Category, label: 'Education',   icon: BookOpen,   bg: '#F0FDF4', color: '#16a34a', emoji: '🎓' },
];

// Education products are now loaded from VTUGate (not hardcoded)
// Each VTUGate education service has: service_id, product_code, edu_type, service_name

export default function BillPayments({ onBack, initialCategory }: BillPaymentsProps) {
  const [step, setStep]         = useState<Step>(() => {
    if (!initialCategory || initialCategory === 'data') return 'category';
    if (initialCategory === 'electricity' || initialCategory === 'cable') return 'provider';
    return 'form'; // airtime, education → skip straight to form
  });
  const [category, setCategory] = useState<Category | null>(initialCategory as Category || null);

  // Current user id — fetched once on mount
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Provider step
  const [providers, setProviders]       = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  // PIN modal state
  const [showPin, setShowPin] = useState(false);

  // Cable plans + verified customer name
  const [verifiedCustomerName, setVerifiedCustomerName] = useState('');
  const [cablePlans, setCablePlans]   = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // Form fields
  const [phone, setPhone]       = useState('');
  const [meterNo, setMeterNo]   = useState('');
  const [smartcard, setSmartcard] = useState('');
  const [amount, setAmount]     = useState('');
  const [eduProduct, setEduProduct] = useState('');   // product_code from VTUGate service
  const [eduQty, setEduQty]         = useState('1');
  const [eduPrice, setEduPrice]     = useState('');   // auto-fetched from get_education_price
  const [fetchingEduPrice, setFetchingEduPrice] = useState(false);

  // Verification
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified]   = useState<any>(null);

  // Receipt
  const [receipt, setReceipt] = useState<any>(null);

  // ── API helpers ──────────────────────────────────────────────────────────
  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const h: Record<string, string> = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY };
    if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
    return h;
  };

  const vtu = async (action: string, payload: Record<string, any>) => {
    const headers = await getHeaders();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/vtugate`, {
      method: 'POST', headers, body: JSON.stringify({ action, ...payload }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) throw new Error(d.error || 'Request failed');
    return d;
  };

  // ── Load providers for every category (hooks must all be at top level) ───
  useEffect(() => {
    if (!category || category === 'data') return;
    setProviders([]); setSelectedProvider(null); setCablePlans([]); setSelectedPlan(null);
    setLoadingProviders(true);

    const svcTypeMap: Record<string, string> = {
      airtime: 'airtime', electricity: 'electricity',
      cable: 'tv', education: 'education',
    };
    const svcType = svcTypeMap[category] || category;

    vtu('fetch_services', { service_type: svcType })
      .then(d => {
        const svcs: any[] = d.data || [];
        // Log ALL fields so we can see exact VTUGate response structure
        setProviders(svcs);
      })
      .catch(() => { toast.error('Failed to load providers'); })
      .finally(() => setLoadingProviders(false));
  }, [category]);

  // Cable TV verification is now manual (button press), not auto-triggered

  // ── Auto-verify electricity meter ────────────────────────────────────────
  useEffect(() => {
    if (category !== 'electricity' || meterNo.length < 11 || !selectedProvider) return;
    const t = setTimeout(async () => {
      setVerifying(true); setVerified(null); setVerifiedCustomerName('');
      try {
        const d = await vtu('verify_electricity', {
          service_id: selectedProvider.service_id,
          meter_no: meterNo,
          disco: selectedProvider.disco || selectedProvider.network_name?.toLowerCase(),
        });
        // Edge function returns: { success, customer_name, raw }
        const name = d.customer_name || d.raw?.meter_name || d.raw?.customer_name || '';
        setVerifiedCustomerName(name);
        setVerified(d.raw || d);
      } catch (e: any) { toast.error(e.message || 'Meter verification failed'); }
      finally { setVerifying(false); }
    }, 700);
    return () => clearTimeout(t);
  }, [meterNo, selectedProvider]);

  // ── PAYMENT — deduct balance FIRST, then show receipt ──────────────────
  const handlePay = async () => {
    setStep('processing');

    let result: any = null;
    let description  = '';
    let payAmount    = 0;
    const ref        = `VTU-${Date.now()}`;

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Not logged in — please refresh');
      const uid = user.id;

      payAmount = parseFloat(amount) || 0;

      // ── Airtime ──
      if (category === 'airtime') {
        if (!selectedProvider || !phone || payAmount < 50) throw new Error('Fill all fields. Minimum ₦50.');
        result = await vtu('buy_airtime', {
          service_id: selectedProvider.service_id,
          phone_number: phone, amount: payAmount,
          user_id: uid,
          network_name: selectedProvider.network_name,
        });
        description = `${selectedProvider.network_name} Airtime — ${phone}`;

      // ── Electricity ──
      } else if (category === 'electricity') {
        if (!selectedProvider || !meterNo || payAmount < 100 || !verified)
          throw new Error('Verify meter and enter amount (min ₦100).');
        result = await vtu('buy_electricity', {
          service_id: selectedProvider.service_id,
          meter_no: meterNo,
          disco: selectedProvider.disco || selectedProvider.network_name?.toLowerCase(),
          amount: payAmount,
          phone_number: phone || '08000000000',
          user_id: uid,
          customer_name: verifiedCustomerName,
        });
        description = `${selectedProvider.disco || selectedProvider.network_name} Electricity — Meter ${meterNo}`;

      // ── Cable TV ──
      } else if (category === 'cable') {
        if (!selectedProvider || !smartcard || !selectedPlan || !verified)
          throw new Error('Verify smartcard and select a package.');
        payAmount = Number(selectedPlan.price || selectedPlan.amount || 0);
        result = await vtu('buy_cable', {
          service_id: selectedProvider.service_id,
          smartcard_number: smartcard,
          phone: phone || '08000000000',
          amount: payAmount,
          plan_code: selectedPlan.plan_code || selectedPlan.code,
          plan_name: selectedPlan.plan_name || selectedPlan.name,
          user_id: uid,
          tv_name: selectedProvider.tv_name || selectedProvider.network_name,
        });
        description = `${selectedProvider.tv_name || selectedProvider.network_name} ${selectedPlan.plan_name || selectedPlan.name} — ${smartcard}`;

      // ── Education ──
      } else if (category === 'education') {
        const qty  = parseInt(eduQty) || 1;
        const unit = parseFloat(eduPrice) || 0;
        payAmount  = unit * qty;
        // product_code comes from the VTUGate service object (set when provider selected)
        const productCode = selectedProvider.product_code || eduProduct || selectedProvider.service_name;
        if (!selectedProvider || !phone || !productCode || !unit)
          throw new Error('Select a product, enter phone number and ensure price is loaded.');
        result = await vtu('buy_education', {
          service_id: selectedProvider.service_id,
          phone, quantity: qty, product_code: productCode,
        });
        const eduLabel = selectedProvider.edu_type || selectedProvider.service_name || 'Education Pin';
        description = `${eduLabel} x${qty} — ${phone}`;
      }

      // Edge function handles wallet deduction server-side — check result
      const deduction = result?.deduction;
      if (deduction && !deduction.ok) {
        throw new Error(deduction.error || 'Wallet deduction failed');
      }

      const responseData = result?.data || {};

      // Record to transactions table so admin panel can see it
      await supabase.from('transactions').insert({
        user_id: uid,
        type: 'BILL_PAYMENT',
        amount: payAmount,
        currency: 'NGN',
        status: 'completed',
        description,
        reference: ref,
        transaction_reference: ref,
        provider: 'vtugate',
        metadata: { category, provider: selectedProvider?.network_name || selectedProvider?.tv_name || selectedProvider?.disco },
      }).then(() => {});

      setReceipt({
        description, amount: payAmount, reference: ref,
        token: responseData.token || result?.token,
        pins: responseData.pins,
        status: 'Completed',
        date: new Date().toLocaleString('en-NG'),
        provider: selectedProvider?.tv_name || selectedProvider?.disco || selectedProvider?.network_name,
        plan: selectedPlan?.plan_name || selectedPlan?.name,
        account: phone || meterNo || smartcard,
        customer: verifiedCustomerName,
        category,
      });
      setStep('success');
      toast.success('Payment successful!');

    } catch (e: any) {
      toast.error(e.message || 'Payment failed');
      setStep('form');
    }
  };

  // ── Receipt helpers ──────────────────────────────────────────────────────
  const receiptLines = (r: any) => [
    'BORDER PAYMENT RECEIPT',
    '======================',
    `Description : ${r.description}`,
    `Amount      : NGN ${Number(r.amount).toLocaleString()}`,
    r.token ? `Token       : ${r.token}` : '',
    r.pins  ? `PIN(s)      : ${r.pins}`  : '',
    r.plan  ? `Plan        : ${r.plan}`  : '',
    `Status      : ${r.status}`,
    `Reference   : ${r.reference}`,
    `Date        : ${r.date}`,
    '======================',
    'Powered by Border',
  ].filter(Boolean).join('\n');

  const shareReceipt = () => {
    const text = receiptLines(receipt);
    if (navigator.share) navigator.share({ title: 'Border Receipt', text }).catch(() => {});
    else { navigator.clipboard.writeText(text); toast.success('Copied!'); }
  };

  const downloadReceipt = () => {
    const blob = new Blob([receiptLines(receipt)], { type: 'text/plain' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `Receipt_${receipt?.reference}.txt`,
    });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const reset = () => {
    setStep('category'); setCategory(null); setProviders([]); setSelectedProvider(null);
    setCablePlans([]); setSelectedPlan(null); setPhone(''); setMeterNo(''); setSmartcard('');
    setAmount(''); setEduProduct(''); setEduQty('1'); setEduPrice('');
    setVerified(null); setVerifiedCustomerName(''); setReceipt(null);
  };

  // ── Data → delegate completely ───────────────────────────────────────────
  if (category === 'data') {
    return (
      <DataPurchase
        onBack={() => { setCategory(null); setStep('category'); }}
        onSuccess={r => { setReceipt(r); setStep('success'); setCategory(null); }}
      />
    );
  }

  // ── Receipt screen ───────────────────────────────────────────────────────
  if (step === 'success' && receipt) {
    const catDef = BILL_CATS.find(c => c.id === receipt.category);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
          <button onClick={reset} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold">Receipt</h1>
        </div>
        <div className="max-w-md mx-auto p-4 space-y-3 pb-8">
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
            <div className="p-6 text-center text-white"
              style={{ background: `linear-gradient(135deg, ${catDef?.color || '#16a34a'}, ${catDef?.color || '#16a34a'}cc)` }}>
              <CheckCircle className="w-14 h-14 mx-auto mb-2 opacity-90" />
              <p className="text-sm opacity-80 mb-1">Payment Successful</p>
              <p className="text-3xl font-bold">₦{Number(receipt.amount).toLocaleString()}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { l: 'Description', v: receipt.description },
                receipt.provider && { l: 'Provider',    v: receipt.provider },
                receipt.account  && { l: 'Account',     v: receipt.account  },
                receipt.plan     && { l: 'Plan',        v: receipt.plan     },
                receipt.token    && { l: 'Token',       v: receipt.token    },
                receipt.pins     && { l: 'PIN(s)',      v: receipt.pins     },
                { l: 'Status',    v: '✅ Completed'        },
                { l: 'Reference', v: receipt.reference     },
                { l: 'Date',      v: receipt.date          },
              ].filter(Boolean).map((row: any) => (
                <div key={row.l} className="flex justify-between items-start px-5 py-3">
                  <span className="text-sm text-gray-400 shrink-0 mr-4">{row.l}</span>
                  <span className="text-sm font-medium text-gray-900 text-right break-all">{row.v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2" onClick={shareReceipt}><Share2 className="w-4 h-4" /> Share</Button>
            <Button variant="outline" className="gap-2" onClick={downloadReceipt}><Download className="w-4 h-4" /> Download</Button>
          </div>
          <Button onClick={reset} className="w-full">Pay Another Bill</Button>
          <Button variant="ghost" className="w-full" onClick={onBack}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // ── Processing ───────────────────────────────────────────────────────────
  if (step === 'processing') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-14 h-14 text-blue-500 animate-spin mx-auto" />
        <p className="font-semibold text-gray-800">Processing payment…</p>
        <p className="text-sm text-gray-400">Please do not close this screen</p>
      </div>
    </div>
  );

  // ── Category grid ────────────────────────────────────────────────────────
  if (step === 'category') return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Bill Payments</h1>
      </div>
      <div className="max-w-md mx-auto p-4">
        <p className="text-sm text-gray-400 mb-4">What would you like to pay for?</p>
        {/* Horizontal scroll — outer clips, inner scrolls */}
        <div style={{ width: '100%', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', gap: 10,
            overflowX: 'auto', overflowY: 'visible',
            paddingBottom: 4,
            scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
          }}>
          {BILL_CATS.map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  if (cat.id === 'electricity' || cat.id === 'cable') setStep('provider');
                  else setStep('form');
                }}
                style={{
                  flexShrink: 0, width: 90,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '12px 8px', borderRadius: 16,
                  border: '2px solid transparent', background: cat.bg,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: `${cat.color}20` }}>
                  {cat.emoji}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, textAlign: 'center' }}>{cat.label}</span>
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Provider selection grid (electricity & cable) ─────────────────────────
  if (step === 'provider') {
    const catDef = BILL_CATS.find(c => c.id === category)!;
    const isElec = category === 'electricity';
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setStep('category')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold">{isElec ? 'Select Distribution Company' : 'Select Cable Provider'}</h1>
        </div>
        <div className="max-w-md mx-auto p-4">
          <p className="text-sm text-gray-400 mb-4">
            {isElec ? 'Choose your electricity provider' : 'Choose your cable TV provider'}
          </p>
          {loadingProviders ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: catDef.color }} />
                <p className="text-sm text-gray-400">Loading providers…</p>
              </div>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-gray-400">No providers found</p>
              <Button variant="outline" onClick={() => {
                setLoadingProviders(true);
                const svcType = category === 'cable' ? 'tv' : 'electricity';
                vtu('fetch_services', { service_type: svcType })
                  .then(d => setProviders(d.data || []))
                  .catch(() => toast.error('Failed'))
                  .finally(() => setLoadingProviders(false));
              }}>Retry</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {providers.map((p: any) => {
                // cable → p.tv_name   |   electricity → p.disco
                const companyName = isElec ? p.disco : p.tv_name;
                if (!companyName) return null;
                return (
                  <button
                    key={p.service_id}
                    onClick={() => {
                      setSelectedProvider(p);
                      setStep('form');
                      setVerified(null); setMeterNo(''); setSmartcard('');
                      setCablePlans([]); setSelectedPlan(null);
                    }}
                    className="flex items-center gap-3 bg-white rounded-2xl border-2 border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-md active:scale-95 transition-all"
                  >
                    <ProviderBadge name={companyName} size={40} />
                    <p className="font-bold text-sm text-gray-900 truncate">{companyName}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  // NOTE: airtimeProviders / eduProviders are loaded in the main useEffect above
  // (hooks cannot appear after a conditional return — all hooks are at top of component)
  const catDef = BILL_CATS.find(c => c.id === category)!;

  const canPay = () => {
    if (category === 'airtime')     return !!selectedProvider && phone.length >= 11 && parseFloat(amount) >= 50;
    if (category === 'electricity') return !!selectedProvider && meterNo.length >= 11 && parseFloat(amount) >= 100 && !!verified;
    if (category === 'cable')       return !!selectedProvider && smartcard.length >= 10 && !!selectedPlan && !!verified;
    if (category === 'education')   return !!selectedProvider && phone.length >= 11 && !!(selectedProvider.product_code || eduProduct) && parseFloat(eduPrice) > 0;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => {
            if (category === 'electricity' || category === 'cable') setStep('provider');
            else if (initialCategory) onBack();
            else setStep('category');
          }}
          className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{catDef?.emoji}</span>
          <h1 className="text-lg font-bold">{catDef?.label}</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* Selected provider chip */}
        {selectedProvider && (
          <div className="flex items-center gap-2 bg-white rounded-2xl border px-4 py-3 shadow-sm">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: catDef?.bg }}>
              {catDef?.emoji}
            </div>
            <span className="font-semibold text-sm text-gray-900">
              {category === 'cable' ? selectedProvider.tv_name
               : category === 'electricity' ? selectedProvider.disco
               : selectedProvider.network_name}
            </span>
            <button
              onClick={() => setStep('provider')}
              className="ml-auto text-xs text-blue-600 font-medium">
              Change
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border p-4 space-y-4 shadow-sm">

          {/* AIRTIME */}
          {category === 'airtime' && <>
            {!selectedProvider && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Select Network</p>
                {loadingProviders
                  ? <div className="flex items-center gap-2 text-gray-400 py-2"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span></div>
                  : <div className="grid grid-cols-2 gap-2">
                      {providers.map((p: any) => {
                        const meta = getProviderIcon(p.network_name);
                        const isSelected = selectedProvider?.service_id === p.service_id;
                        return (
                          <button key={p.service_id} onClick={() => setSelectedProvider(p)}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-bold text-left transition-all
                              ${isSelected ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'}`}
                            style={isSelected ? { background: meta.bg + '22', borderColor: meta.bg } : {}}>
                            <ProviderBadge name={p.network_name} size={32} />
                            <span style={{ color: isSelected ? meta.color === '#fff' ? meta.bg : meta.color : '#374151' }}>
                              {p.network_name}
                            </span>
                          </button>
                        );
                      })}
                    </div>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))} placeholder="08012345678" maxLength={11} className="h-12" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="200" min={50} className="h-12" />
              {parseFloat(amount) > 0 && parseFloat(amount) < 50 && <p className="text-xs text-amber-600 mt-1">Minimum ₦50</p>}
            </div>
          </>}

          {/* ELECTRICITY */}
          {category === 'electricity' && <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meter Number</label>
              <Input value={meterNo} onChange={e => { setMeterNo(e.target.value.replace(/\D/g,'')); setVerified(null); }}
                placeholder="12345678901" maxLength={13} className="h-12" />
              {verifying && <p className="text-xs text-blue-500 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Verifying meter…</p>}
            </div>
            {/* Account name returned after verification */}
            {verified && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-xs text-green-600 font-medium">Account Verified</p>
                  <p className="text-sm font-bold text-green-900">
                    {verifiedCustomerName || 'Meter Verified'}
                  </p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))} placeholder="08012345678" maxLength={11} className="h-12" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1000" min={100} className="h-12" />
              {parseFloat(amount) > 0 && parseFloat(amount) < 100 && <p className="text-xs text-amber-600 mt-1">Minimum ₦100</p>}
            </div>
          </>}

          {/* CABLE TV — two sub-steps: input → verify → plans */}
          {category === 'cable' && <>
            {/* Step A: smartcard + phone + verify button (show when not yet verified) */}
            {!verified && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Smartcard / IUC Number</label>
                  <Input value={smartcard}
                    onChange={e => { setSmartcard(e.target.value.replace(/\D/g,'')); setSelectedPlan(null); setCablePlans([]); }}
                    placeholder="1234567890" maxLength={12} className="h-12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))} placeholder="08012345678" maxLength={11} className="h-12" />
                </div>
                <Button
                  onClick={async () => {
                    if (!smartcard || smartcard.length < 10) { toast.error('Enter a valid smartcard number'); return; }
                    if (!selectedProvider) { toast.error('No provider selected'); return; }
                    setVerifying(true);
                    try {
                      const d = await vtu('verify_cable', {
                        service_id: selectedProvider.service_id,
                        smartcard_number: smartcard,
                        phone: phone || '08000000000',
                      });
                      // Edge function now returns: { success, customer_name, plans, raw }
                      const customerName = d.customer_name || d.raw?.smartcard_name || d.raw?.customer_name || '';
                      const plans: any[] = Array.isArray(d.plans) ? d.plans : [];
                      setVerifiedCustomerName(customerName);
                      setVerified(d.raw || d);
                      setCablePlans(plans);
                      if (plans.length === 0) toast.info('Verification successful — no plans returned by provider');
                    } catch (e: any) {
                      toast.error(e.message || 'Verification failed');
                    }
                    finally { setVerifying(false); }
                  }}
                  disabled={verifying || smartcard.length < 10}
                  className="w-full h-12"
                  style={{ background: catDef?.color, color: '#fff' }}
                >
                  {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : 'Verify Smartcard'}
                </Button>
              </>
            )}

            {/* Step B: account name + plans (show after verification) */}
            {verified && (
              <>
                {/* Account name */}
                <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs text-green-600 font-medium">Card Verified</p>
                      <p className="text-sm font-bold text-green-900">
                        {verifiedCustomerName || 'Card Verified'}
                      </p>
                      <p className="text-xs text-green-700">{smartcard}</p>
                    </div>
                  </div>
                  <button onClick={() => { setVerified(null); setSelectedPlan(null); setCablePlans([]); }}
                    className="text-xs text-blue-600 font-medium shrink-0">Change</button>
                </div>

                {/* Subscription plans */}
                {cablePlans.length > 0 ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Select Subscription Plan</p>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {cablePlans.map((plan: any, i: number) => {
                        const planId = plan.plan_code || plan.code || i;
                        const isSelected = selectedPlan === plan || selectedPlan?.plan_code === plan.plan_code;
                        return (
                          <button key={i} onClick={() => setSelectedPlan(plan)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all
                              ${isSelected ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-sm text-gray-900">{plan.plan_name || plan.name}</p>
                                {plan.duration && <p className="text-xs text-gray-400 mt-0.5">{plan.duration}</p>}
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="font-bold text-sm" style={{ color: isSelected ? catDef?.color : '#111827' }}>
                                  ₦{Number(plan.price || plan.amount || 0).toLocaleString()}
                                </p>
                                {isSelected && <CheckCircle className="w-4 h-4 ml-auto mt-1" style={{ color: catDef?.color }} />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No subscription plans available</p>
                )}
              </>
            )}
          </>}

          {/* EDUCATION */}
          {category === 'education' && <>
            {/* Step 1: Select provider — each VTUGate service IS a distinct product */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Select Product</p>
              {loadingProviders
                ? <div className="flex items-center gap-2 text-gray-400 py-2"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span></div>
                : <div className="grid grid-cols-2 gap-2">
                    {providers.map((p: any) => {
                      // Display the edu_type or service_name from VTUGate
                      const label = p.edu_type || p.service_name || p.network_name || 'PIN';
                      const isSelected = selectedProvider?.service_id === p.service_id;
                      return (
                        <button key={p.service_id}
                          onClick={async () => {
                            setSelectedProvider(p);
                            // product_code comes directly from VTUGate service
                            setEduProduct(p.product_code || p.service_name || '');
                            setEduPrice('');
                            // Auto-fetch price for this service
                            setFetchingEduPrice(true);
                            try {
                              const d = await vtu('get_education_price', { service_id: p.service_id });
                              const price = d.data?.price || d.data?.amount || d.data?.cost;
                              if (price) setEduPrice(String(price));
                            } catch (e) { /* user can enter manually */ }
                            finally { setFetchingEduPrice(false); }
                          }}
                          className={`p-3 rounded-xl border-2 text-sm font-bold text-left transition-all capitalize
                            ${isSelected ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>}
            </div>

            {/* Selected product summary */}
            {selectedProvider && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Selected Product</p>
                  <p className="text-sm font-bold text-green-900 capitalize">
                    {selectedProvider.edu_type || selectedProvider.service_name || selectedProvider.network_name}
                  </p>
                  <p className="text-xs text-green-600 font-mono">code: {selectedProvider.product_code}</p>
                </div>
                <button onClick={() => { setSelectedProvider(null); setEduProduct(''); setEduPrice(''); }}
                  className="text-xs text-blue-600 font-medium">Change</button>
              </div>
            )}

            {/* Phone + Quantity + Price */}
            {selectedProvider && <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))} placeholder="08012345678" maxLength={11} className="h-12" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <Input type="number" value={eduQty} onChange={e => setEduQty(e.target.value)} placeholder="1" min={1} max={5} className="h-12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price (₦)
                    {fetchingEduPrice && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                  </label>
                  <Input type="number" value={eduPrice} onChange={e => setEduPrice(e.target.value)}
                    placeholder={fetchingEduPrice ? 'Fetching…' : 'Enter price'} className="h-12" />
                </div>
              </div>
              {eduPrice && (
                <p className="text-sm font-bold text-green-700">
                  Total: ₦{(parseFloat(eduPrice||'0') * parseInt(eduQty||'1')).toLocaleString()}
                </p>
              )}
            </>}
          </>}

          {/* Pay Now — shows PIN modal first, then processes payment */}
          {category !== 'cable' && (
            <Button
              onClick={() => canPay() && setShowPin(true)}
              disabled={!canPay()}
              className="w-full h-12 text-base font-bold rounded-xl"
              style={canPay() ? { background: catDef?.color } : {}}>
              Pay Now
            </Button>
          )}
          {category === 'cable' && verified && selectedPlan && (
            <Button
              onClick={() => setShowPin(true)}
              disabled={!canPay()}
              className="w-full h-12 text-base font-bold rounded-xl"
              style={{ background: catDef?.color, color: '#fff' }}>
              Pay ₦{Number(selectedPlan.price || selectedPlan.amount || 0).toLocaleString()}
            </Button>
          )}
        </div>
      </div>

      {/* PIN confirmation modal */}
      <TransactionPinModal
        isOpen={showPin}
        onCancel={() => setShowPin(false)}
        onSuccess={() => { setShowPin(false); handlePay(); }}
        amount={
          category === 'cable' ? Number(selectedPlan?.price || selectedPlan?.amount || 0) :
          category === 'education' ? parseFloat(eduPrice || '0') * parseInt(eduQty || '1') :
          parseFloat(amount) || 0
        }
        currency="NGN"
        description={
          selectedProvider
            ? `${category === 'cable' ? (selectedProvider.tv_name || selectedProvider.network_name) :
               category === 'electricity' ? (selectedProvider.disco || selectedProvider.network_name) :
               selectedProvider.network_name} — ${
               category === 'cable' ? (selectedPlan?.plan_name || '') :
               category === 'electricity' ? `Meter ${meterNo}` :
               category === 'airtime' ? `Airtime for ${phone}` :
               category === 'education' ? (selectedProvider?.edu_type || selectedProvider?.service_name || 'Education Pin') :
               ''}`
            : ''
        }
      />
    </div>
  );
}