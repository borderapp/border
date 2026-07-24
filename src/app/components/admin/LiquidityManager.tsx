import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowRightLeft,
  Activity,
  Database,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import juicywayService from '@/utils/juicyway-service';
import openfortTreasury from '@/utils/openfort-treasury';
import transferOrchestrator from '@/utils/transfer-orchestrator';

interface LiquidityManagerProps {
  onBack?: () => void;
}

export default function LiquidityManager({ onBack }: LiquidityManagerProps) {
  const [loading, setLoading] = useState(false);
  const [liquidity, setLiquidity] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [rebalancing, setRebalancing] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load liquidity status
      const liquidityData = await juicywayService.getLiquidityStatus();
      setLiquidity(liquidityData);

      // Load system stats
      const systemStats = transferOrchestrator.getSystemStats();
      setStats(systemStats);
    } catch (error) {
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
    setTimeout(() => setLoading(false), 500);
  };

  const handleRebalance = async (from: string, to: string, amount: number) => {
    if (!confirm(`Rebalance ${amount} from ${from} to ${to}?`)) return;
    
    setRebalancing(true);
    try {
      // TODO: Implement rebalancing logic
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate
      alert('Rebalancing completed successfully');
      await loadData();
    } catch (error) {
      alert('Rebalancing failed: ' + error);
    } finally {
      setRebalancing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'USDC' || currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600 bg-green-50';
    if (percentage < 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const calculateUtilization = (balance: any) => {
    if (!balance || balance.total === 0) return 0;
    return ((balance.reserved / balance.total) * 100).toFixed(1);
  };

  if (!liquidity) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Liquidity Management</h2>
          <p className="text-slate-500 mt-1">Monitor and manage treasury across Openfort & Juicyway</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Critical Alerts */}
      {liquidity.alerts && liquidity.alerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-2">Critical Liquidity Alerts</h3>
              <div className="space-y-2">
                {liquidity.alerts.map((alert: string, idx: number) => (
                  <p key={idx} className="text-sm text-red-800 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {alert}
                  </p>
                ))}
              </div>
              <button
                onClick={() => handleRebalance('external', 'USDC', 10000)}
                disabled={rebalancing}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {rebalancing ? 'Rebalancing...' : 'Initiate Emergency Rebalance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-blue-700">Total Liquidity</p>
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">
            ${(liquidity.total.USDC + liquidity.total.USDT).toFixed(2)}
          </p>
          <p className="text-sm text-blue-600 mt-2">
            USDC: ${liquidity.total.USDC.toFixed(2)} | USDT: ${liquidity.total.USDT.toFixed(2)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-green-700">Available</p>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">
            {((liquidity.openfort[0]?.available || 0) + (liquidity.openfort[1]?.available || 0)).toFixed(2)}
          </p>
          <p className="text-sm text-green-600 mt-2">Ready for payouts</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-2xl border border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-yellow-700">Reserved</p>
            <Activity className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-900">
            {((liquidity.openfort[0]?.reserved || 0) + (liquidity.openfort[1]?.reserved || 0)).toFixed(2)}
          </p>
          <p className="text-sm text-yellow-600 mt-2">In pending transactions</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-purple-700">Success Rate</p>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">
            {stats ? stats.successRate.toFixed(1) : '0'}%
          </p>
          <p className="text-sm text-purple-600 mt-2">
            {stats?.byStatus.completed || 0} completed
          </p>
        </div>
      </div>

      {/* Openfort Treasury */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Openfort Treasury</h3>
              <p className="text-sm text-slate-600">Main custody and wallet infrastructure</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {liquidity.openfort.map((balance: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-bold text-slate-900">{balance.currency}</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUtilizationColor(parseFloat(calculateUtilization(balance)))}`}>
                    {calculateUtilization(balance)}% utilized
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Available */}
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700 font-medium">Available</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-2">
                      ${balance.available.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Ready for payouts</p>
                  </div>

                  {/* Reserved */}
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-yellow-700 font-medium">Reserved</span>
                      <Activity className="w-4 h-4 text-yellow-600" />
                    </div>
                    <p className="text-2xl font-bold text-yellow-900 mt-2">
                      ${balance.reserved.toFixed(2)}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">In pending transactions</p>
                  </div>

                  {/* Total */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 font-medium">Total Balance</span>
                      <Database className="w-4 h-4 text-slate-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">
                      ${balance.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Custody balance</p>
                  </div>

                  {/* Utilization Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                      <span>Utilization</span>
                      <span>{calculateUtilization(balance)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${calculateUtilization(balance)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button
                    onClick={() => handleRebalance(balance.currency, 'external', 1000)}
                    disabled={rebalancing}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 text-sm"
                  >
                    Withdraw
                  </button>
                  <button
                    onClick={() => handleRebalance('external', balance.currency, 1000)}
                    disabled={rebalancing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                  >
                    Deposit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction Flow */}
      {stats && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-6">Transaction Flow (24h)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pending */}
            <div className="text-center p-6 bg-yellow-50 rounded-2xl border border-yellow-200">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-yellow-600" />
                <p className="font-bold text-yellow-900">Pending</p>
              </div>
              <p className="text-4xl font-bold text-yellow-900 mb-2">
                {stats.byStatus.pending + stats.byStatus.processing}
              </p>
              <p className="text-sm text-yellow-600">In progress</p>
            </div>

            {/* Completed */}
            <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-200">
              <div className="flex items-center justify-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-bold text-green-900">Completed</p>
              </div>
              <p className="text-4xl font-bold text-green-900 mb-2">
                {stats.byStatus.completed}
              </p>
              <p className="text-sm text-green-600">Successful</p>
            </div>

            {/* Failed */}
            <div className="text-center p-6 bg-red-50 rounded-2xl border border-red-200">
              <div className="flex items-center justify-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <p className="font-bold text-red-900">Failed</p>
              </div>
              <p className="text-4xl font-bold text-red-900 mb-2">
                {stats.byStatus.failed}
              </p>
              <p className="text-sm text-red-600">Need attention</p>
            </div>
          </div>

          {/* Volume Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700">Off-Ramp Volume</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                ${stats.volume.offRamp.toFixed(2)}
              </p>
              <p className="text-xs text-blue-600 mt-1">{stats.byType['off-ramp']} transactions</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-700">On-Ramp Volume</span>
                <TrendingDown className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                ${stats.volume.onRamp.toFixed(2)}
              </p>
              <p className="text-xs text-purple-600 mt-1">{stats.byType['on-ramp']} transactions</p>
            </div>
          </div>
        </div>
      )}

      {/* Rebalancing Controls */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <ArrowRightLeft className="w-6 h-6 text-slate-700" />
          <h3 className="font-bold text-slate-900">Treasury Rebalancing</h3>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <p className="text-sm text-slate-600 mb-4">
            Automated rebalancing ensures optimal liquidity distribution across all sources.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Low Liquidity Threshold
              </label>
              <input
                type="number"
                defaultValue="10000"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Target Balance
              </label>
              <input
                type="number"
                defaultValue="50000"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Enable Auto-Rebalance
            </button>
            <button className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors">
              Configure Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
