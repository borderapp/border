import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, Plus, Eye, EyeOff, ArrowUpRight, ArrowDownLeft, 
  TrendingUp, Lock, RefreshCw, Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { useWallet } from '@/app/context/WalletContext';

interface WalletsProps {
  onBack: () => void;
  onNavigate?: (screen: string) => void;
}

const CURRENCY_CONFIG = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', description: 'Local currency' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', rate: 1650, description: 'Global payments' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', rate: 2100, description: 'UK transactions' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', flag: '🇬🇭', rate: 110, description: 'Ghana commerce' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', rate: 90, description: 'South Africa' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', rate: 1200, description: 'Canada trade' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', rate: 230, description: 'China business' },
];

export default function Wallets({ onBack, onNavigate }: WalletsProps) {
  const { walletBalances, refreshBalances, loading } = useWallet();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalances();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatCurrency = (amount: number, symbol: string) => {
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const currencies = CURRENCY_CONFIG.map(config => ({
    ...config,
    balance: walletBalances[config.code] || 0,
  }));

  const totalBalanceNGN = currencies.reduce((sum, curr) => {
    const balance = Number(curr.balance) || 0;
    if (curr.code === 'NGN') return sum + balance;
    return sum + (balance * (curr.rate || 1));
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 pt-12 pb-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                {balanceVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              <button 
                onClick={handleRefresh}
                className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div>
            <h1 className="text-white text-3xl font-bold mb-2">My Wallets</h1>
            <p className="text-blue-100 text-sm">Multi-currency accounts for global banking</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-12 relative z-10">
        {/* Total Balance Card */}
        <Card className="mb-8 border-0 shadow-2xl rounded-[2rem] overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">Total Balance</span>
              <Badge className="bg-emerald-500 text-white border-0">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                Live
              </Badge>
            </div>
            <div className="mb-6">
              {balanceVisible ? (
                <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter">
                  {formatCurrency(totalBalanceNGN, '₦')}
                </h2>
              ) : (
                <div className="h-16 flex items-center gap-2">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="w-4 h-4 bg-slate-200 rounded-full animate-pulse"></div>)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">8 active currency wallets</span>
            </div>
          </CardContent>
        </Card>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">
              Each wallet operates independently with real-time exchange rates. Send, receive, and convert between currencies instantly.
            </p>
          </div>
        </div>

        {/* Currency Wallets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {currencies.map((currency, index) => (
            <motion.div
              key={currency.code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer rounded-2xl group overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                        {currency.flag}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-900">{currency.code}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currency.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-1 font-medium">Available Balance</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {balanceVisible ? formatCurrency(currency.balance, currency.symbol) : '••••••'}
                    </p>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">{currency.description}</p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
                      onClick={() => onNavigate?.('add-money')}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-xl font-bold border-slate-200"
                      onClick={() => onNavigate?.('send')}
                    >
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate?.('add-money')}
            className="text-left"
          >
            <Card className="border-0 shadow-sm hover:shadow-xl transition-all rounded-2xl bg-gradient-to-br from-emerald-50 to-white active:scale-95">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100 mx-auto mb-4">
                  <Plus className="w-7 h-7" />
                </div>
                <p className="font-bold text-slate-900 mb-2">Add Money</p>
                <p className="text-xs text-slate-500">Fund your wallets instantly</p>
              </CardContent>
            </Card>
          </button>

          <button
            onClick={() => onNavigate?.('exchange')}
            className="text-left"
          >
            <Card className="border-0 shadow-sm hover:shadow-xl transition-all rounded-2xl bg-gradient-to-br from-blue-50 to-white active:scale-95">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 mx-auto mb-4">
                  <RefreshCw className="w-7 h-7" />
                </div>
                <p className="font-bold text-slate-900 mb-2">Convert Currency</p>
                <p className="text-xs text-slate-500">Exchange at live rates</p>
              </CardContent>
            </Card>
          </button>

          <button
            onClick={() => onNavigate?.('transactions')}
            className="text-left"
          >
            <Card className="border-0 shadow-sm hover:shadow-xl transition-all rounded-2xl bg-gradient-to-br from-purple-50 to-white active:scale-95">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-100 mx-auto mb-4">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <p className="font-bold text-slate-900 mb-2">Transaction History</p>
                <p className="text-xs text-slate-500">View all activity</p>
              </CardContent>
            </Card>
          </button>
        </div>
      </div>
    </div>
  );
}
