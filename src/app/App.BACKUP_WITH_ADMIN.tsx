import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/app/components/AdminSidebar';
import { CustomerSidebar } from '@/app/components/CustomerSidebar';
import { StatCard } from '@/app/components/StatCard';
import { KYCManager } from '@/app/components/KYCManager';
import { TransactionOverview } from '@/app/components/TransactionOverview';
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
import AdminLiquidity from '@/app/components/admin/AdminLiquidity';
import AdminSettings from '@/app/components/admin/AdminSettings';
import { WalletProvider } from '@/app/context/WalletContext';
import { 
  Users, 
  ArrowUpRight, 
  Wallet, 
  AlertCircle,
  Bell,
  Search,
  Lock,
  ChevronRight,
  ShieldCheck,
  Globe,
  Database,
  Smartphone,
  Layout,
  Key,
  Info,
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

// --- ADMIN COMPONENTS ---

const AdminLoginScreen = ({ onLogin, onSwitchToApp }: { onLogin: () => void, onSwitchToApp: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin();
      toast.success('Authenticated as Admin');
      setLoading(false);
    }, 1200);
  };

  const handleQuickAccess = () => {
    setLoading(true);
    setTimeout(() => {
      onLogin();
      toast.success('Quick Admin Access Granted');
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Border Admin</h1>
          <p className="text-slate-500 mt-2">Secure access for verified personnel only</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 px-3 py-1 text-[10px] font-bold rounded-bl-xl uppercase tracking-wider">
            Dev Mode
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Admin Email</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@useborder.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Security Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate Access"}
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-medium">Or Development Shortcut</span></div>
            </div>

            <button 
              type="button"
              onClick={handleQuickAccess}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              Quick Admin Access
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-blue-800 leading-relaxed">
                <p className="font-bold mb-1">How to create real credentials:</p>
                1. Go to your Supabase Dashboard<br/>
                2. Navigate to Authentication → Users<br/>
                3. Add a new user with your admin email<br/>
                4. Use the <strong>Quick Access</strong> button during dev.
              </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onSwitchToApp}
          className="mt-8 w-full text-slate-400 hover:text-slate-600 font-medium text-sm flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4" />
          Back to Mobile App Experience
        </button>
      </div>
    </div>
  );
};

// --- MAIN ROUTER ---

