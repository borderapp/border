import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Activity, TrendingUp, Coins, Zap, RefreshCw, AlertTriangle,
  CheckCircle2, DollarSign, ArrowUpRight, ArrowDownLeft, BarChart3
} from 'lucide-react';
import { getLiquidityPools, getSettlementMetrics } from '@/utils/stablecoin-service';

export default function AdminStablecoinPanel() {
  const [refreshing, setRefreshing] = useState(false);
  const liquidityPools = getLiquidityPools();
  const metrics = getSettlementMetrics();

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const totalLiquidity = liquidityPools.reduce((sum, pool) => sum + pool.total, 0);
  const averageUtilization = liquidityPools.reduce((sum, pool) => sum + pool.utilizationRate, 0) / liquidityPools.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settlement Infrastructure</h2>
          <p className="text-sm text-gray-600">
            Real-time stablecoin operations monitoring (Admin Only)
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <Badge className="bg-green-500 text-white">Live</Badge>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {metrics.last24Hours.totalTransactions.toLocaleString()}
            </h3>
            <p className="text-sm text-gray-600">Settlements (24h)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              ${(metrics.last24Hours.totalVolumeUSD / 1000000).toFixed(2)}M
            </h3>
            <p className="text-sm text-gray-600">Volume (24h)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {metrics.last24Hours.avgSettlementTime.toFixed(1)}s
            </h3>
            <p className="text-sm text-gray-600">Avg Settlement Time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {metrics.last24Hours.successRate}%
            </h3>
            <p className="text-sm text-gray-600">Success Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Liquidity Pools */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Treasury Liquidity Pools</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Circle USDC & Local Partner reserves
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Liquidity</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(totalLiquidity / 1000000).toFixed(2)}M
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {liquidityPools.map((pool) => (
              <div key={pool.stablecoin} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center">
                      <Coins className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{pool.stablecoin}</p>
                      <p className="text-xs text-gray-500">
                        Circle API Treasury
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${pool.total.toLocaleString()}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        pool.utilizationRate < 0.5 
                          ? 'border-green-300 text-green-700' 
                          : pool.utilizationRate < 0.8
                          ? 'border-amber-300 text-amber-700'
                          : 'border-red-300 text-red-700'
                      }`}
                    >
                      {(pool.utilizationRate * 100).toFixed(1)}% utilized
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Available</p>
                    <p className="font-medium text-green-600">
                      ${pool.available.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Reserved</p>
                    <p className="font-medium text-amber-600">
                      ${pool.reserved.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total</p>
                    <p className="font-medium text-gray-900">
                      ${pool.total.toLocaleString()}
                    </p>
                  </div>
                </div>

                <Progress value={pool.utilizationRate * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settlement Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Settlement by Stablecoin (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.byStablecoin).map(([coin, data]) => (
                <div key={coin} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Coins className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{coin}</p>
                      <p className="text-xs text-gray-500">
                        {data.count.toLocaleString()} transactions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${(data.volume / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-gray-500">
                      {((data.count / metrics.last24Hours.totalTransactions) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Circle API Status</p>
                    <p className="text-xs text-green-700">All systems operational</p>
                  </div>
                </div>
                <Badge className="bg-green-500 text-white">Healthy</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Liquidity Status</p>
                    <p className="text-xs text-green-700">
                      {(averageUtilization * 100).toFixed(1)}% avg utilization
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-500 text-white">Optimal</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Settlement Speed</p>
                    <p className="text-xs text-blue-700">
                      {metrics.last24Hours.avgSettlementTime.toFixed(1)}s average
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-blue-300 text-blue-700">
                  Fast
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Success Rate</p>
                    <p className="text-xs text-green-700">
                      {metrics.last24Hours.successRate}% in 24h
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-500 text-white">Excellent</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent On-Chain Settlements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Ledger Settlements</CardTitle>
          <p className="text-sm text-gray-600">
            Latest internal ledger transactions
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: 'P2P', from: 'NGN', to: 'USD', amount: 150000, stable: 'USDC', hash: 'LDG-7a8b4f3e', time: '12s ago' },
              { type: 'Conversion', from: 'USD', to: 'EUR', amount: 500, stable: 'USDC', hash: 'LDG-9c2d8a1b', time: '45s ago' },
              { type: 'Bank Transfer', from: 'NGN', to: 'NGN', amount: 75000, stable: 'USDC', hash: 'LDG-3e5f2d9c', time: '1m ago' },
              { type: 'International', from: 'USD', to: 'GBP', amount: 2000, stable: 'USDC', hash: 'LDG-1b4c7e8f', time: '2m ago' },
              { type: 'China Trade', from: 'NGN', to: 'CNY', amount: 300000, stable: 'USDC', hash: 'LDG-6d9a5c2b', time: '3m ago' },
            ].map((settlement, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{settlement.type}</p>
                      <Badge variant="outline" className="text-xs">
                        {settlement.stable}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">
                      Ledger TX: {settlement.hash}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {settlement.from} → {settlement.to}
                  </p>
                  <p className="text-xs text-gray-500">{settlement.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                Regulatory Compliance & User Privacy
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                All treasury operations are invisible to end users. Border operates as a regulated 
                fintech using Circle APIs for treasury management. Users only see 
                fiat balances and standard banking operations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-900">Internal Ledger</p>
                    <p className="text-xs text-blue-700">All balances tracked internally</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-900">KYC/AML Enforced</p>
                    <p className="text-xs text-blue-700">Full compliance with CBN regulations</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-900">Fiat-Only UX</p>
                    <p className="text-xs text-blue-700">No crypto exposure for users</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}