import { useState, useEffect, useRef } from 'react';
import { Fingerprint, ScanFace, AlertCircle, LogIn } from 'lucide-react';
import { authenticateBiometric } from '@/lib/biometric';
import borderLogoIcon from '@/imports/ChatGPT_Image_Jun_29__2026__06_01_55_PM-removebg-preview.png';

interface BiometricUnlockScreenProps {
  onUnlocked: () => void;
  onUsePassword: () => void;
  userName?: string;
}

type State = 'idle' | 'scanning' | 'success' | 'error';

export default function BiometricUnlockScreen({
  onUnlocked,
  onUsePassword,
  userName,
}: BiometricUnlockScreenProps) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [retries, setRetries] = useState(0);
  const [prefs, setPrefs] = useState(getBiometricPrefsSync());
  const hasAutoTriggered = useRef(false);

  const isFaceID = prefs.biometryType === 'faceid';
  const BiometryIcon = isFaceID ? ScanFace : Fingerprint;
  const methodLabel = isFaceID ? 'Face ID' : 'Fingerprint';

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;
    const timer = setTimeout(() => triggerBiometric(), 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerBiometric = async () => {
    if (state === 'scanning') return;
    setState('scanning');
    setError('');

    const result = await authenticateBiometric('Unlock Border');

    if (result.success) {
      setState('success');
      setTimeout(() => onUnlocked(), 400);
    } else {
      const next = retries + 1;
      setRetries(next);
      setState('error');

      if (result.error !== 'Cancelled.') {
        setError(next >= 3 ? 'Too many failed attempts. Use your password.' : result.error || 'Try again.');
      } else {
        setState('idle');
      }
    }
  };

  const scanRingClass = (() => {
    if (state === 'scanning') return 'scale-110 border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.5)]';
    if (state === 'success') return 'scale-110 border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.5)]';
    if (state === 'error') return 'scale-100 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]';
    return 'scale-100 border-white/20 shadow-none';
  })();

  const iconColorClass = (() => {
    if (state === 'scanning') return 'text-blue-400';
    if (state === 'success') return 'text-emerald-400';
    if (state === 'error') return 'text-red-400';
    return 'text-white/80';
  })();

  const statusText = (() => {
    if (state === 'scanning') return `Scanning ${methodLabel}…`;
    if (state === 'success') return 'Verified!';
    if (state === 'error' && error) return error;
    return isFaceID ? 'Look at your camera to unlock' : 'Touch sensor to unlock';
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#06090f] select-none overflow-hidden">

      {/* Background glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-900/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[100px]" />
      </div>

      {/* Top section: logo + user */}
      <div className="relative z-10 flex flex-col items-center pt-16 pb-6 px-6">
        <img src={borderLogoIcon} alt="Border" className="w-12 h-12 object-contain mb-4 opacity-90" />
        <p className="text-white/40 text-xs font-semibold tracking-[0.2em] uppercase mb-6">Border</p>

        {userName && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-900/40 mb-3">
              {userName.charAt(0).toUpperCase()}
            </div>
            <p className="text-white text-lg font-semibold">{userName}</p>
            <p className="text-white/40 text-sm mt-0.5">Welcome back</p>
          </div>
        )}
        {!userName && (
          <p className="text-white/60 text-base">Welcome back</p>
        )}
      </div>

      {/* Center: biometric button */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-6">

        {/* Main tap target */}
        <button
          onClick={triggerBiometric}
          disabled={state === 'scanning' || state === 'success'}
          className="relative flex items-center justify-center focus:outline-none active:scale-95 transition-transform duration-150"
          aria-label={`Unlock with ${methodLabel}`}
        >
          {/* Outer pulse ring — only while scanning */}
          {state === 'scanning' && (
            <>
              <span className="absolute w-48 h-48 rounded-full border border-blue-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
              <span className="absolute w-40 h-40 rounded-full border border-blue-500/30 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }} />
            </>
          )}

          {/* Inner ring */}
          <span className={`relative w-36 h-36 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${scanRingClass}`}>
            {/* Thin progress ring while scanning */}
            {state === 'scanning' && (
              <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
            )}
            <BiometryIcon
              className={`w-16 h-16 transition-colors duration-300 ${iconColorClass}`}
              strokeWidth={1.25}
            />
          </span>
        </button>

        {/* Status text */}
        <div className="text-center min-h-[48px] flex flex-col items-center justify-center gap-2">
          <p className={`text-sm font-medium transition-colors duration-300 ${
            state === 'error' ? 'text-red-400' : state === 'success' ? 'text-emerald-400' : 'text-white/60'
          }`}>
            {statusText}
          </p>
          {state === 'error' && retries < 3 && (
            <button
              onClick={triggerBiometric}
              className="text-blue-400 text-sm font-semibold hover:text-blue-300 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>

        {/* Tap hint when idle */}
        {state === 'idle' && (
          <button
            onClick={triggerBiometric}
            className="px-8 py-3.5 rounded-full bg-white/8 border border-white/12 text-white/70 text-sm font-medium active:bg-white/12 transition-all"
          >
            Tap to unlock with {methodLabel}
          </button>
        )}
      </div>

      {/* Bottom: use password */}
      <div className="relative z-10 pb-12 flex flex-col items-center gap-2 px-6">
        <div className="w-10 h-px bg-white/10 mb-2" />
        <button
          onClick={onUsePassword}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm font-medium transition-colors py-2 px-4"
        >
          <LogIn className="w-4 h-4" />
          Use Password Instead
        </button>
      </div>
    </div>
  );
}

// Sync read for initial state (localStorage mirror of Capacitor Preferences)
function getBiometricPrefsSync() {
  try {
    const raw = localStorage.getItem('border_biometric_prefs');
    if (raw) return JSON.parse(raw) as { biometryType?: 'fingerprint' | 'faceid' | 'none' };
  } catch {}
  return { biometryType: 'fingerprint' as const };
}