export default function App() {
  const [viewMode, setViewMode] = useState<'app' | 'admin'>('app'); 
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminTab, setAdminTab] = useState('dashboard');
  const [session, setSession] = useState<any>(null);
  const [appAuthMode, setAppAuthMode] = useState<'login' | 'signup'>('login');
  const [customerTab, setCustomerTab] = useState('dashboard');
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setInitLoading(false);
    });

    // 2. Auth State Listener (Crucial for fixing login break)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        setAppAuthMode('login'); // Reset auth mode if we log in
      }
    });

    // 3. View Mode Persistence
    const savedMode = localStorage.getItem('border_view_mode');
    if (savedMode) setViewMode(savedMode as any);

    return () => subscription.unsubscribe();
  }, []);

  const toggleView = (mode: 'app' | 'admin') => {
    setViewMode(mode);
    localStorage.setItem('border_view_mode', mode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAppAuthMode('login');
    toast.success('Logged out successfully');
  };

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  const renderAdminContent = () => {
    if (!isAdminAuth) {
      return <AdminLoginScreen onLogin={() => setIsAdminAuth(true)} onSwitchToApp={() => toggleView('app')} />;
    }

    return (
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar currentTab={adminTab} setTab={setAdminTab} />
        <main className="flex-1 md:pl-64">
          <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
            <h1 className="text-xl font-bold text-slate-900 capitalize">{adminTab}</h1>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsAdminAuth(false)} className="text-xs font-bold text-slate-400 hover:text-rose-500">Log Out</button>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">A</div>
            </div>
          </header>
          <div className="p-8 max-w-7xl mx-auto">
            {adminTab === 'dashboard' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Active Wallets" value="1,240" change="+12.5%" isPositive={true} icon={Users} />
                  <StatCard title="Settlement Vol" value="$84.2k" change="+8.2%" isPositive={true} icon={ArrowUpRight} />
                  <StatCard title="Pending KYC" value="18" change="-5%" isPositive={true} icon={AlertCircle} />
                  <StatCard title="Buffer Pool" value="$42.1k" change="+0.4%" isPositive={true} icon={Wallet} />
                </div>
                <TransactionOverview />
              </div>
            )}
            {adminTab === 'kyc' && <KYCManager />}
            {adminTab === 'transactions' && <AdminTransactions />}
            {adminTab === 'users' && <AdminUsers />}
            {adminTab === 'cards' && <AdminCards />}
            {adminTab === 'liquidity' && <AdminLiquidity />}
            {adminTab === 'settings' && <AdminSettings />}
            {adminTab !== 'dashboard' && adminTab !== 'kyc' && adminTab !== 'transactions' && adminTab !== 'users' && adminTab !== 'cards' && adminTab !== 'liquidity' && adminTab !== 'settings' && (
              <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400">
                Coming soon...
              </div>
            )}
          </div>
        </main>
      </div>
    );
  };

  const renderAppContent = () => {
    // Session check instead of boolean flag fixes the "breaks on login" issue
    if (!session) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {appAuthMode === 'login' ? (
              <LoginPage 
                onLoginSuccess={() => { 
                  console.log('✅ Login successful callback');
                  // The actual navigation happens via onAuthStateChange
                }} 
                onSignupClick={() => setAppAuthMode('signup')} 
              />
            ) : (
              <EmailOTPSignup 
                onComplete={() => { 
                  console.log('✅ Signup successful callback');
                  // The actual navigation happens via onAuthStateChange
                }} 
                onLoginClick={() => setAppAuthMode('login')}
              />
            )}
          </div>
        </div>
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
            {customerTab === 'bills' && <BillPayments onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'cards' && <CardsManagement onBack={() => setCustomerTab('dashboard')} />}
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
                    <button onClick={() => setCustomerTab('dashboard')} className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
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
            {customerTab === 'wallets' && <Wallets onBack={() => setCustomerTab('dashboard')} />}
            {customerTab === 'more' && <MoreMenu onBack={() => setCustomerTab('dashboard')} onNavigate={handleAppNavigate} />}
            
            {/* Fallback for any unhandled routes */}
            {!['dashboard', 'add-money', 'send', 'exchange', 'bills', 'cards', 'pos', 'qr', 'secure-pay', 'transactions', 'notifications', 'settings', 'kyc', 'business-transfer', 'china-trade', 'wallets', 'more', 'diagnostics', 'jwt-debug', 'jwt-fix-guide'].includes(customerTab) && (
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
                  <p className="text-slate-400 max-w-sm mx-auto mt-2">We're working with 9PSB to bring this feature online. Stay tuned!</p>
                  <button onClick={() => setCustomerTab('dashboard')} className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100">
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 w-full h-20 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-6 z-50">
           <button onClick={() => setCustomerTab('dashboard')} className={`p-2 transition-colors ${customerTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
              <Layout className="w-6 h-6" />
           </button>
           <button onClick={() => setCustomerTab('wallets')} className={`p-2 transition-colors ${customerTab === 'wallets' ? 'text-blue-600' : 'text-slate-400'}`}>
              <Wallet className="w-6 h-6" />
           </button>
           <button onClick={() => setCustomerTab('cards')} className={`p-2 transition-colors ${customerTab === 'cards' ? 'text-blue-600' : 'text-slate-400'}`}>
              <CreditCard className="w-6 h-6" />
           </button>
           <button onClick={() => setCustomerTab('more')} className={`p-2 transition-colors ${customerTab === 'more' ? 'text-blue-600' : 'text-slate-400'}`}>
              <Menu className="w-6 h-6" />
           </button>
        </div>
      </div>
    );
  };

  return (
    <WalletProvider>
      <div className="min-h-screen">
        {/* Persistent Dev Switcher - Moved to be more obvious and accessible */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex bg-slate-900/90 backdrop-blur-md shadow-2xl rounded-full p-1 border border-white/10 ring-1 ring-black/5 scale-110">
          <button 
            onClick={() => toggleView('app')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-tighter transition-all ${viewMode === 'app' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Portal
          </button>
          <button 
            onClick={() => toggleView('admin')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-tighter transition-all ${viewMode === 'admin' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Layout className="w-3.5 h-3.5" />
            Console
          </button>
        </div>

        {viewMode === 'app' ? renderAppContent() : renderAdminContent()}
        
        <Toaster position="bottom-right" richColors />
      </div>
    </WalletProvider>
  );
}
