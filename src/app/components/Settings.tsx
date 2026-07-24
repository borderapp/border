import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import APITestPanel from './APITestPanel';
import BiometricEnrollModal from './BiometricEnrollModal';
import { supabase } from '@/lib/supabase';
import { getBiometricPrefs, saveBiometricPrefs, checkBiometryAvailable, isNative } from '@/lib/biometric';
import { toast } from 'sonner';
import { useTransactionPin } from '@/hooks/useTransactionPin';
import {
  ArrowLeft, User, Shield, Bell, Lock, Globe,
  CreditCard, HelpCircle, LogOut, ChevronRight, ChevronDown,
  Mail, Phone, MapPin, Camera, CheckCircle2, Zap, Loader2,
  Eye, EyeOff, KeyRound, Fingerprint,
} from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
  onLogout?: () => void;
  onNavigate?: (tab: string) => void;
}

// ── Reusable section row ───────────────────────────────────────────────────
function RowItem({
  icon: Icon, label, sublabel, action, iconColor = 'text-gray-400', danger = false,
}: {
  icon: any; label: string; sublabel?: string; action?: string;
  iconColor?: string; danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3 min-w-0">
      <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm leading-tight ${danger ? 'text-red-600' : 'text-gray-900'}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5 leading-tight">{sublabel}</p>}
      </div>
      {action && <span className="text-xs text-gray-400 shrink-0 ml-2">{action}</span>}
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </div>
  );
}

