/**
 * Juicyway Operations Panel
 * 
 * Comprehensive admin interface for Juicyway API operations including:
 * - FX rate monitoring and management
 * - Payout/offramp operations (crypto → fiat)
 * - Onramp operations (fiat → crypto)
 * - Liquidity management
 * - Webhook monitoring
 * - Transaction history
 * 
 * API Base URL: https://api.spendjuice.com
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Send,
  Download,
  Wallet,
  Activity,
  BarChart3,
  Settings,
  Plus,
  Eye,
  XCircle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import juicywayRates from '@/utils/juicyway-rates';
import juicywayService from '@/utils/juicyway-service';

interface JuicywayOperationsProps {
  onBack?: () => void;
}

export default function JuicywayOperations({ onBack }: JuicywayOperationsProps) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [rates, setRates] = useState<any[]>([]);
  const [liquidity, setLiquidity] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [onramps, setOnramps] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  
  // Form states
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [showOnrampForm, setShowOnrampForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    userId: '',
    amount: '',
    currency: 'NGN' as const,
    cryptoCurrency: 'USDC' as const,
    accountName: '',
    accountNumber: '',
    bankCode: '',
    bankName: '',
  });
  const [onrampForm, setOnrampForm] = useState({
    userId: '',
    amount: '',
    fiatCurrency: 'NGN' as const,
    cryptoCurrency: 'USDC' as const,
    paymentMethod: 'bank_transfer' as const,
  });

  // Load data on mount and refresh every 30 seconds
  useEffect(() => {
    loadAllData();
    const interval = setInterval(() => {
      loadAllData(true); // Silent refresh
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const ratesData = await juicywayRates.getMultipleRates([
        // Same-currency (always 1)
        { from: 'NGN', to: 'NGN' },
        { from: 'USD', to: 'USD' },
        { from: 'CAD', to: 'CAD' },
        // NGN → foreign (derived by inverting foreign→NGN)
        { from: 'NGN', to: 'USD' },
        { from: 'NGN', to: 'GBP' },
        { from: 'NGN', to: 'CAD' },
        // foreign → NGN (live from Juicyway)
        { from: 'USD', to: 'NGN' },
        { from: 'GBP', to: 'NGN' },
        { from: 'CAD', to: 'NGN' },
        { from: 'EUR', to: 'NGN' },
        { from: 'USDC', to: 'NGN' },
        { from: 'USDT', to: 'NGN' },
      ]).catch((err) => {
        return [];
      });

      setRates(ratesData);

      // Load liquidity
      const liquidityData = await juicywayService.getLiquidityStatus();
      setLiquidity(liquidityData);

      // Load transactions
      const payoutsData = juicywayService.getAllPayouts();
      const onrampsData = juicywayService.getAllOnRamps();
      setPayouts(payoutsData);
      setOnramps(onrampsData);

      // Load health status
      const healthData = juicywayService.getHealthStatus();
      setHealth(healthData);

      if (!silent) {
        toast.success('Data loaded successfully');
      }
    } catch (error: any) {
      if (!silent) {
        toast.error(`Failed to load data: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
  };

  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await juicywayService.createPayout({
        userId: payoutForm.userId,
        amount: parseFloat(payoutForm.amount),
        currency: payoutForm.currency,
        cryptoCurrency: payoutForm.cryptoCurrency,
        bankAccount: {
          accountName: payoutForm.accountName,
          accountNumber: payoutForm.accountNumber,
          bankCode: payoutForm.bankCode,
          bankName: payoutForm.bankName,
          country: 'NG',
          currency: payoutForm.currency,
        },
      });

      toast.success(`Payout created: ${result.orderId}`);
      setShowPayoutForm(false);
      setPayoutForm({
        userId: '',
        amount: '',
        currency: 'NGN',
        cryptoCurrency: 'USDC',
        accountName: '',
        accountNumber: '',
        bankCode: '',
        bankName: '',
      });
      await loadAllData(true);
    } catch (error: any) {
      toast.error(`Payout failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOnramp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await juicywayService.createOnRamp({
        userId: onrampForm.userId,
        amount: parseFloat(onrampForm.amount),
        fiatCurrency: onrampForm.fiatCurrency,
        cryptoCurrency: onrampForm.cryptoCurrency,
        paymentMethod: onrampForm.paymentMethod,
      });

      toast.success(`On-ramp created: ${result.orderId}`);
      setShowOnrampForm(false);
      setOnrampForm({
        userId: '',
        amount: '',
        fiatCurrency: 'NGN',
        cryptoCurrency: 'USDC',
        paymentMethod: 'bank_transfer',
      });
      await loadAllData(true);
    } catch (error: any) {
      toast.error(`On-ramp failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any }> = {
      completed: { className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      processing: { className: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
      pending: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      awaiting_payment: { className: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
      failed: { className: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} border flex items-center gap-1.5`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Juicyway Operations</h1>
          <p className="text-slate-600 mt-1">
            FX rates, liquidity, payouts, and onramp management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* API Status Banner */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-blue-900">Juicyway API Status</p>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Live Production
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-600 font-medium">Base URL</p>
                <p className="text-blue-900 font-mono text-xs">api.spendjuice.com</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Health</p>
                <p className="text-blue-900">{health ? 'Healthy' : 'Loading...'}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Rate Pairs</p>
                <p className="text-blue-900">{rates.length} active</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Total Liquidity</p>
                <p className="text-blue-900">
                  {liquidity ? `$${(liquidity.total.USDC + liquidity.total.USDT).toFixed(2)}` : '...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Alerts */}
      {liquidity?.alerts && liquidity.alerts.length > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900">Liquidity Alerts</p>
              {liquidity.alerts.map((alert: string, idx: number) => (
                <p key={idx} className="text-sm text-amber-800">{alert}</p>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-600">Total Liquidity</p>
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${liquidity ? (liquidity.total.USDC + liquidity.total.USDT).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </p>
          <p className="text-sm text-slate-500 mt-2">USDC + USDT combined</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-600">Payouts (24h)</p>
            <ArrowUpRight className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{payouts.length}</p>
          <p className="text-sm text-green-600 mt-2">
            {payouts.filter(p => p.status === 'completed').length} completed
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-600">On-Ramps (24h)</p>
            <ArrowDownLeft className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{onramps.length}</p>
          <p className="text-sm text-blue-600 mt-2">
            {onramps.filter(o => o.status === 'completed').length} completed
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-600">Active Rates</p>
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{rates.length}</p>
          <p className="text-sm text-slate-500 mt-2">Currency pairs</p>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="rates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="rates">FX Rates</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="onramps">On-Ramps</TabsTrigger>
          <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* FX Rates Tab */}
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Live Exchange Rates</h3>
              <p className="text-sm text-slate-600 mt-1">
                Real-time rates from Juicyway with Border margins applied. NGN→foreign pairs now included.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Pair</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Base Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Margin</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Final Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Change 24h</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-600">No rates available</p>
                        <p className="text-sm text-slate-500">
                          Check your API configuration or ensure Edge Function is deployed
                        </p>
                        <button
                          onClick={() => loadAllData()}
                          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                        >
                          Retry Loading Rates
                        </button>
                      </td>
                    </tr>
                  ) : (
                    rates.map((rate, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50 ${
                        rate.corridor?.startsWith('NGN_') ? 'bg-green-50' :
                        rate.corridor === 'USD_NGN' ? 'bg-yellow-50' : ''
                      }`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{rate.corridor}</span>
                            {rate.corridor?.startsWith('NGN_') && (
                              <Badge className="bg-green-100 text-green-800 border-green-200">NGN Out</Badge>
                            )}
                            {rate.corridor === 'USD_NGN' && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Primary</Badge>
                            )}
                            {rate.rate === 0 && (
                              <Badge className="bg-red-100 text-red-700 border-red-200">Unavailable</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-700">
                          {rate.rate > 0 ? rate.rate.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            +{rate.margin || 0}%
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600">
                          {rate.finalRate > 0 ? rate.finalRate.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-green-600">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm font-medium">+0.3%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {rate.timestamp ? new Date(rate.timestamp).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowPayoutForm(!showPayoutForm)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Payout
            </Button>
          </div>

          {showPayoutForm && (
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Payout</h3>
              <form onSubmit={handleCreatePayout} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">User ID</label>
                    <Input
                      value={payoutForm.userId}
                      onChange={(e) => setPayoutForm({ ...payoutForm, userId: e.target.value })}
                      placeholder="user_12345"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                    <Input
                      type="number"
                      value={payoutForm.amount}
                      onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                      placeholder="10000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                    <Select
                      value={payoutForm.currency}
                      onValueChange={(value: any) => setPayoutForm({ ...payoutForm, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Crypto Currency</label>
                    <Select
                      value={payoutForm.cryptoCurrency}
                      onValueChange={(value: any) => setPayoutForm({ ...payoutForm, cryptoCurrency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDC">USDC</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Account Name</label>
                    <Input
                      value={payoutForm.accountName}
                      onChange={(e) => setPayoutForm({ ...payoutForm, accountName: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
                    <Input
                      value={payoutForm.accountNumber}
                      onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                      placeholder="0123456789"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bank Code</label>
                    <Input
                      value={payoutForm.bankCode}
                      onChange={(e) => setPayoutForm({ ...payoutForm, bankCode: e.target.value })}
                      placeholder="058"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                    <Input
                      value={payoutForm.bankName}
                      onChange={(e) => setPayoutForm({ ...payoutForm, bankName: e.target.value })}
                      placeholder="GTBank"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowPayoutForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Payout'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Recent Payouts</h3>
              <p className="text-sm text-slate-600 mt-1">Crypto → Fiat withdrawals</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Bank</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-600">
                        No payouts yet
                      </td>
                    </tr>
                  ) : (
                    payouts.slice(-10).reverse().map((payout, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono text-sm">{payout.orderId}</td>
                        <td className="px-6 py-4 text-sm">{payout.userId}</td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{formatCurrency(payout.fiatAmount, payout.fiatCurrency)}</p>
                            <p className="text-xs text-slate-500">
                              {payout.cryptoAmount.toFixed(2)} {payout.cryptoCurrency}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium">{payout.bankAccount.accountName}</p>
                            <p className="text-xs text-slate-500">{payout.bankAccount.bankName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(payout.status)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(payout.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* On-Ramps Tab */}
        <TabsContent value="onramps" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowOnrampForm(!showOnrampForm)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create On-Ramp
            </Button>
          </div>

          {showOnrampForm && (
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Create New On-Ramp</h3>
              <form onSubmit={handleCreateOnramp} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">User ID</label>
                    <Input
                      value={onrampForm.userId}
                      onChange={(e) => setOnrampForm({ ...onrampForm, userId: e.target.value })}
                      placeholder="user_12345"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                    <Input
                      type="number"
                      value={onrampForm.amount}
                      onChange={(e) => setOnrampForm({ ...onrampForm, amount: e.target.value })}
                      placeholder="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fiat Currency</label>
                    <Select
                      value={onrampForm.fiatCurrency}
                      onValueChange={(value: any) => setOnrampForm({ ...onrampForm, fiatCurrency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Crypto Currency</label>
                    <Select
                      value={onrampForm.cryptoCurrency}
                      onValueChange={(value: any) => setOnrampForm({ ...onrampForm, cryptoCurrency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDC">USDC</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowOnrampForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create On-Ramp'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Recent On-Ramps</h3>
              <p className="text-sm text-slate-600 mt-1">Fiat → Crypto deposits</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {onramps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-600">
                        No on-ramps yet
                      </td>
                    </tr>
                  ) : (
                    onramps.slice(-10).reverse().map((onramp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono text-sm">{onramp.orderId}</td>
                        <td className="px-6 py-4 text-sm">{onramp.userId}</td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{formatCurrency(onramp.fiatAmount, onramp.fiatCurrency)}</p>
                            <p className="text-xs text-slate-500">
                              → {onramp.cryptoAmount.toFixed(2)} {onramp.cryptoCurrency}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(onramp.status)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(onramp.createdAt)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(onramp.expiresAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Liquidity Tab */}
        <TabsContent value="liquidity" className="space-y-6">
          {liquidity && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liquidity.openfort.map((balance: any, idx: number) => (
                  <Card key={idx} className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xl font-bold text-slate-900">{balance.currency}</h4>
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-600">Available</p>
                        <p className="text-3xl font-bold text-slate-900">${balance.available.toFixed(2)}</p>
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
                  </Card>
                ))}
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Total Liquidity Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-green-50 rounded-xl">
                    <p className="text-sm text-green-600 mb-2">USDC Total</p>
                    <p className="text-3xl font-bold text-green-900">${liquidity.total.USDC.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-6 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-600 mb-2">USDT Total</p>
                    <p className="text-3xl font-bold text-blue-900">${liquidity.total.USDT.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-6 bg-purple-50 rounded-xl">
                    <p className="text-sm text-purple-600 mb-2">Combined Total</p>
                    <p className="text-3xl font-bold text-purple-900">
                      ${(liquidity.total.USDC + liquidity.total.USDT).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">System Health</h3>
            {health && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">Payout Operations</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Total</span>
                      <span className="font-medium">{health.payouts.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Pending</span>
                      <span className="font-medium text-yellow-600">{health.payouts.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Processing</span>
                      <span className="font-medium text-blue-600">{health.payouts.processing}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Completed</span>
                      <span className="font-medium text-green-600">{health.payouts.completed}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">On-Ramp Operations</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Total</span>
                      <span className="font-medium">{health.onramps.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Awaiting</span>
                      <span className="font-medium text-orange-600">{health.onramps.awaiting}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Processing</span>
                      <span className="font-medium text-blue-600">{health.onramps.processing}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Completed</span>
                      <span className="font-medium text-green-600">{health.onramps.completed}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col">
                <Download className="w-5 h-5" />
                <span>Export Transactions</span>
              </Button>
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col">
                <Eye className="w-5 h-5" />
                <span>View Webhooks</span>
              </Button>
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col">
                <Settings className="w-5 h-5" />
                <span>API Configuration</span>
              </Button>
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col">
                <Activity className="w-5 h-5" />
                <span>System Logs</span>
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
