import { useState, useEffect } from 'react';
import {
  Fingerprint, ScanFace, CheckCircle2, AlertCircle, X,
  Loader2, KeyRound, Shield,
} from 'lucide-react';
import {
  checkBiometryAvailable,
  enrollBiometric,
  clearBiometricPrefs,
  saveBiometricPrefs,
  isNative,
} from '@/lib/biometric';
import { supabase } from '@/lib/supabase';

interface BiometricEnrollModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'enroll' | 'disable';
}

type Step = 'checking' | 'unsupported' | 'pin' | 'scanning' | 'success' | 'error';

export default function BiometricEnrollModal({
  open, onClose, onSuccess, mode = 'enroll',
}: BiometricEnrollModalProps) {
  const [step, setStep] = useState<Step>('checking');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometryType, setBiometryType] = useState<'fingerprint' | 'faceid' | 'none'>('fingerprint');

  useEffect(() => {
    if (!open) {
      setTimeout(() => { setStep('checking'); setPin(''); setErrorMsg(''); }, 300);
      return;
    }
    if (mode === 'disable') return;
    checkDevice();
  }, [open, mode]);

  const checkDevice = async () => {
    setStep('checking');
    const info = await checkBiometryAvailable();
    setBiometryType(info.biometryType);
    if (!info.available) {
      setStep('unsupported');
      return;
    }
    setStep('pin');
  };

  const verifyPinAndEnroll = async () => {
    if (pin.length < 4) { setErrorMsg('Enter your 4-digit transaction PIN.'); return; }
    setErrorMsg('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('transaction_pin')
        .eq('id', user.id)
        .single();

      if (!profile?.transaction_pin) throw new Error('No Transaction PIN set. Create one in Settings → Transaction PIN first.');
      if (profile.transaction_pin !== pin) throw new Error('Incorrect PIN. Please try again.');

      setLoading(false);
      setStep('scanning');

      const result = await enrollBiometric();
      if (result.success) {
        setStep('success');
        setTimeout(() => { onSuccess(); onClose(); }, 1800);
      } else {
        setErrorMsg(result.error || 'Enrollment failed.');
        setStep('error');
      }
    } catch (e: any) {
      setLoading(false);
      setErrorMsg(e.message || 'Verification failed.');
      setStep('error');
    }
  };

  const handleDisable = async () => {
    await clearBiometricPrefs();
    onSuccess();
    onClose();
  };

  const BiometryIcon = biometryType === 'faceid' ? ScanFace : Fingerprint;
  const methodLabel = biometryType === 'faceid' ? 'Face ID' : 'Fingerprint';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={state => { if (step !== 'scanning' && step !== 'success') onClose(); }}
      />

      {/* Sheet */}
      <div className="relative bg-[#0f1623] w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl overflow-hidden shadow-2xl border border-white/5">

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        {/* Close button */}
        {(step !== 'scanning' && step !== 'success') && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-6 pt-5">
          {/* ── DISABLE MODE ── */}
          {mode === 'disable' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                <BiometryIcon className="w-8 h-8 text-red-400" strokeWidth={1.25} />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">Disable Biometrics</h2>
              <p className="text-white/40 text-sm mb-7">
                {methodLabel} login will be removed from this device. You can re-enable it anytime in Security Settings.
              </p>
              <button
                onClick={handleDisable}
                className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold transition-colors mb-3"
              >
                Disable {methodLabel}
              </button>
              <button onClick={onClose} className="w-full py-3 text-white/40 text-sm">Cancel</button>
            </div>
          )}

          {/* ── CHECKING ── */}
          {mode === 'enroll' && step === 'checking' && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-4" />
              <p className="text-white/50 text-sm">Checking device capabilities…</p>
            </div>
          )}

          {/* ── UNSUPPORTED ── */}
          {mode === 'enroll' && step === 'unsupported' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-white text-lg font-bold mb-2">
                {isNative() ? 'Biometrics Not Set Up' : 'Native App Required'}
              </h2>
              <p className="text-white/40 text-sm mb-6">
                {isNative()
                  ? 'Please enrol fingerprints or Face ID in your device Settings, then return here.'
                  : 'Biometric login is only available in the Border mobile app. Download the app to enable this feature.'}
              </p>
              <button onClick={onClose} className="w-full py-4 rounded-2xl bg-white/8 border border-white/10 text-white/70 font-semibold">
                Got it
              </button>
            </div>
          )}

          {/* ── PIN VERIFY ── */}
          {mode === 'enroll' && step === 'pin' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <KeyRound className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-white text-lg font-bold leading-tight">Verify Your PIN</h2>
                  <p className="text-white/40 text-xs mt-0.5">Confirm your identity before enabling {methodLabel}</p>
                </div>
              </div>

              {/* PIN dots */}
              <div className="flex gap-3 justify-center mb-5">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-150 border ${
                      pin[i]
                        ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                        : 'border-white/10 bg-white/4 text-transparent'
                    }`}
                  >
                    {pin[i] ? '●' : ''}
                  </div>
                ))}
              </div>

              {errorMsg && (
                <p className="text-red-400 text-sm text-center mb-3">{errorMsg}</p>
              )}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, idx) => (
                  <button
                    key={idx}
                    disabled={!k}
                    onClick={() => {
                      if (!k) return;
                      if (k === '⌫') setPin(p => p.slice(0, -1));
                      else if (pin.length < 4) setPin(p => p + k);
                    }}
                    className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                      k ? 'bg-white/8 hover:bg-white/14 text-white border border-white/6' : ''
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <button
                onClick={verifyPinAndEnroll}
                disabled={loading || pin.length < 4}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BiometryIcon className="w-4 h-4" />}
                {loading ? 'Verifying…' : `Continue`}
              </button>
            </div>
          )}

          {/* ── SCANNING ── */}
          {mode === 'enroll' && step === 'scanning' && (
            <div className="flex flex-col items-center py-8">
              <div className="relative w-24 h-24 mb-6">
                <span className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" style={{ animationDuration: '1.4s' }} />
                <span className="absolute inset-2 rounded-full border border-blue-500/20 animate-ping" style={{ animationDuration: '1.1s', animationDelay: '0.2s' }} />
                <div className="absolute inset-0 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <BiometryIcon className="w-10 h-10 text-blue-400" strokeWidth={1.25} />
                </div>
              </div>
              <h2 className="text-white text-lg font-bold mb-2">
                {biometryType === 'faceid' ? 'Look at your camera' : 'Place your finger'}
              </h2>
              <p className="text-white/40 text-sm text-center">
                Follow the prompt on your device to register your {methodLabel.toLowerCase()}.
              </p>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {mode === 'enroll' && step === 'success' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">{methodLabel} Enabled!</h2>
              <p className="text-white/40 text-sm text-center">
                You can now unlock Border with your {methodLabel.toLowerCase()}.
              </p>
            </div>
          )}

          {/* ── ERROR ── */}
          {mode === 'enroll' && step === 'error' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-white text-lg font-bold mb-2">Enrollment Failed</h2>
              <p className="text-white/40 text-sm mb-6">{errorMsg}</p>
              <button
                onClick={() => { setPin(''); setStep('pin'); }}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold mb-3"
              >
                Try Again
              </button>
              <button onClick={onClose} className="w-full py-3 text-white/40 text-sm">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
