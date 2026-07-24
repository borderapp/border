import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ArrowLeft, ArrowDownUp, RefreshCw, TrendingUp, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { getIndicativeRate } from '@/utils/juicyway-rates';
import { useWallet } from '@/app/context/WalletContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const MARKUP_PCT = 2;

interface StroRate {
  conversionRate: number; // multiply fromAmount by this to get toAmount
  displayNgnPerUsd: number; // NGN per $1, shown to user
}

// Fetches live NGN/USD base rate from Strowallet (always returns NGN per $1).
// USD→NGN: user gets (raw - 2%) NGN per $1 displayed and used for conversion.
// NGN→USD: raw is shown as-is (no markup on display); conversion = 1/raw.
async function getStrowalletFXRate(from: string, to: string): Promise<StroRate> {
  const { data: { session } } = await supabase.auth.getSession();

  // Always query USD/NGN — both directions return the same NGN-per-$1 base.
  const res = await fetch(
    'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/strowallet-cards',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ action: 'get_stro_rate', from, to }),
    }
  );

  if (!res.ok) throw new Error(`Strowallet fetch failed: ${res.status}`);

  const json = await res.json();
  const d = json?.data ?? json;
  const candidates = [
    d?.rate, d?.exchange_rate, d?.exchangeRate,
    d?.data?.rate, d?.data?.exchange_rate,
    d?.result?.rate, d?.result,
  ];
  const rawVal = candidates.find((v) => v != null && !isNaN(Number(v)));
  if (rawVal == null) throw new Error('No rate value found in Strowallet response');

  const raw = Number(rawVal); // e.g. 1400 — means ₦1400 per $1

  if (from === 'USD' && to === 'NGN') {
    // User gets fewer NGN: e.g. 1650 × 0.98 = 1617 NGN per $1
    const withMarkup = raw * (1 - MARKUP_PCT / 100);
    return { conversionRate: withMarkup, displayNgnPerUsd: withMarkup };
  } else {
    // NGN→USD: user pays more NGN per $1: e.g. 1650 × 1.02 = 1683 NGN per $1
    // conversionRate = 1/withMarkup so toAmount = fromNGN × (1/1683) = USD amount
    const withMarkup = raw * (1 + MARKUP_PCT / 100);
    return { conversionRate: 1 / withMarkup, displayNgnPerUsd: withMarkup };
  }
}

function isNgnUsdPair(from: string, to: string) {
  return (from === 'USD' && to === 'NGN') || (from === 'NGN' && to === 'USD');
}

interface CurrencyConverterProps {
  onBack: () => void;
}

const CURRENCY_CONFIG = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', flag: '🇬🇭' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
];

