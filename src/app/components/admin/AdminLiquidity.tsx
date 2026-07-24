import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, DollarSign, Coins, RefreshCw, Loader2,
  ArrowUpRight, ArrowDownLeft, Zap, Shield, Globe, Database
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLiquidity() {
  const [loading, setLoading] = useState(false);
  const [liquidityData, setLiquidityData] = useState({
    totalLiquidity: 842500,
    openfortReserves: 625000,
    juicywayReserves: 217500,
    pendingSettlements: 18750,
    dailyVolume: 156200,
    settlementSpeed: 1.8
  });

  const [openfortMetrics] = useState({
    usdcBalance: 485234.56,
    usdtBalance: 342156.78,
    supportedCurrencies: ['USDC', 'USDT', 'ETH'],
    apiHealth: 'healthy',
    lastSync: new Date().toISOString()
  });

  const [treasuryAllocation] = useState({
    openfortUSDC: 485234.56,
    openfortUSDT: 342156.78,
    juicywayNGN: 150000,
    juicywayUSD: 67500
  });

  const [recentSettlements] = useState([
    {
      id: 'STL-001',
      type: 'cross-border',
      from: 'NGN',
      to: 'USD',
      amount: 5000,
      method: 'Openfort USDC',
      ledgerTx: 'LDG-1234567',
      status: 'completed',
      time: '2 mins ago',
      fee: 0.5
    },
    {
      id: 'STL-002',
      type: 'currency-swap',
      from: 'GBP',
      to: 'EUR',
      amount: 3200,
      method: 'Juicyway FX',
      ledgerTx: 'LDG-1234568',
      status: 'completed',
      time: '5 mins ago',
      fee: 0.3
    },
    {
      id: 'STL-003',
      type: 'cross-border',
      from: 'USD',
      to: 'NGN',
      amount: 8500,
      method: 'Juicyway Payout',
      ledgerTx: 'LDG-1234569',
      status: 'processing',
      time: '1 min ago',
      fee: 0.8
    },
    {
      id: 'STL-004',
      type: 'bulk-payout',
      from: 'USDC',
      to: 'NGN',
      amount: 12000,
      method: 'Openfort → Juicyway',
      ledgerTx: 'LDG-1234570',
      status: 'completed',
      time: '8 mins ago',
      fee: 0.6
    }
  ]);

  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      // Simulate data refresh with slight variations
      setLiquidityData(prev => ({
        ...prev,
        totalLiquidity: prev.totalLiquidity + Math.random() * 1000 - 500,
        pendingSettlements: prev.pendingSettlements + Math.random() * 100 - 50
      }));
      setLoading(false);
      toast.success('Liquidity data refreshed');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Liquidity Pool</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${(liquidityData.totalLiquidity / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12.5% this month
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Openfort Treasury</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  ${(liquidityData.openfortReserves / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {((liquidityData.openfortReserves / liquidityData.totalLiquidity) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Avg Settlement Time</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {liquidityData.settlementSpeed.toFixed(1)}s
                </p>
                <p className="text-xs text-purple-600 font-medium mt-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Internal ledger speed
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Openfort & Juicyway Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Openfort Treasury + Juicyway Liquidity
            </CardTitle>
            <button
              onClick={refreshData}
              disabled={loading}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">USDC Balance</p>
              <p className="text-2xl font-bold text-blue-700">${openfortMetrics.usdcBalance.toLocaleString()}</p>
              <p className="text-xs text-blue-600 mt-1">Openfort Treasury</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">USDT Balance</p>
              <p className="text-2xl font-bold text-purple-700">${openfortMetrics.usdtBalance.toLocaleString()}</p>
              <p className="text-xs text-purple-600 mt-1">Openfort Treasury</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">Supported</p>
              <p className="text-2xl font-bold text-green-700">{openfortMetrics.supportedCurrencies.length}</p>
              <p className="text-xs text-green-600 mt-1">Currencies</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide mb-1">API Status</p>
              <p className="text-2xl font-bold text-emerald-700 capitalize">{openfortMetrics.apiHealth}</p>
              <p className="text-xs text-emerald-600 mt-1">Real-time</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">Last Sync</p>
              <p className="text-2xl font-bold text-purple-700">{new Date(openfortMetrics.lastSync).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-xs text-purple-600 mt-1">Auto-synced</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 mb-2">Internal Ledger Architecture</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Settlement Method</p>
                    <p className="font-bold text-slate-900">Internal Ledger</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Treasury Provider</p>
                    <p className="font-bold text-slate-900">Openfort (USDC/USDT)</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Liquidity Provider</p>
                    <p className="font-bold text-slate-900">Juicyway FX</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Treasury Allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            Treasury Allocation by Provider
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-700">Openfort USDC Treasury</span>
                </div>
                <span className="font-bold text-slate-900">${(treasuryAllocation.openfortUSDC / 1000).toFixed(1)}k</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '59%' }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-1">USDC custody & treasury</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-700">Openfort USDT Treasury</span>
                </div>
                <span className="font-bold text-slate-900">${(treasuryAllocation.openfortUSDT / 1000).toFixed(1)}k</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '41%' }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-1">USDT custody & treasury</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-700">Juicyway NGN Liquidity</span>
                </div>
                <span className="font-bold text-slate-900">${(treasuryAllocation.juicywayNGN / 1000).toFixed(1)}k</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '18%' }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Nigerian Naira FX & payouts</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-600 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-700">Juicyway USD Liquidity</span>
                </div>
                <span className="font-bold text-slate-900">${(treasuryAllocation.juicywayUSD / 1000).toFixed(1)}k</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-amber-600 h-2 rounded-full" style={{ width: '8%' }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-1">USD FX & international payouts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Settlements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Ledger Settlements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentSettlements.map((settlement) => (
              <div key={settlement.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {settlement.status === 'completed' ? (
                        <ArrowUpRight className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{settlement.id}</p>
                      <p className="text-xs text-slate-500 capitalize">{settlement.type.replace('-', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={settlement.status === 'completed' ? 'bg-green-100 text-green-700 border-0' : 'bg-yellow-100 text-yellow-700 border-0'}>
                      {settlement.status}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700 border-0">
                      {settlement.fee}% fee
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Route</p>
                    <p className="font-bold text-slate-900">{settlement.from} → {settlement.to}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Amount</p>
                    <p className="font-bold text-slate-900">${settlement.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Method</p>
                    <p className="font-bold text-slate-900">{settlement.method}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Ledger TX</p>
                    <p className="font-mono text-xs text-blue-600">{settlement.ledgerTx}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Time</p>
                    <p className="font-medium text-slate-900">{settlement.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Liquidity Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Settlement Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Today's Volume</span>
                  <span className="font-bold text-slate-900">${(liquidityData.dailyVolume / 1000).toFixed(1)}k</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '68%' }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">68% of daily capacity</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Pending Settlements</span>
                  <span className="font-bold text-yellow-600">${(liquidityData.pendingSettlements / 1000).toFixed(1)}k</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">12% in processing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treasury Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-200" />
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray="351.68" strokeDashoffset="45" className="text-green-500" />
                </svg>
                <div className="absolute">
                  <p className="text-3xl font-bold text-slate-900">87</p>
                  <p className="text-xs text-slate-500">Score</p>
                </div>
              </div>
              <p className="font-bold text-green-600 mb-1">Excellent Health</p>
              <p className="text-sm text-slate-600">Treasury reserves are optimal for current demand</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}