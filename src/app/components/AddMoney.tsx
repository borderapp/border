import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Landmark, CheckCircle, XCircle, Loader2, Copy, Check, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/app/context/WalletContext';
import { useJuicywaySDK } from '@/hooks/useJuicywaySDK';
import InteracIncomingTransfer from './InteracIncomingTransfer';
import { createTransactionNotification } from '@/utils/notification-helper';

interface AddMoneyProps {
  onBack: () => void;
}

type PaymentStep = 'form' | 'processing' | 'complete' | 'error';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

const CURRENCIES = [
  { code: 'NGN', name: 'Nigerian Naira',  flag: '🇳🇬', symbol: '₦' },
  { code: 'USD', name: 'US Dollar',       flag: '🇺🇸', symbol: '$' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', symbol: 'C$' },
];

const CURRENCY_ADDRESS: Record<string, { country: string; city: string; state: string; zip_code: string; phone: string }> = {
  NGN: { country: 'NG', city: 'Lagos',    state: 'Lagos', zip_code: '100001',  phone: '+2348118873422' },
  USD: { country: 'US', city: 'New York', state: 'NY',    zip_code: '10001',   phone: '+14165550100'  },
  CAD: { country: 'CA', city: 'Toronto',  state: 'ON',    zip_code: 'M5H 2N2', phone: '+14165550100'  },
};

const BANK_DETAILS: Record<string, { label: string; value: string; copyable?: boolean }[]> = {
  NGN: [
    { label: 'Bank', value: 'Border / Juicyway' },
    { label: 'Note', value: 'Use card payment above to fund your NGN wallet instantly.' },
  ],
  USD: [
    { label: 'Bank',           value: 'Silvergate Bank',   copyable: false },
    { label: 'Account Number', value: '1234567890',         copyable: true  },
    { label: 'Routing Number', value: '121000248',          copyable: true  },
    { label: 'SWIFT',          value: 'SIVGUS66XXX',        copyable: true  },
    { label: 'Note', value: 'International wires arrive in 1–3 business days.' },
  ],
  CAD: [
    { label: 'Bank',        value: 'Royal Bank of Canada', copyable: false },
    { label: 'Account',     value: '1234567',              copyable: true  },
    { label: 'Transit',     value: '00000',                copyable: true  },
    { label: 'Institution', value: '003',                  copyable: true  },
    { label: 'SWIFT',       value: 'ROYCCAT2XXX',          copyable: true  },
    { label: 'Note', value: 'Or use Interac e-Transfer below for instant funding.' },
  ],
};

export default function AddMoney({ onBack }: AddMoneyProps) {
  const { refreshBalances } = useWallet();
  const { sdkLoaded, sdkObject } = useJuicywaySDK(false);

  const [userData, setUserData]     = useState<any>(null);
  const [currency, setCurrency]     = useState('NGN');
  const [amount, setAmount]         = useState('');
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading]       = useState(false);
  const [showBank, setShowBank]     = useState(false);
  const [copied, setCopied]         = useState<string | null>(null);
  const [showInterac, setShowInterac] = useState(false);

  useEffect(() => { loadUserData(); }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setUserData({
          id: user.id,
          email: user.email,
          firstName: profile.first_name || 'User',
          lastName:  profile.last_name  || '',
          phone:     profile.phone      || '',
          accountNumber: profile.account_number || '',
        });
      } else {
        const m = user.user_metadata || {};
        setUserData({
          id: user.id,
          email: user.email,
          firstName: m.first_name || m.name?.split(' ')[0] || 'User',
          lastName:  m.last_name  || m.name?.split(' ')[1] || '',
          phone:     m.phone || '',
          accountNumber: '',
        });
      }
    } catch (_e) { /* ignore */ }
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const h: Record<string, string> = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY };
    if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
    return h;
  };

  const handleCurrencyChange = (c: string) => {
    setCurrency(c);
    setPaymentStep('form');
    setErrorMessage('');
    setAmount('');
    setShowBank(false);
  };

  const handlePay = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) return toast.error('Enter a valid amount');

    // Access window.Juicyway directly at call-time — same object the admin component uses
    // via sdkObject (the hook's fallback resolves window.Juicyway, not window.PayWithJuice).
    // Reading it directly avoids any stale React-state capture.
    const juicywayGlobal = (window as any).Juicyway;
    const sdkFn = juicywayGlobal?.PayWithJuice || juicywayGlobal?.PayWithJuiceHosted;

    if (!sdkFn) {
      toast.error('Payment SDK not ready — please wait a moment and try again');
      return;
    }

    setLoading(true);
    setPaymentStep('processing');
    setErrorMessage('');

    const ts   = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);
    // Short reference — Juicyway rejects full UUIDs (too long). Wallet is credited
    // directly in onSuccess via Supabase instead of relying on webhook reference parsing.
    const shortUid = (userData?.id || 'user').replace(/-/g, '').substring(0, 8);
    const freshReference  = `ord_${shortUid}_${ts}_${rand}`;
    const widgetReference = `ord_${shortUid}_${ts}_${rand}_pay`;

    const addr = CURRENCY_ADDRESS[currency] || CURRENCY_ADDRESS['USD'];
    const amountInCents = Math.round(amountNum * 100);

    const firstName = userData?.firstName || 'User';
    const lastName  = userData?.lastName  || firstName; // never send empty string — Juicyway rejects it

    // Use user phone only if it looks like it has a country code (+), else fall back to addr default
    const userPhone = userData?.phone;
    const phone = (userPhone && userPhone.startsWith('+')) ? userPhone : addr.phone;

    const customerInfo = {
      first_name:   firstName,
      last_name:    lastName,
      email:        userData?.email || 'user@border.app',
      phone_number: phone,
      billing_address: {
        line1: '123 Main St',
        line2: 'Suite 1',   // never empty — Juicyway validation requires non-empty line2
        city: addr.city, state: addr.state,
        country: addr.country, zip_code: addr.zip_code,
      },
      ip_address: '127.0.0.1',
    };

    try {
      const headers = await getAuthHeaders();

      const res = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'initialize',
          payload: {
            customer: customerInfo,
            description: 'Border Wallet Funding',
            currency,
            amount: amountInCents,
            reference: freshReference,
            order: { identifier: freshReference, items: [{ name: 'Wallet Top-up', type: 'digital' }] },
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create payment session');
      }

      const data = await res.json();

      const sessionKey =
        data.data?.key         || data.data?.payment_key ||
        data.data?.session_key || data.data?.token       ||
        data.key               || data.payment_key       ||
        data.session_key       || data.token;


      if (!sessionKey) {
        throw new Error(data.error || 'No session key returned. This currency may not support card payments.');
      }

      // Call the SDK exactly as the working admin component does —
      // method call on the object so `this` binding is preserved.
      const widgetPayload = {
        key: sessionKey,
        amount: amountInCents,
        currency,
        description: 'Border Wallet Funding',
        reference: widgetReference,
        customer: {
          first_name:      customerInfo.first_name,
          last_name:       customerInfo.last_name,
          email:           customerInfo.email,
          phone_number:    customerInfo.phone_number,
          billing_address: customerInfo.billing_address,
        },
        order: {
          identifier: widgetReference,
          items: [{ name: 'Wallet Top-up', type: 'digital' }],
        },
        onSuccess: async (response: any) => {
          setPaymentStep('complete');
          setLoading(false);
          const sym = CURRENCIES.find(c => c.code === currency)?.symbol ?? currency;
          toast.success(`${sym}${amountNum.toFixed(2)} added to your wallet!`);

          // Credit wallet directly via Supabase — don't rely on webhook
          // (short reference means webhook can't parse userId back out)
          try {
            const userId = userData?.id;
            if (userId) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('wallets')
                .eq('id', userId)
                .single();

              const wallets = profile?.wallets || {};
              wallets[currency] = (wallets[currency] || 0) + amountNum;

              await supabase
                .from('profiles')
                .update({ wallets })
                .eq('id', userId);

              // Create transaction record so it appears in history
              const ref = `JW-CARD-${widgetReference.toUpperCase()}`;
              await supabase.from('transactions').insert({
                user_id: userId,
                type: 'deposit',
                amount: amountNum,
                currency,
                status: 'completed',
                description: `Card funding — ${currency} wallet`,
                reference: ref,
                transaction_reference: ref,
                provider: 'juicyway_card',
                metadata: { payment_method: 'card', reference: widgetReference, response },
              });

              // Create notification
              await createTransactionNotification(
                userId,
                'received',
                amountNum,
                currency,
                'Card Payment',
                ref
              );
            }
          } catch (creditErr) {
          }

          await refreshBalances();
          await loadUserData();
        },
        onError: (error: any) => {
          const msg = error?.message || error?.error || error?.details || 'Payment failed';
          setErrorMessage(msg);
          setPaymentStep('error');
          setLoading(false);
          toast.error('Payment failed: ' + msg);
        },
        onClose: () => {
          setLoading(false);
          setPaymentStep(prev => prev === 'processing' ? 'form' : prev);
        },
      };

      // Use method-call style like the admin component to preserve `this` context
      if (juicywayGlobal.PayWithJuice) {
        juicywayGlobal.PayWithJuice(widgetPayload);
      } else {
        juicywayGlobal.PayWithJuiceHosted(widgetPayload);
      }

    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong');
      setPaymentStep('error');
      setLoading(false);
      toast.error(err.message || 'Payment failed');
    }
  };

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    toast.success('Copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleReset = () => { setPaymentStep('form'); setErrorMessage(''); setAmount(''); };

  const selected = CURRENCIES.find(c => c.code === currency)!;
  const bankRows = BANK_DETAILS[currency] || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Add Money</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* ── Currency Picker ── */}
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Select Currency</p>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => handleCurrencyChange(c.code)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all
                  ${currency === c.code
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              >
                <span className="text-2xl">{c.flag}</span>
                <span className="text-xs font-bold">{c.code}</span>
                <span className="text-[10px] text-gray-400">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Card Payment ── */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-white flex-shrink-0" />
            <div>
              <p className="text-white font-bold text-sm">Fund Your Account</p>
              <p className="text-blue-100 text-xs">Instant · Secure · Multiple payment methods</p>
            </div>
          </div>

          <div className="p-4">
            {paymentStep === 'form' && (
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                    {selected.symbol}
                  </span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="pl-8 text-lg"
                    min="1"
                    step="0.01"
                  />
                </div>

                {!sdkLoaded && !(window as any).Juicyway && (
                  <p className="text-xs text-amber-600 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Connecting to payment provider…
                  </p>
                )}

                <Button
                  onClick={handlePay}
                  disabled={!amount || !parseFloat(amount) || loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                >
                  {`Add ${amount && parseFloat(amount) > 0 ? `${selected.symbol}${parseFloat(amount).toFixed(2)}` : 'Money'}`}
                </Button>

                {/* PIN modal */}
              </div>
            )}

            {paymentStep === 'processing' && (
              <div className="text-center py-8 space-y-3">
                <Loader2 className="w-10 h-10 text-blue-500 mx-auto animate-spin" />
                <p className="font-medium text-gray-800">Complete your payment</p>
                <p className="text-xs text-gray-400">Do not close this page</p>
              </div>
            )}

            {paymentStep === 'complete' && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
                <div>
                  <p className="font-bold text-green-700 text-lg">Payment Successful!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selected.symbol}{parseFloat(amount || '0').toFixed(2)} added to your {currency} wallet
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleReset}>Add More</Button>
                  <Button variant="outline" className="flex-1" onClick={onBack}>Done</Button>
                </div>
              </div>
            )}

            {paymentStep === 'error' && (
              <div className="text-center py-8 space-y-4">
                <XCircle className="w-14 h-14 text-red-500 mx-auto" />
                <div>
                  <p className="font-bold text-red-700">Payment Failed</p>
                  <p className="text-xs text-gray-500 mt-1">{errorMessage}</p>
                </div>
                <Button className="w-full" onClick={handleReset}>Try Again</Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Interac (CAD only) ── */}
        {currency === 'CAD' && (
          <button
            onClick={() => setShowInterac(true)}
            className="w-full flex items-center justify-between bg-white rounded-2xl border px-4 py-3 hover:border-red-300 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍁</span>
              <div className="text-left">
                <p className="font-bold text-sm text-gray-900">Interac e-Transfer</p>
                <p className="text-xs text-gray-500">Generate a payment link — Instant</p>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
          </button>
        )}

        <p className="text-center text-[10px] text-gray-400 pb-4">
          Your funds are safe and secured with bank-grade encryption
        </p>
      </div>

      <InteracIncomingTransfer
        isOpen={showInterac}
        onClose={() => setShowInterac(false)}
        onSuccess={async () => {
          toast.success('Payment link generated! Share it to receive funds.');
          await refreshBalances();
        }}
      />
    </div>
  );
}