export default function CurrencyConverter({ onBack }: CurrencyConverterProps) {
  const { walletBalances, refreshBalances } = useWallet();
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('NGN');
  const [fromAmount, setFromAmount] = useState('100');
  const [toAmount, setToAmount] = useState('165000');
  const [showCurrencySelect, setShowCurrencySelect] = useState<'from' | 'to' | null>(null);
  const [converting, setConverting] = useState(false);
  const [conversionComplete, setConversionComplete] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [rate, setRate] = useState(1);
  const [stroNgnPerUsd, setStroNgnPerUsd] = useState<number | null>(null); // display: NGN per $1
  const [loadingRates, setLoadingRates] = useState(false);
  const [popularRates, setPopularRates] = useState<Record<string, number>>({});

  // Fetch real exchange rates
  useEffect(() => {
    const fetchRate = async () => {
      setLoadingRates(true);
      try {
        let newRate: number;
        if (isNgnUsdPair(fromCurrency, toCurrency)) {
          const stro = await getStrowalletFXRate(fromCurrency, toCurrency);
          newRate = stro.conversionRate;
          setStroNgnPerUsd(stro.displayNgnPerUsd);
        } else {
          const rateData = await getIndicativeRate(fromCurrency as any, toCurrency as any);
          newRate = rateData.finalRate;
          setStroNgnPerUsd(null);
        }
        setRate(newRate);
        setLastUpdate(new Date());
      } catch (error) {
        // Keep existing rate as fallback
      } finally {
        setLoadingRates(false);
      }
    };

    fetchRate();
  }, [fromCurrency, toCurrency]);

  // Fetch popular conversion rates
  useEffect(() => {
    const fetchPopularRates = async () => {
      const pairs = [
        { from: 'USD', to: 'NGN' },
        { from: 'GBP', to: 'NGN' },
        { from: 'EUR', to: 'NGN' },
        { from: 'CNY', to: 'NGN' },
      ];

      const rates: Record<string, number> = {};
      for (const pair of pairs) {
        try {
          let r: number;
          if (isNgnUsdPair(pair.from, pair.to)) {
            const stro = await getStrowalletFXRate(pair.from, pair.to);
            r = stro.displayNgnPerUsd;
          } else {
            const rateData = await getIndicativeRate(pair.from as any, pair.to as any);
            r = rateData.finalRate;
          }
          rates[`${pair.from}-${pair.to}`] = r;
        } catch {
          rates[`${pair.from}-${pair.to}`] = 1;
        }
      }
      setPopularRates(rates);
    };

    fetchPopularRates();
  }, []);

  const fee = 0;
  
  // Get live balances from WalletContext
  const currencies = CURRENCY_CONFIG.map(config => ({
    ...config,
    balance: walletBalances[config.code] || 0,
  }));

  const fromCurrencyData = currencies.find(c => c.code === fromCurrency)!;
  const toCurrencyData = currencies.find(c => c.code === toCurrency)!;

  useEffect(() => {
    const amount = parseFloat(fromAmount) || 0;
    setToAmount((amount * rate).toFixed(2));
  }, [fromAmount, rate]);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount);
  };

  const handleConvert = async () => {
    setConverting(true);
    
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !session?.user?.id) {
        toast.error('Please log in to convert currency');
        setConverting(false);
        return;
      }

      // Call backend API to perform conversion
      const response = await fetch('https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/server/convert/currency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-token': session.access_token,
          'x-user-id': session.user.id,
        },
        body: JSON.stringify({
          fromCurrency,
          toCurrency,
          fromAmount: parseFloat(fromAmount),
          exchangeRate: rate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Conversion failed');
        setConverting(false);
        return;
      }

      
      // Refresh wallet balances from context
      await refreshBalances();
      
      setConverting(false);
      setConversionComplete(true);
      
      toast.success(`Successfully converted ${fromAmount} ${fromCurrency} to ${data.transaction.to.amount.toFixed(2)} ${toCurrency}`);
      
      setTimeout(() => {
        setConversionComplete(false);
        // Reset form
        setFromAmount('100');
      }, 3000);
      
    } catch (error: any) {
      toast.error('Failed to convert currency');
      setConverting(false);
    }
  };

  const refreshRate = async () => {
    setLoadingRates(true);
    try {
      let newRate: number;
      if (isNgnUsdPair(fromCurrency, toCurrency)) {
        const stro = await getStrowalletFXRate(fromCurrency, toCurrency);
        newRate = stro.conversionRate;
        setStroNgnPerUsd(stro.displayNgnPerUsd);
      } else {
        const rateData = await getIndicativeRate(fromCurrency as any, toCurrency as any);
        newRate = rateData.finalRate;
        setStroNgnPerUsd(null);
      }
      setRate(newRate);
      setLastUpdate(new Date());
      toast.success('Exchange rate updated');
    } catch {
      toast.error('Failed to update exchange rate');
    } finally {
      setLoadingRates(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 pt-12 pb-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-white text-2xl font-bold">Convert Currency</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4">
        {/* Live Rate Banner */}
        <Card className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Live FX Rate</p>
                  <p className="text-xs text-green-700">
                    Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
                  </p>
                </div>
              </div>
              <button 
                onClick={refreshRate}
                className="p-2 hover:bg-green-100 rounded-full transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-green-600" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Converter Card */}
        <Card className="mb-4">
          <CardContent className="p-6">
            {/* From Currency */}
            <div className="space-y-2 mb-4">
              <Label>From</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="text-2xl font-bold pr-32 h-14"
                  placeholder="0.00"
                />
                <button
                  onClick={() => setShowCurrencySelect('from')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <span className="text-xl">{fromCurrencyData.flag}</span>
                  <span className="font-semibold">{fromCurrency}</span>
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Available: {fromCurrencyData.symbol}{fromCurrencyData.balance.toLocaleString()}
              </p>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-2 relative z-10">
              <button
                onClick={handleSwapCurrencies}
                className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all hover:scale-110"
              >
                <ArrowDownUp className="w-5 h-5" />
              </button>
            </div>

            {/* To Currency */}
            <div className="space-y-2 mt-4">
              <Label>To</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={toAmount}
                  readOnly
                  className="text-2xl font-bold pr-32 h-14 bg-gray-50"
                  placeholder="0.00"
                />
                <button
                  onClick={() => setShowCurrencySelect('to')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <span className="text-xl">{toCurrencyData.flag}</span>
                  <span className="font-semibold">{toCurrency}</span>
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Balance after: {toCurrencyData.symbol}{(toCurrencyData.balance + parseFloat(toAmount)).toLocaleString()}
              </p>
            </div>

            {/* Exchange Rate Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Exchange Rate</span>
                <span className="font-medium">
                  {stroNgnPerUsd != null
                    ? <>₦{stroNgnPerUsd.toLocaleString('en-NG', { maximumFractionDigits: 2 })} = $1</>
                    : <>1 {fromCurrency} = {rate < 1 ? rate.toFixed(6) : rate.toLocaleString()} {toCurrency}</>
                  }
                </span>
              </div>

              <div className="pt-2 border-t flex justify-between">
                <span className="text-gray-900 font-semibold">You'll Receive</span>
                <span className="text-gray-900 font-bold">
                  {toCurrencyData.symbol}{toAmount}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card className="mb-4 bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-900">
                <p className="font-medium mb-1">Instant Conversion</p>
                <p className="text-amber-800">
                  Your currency conversion happens instantly with live FX rates. 
                  All conversions are secure and comply with regulatory requirements.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Convert Button */}
        <Button 
          onClick={handleConvert}
          disabled={converting || parseFloat(fromAmount) > fromCurrencyData.balance}
          className="w-full h-14 text-lg mb-6"
          size="lg"
        >
          {converting ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Converting...
            </>
          ) : conversionComplete ? (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Conversion Complete!
            </>
          ) : (
            <>
              Convert {fromCurrency} to {toCurrency}
            </>
          )}
        </Button>

        {/* Popular Conversions */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Popular Conversions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { from: 'USD', to: 'NGN' },
              { from: 'GBP', to: 'NGN' },
              { from: 'EUR', to: 'NGN' },
              { from: 'CNY', to: 'NGN' },
            ].map((pair) => {
              const rate = popularRates[`${pair.from}-${pair.to}`] || 1;
              return (
                <Card 
                  key={`${pair.from}-${pair.to}`}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setFromCurrency(pair.from);
                    setToCurrency(pair.to);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">
                        {currencies.find(c => c.code === pair.from)?.flag}
                      </span>
                      <span className="text-xs text-gray-500">→</span>
                      <span className="text-lg">
                        {currencies.find(c => c.code === pair.to)?.flag}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      {pair.from}/{pair.to}
                    </p>
                    <p className="font-semibold text-sm">
                      {isNgnUsdPair(pair.from, pair.to)
                        ? `₦${rate.toLocaleString('en-NG', { maximumFractionDigits: 0 })}/$1`
                        : rate < 1 ? rate.toFixed(6) : rate.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Currency Selection Modal */}
      {showCurrencySelect && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowCurrencySelect(null)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-xl">Select Currency</h3>
                <button 
                  onClick={() => setShowCurrencySelect(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => {
                      if (showCurrencySelect === 'from') {
                        setFromCurrency(currency.code);
                      } else {
                        setToCurrency(currency.code);
                      }
                      setShowCurrencySelect(null);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{currency.flag}</span>
                      <div className="text-left">
                        <p className="font-semibold">{currency.code}</p>
                        <p className="text-sm text-gray-500">{currency.name}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {currency.symbol}{currency.balance.toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}