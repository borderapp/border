import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Settings,
  BarChart3,
  Zap,
  Terminal,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import juicywayService from '@/utils/juicyway-service';
import juicywayRates, { getMultipleRates } from '@/utils/juicyway-rates';
import CustomRatesManager from './CustomRatesManager';
import JuicywayDiagnostic from './JuicywayDiagnostic';
import USDNGNTestPanel from './USDNGNTestPanel';
import InternalCustomRates from './InternalCustomRates';
import JuicywayPayoutTesting from './JuicywayPayoutTesting';
import JuicywayComprehensive from './JuicywayComprehensive';
import JuicywayPayoutSystem from './JuicywayPayoutSystem';
import JuicywayBalanceTest from './JuicywayBalanceTest';
import USDWithdrawalTest from './USDWithdrawalTest';
import InteracTestPanel from './InteracTestPanel';
import JuicywayCardFundingFixed from './JuicywayCardFundingFixed';

interface AdminJuicywayProps {
  onBack?: () => void;
}

export default function AdminJuicyway({ onBack }: AdminJuicywayProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rates' | 'custom-rates' | 'internal-rates' | 'testing' | 'payouts' | 'payout-testing' | 'usd-withdrawal' | 'interac-test' | 'card-funding-fixed' | 'payout-system' | 'comprehensive' | 'balance-test' | 'onramps' | 'liquidity' | 'diagnostics'>('overview');
  const [loading, setLoading] = useState(false);
  const [liquidity, setLiquidity] = useState<any>(null);
  const [rates, setRates] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [onramps, setOnramps] = useState<any[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setApiError(null);

      // Load all data independently - don't let one failure block everything
      const liquidityPromise = juicywayService.getLiquidityStatus().catch(err => {
        return {
          openfort: [],
          juicyway: [],
          total: { USDC: 0, USDT: 0 },
          alerts: ['⚠️ Liquidity data unavailable - Openfort API not configured'],
        };
      });

      const ratePromise = getMultipleRates([
        { from: 'USD', to: 'NGN' },
        { from: 'USD', to: 'USDC' },
        { from: 'GBP', to: 'NGN' },
        { from: 'CAD', to: 'NGN' },
        { from: 'EUR', to: 'NGN' },
        { from: 'USDC', to: 'NGN' },
        { from: 'USD', to: 'USDT' },
        { from: 'USDT', to: 'NGN' },
        { from: 'USDC', to: 'USDT' },
      ]).catch(err => {
        return [];
      });

      const payoutPromise = Promise.resolve(juicywayService.getAllPayouts().slice(-10));
      const onrampPromise = Promise.resolve(juicywayService.getAllOnRamps().slice(-10));

      const [liquidityResult, rateResult, payoutResult, onrampResult] = await Promise.all([
        liquidityPromise,
        ratePromise,
        payoutPromise,
        onrampPromise,
      ]);

      // Handle liquidity
      setLiquidity(liquidityResult);

      // Handle rates
      if (rateResult && rateResult.length > 0) {
        setRates(rateResult);

        // Check if any rates are actually 0 (which means they failed but didn't throw)
        const failedRates = rateResult.filter(r => r.rate === 0);
        if (failedRates.length > 0) {
        }
      } else {
        setRates([]);
        setApiError('Unable to load FX rates. Using development mode. Juicyway Edge Function may not be deployed or API key is invalid.');
      }

      // Handle payouts and onramps
      setPayouts(payoutResult);

      setOnramps(onrampResult);

    } catch (error) {
      setApiError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
    setTimeout(() => setLoading(false), 500);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Juicyway Integration</h2>
          <p className="text-slate-500 mt-1">FX conversion, liquidity, and payment rails</p>
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

      {/* Alerts */}
      {apiError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900">Development Mode</p>
              <p className="text-sm text-amber-800">{apiError}</p>
              <p className="text-xs text-amber-700 mt-2">
                Using mock rate data for development. Deploy the Juicyway Edge Function to enable live rates.
              </p>
            </div>
          </div>
        </div>
      )}

      {liquidity?.alerts && liquidity.alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900">Liquidity Alerts</p>
              {liquidity.alerts.map((alert: string, idx: number) => (
                <p key={idx} className="text-sm text-amber-800">{alert}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'comprehensive', label: '🎯 Full System' },
          { id: 'payout-system', label: '🚀 Payout Flow' },
          { id: 'rates', label: 'FX Rates' },
          { id: 'custom-rates', label: 'Juicyway Custom' },
          { id: 'internal-rates', label: 'Internal Rates' },
          { id: 'testing', label: 'USD→NGN Testing' },
          { id: 'payout-testing', label: '💸 Payout Testing' },
          { id: 'usd-withdrawal', label: '💵 USD Withdrawal' },
          { id: 'interac-test', label: '🇨🇦 Interac Test' },
          { id: 'card-funding-fixed', label: '💳 Card Funding (Fixed)' },
          { id: 'payouts', label: 'Payouts' },
          { id: 'onramps', label: 'On-Ramps' },
          { id: 'liquidity', label: 'Liquidity' },
          { id: 'diagnostics', label: 'Diagnostics' },
          { id: 'balance-test', label: 'Balance Test' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">Total Liquidity</p>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                ${liquidity ? (liquidity.total.USDC + liquidity.total.USDT).toFixed(2) : '0.00'}
              </p>
              <p className="text-sm text-slate-500 mt-2">USDC + USDT</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">Payouts (24h)</p>
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{payouts.length}</p>
              <p className="text-sm text-green-600 mt-2">
                {payouts.filter(p => p.status === 'completed').length} completed
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">On-Ramps (24h)</p>
                <ArrowDownRight className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{onramps.length}</p>
              <p className="text-sm text-blue-600 mt-2">
                {onramps.filter(o => o.status === 'completed').length} completed
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">Active Quotes</p>
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {rates.length}
              </p>
              <p className="text-sm text-slate-500 mt-2">Currency pairs</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Recent Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...payouts.slice(0, 5).map(p => ({ ...p, type: 'payout' })), 
                    ...onramps.slice(0, 5).map(o => ({ ...o, type: 'onramp' }))]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 10)
                    .map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.type === 'payout' ? (
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-blue-600" />
                          )}
                          <span className="font-medium capitalize">{item.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">{item.orderId}</td>
                      <td className="px-6 py-4">
                        {item.type === 'payout' ? (
                          <div>
                            <p className="font-medium">{formatCurrency(item.fiatAmount, item.fiatCurrency)}</p>
                            <p className="text-xs text-slate-500">{item.cryptoAmount.toFixed(2)} {item.cryptoCurrency}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">{formatCurrency(item.fiatAmount, item.fiatCurrency)}</p>
                            <p className="text-xs text-slate-500">{item.cryptoAmount.toFixed(2)} {item.cryptoCurrency}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive System Tab */}
      {activeTab === 'comprehensive' && (
        <div>
          <JuicywayComprehensive />
        </div>
      )}

      {activeTab === 'payout-system' && (
        <div>
          <JuicywayPayoutSystem />
        </div>
      )}

      {/* FX Rates Tab */}
      {activeTab === 'rates' && (
        <div className="space-y-6">
          {rates.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="font-bold text-blue-900 mb-2">No Rates Available</p>
              <p className="text-sm text-blue-800">
                FX rates will appear here once the Juicyway integration is active.
                Currently in development mode.
              </p>
            </div>
          )}
          {rates.length > 0 && (
            <>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Live Exchange Rates</h3>
                    <p className="text-sm text-slate-500 mt-1">Real-time rates with Border margin applied</p>
                  </div>
                  {apiError && (
                    <Badge className="bg-amber-100 text-amber-700 border-0">
                      Dev Mode
                    </Badge>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Pair</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Raw Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Converted Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Margin</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Final Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rates.map((rate, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 ${
                      rate.corridor === 'USD_NGN' ? 'bg-yellow-50' : ''
                    }`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{rate.corridor}</span>
                          {rate.corridor === 'USD_NGN' && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] px-2 py-0">
                              TESTING
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-500">kobo/cents</div>
                        <div className="font-mono text-slate-600">{(rate.rate * 100).toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{rate.rate.toFixed(4)}</td>
                      <td className="px-6 py-4">
                        <span className="text-amber-600 font-medium">+{rate.margin}%</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-600">{rate.finalRate.toFixed(4)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(rate.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Margin Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">Margin Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rates.map((rate, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">{rate.corridor}</span>
                    <span className="text-sm text-slate-600">{rate.margin}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={rate.margin}
                    className="w-full"
                    disabled
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0.5%</span>
                    <span>5.0%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
        )}
        </div>
      )}

      {/* Custom Rates Tab */}
      {activeTab === 'custom-rates' && (
        <div className="space-y-6">
          <CustomRatesManager />
        </div>
      )}

      {/* Internal Custom Rates Tab */}
      {activeTab === 'internal-rates' && (
        <div className="space-y-6">
          <InternalCustomRates />
        </div>
      )}

      {/* USD→NGN Testing Tab */}
      {activeTab === 'testing' && (
        <div className="space-y-6">
          <USDNGNTestPanel />
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-900">Payout Orders (Crypto → Fiat)</h3>
            <p className="text-sm text-slate-500 mt-1">Withdrawals to bank accounts</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Crypto Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Fiat Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Bank</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((payout, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-sm">{payout.orderId}</td>
                    <td className="px-6 py-4 text-sm">{payout.userId}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{payout.cryptoAmount.toFixed(2)} {payout.cryptoCurrency}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{formatCurrency(payout.fiatAmount, payout.fiatCurrency)}</p>
                      <p className="text-xs text-slate-500">Fee: {formatCurrency(payout.fee, payout.fiatCurrency)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{payout.bankAccount.accountName}</p>
                      <p className="text-xs text-slate-500">{payout.bankAccount.bankName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                        {getStatusIcon(payout.status)}
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(payout.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* On-Ramps Tab */}
      {activeTab === 'onramps' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-900">On-Ramp Orders (Fiat → Crypto)</h3>
            <p className="text-sm text-slate-500 mt-1">Deposits via bank transfer</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Fiat Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Crypto Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {onramps.map((onramp, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-sm">{onramp.orderId}</td>
                    <td className="px-6 py-4 text-sm">{onramp.userId}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{formatCurrency(onramp.fiatAmount, onramp.fiatCurrency)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{onramp.cryptoAmount.toFixed(2)} {onramp.cryptoCurrency}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(onramp.status)}`}>
                        {getStatusIcon(onramp.status)}
                        {onramp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(onramp.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(onramp.expiresAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Liquidity Tab */}
      {activeTab === 'liquidity' && liquidity && (
        <div className="space-y-6">
          {/* Openfort Balances */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Openfort Treasury</h3>
              <p className="text-sm text-slate-500 mt-1">Main custody and wallet infrastructure</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liquidity.openfort.map((balance: any, idx: number) => (
                  <div key={idx} className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-slate-900">{balance.currency}</h4>
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-600">Available</p>
                        <p className="text-2xl font-bold text-slate-900">${balance.available.toFixed(2)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Reserved</p>
                          <p className="font-medium text-slate-700">${balance.reserved.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="font-medium text-slate-700">${balance.total.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Combined View */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">Total Liquidity Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-green-50 rounded-2xl">
                <p className="text-sm text-green-600 mb-2">USDC Total</p>
                <p className="text-3xl font-bold text-green-900">${liquidity.total.USDC.toFixed(2)}</p>
              </div>
              <div className="text-center p-6 bg-blue-50 rounded-2xl">
                <p className="text-sm text-blue-600 mb-2">USDT Total</p>
                <p className="text-3xl font-bold text-blue-900">${liquidity.total.USDT.toFixed(2)}</p>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-2xl">
                <p className="text-sm text-purple-600 mb-2">Combined Total</p>
                <p className="text-3xl font-bold text-purple-900">
                  ${(liquidity.total.USDC + liquidity.total.USDT).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Testing Tab */}
      {activeTab === 'payout-testing' && (
        <div className="space-y-6">
          <JuicywayPayoutTesting />
        </div>
      )}

      {/* USD Withdrawal Test Tab */}
      {activeTab === 'usd-withdrawal' && (
        <div className="space-y-6">
          <USDWithdrawalTest />
        </div>
      )}

      {/* Interac Test Tab */}
      {activeTab === 'interac-test' && (
        <div className="space-y-6">
          <InteracTestPanel />
        </div>
      )}

      {activeTab === 'card-funding-fixed' && (
        <div className="space-y-6">
          <JuicywayCardFundingFixed />
        </div>
      )}

      {/* Diagnostics Tab */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <JuicywayDiagnostic />
        </div>
      )}

      {/* Balance Test Tab */}
      {activeTab === 'balance-test' && (
        <div className="space-y-6">
          <JuicywayBalanceTest />
        </div>
      )}
    </div>
  );
}