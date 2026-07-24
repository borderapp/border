import { useState } from 'react';
import { Fingerprint, KeyRound, Loader2, AlertCircle, X } from 'lucide-react';
import { authenticateBiometric, getBiometricPrefsSync } from '@/lib/biometric';

interface BiometricConfirmProps {
  open: boolean;
  title?: string;
  description?: string;
  onConfirmed: () => void;
  onUsePIN: () => void;
  onCancel: () => void;
}

export default function BiometricConfirm({
  open, title = 'Confirm Action', description, onConfirmed, onUsePIN, onCancel,
}: BiometricConfirmProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retries, setRetries] = useState(0);

  const prefs = getBiometricPrefsSync();
  const isFaceID = prefs.preferredMethod === 'faceid';
  const methodLabel = isFaceID ? 'Face ID' : 'Fingerprint';

  const handleBiometric = async () => {
    setError('');
    setLoading(true);
    const result = await authenticateBiometric();
    setLoading(false);
    if (result.success) {
      onConfirmed();
    } else {
      const next = retries + 1;
      setRetries(next);
      setError(next >= 3 ? 'Too many attempts. Use your PIN instead.' : result.error || 'Failed.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${
            loading ? 'bg-blue-100 ring-4 ring-blue-200 animate-pulse' : 'bg-slate-100'
          }`}>
            <Fingerprint className={`w-8 h-8 ${loading ? 'text-blue-600' : 'text-slate-500'}`} />
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-1">{title}</h2>
          {description && <p className="text-slate-500 text-sm mb-5">{description}</p>}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4 w-full text-left">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleBiometric}
            disabled={loading || retries >= 3}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mb-3"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Fingerprint className="w-4 h-4" />
            )}
            {loading ? `Verifying ${methodLabel}…` : `Confirm with ${methodLabel}`}
          </button>

          <button
            onClick={onUsePIN}
            className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium py-2 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            Use Transaction PIN
          </button>
        </div>
      </div>
    </div>
  );
}
