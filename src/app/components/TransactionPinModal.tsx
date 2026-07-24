/**
 * TransactionPinModal
 * Reusable 4-digit PIN entry modal used before every wallet debit.
 * Usage:
 *   <TransactionPinModal
 *     isOpen={showPin}
 *     onSuccess={() => proceedWithPayment()}
 *     onCancel={() => setShowPin(false)}
 *     amount={1000}
 *     description="MTN Airtime — 08012345678"
 *   />
 */

import { useState, useRef, useEffect } from 'react';
import { X, Lock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TransactionPinModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  amount?: number;
  currency?: string;
  description?: string;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function TransactionPinModal({
  isOpen, onSuccess, onCancel, amount, currency = 'NGN', description,
}: TransactionPinModalProps) {
  const [pin, setPin]           = useState(['', '', '', '']);
  const [error, setError]       = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError('');
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [isOpen]);

  const handleDigit = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...pin];
    next[idx] = digit;
    setPin(next);
    setError('');
    if (digit && idx < 3) {
      inputRefs[idx + 1].current?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      inputRefs[idx - 1].current?.focus();
    }
    if (e.key === 'Enter' && pin.every(d => d)) {
      handleVerify();
    }
  };

  const handleVerify = async () => {
    const enteredPin = pin.join('');
    if (enteredPin.length < 4) { setError('Enter your 4-digit PIN'); return; }

    setVerifying(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const storedHash = user.user_metadata?.transaction_pin_hash;
      if (!storedHash) {
        setError('No Transaction PIN set. Please create one in Settings.');
        return;
      }

      const enteredHash = await sha256(enteredPin);
      if (enteredHash !== storedHash) {
        setPin(['', '', '', '']);
        inputRefs[0].current?.focus();
        setError('Incorrect PIN. Please try again.');
        return;
      }

      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  const filled = pin.filter(d => d).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* Sheet */}
      <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-10 shadow-2xl">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Confirm Transaction</p>
              <p className="text-xs text-gray-400">Enter your 4-digit PIN</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Transaction summary */}
        {(amount || description) && (
          <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-6 text-center">
            {amount && (
              <p className="text-2xl font-extrabold text-gray-900">
                {currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency}
                {amount.toLocaleString()}
              </p>
            )}
            {description && <p className="text-sm text-gray-500 mt-0.5 truncate">{description}</p>}
          </div>
        )}

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {pin.map((digit, i) => (
            <div key={i} className="relative">
              <input
                ref={inputRefs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-14 h-14 text-center text-2xl font-bold border-2 rounded-2xl outline-none transition-all
                  bg-white caret-transparent select-none"
                style={{
                  borderColor: error ? '#ef4444' : digit ? '#2563eb' : '#e5e7eb',
                  color: digit ? '#111827' : 'transparent',
                }}
              />
              {/* Dot indicator */}
              {digit && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3 h-3 bg-blue-600 rounded-full" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mb-4 justify-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleVerify}
          disabled={filled < 4 || verifying}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all disabled:opacity-40"
          style={{ background: filled === 4 && !verifying ? '#2563eb' : '#9ca3af' }}
        >
          {verifying
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Verifying…</span>
            : 'Confirm'}
        </button>

        <button onClick={onCancel} className="w-full mt-3 py-3 text-sm text-gray-500 font-medium">
          Cancel
        </button>
      </div>
    </div>
  );
}