function SwitchRow({
  icon: Icon, label, sublabel, checked, onChange,
}: {
  icon?: any; label: string; sublabel?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 min-w-0">
      {Icon && <Icon className="w-5 h-5 shrink-0 text-gray-400" />}
      <div className="flex-1 min-w-0 pr-3">
        <p className="font-medium text-sm text-gray-900 leading-tight">{label}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5 leading-tight">{sublabel}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}

// ── Change Password inline form ────────────────────────────────────────────
function ChangePasswordSection() {
  const [open, setOpen]             = useState(false);
  const [current, setCurrent]       = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [loading, setLoading]       = useState(false);

  const reset = () => { setCurrent(''); setNewPw(''); setConfirm(''); };

  const handleChange = async () => {
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPw !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      // Re-authenticate with current password then update
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Not logged in');
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (signInErr) throw new Error('Current password is incorrect');
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;
      toast.success('Password updated successfully');
      reset(); setOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div className="border-t">
      <button
        onClick={() => { setOpen(v => !v); reset(); }}
        className="w-full flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg transition-colors px-1"
      >
        <div className="flex items-center gap-3">
          <KeyRound className="w-5 h-5 text-gray-400 shrink-0" />
          <span className="font-medium text-sm text-gray-900">Change Password</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="pb-4 space-y-3 px-1">
          <div className="relative">
            <Label className="text-xs text-gray-600 mb-1 block">Current Password</Label>
            <Input
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="Enter current password"
              className="pr-10 h-11"
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-8 text-gray-400">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <Label className="text-xs text-gray-600 mb-1 block">New Password</Label>
            <Input
              type={showNew ? 'text' : 'password'}
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="At least 8 characters"
              className="pr-10 h-11"
            />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-8 text-gray-400">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Confirm New Password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              className="h-11"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-10" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button className="flex-1 h-10 bg-blue-600 hover:bg-blue-700"
              onClick={handleChange}
              disabled={loading || !current || !newPw || !confirm}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transaction PIN inline section ─────────────────────────────────────────
function PinInput({ label, value, onChange, placeholder = '• • • •' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-gray-600 mb-1 block">{label}</Label>
      <Input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder={placeholder}
        className="h-11 text-center text-lg tracking-[0.5em]"
      />
    </div>
  );
}

function TransactionPinSection() {
  const { hasPin, loading, error, success, createPin, changePin, setError, setSuccess } = useTransactionPin();
  const [open, setOpen]             = useState(false);
  const [mode, setMode]             = useState<'create' | 'change'>('create');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const reset = () => { setCurrentPin(''); setNewPin(''); setConfirmPin(''); setError(''); setSuccess(''); };

  const handleSubmit = async () => {
    const ok = mode === 'create'
      ? await createPin(newPin, confirmPin)
      : await changePin(currentPin, newPin, confirmPin);
    if (ok) { reset(); setOpen(false); }
  };

  if (hasPin === null) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-600 shrink-0" />
          Transaction PIN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {/* Status row */}
        {!open && (
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${hasPin ? 'bg-green-50' : 'bg-amber-50'}`}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${hasPin ? 'bg-green-500' : 'bg-amber-500'}`} />
            <p className={`text-sm flex-1 ${hasPin ? 'text-green-800' : 'text-amber-800'}`}>
              {hasPin ? 'Transaction PIN is active — wallet is protected' : 'No Transaction PIN set — required for all payments'}
            </p>
          </div>
        )}

        {/* Open button */}
        {!open && (
          <button
            onClick={() => { setMode(hasPin ? 'change' : 'create'); setOpen(true); reset(); }}
            className="w-full flex items-center justify-between py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-gray-400 shrink-0" />
              <span className="font-medium text-sm text-gray-900">
                {hasPin ? 'Change Transaction PIN' : 'Create Transaction PIN'}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </button>
        )}

        {/* Inline form */}
        {open && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-gray-500 px-1">
              {mode === 'create'
                ? 'Choose a 4-digit PIN to authorise every payment.'
                : 'Verify your current PIN, then set a new one.'}
            </p>
            {mode === 'change' && (
              <PinInput label="Current PIN" value={currentPin} onChange={setCurrentPin} />
            )}
            <PinInput label="New PIN" value={newPin} onChange={setNewPin} />
            <PinInput label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />
            {error   && <p className="text-xs text-red-600 px-1">{error}</p>}
            {success && <p className="text-xs text-green-600 px-1">{success}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-10" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
              <Button
                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700"
                onClick={handleSubmit}
                disabled={loading || newPin.length < 4 || confirmPin.length < 4 || (mode === 'change' && currentPin.length < 4)}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'create' ? 'Create PIN' : 'Change PIN'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Account Section ────────────────────────────────────────────────────────
const BASE_CURRENCIES = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

function AccountSection({ userProfile, onNavigate }: { userProfile: any; onNavigate?: (tab: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState('NGN');
  const [firstName, setFirstName] = useState(userProfile?.first_name || '');
  const [lastName, setLastName]   = useState(userProfile?.last_name || '');
  const [phone, setPhone]         = useState(userProfile?.phone_number || '');
  const [saving, setSaving]       = useState(false);

  const toggle = (key: string) => setOpen(v => v === key ? null : key);

  const savePersonalInfo = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('profiles').update({
        first_name: firstName, last_name: lastName, phone_number: phone,
      }).eq('id', user.id);
      if (error) throw error;
      toast.success('Profile updated');
      setOpen(null);
    } catch (e: any) { toast.error(e.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-5 h-5 shrink-0" /> Account
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-0 divide-y divide-gray-100">

        {/* Personal Information */}
        <div>
          <button onClick={() => toggle('personal')}
            className="w-full flex items-center gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors">
            <User className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="font-medium text-sm text-gray-900 flex-1 text-left">Personal Information</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open === 'personal' ? 'rotate-180' : ''}`} />
          </button>
          {open === 'personal' && (
            <div className="pb-4 space-y-3 px-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">First Name</Label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-11" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Last Name</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} className="h-11" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Email</Label>
                <Input value={userProfile?.email || ''} disabled className="h-11 bg-gray-50 text-gray-400" />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Phone Number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234..." className="h-11" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setOpen(null)}>Cancel</Button>
                <Button className="flex-1 h-10 bg-blue-600 hover:bg-blue-700" onClick={savePersonalInfo} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* KYC / Verification */}
        <button onClick={() => onNavigate?.('kyc')}
          className="w-full flex items-center gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors">
          <Shield className="w-5 h-5 text-gray-400 shrink-0" />
          <div className="flex-1 text-left">
            <p className="font-medium text-sm text-gray-900">KYC Verification</p>
            <p className="text-xs text-green-600 mt-0.5">Tap to view your verification status</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </button>

        {/* Payment Methods */}
        <button onClick={() => onNavigate?.('cards')}
          className="w-full flex items-center gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors">
          <CreditCard className="w-5 h-5 text-gray-400 shrink-0" />
          <span className="font-medium text-sm text-gray-900 flex-1 text-left">Payment Methods</span>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </button>

        {/* Base Currency */}
        <div>
          <button onClick={() => toggle('currency')}
            className="w-full flex items-center gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors">
            <Globe className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="font-medium text-sm text-gray-900 flex-1 text-left">Base Currency</span>
            <span className="text-xs text-gray-500 mr-1">{baseCurrency}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open === 'currency' ? 'rotate-180' : ''}`} />
          </button>
          {open === 'currency' && (
            <div className="pb-3 grid grid-cols-2 gap-2 px-1">
              {BASE_CURRENCIES.map(c => (
                <button key={c.code}
                  onClick={() => { setBaseCurrency(c.code); setOpen(null); toast.success(`Base currency set to ${c.code}`); }}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all text-left
                    ${baseCurrency === c.code ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                  <span className="font-bold">{c.symbol}</span>
                  <span className="truncate">{c.code} — {c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}

// ── Biometric Settings Section ─────────────────────────────────────────────
function BiometricSection() {
  const [prefs, setPrefs] = useState<any>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [biometryType, setBiometryType] = useState<'fingerprint' | 'faceid' | 'none'>('fingerprint');
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollMode, setEnrollMode] = useState<'enroll' | 'disable'>('enroll');

  useEffect(() => {
    Promise.all([getBiometricPrefs(), checkBiometryAvailable()]).then(([p, info]) => {
      setPrefs(p);
      setSupported(info.available);
      setBiometryType(info.biometryType);
    });
  }, []);

  const refresh = async () => {
    const p = await getBiometricPrefs();
    setPrefs(p);
  };

  const toggleEnabled = () => {
    if (!supported) return;
    setEnrollMode(prefs?.enabled ? 'disable' : 'enroll');
    setEnrollOpen(true);
  };

  const updatePref = async (key: string, value: any) => {
    await saveBiometricPrefs({ [key]: value });
    refresh();
  };

  const methodLabel = biometryType === 'faceid' ? 'Face ID' : 'Fingerprint';

  const notAvailableReason = !isNative()
    ? 'Available in the Border mobile app'
    : supported === false
      ? 'Set up biometrics in your device Settings first'
      : null;

  return (
    <>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Fingerprint className="w-5 h-5 shrink-0 text-blue-600" /> Biometric Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 divide-y divide-gray-100">
          {/* Enable/disable row */}
          <div className="flex items-center justify-between py-3 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {biometryType === 'faceid' ? 'Face ID / Touch ID' : 'Fingerprint Login'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {prefs === null ? 'Loading…'
                  : notAvailableReason ?? (prefs.enabled ? 'Active — tap to disable' : 'Tap to enable')}
              </p>
            </div>
            <Switch
              checked={!!prefs?.enabled}
              onCheckedChange={toggleEnabled}
              disabled={!!notAvailableReason || prefs === null}
            />
          </div>

          {prefs?.enabled && (
            <>
              {/* Require for transfers */}
              <SwitchRow
                icon={Shield}
                label="Require for Transfers"
                sublabel="Confirm every send/withdraw with biometrics"
                checked={!!prefs.requireForTransfers}
                onChange={v => updatePref('requireForTransfers', v)}
              />

              {/* Require for security settings */}
              <SwitchRow
                icon={Lock}
                label="Require for Security Settings"
                sublabel="Protect PIN changes and security settings"
                checked={!!prefs.requireForSecuritySettings}
                onChange={v => updatePref('requireForSecuritySettings', v)}
              />

              {/* Session timeout */}
              <div className="py-3">
                <p className="text-sm font-medium text-gray-900 mb-1">Lock After Inactivity</p>
                <select
                  value={prefs.sessionTimeoutMinutes ?? 15}
                  onChange={e => updatePref('sessionTimeoutMinutes', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={0}>Immediately</option>
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              {/* Disable button */}
              <div className="pt-2 pb-1">
                <button
                  onClick={() => { setEnrollMode('disable'); setEnrollOpen(true); }}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Disable {methodLabel}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <BiometricEnrollModal
        open={enrollOpen}
        mode={enrollMode}
        onClose={() => setEnrollOpen(false)}
        onSuccess={() => {
          refresh();
          toast.success(enrollMode === 'disable' ? 'Biometrics disabled.' : 'Biometrics enabled!');
        }}
      />
    </>
  );
}

// ── (Identity Verification section removed — KYC is done at card creation) ─
function _IdentityVerificationSection_unused({ profile, onProfileRefresh }: { profile: any; onProfileRefresh: () => void }) {
  const [showKYC, setShowKYC]   = useState(false);
  const [kycMode, setKycMode]   = useState<'bvn' | 'nin' | 'kyb'>('bvn');
  const [showCACForm, setShowCACForm] = useState(false);
  const [cac, setCac] = useState({ rc: '', type: 'RC', entity: 'RC', name: '', surname: '', firstname: '', email: '', phone: '', gender: 'MALE', city: '', occupation: '' });
  const [cacLoading, setCacLoading] = useState(false);

  const bvnVerified = !!profile?.bvn_verified;
  const ninVerified = !!profile?.nin_verified;

  const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

  const kycApi = async (action: string, payload: Record<string, any>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/strowallet-cards`, {
      method: 'POST', headers, body: JSON.stringify({ action, ...payload }),
    });
    const d = await res.json();
    if (!res.ok || d.error) throw new Error(d.error || 'Request failed');
    return d;
  };

  const handleCACSubmit = async () => {
    if (!cac.rc || !cac.name || !cac.surname || !cac.firstname || !cac.email || !cac.phone || !cac.city || !cac.occupation) {
      toast.error('All CAC fields are required'); return;
    }
    setCacLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await kycApi('kyb_verify_cac', {
        rc_number: cac.rc, company_type: cac.type, entity_type: cac.entity,
        company_name: cac.name.toUpperCase(), surname: cac.surname.toUpperCase(),
        firstname: cac.firstname.toUpperCase(), email: cac.email,
        phoneNumber: cac.phone, gender: cac.gender, city: cac.city, occupation: cac.occupation,
        user_id: user?.id,
      });
      toast.success('Business verified successfully!');
      setShowCACForm(false);
      onProfileRefresh();
    } catch (e: any) {
      toast.error(e.message || 'CAC verification failed');
    } finally { setCacLoading(false); }
  };

  if (showKYC) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="absolute top-4 right-4 z-10">
          <button onClick={() => setShowKYC(false)} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
            <X className="w-5 h-5" />
          </button>
        </div>
        <KYCVerification
          onComplete={() => { setShowKYC(false); onProfileRefresh(); }}
          skipable
          onSkip={() => setShowKYC(false)}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 shrink-0 text-blue-600" /> Identity Verification
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Required to unlock Border Basic and create virtual cards</p>
      </CardHeader>
      <CardContent className="pt-3 divide-y divide-gray-100">

        {/* BVN row */}
        <div className="flex items-center gap-3 py-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bvnVerified ? 'bg-emerald-100' : 'bg-amber-50 border border-amber-200'}`}>
            {bvnVerified
              ? <BadgeCheck className="w-4 h-4 text-emerald-600" />
              : <AlertCircle className="w-4 h-4 text-amber-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Bank Verification Number (BVN)</p>
            <p className={`text-xs mt-0.5 ${bvnVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
              {bvnVerified ? 'Verified — BVN on file' : 'Not verified — required for cards & transfers'}
            </p>
          </div>
          {!bvnVerified && (
            <button
              onClick={() => { setKycMode('bvn'); setShowKYC(true); }}
              className="shrink-0 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors"
            >
              Verify
            </button>
          )}
        </div>

        {/* NIN row */}
        <div className="flex items-center gap-3 py-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ninVerified ? 'bg-emerald-100' : 'bg-amber-50 border border-amber-200'}`}>
            {ninVerified
              ? <BadgeCheck className="w-4 h-4 text-emerald-600" />
              : <AlertCircle className="w-4 h-4 text-amber-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">National Identity Number (NIN)</p>
            <p className={`text-xs mt-0.5 ${ninVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
              {ninVerified ? 'Verified — NIN on file' : 'Not verified — dial *346# to get your NIN'}
            </p>
          </div>
          {!ninVerified && (
            <button
              onClick={() => { setKycMode('nin'); setShowKYC(true); }}
              className="shrink-0 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors"
            >
              Verify
            </button>
          )}
        </div>

        {/* KYB / CAC row */}
        <div className="py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-100">
              <Building2 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Business Verification (CAC)</p>
              <p className="text-xs text-gray-500 mt-0.5">Optional — required for Border Pro & Business tiers</p>
            </div>
            <button
              onClick={() => setShowCACForm(v => !v)}
              className="shrink-0 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors"
            >
              {showCACForm ? 'Cancel' : 'Verify'}
            </button>
          </div>

          {showCACForm && (
            <div className="mt-4 space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-700">CAC Business Details</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={cac.rc} onChange={e => setCac(f => ({...f, rc: e.target.value}))} placeholder="RC Number" className="col-span-2 px-3 py-2 border rounded-lg text-sm" />
                <select value={cac.type} onChange={e => setCac(f => ({...f, type: e.target.value}))} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="RC">Type: RC</option><option value="BN">Type: BN</option>
                </select>
                <select value={cac.entity} onChange={e => setCac(f => ({...f, entity: e.target.value}))} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="RC">Entity: RC</option><option value="BN">Entity: BN</option>
                </select>
                <input value={cac.name} onChange={e => setCac(f => ({...f, name: e.target.value}))} placeholder="Company Name (CAPS)" className="col-span-2 px-3 py-2 border rounded-lg text-sm uppercase" />
                <input value={cac.surname} onChange={e => setCac(f => ({...f, surname: e.target.value}))} placeholder="Director Surname" className="px-3 py-2 border rounded-lg text-sm" />
                <input value={cac.firstname} onChange={e => setCac(f => ({...f, firstname: e.target.value}))} placeholder="Director Firstname" className="px-3 py-2 border rounded-lg text-sm" />
                <input value={cac.email} onChange={e => setCac(f => ({...f, email: e.target.value}))} placeholder="Email (on CAC)" type="email" className="px-3 py-2 border rounded-lg text-sm" />
                <input value={cac.phone} onChange={e => setCac(f => ({...f, phone: e.target.value}))} placeholder="Phone (on CAC)" className="px-3 py-2 border rounded-lg text-sm" />
                <select value={cac.gender} onChange={e => setCac(f => ({...f, gender: e.target.value}))} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="MALE">MALE</option><option value="FEMALE">FEMALE</option>
                </select>
                <input value={cac.city} onChange={e => setCac(f => ({...f, city: e.target.value}))} placeholder="City" className="px-3 py-2 border rounded-lg text-sm" />
                <input value={cac.occupation} onChange={e => setCac(f => ({...f, occupation: e.target.value}))} placeholder="Occupation" className="col-span-2 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <button
                onClick={handleCACSubmit}
                disabled={cacLoading}
                className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cacLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit CAC Verification'}
              </button>
            </div>
          )}
        </div>

        {/* Tier unlock hint */}
        {(!bvnVerified || !ninVerified) && (
          <div className="pt-3 pb-1">
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <ShieldCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Verify your BVN to unlock <strong>Border Basic</strong> — required for virtual card creation, local transfers, and bill payments.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Settings component ────────────────────────────────────────────────
export default function Settings({ onBack, onLogout, onNavigate }: SettingsProps) {
  const [settings, setSettings] = useState({
    notifications: { transactions: true, fxRates: true, security: true, marketing: false },
    security:      { twoFactor: false, loginAlerts: true },
    privacy:       { showBalance: true, shareData: false },
  });

  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [showAPITest, setShowAPITest] = useState(false);

  useEffect(() => { fetchUserProfile(); }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profile);
    } catch (_e) { /* ignore */ }
    finally { setLoading(false); }
  };

  const getTierName = (tier: number) => ['Basic','Standard','Premium','Business','Enterprise'][tier] || 'Basic';

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 pt-12 pb-8 px-4">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-2xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 space-y-4 relative z-10 isolate">

        {/* ── Profile ── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {userProfile?.first_name?.charAt(0) || 'U'}{userProfile?.last_name?.charAt(0) || ''}
                </div>
                <button className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow border-2 border-white">
                  <Camera className="w-3 h-3 text-gray-600" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-gray-900 truncate">
                  {userProfile?.first_name} {userProfile?.last_name}
                </h3>
                {userProfile?.border_tag && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(userProfile.border_tag); toast.success('Tag copied!'); }}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 block mt-0.5 truncate"
                  >
                    {userProfile.border_tag}
                  </button>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium">{getTierName(userProfile?.kyc_level || 0)} Account</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Member since {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              {userProfile?.email && (
                <div className="flex items-center gap-2.5 text-xs text-gray-500">
                  <Mail className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{userProfile.email}</span>
                </div>
              )}
              {userProfile?.phone_number && (
                <div className="flex items-center gap-2.5 text-xs text-gray-500">
                  <Phone className="w-3.5 h-3.5 shrink-0" /><span>{userProfile.phone_number}</span>
                </div>
              )}
              {userProfile?.country && (
                <div className="flex items-center gap-2.5 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5 shrink-0" /><span>{userProfile.country}</span>
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full h-10 text-sm">Edit Profile</Button>
          </CardContent>
        </Card>

        {/* ── Account ── */}
        <AccountSection userProfile={userProfile} onNavigate={onNavigate} />

        {/* ── Biometric Authentication ── */}
        <BiometricSection />

        {/* ── Security ── */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-5 h-5 shrink-0" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 divide-y divide-gray-100">
            <SwitchRow icon={Shield} label="Two-Factor Authentication" sublabel="Extra security layer"
              checked={settings.security.twoFactor}
              onChange={v => setSettings(s => ({ ...s, security: { ...s.security, twoFactor: v } }))} />
            <SwitchRow icon={Bell}   label="Login Alerts"            sublabel="Notify on new device login"
              checked={settings.security.loginAlerts}
              onChange={v => setSettings(s => ({ ...s, security: { ...s.security, loginAlerts: v } }))} />

            <ChangePasswordSection />
          </CardContent>
        </Card>

        {/* ── Transaction PIN ── */}
        <TransactionPinSection />

        {/* ── Notifications ── */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5 shrink-0" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 divide-y divide-gray-100">
            <SwitchRow label="Transaction Alerts"  sublabel="Money in and out"
              checked={settings.notifications.transactions}
              onChange={v => setSettings(s => ({ ...s, notifications: { ...s.notifications, transactions: v } }))} />
            <SwitchRow label="FX Rate Alerts"      sublabel="Currency rate changes"
              checked={settings.notifications.fxRates}
              onChange={v => setSettings(s => ({ ...s, notifications: { ...s.notifications, fxRates: v } }))} />
            <SwitchRow label="Security Alerts"     sublabel="Important security updates"
              checked={settings.notifications.security}
              onChange={v => setSettings(s => ({ ...s, notifications: { ...s.notifications, security: v } }))} />
            <SwitchRow label="Marketing Updates"   sublabel="Promotions and offers"
              checked={settings.notifications.marketing}
              onChange={v => setSettings(s => ({ ...s, notifications: { ...s.notifications, marketing: v } }))} />
          </CardContent>
        </Card>

        {/* ── Support & Legal ── */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5 shrink-0" /> Support & Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 divide-y divide-gray-100">
            {[
              { label: 'Help Center',      action: () => window.open('https://www.border.com.ng/help', '_blank') },
              { label: 'Contact Support',  action: () => window.open('https://www.border.com.ng/contact', '_blank') },
              { label: 'Terms of Service', action: () => window.open('https://www.border.com.ng/legal', '_blank') },
              { label: 'Privacy Policy',   action: () => window.open('https://www.border.com.ng/legal', '_blank') },
              { label: 'About Border',     action: () => window.open('https://www.border.com.ng/about', '_blank') },
            ].map(({ label, action }) => (
              <button key={label} onClick={action} className="w-full hover:bg-gray-50 rounded-lg transition-colors px-1">
                <RowItem icon={ChevronRight} label={label} iconColor="opacity-0" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Version */}
        <div className="text-center py-2">
          <p className="text-xs text-gray-400">Border v2.5.0 · Build 20260103</p>
        </div>

        {/* Logout */}
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50 h-12 text-base"
        >
          <LogOut className="w-5 h-5 mr-2 shrink-0" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
