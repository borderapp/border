import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/app/components/AdminSidebar';
import { CustomerSidebar } from '@/app/components/CustomerSidebar';
import Dashboard from '@/app/components/Dashboard';
import OnboardingFlow from '@/app/components/OnboardingFlow';
import EmailOTPSignup from '@/app/components/EmailOTPSignup';
import LoginPage from '@/app/components/LoginPage';
import AddMoney from '@/app/components/AddMoney';
import TransferFlow from '@/app/components/TransferFlow';
import CurrencyConverter from '@/app/components/CurrencyConverter';
import BillPayments from '@/app/components/BillPayments';
import CardsManagement from '@/app/components/CardsManagement';
import VirtualPOS from '@/app/components/VirtualPOS';
import QRPayments from '@/app/components/QRPayments';
import SecurePay from '@/app/components/SecurePay';
import TransactionHistory from '@/app/components/TransactionHistory';
import Notifications from '@/app/components/Notifications';
import Settings from '@/app/components/Settings';
import AccountTiers from '@/app/components/AccountTiers';
import InternationalBusinessTransfer from '@/app/components/InternationalBusinessTransfer';
import ChinaTradeSettlement from '@/app/components/ChinaTradeSettlement';
import Wallets from '@/app/components/Wallets';
import MoreMenu from '@/app/components/MoreMenu';
import DiagnosticPanel from '@/app/components/DiagnosticPanel';
import JWTDebugger from '@/app/components/JWTDebugger';
import JWTFixGuide from '@/app/components/JWTFixGuide';
import AdminTransactions from '@/app/components/admin/AdminTransactions';
import AdminUsers from '@/app/components/admin/AdminUsers';
import AdminCards from '@/app/components/admin/AdminCards';
import AdminJuicyway from '@/app/components/admin/AdminJuicyway';
import AdminKYCApproval from '@/app/components/AdminKYCApproval';
import StrowalletTestPanel from '@/app/components/admin/StrowalletTestPanel';
import AdminStrowalletRates from '@/app/components/admin/AdminStrowalletRates';
import AdminSavings from '@/app/components/admin/AdminSavings';
import SavingsModule from '@/app/components/SavingsModule';
import { WalletProvider } from '@/app/context/WalletContext';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { 
  Users,
  ArrowUpRight,
  Wallet,
  AlertCircle,
  Bell,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ShieldCheck,
  Globe,
  Database,
  Smartphone,
  Layout,
  CreditCard,
  Zap,
  PlusCircle,
  LogOut,
  Loader2,
  Settings as SettingsIcon,
  Menu
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import BiometricUnlockScreen from '@/app/components/BiometricUnlockScreen';
import KYCVerification from '@/app/components/KYCVerification';
import {
  getBiometricPrefsSync, isBiometricSessionValid, markBiometricSessionActive,
  clearBiometricPrefs, initBiometric, setSessionExpiredCallback, resetIdleTimer,
} from '@/lib/biometric';

// ── Password Reset Screen ──────────────────────────────────────────────────
const ResetPasswordScreen = ({ onDone }: { onDone: () => void }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleReset = async () => {
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated! Please sign in.');
      await supabase.auth.signOut();
      onDone();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Set new password</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a strong password for your Border account.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              onKeyDown={e => e.key === 'Enter' && handleReset()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Updating…</> : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- ADMIN COMPONENTS ---
// Admin interface components
// Updated: 2026-04-03

// Admin login: user must already be logged into the app AND have is_admin=true,
// then must supply their separate admin PIN.
const AdminLoginScreen = ({ onLogin, onSwitchToApp, session }: { onLogin: () => void; onSwitchToApp: () => void; session: any }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!session?.user) { setError('You must be logged in to the app first.'); return; }
    setLoading(true);
    try {
      // Fetch this user's profile and verify is_admin + admin_pin
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('is_admin, admin_pin')
        .eq('id', session.user.id)
        .single();

      if (profileErr || !profile) throw new Error('Could not verify admin status.');
      if (!profile.is_admin) throw new Error('This account does not have admin access.');
      if (!profile.admin_pin) throw new Error('No admin PIN set for this account. Contact a super-admin.');
      if (profile.admin_pin !== pin) throw new Error('Incorrect admin PIN.');

      onLogin();
      toast.success('Admin access granted');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-300">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Console</h1>
          <p className="text-slate-500 mt-2">Enter your admin PIN to continue</p>
          {session?.user && (
            <p className="text-xs text-slate-400 mt-1">Logged in as <span className="font-semibold">{session.user.email}</span></p>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          {!session?.user ? (
            <div className="text-center py-6">
              <Lock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Log into the Border app first, then return here to access Admin.</p>
              <button onClick={onSwitchToApp} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm">Go to App</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Admin PIN</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter your admin PIN"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:bg-white transition-all outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400 ml-1">This is separate from your app password. Set by a super-admin.</p>
              </div>
              <button
                type="submit"
                disabled={loading || !pin}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Access Admin Console'}
              </button>
            </form>
          )}
        </div>

        <button onClick={onSwitchToApp} className="mt-6 w-full text-slate-400 hover:text-slate-600 font-medium text-sm flex items-center justify-center gap-2">
          <Smartphone className="w-4 h-4" />
          Back to App
        </button>
      </div>
    </div>
  );
};

// --- Admin Dashboard with live Supabase stats ---
function AdminDashboardLive() {
  const [stats, setStats] = React.useState({ users: 0, txVolume: 0, pendingKyc: 0, txCount: 0 });
  const [loading, setLoading] = React.useState(true);
  const [recentTx, setRecentTx] = React.useState<any[]>([]);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      const [usersRes, txRes, kycRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount, status, description, created_at, type').order('created_at', { ascending: false }).limit(10),
        supabase.from('kyc_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      const txData: any[] = txRes.data || [];
      const volume = txData.reduce((s: number, t: any) => s + parseFloat(t.amount || 0), 0);
      setStats({
        users: usersRes.count || 0,
        txVolume: volume,
        pendingKyc: kycRes.count || 0,
        txCount: txData.length,
      });
      setRecentTx(txData);
      setLoading(false);
    }
    load();
  }, []);

  const fmt = (n: number) => n >= 1000 ? `₦${(n / 1000).toFixed(1)}k` : `₦${n.toLocaleString()}`;

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading live data…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Total Users', value: stats.users.toLocaleString(), icon: Users },
            { title: 'Tx Volume (recent)', value: fmt(stats.txVolume), icon: ArrowUpRight },
            { title: 'Pending KYC', value: stats.pendingKyc.toLocaleString(), icon: AlertCircle },
            { title: 'Recent Transactions', value: stats.txCount.toLocaleString(), icon: Wallet },
          ].map(({ title, value, icon: Icon }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">{title}</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}
      {recentTx.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Recent Transactions</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {recentTx.map((tx, i) => (
              <div key={i} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{tx.description || tx.type || 'Transaction'}</p>
                  <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString('en-NG')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">₦{parseFloat(tx.amount || 0).toLocaleString()}</p>
                  <span className={`text-xs font-semibold ${tx.status === 'completed' ? 'text-green-600' : tx.status === 'failed' ? 'text-red-500' : 'text-amber-500'}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN ROUTER ---

export default function App() {
  const [viewMode, setViewMode] = useState<'app' | 'admin'>(() =>
    (localStorage.getItem('border_view_mode') as 'app' | 'admin') || 'app'
  );
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false); // is_admin=true in profiles
  const [kycVerified, setKycVerified] = useState(true); // false = show KYC gate
  const [adminTab, setAdminTab] = useState('dashboard');
  const [session, setSession] = useState<any>(null);
  const [resetMode, setResetMode] = useState(false);
  const [appAuthMode, setAppAuthMode] = useState<'login' | 'signup'>('login');
  const [customerTab, setCustomerTab] = useState('dashboard');
  const [initLoading, setInitLoading] = useState(true);
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const [biometricUnlocked, setBiometricUnlocked] = useState(() => {
    const prefs = getBiometricPrefsSync();
    if (!prefs.enabled) return true;
    return isBiometricSessionValid(prefs.sessionTimeoutMinutes ?? 15);
  });

  // Push a history entry whenever the user navigates away from dashboard,
  // so the device/browser back button returns to dashboard instead of leaving the app.
  useEffect(() => {
    if (customerTab !== 'dashboard') {
      window.history.pushState({ borderTab: customerTab }, '');
    }
  }, [customerTab]);

  useEffect(() => {
    const handlePopState = () => {
      setCustomerTab('dashboard');
      // Keep a neutral history entry so subsequent back presses don't exit.
      window.history.pushState({ borderTab: 'dashboard' }, '');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // 0. Init biometric (loads prefs from secure storage into memory cache)
    initBiometric().then(prefs => {
      if (prefs.enabled && !isBiometricSessionValid(prefs.sessionTimeoutMinutes)) {
        setBiometricUnlocked(false);
      }
    });

    // Wire session-expired callback (fires when inactivity timer elapses)
    setSessionExpiredCallback(() => setBiometricUnlocked(false));

    // Reset idle timer on user interaction
    const onInteraction = () => resetIdleTimer();
    ['touchstart', 'click', 'keydown', 'scroll'].forEach(e =>
      window.addEventListener(e, onInteraction, { passive: true })
    );

    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, bvn_verified')
          .eq('id', currentSession.user.id)
          .single();
        const adminFlag = !!profile?.is_admin;
        setIsAdminUser(adminFlag);
        setKycVerified(profile?.bvn_verified === true);
        if (adminFlag && localStorage.getItem('border_admin_authenticated') === 'true') {
          setIsAdminAuth(true);
        }
      }
      setInitLoading(false);
    });

    // 2. Auth State Listener (Crucial for fixing login break)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setResetMode(true);
        setSession(currentSession);
        setInitLoading(false);
        return;
      }
      setSession(currentSession);
      if (currentSession) {
        setAppAuthMode('login');
        // Check if this user has admin permission
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentSession.user.id)
          .single();
        setIsAdminUser(!!profile?.is_admin);
        // If they no longer have admin flag, clear admin session
        if (!profile?.is_admin) {
          setIsAdminAuth(false);
          localStorage.removeItem('border_admin_authenticated');
          if (localStorage.getItem('border_view_mode') === 'admin') {
            setViewMode('app');
            localStorage.setItem('border_view_mode', 'app');
          }
        }
      } else {
        setIsAdminAuth(false);
        setIsAdminUser(false);
        localStorage.removeItem('border_admin_authenticated');
      }
    });

    // 3. View Mode Persistence
    const savedMode = localStorage.getItem('border_view_mode');
    if (savedMode) setViewMode(savedMode as any);

    return () => {
      subscription.unsubscribe();
      ['touchstart', 'click', 'keydown', 'scroll'].forEach(e =>
        window.removeEventListener(e, onInteraction)
      );
    };
  }, []);

  // Lock app when tab becomes visible again and biometric session has expired
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const prefs = getBiometricPrefsSync();
        if (prefs.enabled && !isBiometricSessionValid(prefs.sessionTimeoutMinutes ?? 15)) {
          setBiometricUnlocked(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const toggleView = (mode: 'app' | 'admin') => {
    setViewMode(mode);
    localStorage.setItem('border_view_mode', mode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAppAuthMode('login');
    clearBiometricPrefs().catch(() => {});
    setBiometricUnlocked(true);
    toast.success('Logged out successfully');
  };

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  // KYC is optional at signup — enforced at tier upgrade (Border Basic+)

  const renderAdminContent = () => {
    if (!isAdminAuth) {
      return <AdminLoginScreen
        session={session}
        onLogin={() => {
          setIsAdminAuth(true);
          localStorage.setItem('border_admin_authenticated', 'true');
        }}
        onSwitchToApp={() => toggleView('app')}
      />;
    }

    const tabLabel: Record<string, string> = {
      dashboard: 'Dashboard', kyc: 'KYC Approvals', transactions: 'Transactions',
      users: 'User Management', cards: 'Cards & POS', juicyway: 'Juicyway FX',
      'strowallet-test': 'Strowallet', 'strowallet-fx': 'Strowallet FX Rates', savings: 'Savings Administration',
    };

    return (
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar
          currentTab={adminTab}
          setTab={setAdminTab}
          isOpen={adminSidebarOpen}
          onClose={() => setAdminSidebarOpen(false)}
          onLogout={async () => {
            await supabase.auth.signOut();
            setIsAdminAuth(false);
            localStorage.removeItem('border_admin_authenticated');
            setSession(null);
            toast.success('Logged out from admin panel');
          }}
        />
        <main className="flex-1 lg:ml-64 min-w-0">
          <header className="h-16 lg:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setAdminSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-base lg:text-xl font-bold text-slate-900 truncate">
                {tabLabel[adminTab] || adminTab}
              </h1>
            </div>
            <div className="flex items-center gap-2 lg:gap-4 shrink-0">
              {/* App / Admin switcher */}
              <div className="flex gap-1 bg-slate-100 rounded-full p-1">
                <button onClick={() => toggleView('app')} className={`px-2 lg:px-3 py-1 text-xs font-semibold rounded-full transition-all ${viewMode === 'app' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>App</button>
                <button onClick={() => toggleView('admin')} className={`px-2 lg:px-3 py-1 text-xs font-semibold rounded-full transition-all ${viewMode === 'admin' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>Admin</button>
              </div>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setIsAdminAuth(false);
                  localStorage.removeItem('border_admin_authenticated');
                  setSession(null);
                  toast.success('Logged out');
                }}
                className="hidden lg:block text-xs font-bold text-slate-400 hover:text-rose-500"
              >
                Log Out
              </button>
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm" title={session?.user?.email || 'Admin'}>
                {session?.user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>
          </header>
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {adminTab === 'dashboard' && <AdminDashboardLive />}
            {adminTab === 'kyc' && <AdminKYCApproval />}
            {adminTab === 'transactions' && <AdminTransactions />}
            {adminTab === 'users' && <AdminUsers />}
            {adminTab === 'cards' && <AdminCards />}
            {adminTab === 'savings' && <AdminSavings />}
            {adminTab === 'juicyway' && <AdminJuicyway />}
            {adminTab === 'strowallet-fx' && (
              <ErrorBoundary>
                <AdminStrowalletRates />
              </ErrorBoundary>
            )}
            {adminTab === 'strowallet-test' && (
              <ErrorBoundary>
                <StrowalletTestPanel />
              </ErrorBoundary>
            )}
          </div>
        </main>
      </div>
    );
  };

  const renderAppContent = () => {
    // Password reset flow — triggered by recovery link from email
    if (resetMode) {
      return <ResetPasswordScreen onDone={() => { setResetMode(false); setSession(null); setAppAuthMode('login'); }} />;
    }

    // Session check instead of boolean flag fixes the "breaks on login" issue
    if (!session) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {appAuthMode === 'login' ? (
              <LoginPage 
                onLoginSuccess={() => { 
                  // The actual navigation happens via onAuthStateChange
                }} 
                onSignupClick={() => setAppAuthMode('signup')} 
              />
            ) : (
              <EmailOTPSignup 
                onComplete={() => { 
                  // The actual navigation happens via onAuthStateChange
                }} 
                onLoginClick={() => setAppAuthMode('login')}
              />
            )}
          </div>
        </div>
      );
    }

    // Biometric gate: session exists but biometric lock not yet cleared
    if (!biometricUnlocked) {
      const firstName = session?.user?.user_metadata?.first_name || session?.user?.email?.split('@')[0];
      return (
        <BiometricUnlockScreen
          userName={firstName}
          onUnlocked={() => {
            markBiometricSessionActive();
            setBiometricUnlocked(true);
          }}
          onUsePassword={async () => {
            // Sign out so the user sees the login page (per plan: biometric failure → login)
            await supabase.auth.signOut();
            setBiometricUnlocked(true);
          }}
        />
      );
    }

    const handleAppNavigate = (screen: string) => {
      if (screen === 'logout') {
        handleLogout();
      } else {
        setCustomerTab(screen);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <CustomerSidebar currentTab={customerTab} setTab={setCustomerTab} onLogout={handleLogout} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1">
          <div className="min-h-screen overflow-y-auto">
            {customerTab === 'dashboard' && <Dashboard onNavigate={handleAppNavigate} />}
            {customerTab === 'add-money' && <AddMoney onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'send' && <TransferFlow onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'exchange' && <CurrencyConverter onBack={() => setCustomerTab('dashboard')} />}
            {(customerTab === 'bills' || customerTab === 'airtime' || customerTab === 'data') && <BillPayments onBack={() => setCustomerTab('dashboard')} initialCategory={customerTab === 'airtime' ? 'airtime' : customerTab === 'data' ? 'data' : undefined} />}
            {customerTab === 'cards' && <CardsManagement onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'savings' && <SavingsModule onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'pos' && <VirtualPOS onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'qr' && <QRPayments onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'secure-pay' && <SecurePay onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'transactions' && <TransactionHistory onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'notifications' && <Notifications onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'settings' && <Settings onBack={() => setCustomerTab('dashboard')} onLogout={handleLogout} onNavigate={setCustomerTab} />}
            {customerTab === 'diagnostics' && (
              <div className="min-h-screen bg-gray-50 pb-24">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 pt-12 pb-8 px-4">
                  <div className="max-w-md mx-auto flex items-center gap-4">
                    <button onClick={() => setCustomerTab('dashboard')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                      <ArrowUpRight className="w-5 h-5 rotate-180" />
                    </button>
                    <h1 className="text-white text-2xl font-bold">Diagnostics</h1>
                  </div>
                </div>
                <div className="max-w-md mx-auto px-4 -mt-4">
                  <DiagnosticPanel />
                </div>
              </div>
            )}
            {customerTab === 'jwt-debug' && <JWTDebugger />}
            {customerTab === 'jwt-fix-guide' && <JWTFixGuide />}
            {customerTab === 'kyc' && <AccountTiers onBack={() => setCustomerTab('dashboard')} onUpdate={() => {}} />}
            {customerTab === 'business-transfer' && <InternationalBusinessTransfer onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'china-trade' && <ChinaTradeSettlement onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'wallets' && <Wallets onBack={() => setCustomerTab('dashboard')} onNavigate={handleAppNavigate} />}
            {customerTab === 'more' && <MoreMenu onBack={() => setCustomerTab('dashboard')} onNavigate={handleAppNavigate} />}
            
            {/* Fallback for any unhandled routes */}
            {!['dashboard', 'add-money', 'send', 'exchange', 'bills', 'cards', 'savings', 'pos', 'qr', 'secure-pay', 'transactions', 'notifications', 'settings', 'kyc', 'business-transfer', 'china-trade', 'wallets', 'more', 'diagnostics', 'jwt-debug', 'jwt-fix-guide'].includes(customerTab) && (
              <div className="p-8 lg:p-12 max-w-6xl mx-auto pt-24 lg:pt-12">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 capitalize">{customerTab.replace('-', ' ')}</h2>
                  <p className="text-slate-500 mt-1">Border banking services for {customerTab}.</p>
                </div>
                <div className="bg-white p-16 rounded-[2rem] border-2 border-dashed border-slate-100 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <Zap className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Module Under Construction</h3>
                  <p className="text-slate-400 max-w-sm mx-auto mt-2">We're working to bring this feature online. Stay tuned!</p>
                  <button onClick={() => setCustomerTab('dashboard')} className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100">
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 w-full h-20 bg-white border-t border-slate-100 flex items-center justify-around px-4 z-50">
           <button onClick={() => setCustomerTab('dashboard')} className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${customerTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
              <Layout className="w-5 h-5" />
              <span className="text-[9px] font-semibold">Home</span>
           </button>
           <button onClick={() => setCustomerTab('wallets')} className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${customerTab === 'wallets' ? 'text-blue-600' : 'text-slate-400'}`}>
              <Wallet className="w-5 h-5" />
              <span className="text-[9px] font-semibold">Wallets</span>
           </button>
           <button onClick={() => setCustomerTab('savings')} className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${customerTab === 'savings' ? 'text-blue-600' : 'text-slate-400'}`}>
              <PlusCircle className="w-5 h-5" />
              <span className="text-[9px] font-semibold">Savings</span>
           </button>
           <button onClick={() => setCustomerTab('cards')} className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${customerTab === 'cards' ? 'text-blue-600' : 'text-slate-400'}`}>
              <CreditCard className="w-5 h-5" />
              <span className="text-[9px] font-semibold">Cards</span>
           </button>
           <button onClick={() => setCustomerTab('more')} className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${customerTab === 'more' ? 'text-blue-600' : 'text-slate-400'}`}>
              <Menu className="w-5 h-5" />
              <span className="text-[9px] font-semibold">More</span>
           </button>
        </div>
      </div>
    );
  };

  return (
    <WalletProvider>
      <div className="min-h-screen w-full" style={{overflowX:'hidden',maxWidth:'100vw',position:'relative'}}>
        {/* Floating switcher — only admin users see this; admin view has it in its header */}
        {session && isAdminUser && viewMode !== 'admin' && (
          <div className="fixed top-3 right-3 z-[9999] flex gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
            <button
              onClick={() => toggleView('app')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${viewMode === 'app' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}
            >App</button>
            <button
              onClick={() => toggleView('admin')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${viewMode === 'admin' ? 'bg-slate-800 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}
            >Admin</button>
          </div>
        )}
        {viewMode === 'admin' ? renderAdminContent() : renderAppContent()}
        <Toaster position="bottom-right" richColors />
      </div>
    </WalletProvider>
  );
}