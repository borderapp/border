import borderLogoIcon from '@/imports/ChatGPT_Image_Jul_1__2026__03_28_30_PM-removebg-preview.png';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ReceiptViewer from './ReceiptViewer';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Eye, EyeOff, Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, LogOut,
  TrendingUp, Bell, Settings, ChevronRight, Wallet, Zap, Shield, PlusCircle,
  AlertCircle, Lock, CreditCard, Loader2, Smartphone, Phone, Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useWallet } from '@/app/context/WalletContext';
import { useUnreadNotifications, useRecentActivities } from '@/app/hooks/useNotifications';
import { getIndicativeRate } from '@/utils/juicyway-rates';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  balance: number;
  flag: string;
  rate?: number;
}

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

const CURRENCY_CONFIG = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', flag: '🇬🇭' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
];

// ── Recent Activity — reads from notifications table ─────────────────────
function RecentActivity({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [receiptNotif, setReceiptNotif]   = useState<any | null>(null);

  useEffect(() => {
    let sub: any;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(8);
      if (data) setNotifications(data);
      setLoading(false);
    };
    load();

    // Real-time: refresh when a new notification arrives
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      sub = supabase
        .channel('dashboard-notifs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${session.user.id}` }, () => load())
        .subscribe();
    });
    return () => { sub?.unsubscribe(); };
  }, []);

  const getIcon = (type: string, title: string) => {
    const t = (type + title).toLowerCase();
    if (t.includes('success') || t.includes('complet') || t.includes('received') || t.includes('✅'))
      return { icon: ArrowDownLeft, bg: 'bg-emerald-50', color: 'text-emerald-600' };
    if (t.includes('fail') || t.includes('❌'))
      return { icon: ArrowUpRight, bg: 'bg-rose-50', color: 'text-rose-600' };
    if (t.includes('sent') || t.includes('transfer') || t.includes('withdraw'))
      return { icon: ArrowUpRight, bg: 'bg-rose-50', color: 'text-rose-600' };
    return { icon: Bell, bg: 'bg-blue-50', color: 'text-blue-600' };
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="w-5 h-5 animate-spin text-slate-300" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-900">Recent Activity</h3>
        <button onClick={() => onNavigate('notifications')}
          className="text-blue-600 text-sm font-bold hover:underline">View All</button>
      </div>

      {/* Receipt overlay — passes full notification as fallback when no DB record */}
      {receiptNotif && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <ReceiptViewer
            txId={receiptNotif.metadata?.reference || receiptNotif.metadata?.transaction_reference}
            notification={receiptNotif}
            onClose={() => setReceiptNotif(null)}
          />
        </div>
      )}

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] text-center border border-slate-100">
            <Bell className="w-10 h-10 text-slate-200 mx-auto mb-4" />
            <p className="font-bold text-slate-900">No activity yet</p>
            <p className="text-slate-400 text-sm mt-1">Your transactions will appear here.</p>
          </div>
        ) : (
          notifications.map(n => {
            const { icon: Icon, bg, color } = getIcon(n.type || '', n.title || '');
            const ref = n.metadata?.reference || n.metadata?.transaction_reference;
            const isTransaction = !!ref;
            return (
              <Card key={n.id}
                className={`border-0 shadow-sm rounded-2xl overflow-hidden transition-all ${isTransaction ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''}`}
                onClick={isTransaction ? () => setReceiptNotif(n) : undefined}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{n.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{n.message}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[10px] text-slate-400 font-medium">{formatTime(n.created_at)}</p>
                    {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto mt-1" />}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}


export default function Dashboard({ onNavigate }: DashboardProps) {
  const { walletBalances, refreshBalances, loading: walletLoading } = useWallet();
  const { unreadCount } = useUnreadNotifications();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [baseCurrency] = useState('NGN');
  const [userData, setUserData] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});

  const fetchDashboardData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        setSessionChecked(true);
        return;
      }


      // Fetch Profile with better error handling
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        // Use session metadata as fallback
        const metadata = session.user.user_metadata;
        setUserData({
          firstName: metadata?.firstName || metadata?.name?.split(' ')[0] || 'User',
          kyc_level: 0,
          border_tag: metadata?.border_tag
        });
      } else if (profile) {
        setUserData({
          ...profile,
          firstName: profile.first_name || profile.name?.split(' ')[0] || session.user.user_metadata?.firstName || session.user.user_metadata?.name?.split(' ')[0] || 'User'
        });
      }

      // Fetch Transactions with error handling
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (txError) {
      } else if (transactions) {
        setRecentTransactions(transactions);
      }

      if (isManual) {
        await refreshBalances();
        toast.success('Account synced');
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSessionChecked(true);
    }
  };

  useEffect(() => {
    // Add a small delay to ensure session is fully established
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 300);

    // Subscribe to transaction changes for real-time updates
    const transactionSubscription = supabase
      .channel('dashboard-transactions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' }, 
        (payload) => {
          // Reload transactions when any transaction changes
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      transactionSubscription.unsubscribe();
    };
  }, []);

  // Fetch live exchange rates
  useEffect(() => {
    const fetchLiveRates = async () => {
      try {
        const rates: Record<string, number> = {};
        
        // Fetch rates for all currencies relative to NGN
        for (const currency of CURRENCY_CONFIG) {
          if (currency.code !== 'NGN') {
            try {
              const rateData = await getIndicativeRate(currency.code as any, 'NGN');
              rates[currency.code] = rateData.finalRate;
            } catch (error) {
              // Use fallback rate
              rates[currency.code] = 1;
            }
          }
        }
        
        setLiveRates(rates);
      } catch (error) {
      }
    };

    fetchLiveRates();
    
    // Refresh rates every 5 minutes
    const rateInterval = setInterval(fetchLiveRates, 5 * 60 * 1000);
    
    return () => clearInterval(rateInterval);
  }, []);

  // Show loading state while checking session and wallet
  if (!sessionChecked || (loading && !userData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Loading your account...</p>
          <p className="text-slate-400 text-sm mt-1">Loading your account...</p>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const currencies: Currency[] = CURRENCY_CONFIG.map(config => ({
    ...config,
    balance: walletBalances[config.code] || 0,
    rate: liveRates[config.code] || 1
  }));

  const totalBalance = currencies.reduce((sum, curr) => {
    const balance = Number(curr.balance) || 0;
    if (curr.code === baseCurrency) return sum + balance;
    return sum + (balance * (curr.rate || 1));
  }, 0);

  const formatCurrency = (amount: number, symbol: string) => {
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTransactionTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const kycTiers = [
    { name: 'Guest', color: 'bg-gray-500' },
    { name: 'Basic', color: 'bg-blue-500' },
    { name: 'Plus', color: 'bg-purple-500' },
    { name: 'Pro', color: 'bg-orange-500' },
    { name: 'Business', color: 'bg-red-500' },
  ];

  const currentKycLevel = userData?.kyc_level ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-12">
      {/* Dynamic Header */}
      <div className="bg-gradient-to-br from-blue-600 to-green-500 pt-10 pb-36 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Border logo in header */}
          <div className="mb-4">
            <img src={borderLogoIcon} alt="Border" className="h-8 object-contain " />
          </div>
          <div className="flex items-center justify-between mb-8 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 shrink-0 bg-white/20 rounded-2xl flex items-center justify-center text-white border border-white/20 text-lg font-bold shadow-inner">
                {userData?.firstName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">{getGreeting()}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-white text-xl font-bold tracking-tight truncate">{userData?.firstName || 'User'}</h1>
                  <Badge className={`${kycTiers[currentKycLevel].color} text-white border-0 py-0.5`}>
                    {kycTiers[currentKycLevel].name}
                  </Badge>
                </div>
                {userData?.border_tag && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(userData.border_tag);
                      toast.success('Tag copied to clipboard!');
                    }}
                    className="flex items-center gap-1.5 text-white/80 text-xs font-medium mt-0.5 hover:text-white transition-colors group"
                  >
                    {userData.border_tag}
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity rotate-45" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => fetchDashboardData(true)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => onNavigate('notifications')} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>}
              </button>
              <button onClick={() => onNavigate('settings')} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {currentKycLevel === 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-4 flex items-center gap-4 cursor-pointer" onClick={() => onNavigate('kyc')}>
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-bold">Action Required: KYC Level 1</p>
                    <p className="text-blue-50 text-xs">Verify your identity to unlock global banking features.</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/50" />
                </motion.div>
              )}

              <Card className="bg-white border-0 shadow-2xl overflow-hidden rounded-[2rem]">
                <CardContent className="p-0">
                  <div className="p-8 md:p-10">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">Available Balance</span>
                      <button onClick={() => setBalanceVisible(!balanceVisible)} className="text-slate-400 hover:text-slate-900 transition-colors">
                        {balanceVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="mb-10">
                      {balanceVisible ? (
                        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter">
                          {formatCurrency(totalBalance, '₦')}
                        </h2>
                      ) : (
                        <div className="h-16 flex items-center gap-2">
                          {[1,2,3,4,5,6].map(i => <div key={i} className="w-4 h-4 bg-slate-200 rounded-full animate-pulse"></div>)}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Button onClick={() => onNavigate('add-money')} className="bg-blue-600 hover:bg-blue-700 h-auto py-4 rounded-2xl flex-col gap-1.5 shadow-xl shadow-blue-200">
                        <PlusCircle className="w-5 h-5" />
                        <span className="text-[9px] font-bold uppercase">Add Funds</span>
                      </Button>
                      <Button onClick={() => onNavigate('send')} variant="outline" className="h-auto py-4 rounded-2xl flex-col gap-1.5 border-slate-100 hover:bg-slate-50">
                        <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                        <span className="text-[9px] font-bold uppercase">Send Money</span>
                      </Button>
                      <Button onClick={() => onNavigate('exchange')} variant="outline" className="h-auto py-4 rounded-2xl flex-col gap-1.5 border-slate-100 hover:bg-slate-50">
                        <RefreshCw className="w-5 h-5 text-blue-600" />
                        <span className="text-[9px] font-bold uppercase">Convert</span>
                      </Button>
                      <Button onClick={() => onNavigate('airtime')} disabled={currentKycLevel < 1} variant="outline" className="h-auto py-4 rounded-2xl flex-col gap-1.5 border-slate-100 hover:bg-slate-50 relative">
                        <Phone className="w-5 h-5 text-rose-500" />
                        <span className="text-[9px] font-bold uppercase">Airtime</span>
                        {currentKycLevel < 1 && <Lock className="w-3 h-3 absolute top-2 right-2 text-slate-300" />}
                      </Button>
                      <Button onClick={() => onNavigate('data')} disabled={currentKycLevel < 1} variant="outline" className="h-auto py-4 rounded-2xl flex-col gap-1.5 border-slate-100 hover:bg-slate-50 relative">
                        <Wifi className="w-5 h-5 text-violet-500" />
                        <span className="text-[9px] font-bold uppercase">Data</span>
                        {currentKycLevel < 1 && <Lock className="w-3 h-3 absolute top-2 right-2 text-slate-300" />}
                      </Button>
                      <Button onClick={() => onNavigate('bills')} disabled={currentKycLevel < 1} variant="outline" className="h-auto py-4 rounded-2xl flex-col gap-1.5 border-slate-100 hover:bg-slate-50 relative">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <span className="text-[9px] font-bold uppercase">Bills</span>
                        {currentKycLevel < 1 && <Lock className="w-3 h-3 absolute top-2 right-2 text-slate-300" />}
                      </Button>
                    </div>
                  </div>
                  <div className="bg-emerald-50 px-10 py-4 flex items-center justify-between border-t border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-600">Tier {currentKycLevel} Wallet</span>
                    <button
                      onClick={() => setBalanceVisible(!balanceVisible)}
                      className="text-emerald-700 hover:text-emerald-800 transition-colors"
                    >
                      {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 hidden lg:block space-y-6">
              <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden h-full flex flex-col justify-between border border-slate-800 shadow-2xl">
                <div>
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <CreditCard className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Border Cards</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Spend globally with USD & NGN virtual cards. Instant issuance.</p>
                </div>
                <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold py-6 rounded-2xl" onClick={() => onNavigate('cards')}>
                  Issue New Card
                </Button>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Multi-Currency Wallets</h3>
                <button className="text-blue-600 text-sm font-bold hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currencies.slice(0, currentKycLevel > 1 ? 6 : 1).map((currency, i) => (
                  <Card key={currency.code} className="border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer rounded-2xl group overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                            {currency.flag}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{currency.code}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currency.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-slate-900">
                            {balanceVisible ? formatCurrency(currency.balance, currency.symbol) : '••••••'}
                          </p>
                          {currency.rate && (
                            <p className="text-[10px] font-bold text-emerald-600">₦{currency.rate.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {currentKycLevel <= 1 && (
                  <Card className="border-2 border-dashed border-slate-200 shadow-none bg-slate-50/50 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => onNavigate('kyc')}>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4 opacity-50 grayscale">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-4xl">🌍</div>
                        <div>
                          <p className="font-bold text-slate-900 tracking-tight">Add New Wallet</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest">USD, GBP, CAD & more</p>
                        </div>
                      </div>
                      <Plus className="w-6 h-6 text-slate-300" />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <RecentActivity onNavigate={onNavigate} />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Featured</h3>
            <div className="grid grid-cols-1 gap-4">
              <Card onClick={() => onNavigate('pos')} className="border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer rounded-2xl bg-gradient-to-br from-emerald-50 to-white group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Virtual POS</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Accept Tap-to-Pay</p>
                  </div>
                </CardContent>
              </Card>

              <Card onClick={() => onNavigate('secure-pay')} className="border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer rounded-2xl bg-gradient-to-br from-blue-50 to-white group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
                    <Shield className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">SecurePay Escrow</p>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Protected Commerce</p>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}