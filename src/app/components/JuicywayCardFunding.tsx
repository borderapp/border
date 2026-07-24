/**
 * User-facing Juicyway card funding component.
 * Embedded in AddMoney — replaces Flutterwave card payment.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/app/context/WalletContext';
import { CreditCard, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

declare global {
  interface Window {
    PayWithJuice?: any;
    PayWithJuiceHosted?: any;
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number, currency: string) => void;
  userId: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  userPhone?: string;
  defaultCurrency?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

const CURRENCY_ADDRESS: Record<string, { country: string; city: string; state: string; zip_code: string; phone: string }> = {
  NGN: { country: 'NG', city: 'Lagos',    state: 'Lagos',   zip_code: '100001',  phone: '+2348118873422' },
  USD: { country: 'US', city: 'New York', state: 'NY',      zip_code: '10001',   phone: '+14165550100' },
  CAD: { country: 'CA', city: 'Toronto',  state: 'ON',      zip_code: 'M5H 2N2', phone: '+14165550100' },
  EUR: { country: 'DE', city: 'Berlin',   state: 'Berlin',  zip_code: '10115',   phone: '+4930000000' },
  GBP: { country: 'GB', city: 'London',   state: 'England', zip_code: 'EC1A 1BB',phone: '+442071234567' },
  GHS: { country: 'GH', city: 'Accra',    state: 'Greater Accra', zip_code: '00233', phone: '+233201234567' },
  KES: { country: 'KE', city: 'Nairobi',  state: 'Nairobi', zip_code: '00100',   phone: '+254712345678' },
  ZAR: { country: 'ZA', city: 'Cape Town',state: 'Western Cape', zip_code: '8001', phone: '+27211234567' },
};

type Step = 'form' | 'processing' | 'success' | 'error';

export default function JuicywayCardFunding({
  isOpen, onClose, onSuccess,
  userId, userEmail, firstName, lastName, userPhone, defaultCurrency = 'NGN',
}: Props) {
  const { refreshBalances } = useWallet();
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync currency from parent when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrency(defaultCurrency);
      setStep('form');
      setAmount('');
      setErrorMsg('');
    }
  }, [isOpen, defaultCurrency]);

  // Load Juicyway SDK once
  useEffect(() => {
    if (window.PayWithJuice || window.PayWithJuiceHosted) {
      setSdkLoaded(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.juicyway.com/pay.js"]');
    if (existing) {
      existing.addEventListener('load', () => setSdkLoaded(true));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.juicyway.com/pay.js';
    script.async = true;
    script.onload = () => {
      setTimeout(() => {
        if (window.PayWithJuice || window.PayWithJuiceHosted) setSdkLoaded(true);
      }, 200);
    };
    document.head.appendChild(script);
  }, []);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return headers;
  };

  const handlePay = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) return toast.error('Enter a valid amount');
    if (amountNum < 1) return toast.error('Minimum amount is 1');

    if (!sdkLoaded) return toast.error('Payment SDK still loading, please wait');

    const widget = window.PayWithJuice || window.PayWithJuiceHosted;
    if (!widget) return toast.error('Payment SDK not available');

    setLoading(true);
    setStep('processing');

    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);
    const backendRef = `ord_${userId}_${ts}_${rand}`;
    const widgetRef  = `ord_${userId}_${ts}_${rand}_pay`;

    const addr = CURRENCY_ADDRESS[currency] || CURRENCY_ADDRESS['USD'];
    const amountInSmallestUnit = Math.round(amountNum * 100);

    try {
      const headers = await getAuthHeaders();

      // Create payment session on backend
      const res = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'initialize',
          payload: {
            customer: {
              first_name: firstName,
              last_name: lastName,
              email: userEmail,
              phone_number: userPhone || addr.phone,
              billing_address: {
                line1: '123 Main St',
                line2: '',
                city: addr.city,
                state: addr.state,
                country: addr.country,
                zip_code: addr.zip_code,
              },
              ip_address: '127.0.0.1',
            },
            description: 'Border Wallet Funding',
            currency,
            amount: amountInSmallestUnit,
            reference: backendRef,
            order: {
              identifier: backendRef,
              items: [{ name: 'Wallet Top-up', type: 'digital' }],
            },
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create payment session');
      }

      const data = await res.json();
      const sessionKey =
        data.payment_key || data.data?.key || data.data?.payment_key ||
        data.key || data.session_key;

      if (!sessionKey) {
        throw new Error(
          `No session key returned. ${data.error || 'Currency may not be supported for card payments.'}`
        );
      }

      // Launch widget with widgetRef (distinct from backendRef to avoid reference_exists)
      widget({
        key: sessionKey,
        amount: amountInSmallestUnit,
        currency,
        description: 'Border Wallet Funding',
        reference: widgetRef,
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: userEmail,
          phone_number: userPhone || addr.phone,
          billing_address: {
            line1: '123 Main St',
            line2: '',
            city: addr.city,
            state: addr.state,
            country: addr.country,
            zip_code: addr.zip_code,
          },
        },
        order: {
          identifier: widgetRef,
          items: [{ name: 'Wallet Top-up', type: 'digital' }],
        },
        onSuccess: async (response: any) => {
          setStep('success');
          setLoading(false);
          toast.success(`${currency} ${amountNum.toFixed(2)} added to your wallet!`);
          await refreshBalances();
          onSuccess(amountNum, currency);
        },
        onError: (error: any) => {
          const msg = error?.message || error?.error || 'Payment failed';
          setErrorMsg(msg);
          setStep('error');
          setLoading(false);
          toast.error('Payment failed: ' + msg);
        },
        onClose: () => {
          setLoading(false);
          if (step === 'processing') setStep('form');
        },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
      setStep('error');
      setLoading(false);
      toast.error(err.message || 'Payment failed');
    }
  };

  const currencySymbol: Record<string, string> = {
    NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'C$', GHS: 'GH₵', KES: 'KSh', ZAR: 'R',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Fund with Card
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            {!sdkLoaded && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading payment SDK...
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="NGN">NGN — Nigerian Naira</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="GHS">GHS — Ghanaian Cedi</option>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="ZAR">ZAR — South African Rand</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {currencySymbol[currency] ?? currency}
                </span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                  min="1"
                  step="0.01"
                />
              </div>
            </div>

            <Button
              onClick={handlePay}
              disabled={!amount || loading || !sdkLoaded}
              className="w-full"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : (
                `Pay ${amount ? `${currencySymbol[currency] ?? currency}${parseFloat(amount).toFixed(2)}` : ''}`
              )}
            </Button>

            <Button variant="ghost" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
            <p className="font-medium">Complete payment in the Juicyway window</p>
            <p className="text-sm text-gray-500">Do not close this page</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <div>
              <p className="font-bold text-green-700 text-lg">Payment Successful!</p>
              <p className="text-sm text-gray-500 mt-1">
                {currencySymbol[currency]}{parseFloat(amount || '0').toFixed(2)} added to your wallet
              </p>
            </div>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8 space-y-4">
            <XCircle className="w-14 h-14 text-red-500 mx-auto" />
            <div>
              <p className="font-bold text-red-700 text-lg">Payment Failed</p>
              <p className="text-sm text-gray-500 mt-1">{errorMsg}</p>
            </div>
            <Button className="w-full" onClick={() => setStep('form')}>Try Again</Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>Cancel</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
