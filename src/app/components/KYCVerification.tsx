import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import {
  ShieldCheck, Loader2, ArrowRight, ChevronLeft,
  CheckCircle2, AlertCircle, Phone,
} from 'lucide-react';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

interface KYCVerificationProps {
  onComplete: () => void;
  skipable?: boolean;   // Settings re-verification can be dismissed
  onSkip?: () => void;
}

type Step = 'bvn_form' | 'bvn_otp' | 'done';

async function kycApi(action: string, payload: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON,
  };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/strowallet-cards`, {
    method: 'POST', headers, body: JSON.stringify({ action, ...payload }),
  });
  const d = await res.json();
  if (!res.ok || d.error) {
    // Surface raw Strowallet detail if available
    const rawMsg = d.raw?.message || d.raw?.error;
    throw new Error(rawMsg || d.error || `Request failed (${res.status})`);
  }
  return d;
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
        done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
      }`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : label}
      </div>
    </div>
  );
}

export default function KYCVerification({ onComplete, skipable, onSkip }: KYCVerificationProps) {
  const [step, setStep]           = useState<Step>('bvn_form');
  const [loading, setLoading]     = useState(true); // true until profile check completes
  const [resending, setResending] = useState(false);
  const [error, setError]         = useState('');
  const [trx, setTrx]             = useState('');
  const [bvnNumber, setBvnNumber] = useState('');
  const [bvnPhone, setBvnPhone]   = useState('');
  const [altPhone, setAltPhone]   = useState('');
  const [showAltPhone, setShowAltPhone] = useState(false);
  const [userId, setUserId]       = useState<string | undefined>();

  const [bvn, setBvn] = useState({ number: '', firstName: '', lastName: '', dob: '', phone: '' });
  const [otp, setOtp] = useState('');

  const stepIndex = { bvn_form: 0, bvn_otp: 1, done: 2 }[step];

  const setF = (setter: any) => (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter((f: any) => ({ ...f, [key]: e.target.value }));

  const maskPhone = (p: string) => p.length >= 7
    ? p.slice(0, 3) + '*'.repeat(p.length - 6) + p.slice(-3) : p;

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id);
    return user?.id;
  };

  // On mount: if BVN already verified, nothing left to do
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('bvn_verified')
          .eq('id', user.id)
          .single();
        if (profile?.bvn_verified) {
          onComplete();
          return;
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  // ── Step 1: send BVN details → Strowallet returns trx, Termii sends OTP ──
  const handleBvnSubmit = async () => {
    if (!bvn.number || bvn.number.length !== 11) { setError('Enter your 11-digit BVN'); return; }
    if (!bvn.firstName || !bvn.lastName)          { setError('First and last name required'); return; }
    if (!bvn.dob)                                  { setError('Date of birth required (DD-MM-YYYY)'); return; }
    if (!bvn.phone)                                { setError('Phone number required'); return; }
    setError(''); setLoading(true);
    try {
      const uid = userId || await getUser();
      const d = await kycApi('kyc_verify_bvn', {
        number: bvn.number,
        firstName: bvn.firstName.toUpperCase(),
        lastName: bvn.lastName.toUpperCase(),
        dateOfBirth: bvn.dob,
        phoneNumber: bvn.phone,
        user_id: uid,
      });
      // trx captured silently — never shown to user
      setTrx(d.trx);
      setBvnNumber(bvn.number);
      setBvnPhone(bvn.phone);
      setAltPhone(bvn.phone); // default resend target = same phone
      // Step transition — explicit to prevent any race condition
      setStep('bvn_otp');
      toast.success('OTP sent — check the phone linked to your BVN');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend: send same stored OTP to same or different phone via Termii ────
  const handleResend = async () => {
    const phone = altPhone || bvnPhone;
    if (!phone) { setError('Phone number required for resend'); return; }
    setResending(true); setError('');
    try {
      const uid = userId || await getUser();
      await kycApi('kyc_resend_otp', { user_id: uid, phone });
      setOtp('');
      toast.success(`OTP resent to ${maskPhone(phone)}`);
      setShowAltPhone(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResending(false);
    }
  };

  // ── Step 2: user enters OTP, trx auto-sent from state ────────────────────
  const handleOtpSubmit = async () => {
    if (!otp || otp.length < 4) { setError('Enter the OTP sent to your phone'); return; }
    if (!trx) { setError('Session expired — please go back and resend'); return; }
    setError(''); setLoading(true);
    try {
      const uid = userId || await getUser();
      await kycApi('kyc_confirm_bvn', { trx, otp, user_id: uid, bvn_number: bvnNumber });
      setStep('done');
      toast.success('BVN verified!');
      setTimeout(onComplete, 1000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: submit NIN ────────────────────────────────────────────────────

  // Show spinner while we check existing verification status
  if (loading && step === 'bvn_form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-start px-4 py-10 overflow-y-auto">

      {/* Header */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <span className="text-white font-bold text-lg">Identity Verification</span>
          </div>
          {skipable && onSkip && (
            <button onClick={onSkip} className="text-white/40 text-sm hover:text-white/70 transition-colors">Skip for now</button>
          )}
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2">
          <StepDot active={step === 'bvn_form'} done={stepIndex > 0} label="1" />
          <div className={`flex-1 h-0.5 rounded transition-all ${stepIndex > 0 ? 'bg-emerald-500' : 'bg-white/10'}`} />
          <StepDot active={step === 'bvn_otp'} done={stepIndex > 1} label="2" />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-white/30 font-medium">
          <span>BVN Details</span>
          <span>Confirm OTP</span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">

        {/* ── BVN FORM ── */}
        {step === 'bvn_form' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-white text-xl font-bold mb-1">Bank Verification Number</h2>
              <p className="text-white/40 text-sm">Your BVN links your bank accounts. Dial <span className="text-blue-400 font-mono">*565*0#</span> to retrieve it.</p>
            </div>

            <div>
              <Label className="text-white/60 text-xs">BVN (11 digits)</Label>
              <Input
                value={bvn.number}
                onChange={e => setBvn(f => ({ ...f, number: e.target.value.replace(/\D/g,'').slice(0,11) }))}
                placeholder="e.g. 22345678901"
                inputMode="numeric" maxLength={11}
                className="mt-1 bg-white/8 border-white/15 text-white placeholder:text-white/30 h-12"
              />
              {bvn.number.length > 0 && (
                <p className={`text-[11px] mt-1 ${bvn.number.length === 11 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {bvn.number.length === 11 ? '✓ Valid length' : `${11 - bvn.number.length} more digits needed`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">First Name</Label>
                <Input value={bvn.firstName} onChange={setF(setBvn)('firstName')}
                  placeholder="JOHN" className="mt-1 bg-white/8 border-white/15 text-white placeholder:text-white/30 h-11 uppercase" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Last Name</Label>
                <Input value={bvn.lastName} onChange={setF(setBvn)('lastName')}
                  placeholder="DOE" className="mt-1 bg-white/8 border-white/15 text-white placeholder:text-white/30 h-11 uppercase" />
              </div>
            </div>

            <div>
              <Label className="text-white/60 text-xs">Date of Birth (DD-MM-YYYY)</Label>
              <Input value={bvn.dob} onChange={setF(setBvn)('dob')}
                placeholder="15-01-1995"
                className="mt-1 bg-white/8 border-white/15 text-white placeholder:text-white/30 h-11" />
              <p className="text-[11px] text-white/30 mt-1">Must match your BVN registration — format: DD-MM-YYYY</p>
            </div>

            <div>
              <Label className="text-white/60 text-xs">Phone (local format)</Label>
              <Input value={bvn.phone} onChange={setF(setBvn)('phone')}
                placeholder="08012345678" inputMode="tel"
                className="mt-1 bg-white/8 border-white/15 text-white placeholder:text-white/30 h-11" />
              <p className="text-[11px] text-white/30 mt-1">Phone number registered with your BVN — OTP will be sent here</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <Button onClick={handleBvnSubmit} disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Send OTP</span><ArrowRight className="w-4 h-4 ml-2" /></>}
            </Button>
          </div>
        )}

        {/* ── BVN OTP ── */}
        {step === 'bvn_otp' && (
          <div className="space-y-5">
            <div>
              <button onClick={() => { setStep('bvn_form'); setOtp(''); setError(''); }}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-white text-xl font-bold mb-1">Enter OTP</h2>
              <p className="text-white/40 text-sm">
                A one-time code was sent to the phone number linked to your BVN. It may take up to 60 seconds.
              </p>
            </div>

            {/* Phone + auto-trx info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-400 shrink-0" />
                <p className="text-blue-200 text-sm">
                  OTP sent to <span className="font-mono font-bold text-white">{maskPhone(bvnPhone)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-blue-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <p className="text-[11px] text-white/40">
                  Transaction ID captured automatically — you only need to enter the OTP below
                </p>
              </div>
            </div>

            {/* OTP input */}
            <div>
              <Label className="text-white/60 text-xs">Enter the OTP from your phone</Label>
              <Input
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setError(''); }}
                placeholder="• • • • • •"
                inputMode="numeric" maxLength={6} autoFocus
                className="mt-1 bg-white/8 border-white/15 text-white placeholder:text-white/30 h-16 text-center text-3xl tracking-[0.5em] font-mono"
              />
              {otp.length > 0 && otp.length < 6 && (
                <p className="text-amber-400 text-[11px] mt-1 text-center">{6 - otp.length} more digits</p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleOtpSubmit}
              disabled={loading || otp.length < 4}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm OTP & Verify BVN'}
            </Button>

            {/* Resend section */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              {!showAltPhone ? (
                <button
                  onClick={() => setShowAltPhone(true)}
                  disabled={resending || loading}
                  className="w-full text-white/40 text-sm py-2 hover:text-white/70 transition-colors"
                >
                  Don't have access to that number?
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-white/50 text-xs text-center">
                    The BVN request always uses your BVN-registered phone.<br />
                    You can receive the code on a different number below.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={altPhone}
                      onChange={e => setAltPhone(e.target.value.replace(/\D/g,''))}
                      placeholder="Phone to receive code (e.g. 08099887766)"
                      inputMode="tel"
                      className="flex-1 bg-white/8 border-white/15 text-white placeholder:text-white/30 h-11 text-sm"
                    />
                    <button
                      onClick={handleResend}
                      disabled={resending || !altPhone}
                      className="px-4 h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold rounded-lg shrink-0"
                    >
                      {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                    </button>
                  </div>
                  <button
                    onClick={() => { setAltPhone(bvnPhone); handleResend(); }}
                    disabled={resending}
                    className="w-full text-white/30 text-xs py-1 hover:text-white/60 transition-colors"
                  >
                    Or send to original BVN phone ({maskPhone(bvnPhone)})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center py-8 text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-white text-2xl font-bold">BVN Verified!</h2>
            <p className="text-white/50 text-sm">Your identity has been confirmed. You now have full access to Border.</p>
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin mt-2" />
          </div>
        )}
      </div>

      {/* Footer note */}
      {step !== 'done' && (
        <p className="text-white/20 text-xs text-center mt-6 max-w-sm">
          Your data is encrypted and stored securely. Border does not share your identity information with third parties.
        </p>
      )}
    </div>
  );
}
