/**
 * Juicyway Operations API Test Panel
 *
 * Comprehensive testing interface for Juicyway operations:
 * - Payout creation (crypto → fiat)
 * - On-ramp creation (fiat → crypto)
 * - Order status tracking
 * - API health checks
 * - Webhook simulation
 */

import React, { useState } from 'react';
import {
  Send,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Zap,
  FileText,
  Eye,
  DollarSign,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import juicywayService from '@/utils/juicyway-service';

interface TestLog {
  timestamp: number;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  data?: any;
}

export default function JuicywayTestPanel() {
  const [loading, setLoading] = useState(false);
  const [testLogs, setTestLogs] = useState<TestLog[]>([]);
  const [lastTestResult, setLastTestResult] = useState<any>(null);

  // Payout test form
  const [payoutTest, setPayoutTest] = useState({
    userId: 'test_user_123',
    amount: '10000',
    currency: 'NGN' as const,
    cryptoCurrency: 'USDC' as const,
    accountName: 'Test User',
    accountNumber: '0123456789',
    bankCode: '058',
    bankName: 'GTBank',
  });

  // On-ramp test form
  const [onrampTest, setOnrampTest] = useState({
    userId: 'test_user_123',
    amount: '50000',
    fiatCurrency: 'NGN' as const,
    cryptoCurrency: 'USDC' as const,
    paymentMethod: 'bank_transfer' as const,
  });

  const addLog = (log: Omit<TestLog, 'timestamp'>) => {
    const newLog = { ...log, timestamp: Date.now() };
    setTestLogs((prev) => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  const clearLogs = () => {
    setTestLogs([]);
    setLastTestResult(null);
    toast.success('Logs cleared');
  };

  // ==================== TEST: Create Payout ====================
  const testCreatePayout = async () => {
    setLoading(true);
    addLog({
      type: 'info',
      title: 'Testing Payout Creation',
      message: `Creating payout for ${payoutTest.amount} ${payoutTest.currency}`,
    });

    try {
      const result = await juicywayService.createPayout({
        userId: payoutTest.userId,
        amount: parseFloat(payoutTest.amount),
        currency: payoutTest.currency,
        cryptoCurrency: payoutTest.cryptoCurrency,
        bankAccount: {
          accountName: payoutTest.accountName,
          accountNumber: payoutTest.accountNumber,
          bankCode: payoutTest.bankCode,
          bankName: payoutTest.bankName,
          country: 'NG',
          currency: payoutTest.currency,
        },
        reference: `TEST-${Date.now()}`,
      });

      addLog({
        type: 'success',
        title: 'Payout Created Successfully',
        message: `Order ID: ${result.orderId}`,
        data: result,
      });

      setLastTestResult(result);
      toast.success(`Payout created: ${result.orderId}`);
    } catch (error: any) {
      addLog({
        type: 'error',
        title: 'Payout Creation Failed',
        message: error.message || 'Unknown error',
        data: error,
      });

      toast.error(`Payout failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== TEST: Check Payout Status ====================
  const testPayoutStatus = async () => {
    if (!lastTestResult?.orderId) {
      toast.error('No payout order to check. Create a payout first.');
      return;
    }

    setLoading(true);
    addLog({
      type: 'info',
      title: 'Checking Payout Status',
      message: `Order ID: ${lastTestResult.orderId}`,
    });

    try {
      const status = await juicywayService.getPayoutStatus(lastTestResult.orderId);

      if (status) {
        addLog({
          type: 'success',
          title: 'Payout Status Retrieved',
          message: `Status: ${status.status}`,
          data: status,
        });

        toast.success(`Status: ${status.status}`);
      } else {
        addLog({
          type: 'warning',
          title: 'Payout Not Found',
          message: 'Order not found in system',
        });

        toast.warning('Payout not found');
      }
    } catch (error: any) {
      addLog({
        type: 'error',
        title: 'Status Check Failed',
        message: error.message || 'Unknown error',
      });

      toast.error(`Check failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== TEST: Create On-Ramp ====================
  const testCreateOnramp = async () => {
    setLoading(true);
    addLog({
      type: 'info',
      title: 'Testing On-Ramp Creation',
      message: `Creating on-ramp for ${onrampTest.amount} ${onrampTest.fiatCurrency}`,
    });

    try {
      const result = await juicywayService.createOnRamp({
        userId: onrampTest.userId,
        amount: parseFloat(onrampTest.amount),
        fiatCurrency: onrampTest.fiatCurrency,
        cryptoCurrency: onrampTest.cryptoCurrency,
        paymentMethod: onrampTest.paymentMethod,
        reference: `TEST-${Date.now()}`,
      });

      addLog({
        type: 'success',
        title: 'On-Ramp Created Successfully',
        message: `Order ID: ${result.orderId}`,
        data: result,
      });

      setLastTestResult(result);
      toast.success(`On-ramp created: ${result.orderId}`);
    } catch (error: any) {
      addLog({
        type: 'error',
        title: 'On-Ramp Creation Failed',
        message: error.message || 'Unknown error',
        data: error,
      });

      toast.error(`On-ramp failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== TEST: Check On-Ramp Status ====================
  const testOnrampStatus = async () => {
    if (!lastTestResult?.orderId) {
      toast.error('No on-ramp order to check. Create an on-ramp first.');
      return;
    }

    setLoading(true);
    addLog({
      type: 'info',
      title: 'Checking On-Ramp Status',
      message: `Order ID: ${lastTestResult.orderId}`,
    });

    try {
      const status = await juicywayService.getOnRampStatus(lastTestResult.orderId);

      if (status) {
        addLog({
          type: 'success',
          title: 'On-Ramp Status Retrieved',
          message: `Status: ${status.status}`,
          data: status,
        });

        toast.success(`Status: ${status.status}`);
      } else {
        addLog({
          type: 'warning',
          title: 'On-Ramp Not Found',
          message: 'Order not found in system',
        });

        toast.warning('On-ramp not found');
      }
    } catch (error: any) {
      addLog({
        type: 'error',
        title: 'Status Check Failed',
        message: error.message || 'Unknown error',
      });

      toast.error(`Check failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== TEST: Liquidity Status ====================
  const testLiquidity = async () => {
    setLoading(true);
    addLog({
      type: 'info',
      title: 'Testing Liquidity Status',
      message: 'Fetching liquidity from Openfort and Juicyway',
    });

    try {
      const liquidity = await juicywayService.getLiquidityStatus();

      addLog({
        type: 'success',
        title: 'Liquidity Status Retrieved',
        message: `Total USDC: $${liquidity.total.USDC.toFixed(2)}, USDT: $${liquidity.total.USDT.toFixed(2)}`,
        data: liquidity,
      });

      toast.success('Liquidity status retrieved');
    } catch (error: any) {
      addLog({
        type: 'error',
        title: 'Liquidity Check Failed',
        message: error.message || 'Unknown error',
      });

      toast.error(`Check failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== TEST: Health Check ====================
  const testHealthCheck = () => {
    addLog({
      type: 'info',
      title: 'Testing Health Check',
      message: 'Fetching service health status',
    });

    try {
      const health = juicywayService.getHealthStatus();

      addLog({
        type: 'success',
        title: 'Health Status Retrieved',
        message: `Payouts: ${health.payouts.total}, On-Ramps: ${health.onramps.total}`,
        data: health,
      });

      toast.success('Service is healthy');
    } catch (error: any) {
      addLog({
        type: 'error',
        title: 'Health Check Failed',
        message: error.message || 'Unknown error',
      });

      toast.error(`Check failed: ${error.message}`);
    }
  };

  const getLogIcon = (type: TestLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'info':
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getLogBgColor = (type: TestLog['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Juicyway API Test Panel</h1>
        <p className="text-slate-600 mt-1">
          Test payouts, on-ramps, and operations API integration
        </p>
      </div>

      {/* Real API Notice */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-purple-900">Sandbox Testing Mode</h3>
            <p className="text-sm text-purple-700 mt-1">
              This panel uses <strong>Juicyway Sandbox API</strong> for testing via Supabase Edge Functions. 
              All tests will create orders in the sandbox environment using test credentials before going live.
            </p>
            <div className="flex gap-2 mt-2 text-xs text-purple-600">
              <span>✓ Sandbox environment</span>
              <span>•</span>
              <span>✓ Test transactions only</span>
              <span>•</span>
              <span>✓ Safe for testing</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Quick Health Checks</h3>
            <p className="text-sm text-slate-600">Run basic system tests</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={testHealthCheck} variant="outline" className="gap-2">
              <Zap className="w-4 h-4" />
              Health Check
            </Button>
            <Button onClick={testLiquidity} variant="outline" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Liquidity Check
            </Button>
            <Button onClick={clearLogs} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Clear Logs
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Test Tabs */}
      <Tabs defaultValue="payout" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payout">Payout Tests</TabsTrigger>
          <TabsTrigger value="onramp">On-Ramp Tests</TabsTrigger>
          <TabsTrigger value="logs">Test Logs</TabsTrigger>
        </TabsList>

        {/* Payout Tests */}
        <TabsContent value="payout" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Test Payout Creation</h3>
            <p className="text-sm text-slate-600 mb-6">
              Create a test payout order (crypto → fiat). This will test the full flow including Openfort treasury and Juicyway API.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">User ID</label>
                  <Input
                    value={payoutTest.userId}
                    onChange={(e) => setPayoutTest({ ...payoutTest, userId: e.target.value })}
                    placeholder="test_user_123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                  <Input
                    type="number"
                    value={payoutTest.amount}
                    onChange={(e) => setPayoutTest({ ...payoutTest, amount: e.target.value })}
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                  <Select
                    value={payoutTest.currency}
                    onValueChange={(value: any) => setPayoutTest({ ...payoutTest, currency: value })}
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
                    value={payoutTest.cryptoCurrency}
                    onValueChange={(value: any) => setPayoutTest({ ...payoutTest, cryptoCurrency: value })}
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
                    value={payoutTest.accountName}
                    onChange={(e) => setPayoutTest({ ...payoutTest, accountName: e.target.value })}
                    placeholder="Test User"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
                  <Input
                    value={payoutTest.accountNumber}
                    onChange={(e) => setPayoutTest({ ...payoutTest, accountNumber: e.target.value })}
                    placeholder="0123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bank Code</label>
                  <Input
                    value={payoutTest.bankCode}
                    onChange={(e) => setPayoutTest({ ...payoutTest, bankCode: e.target.value })}
                    placeholder="058"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                  <Input
                    value={payoutTest.bankName}
                    onChange={(e) => setPayoutTest({ ...payoutTest, bankName: e.target.value })}
                    placeholder="GTBank"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={testCreatePayout} disabled={loading} className="gap-2">
                  <Send className="w-4 h-4" />
                  {loading ? 'Creating...' : 'Create Test Payout'}
                </Button>
                <Button onClick={testPayoutStatus} disabled={loading || !lastTestResult} variant="outline" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Check Status
                </Button>
              </div>
            </div>
          </Card>

          {/* Last Result */}
          {lastTestResult && lastTestResult.status && (
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Last Test Result</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Order ID</span>
                  <span className="font-mono text-sm font-medium">{lastTestResult.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Status</span>
                  <Badge className="bg-blue-100 text-blue-800">{lastTestResult.status}</Badge>
                </div>
                {lastTestResult.fiatAmount && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Amount</span>
                    <span className="font-medium">{lastTestResult.fiatAmount} {lastTestResult.fiatCurrency}</span>
                  </div>
                )}
                {lastTestResult.cryptoAmount && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Crypto</span>
                    <span className="font-medium">{lastTestResult.cryptoAmount.toFixed(4)} {lastTestResult.cryptoCurrency}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* On-Ramp Tests */}
        <TabsContent value="onramp" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Test On-Ramp Creation</h3>
            <p className="text-sm text-slate-600 mb-6">
              Create a test on-ramp order (fiat → crypto). This will test Juicyway on-ramp API and payment instruction generation.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">User ID</label>
                  <Input
                    value={onrampTest.userId}
                    onChange={(e) => setOnrampTest({ ...onrampTest, userId: e.target.value })}
                    placeholder="test_user_123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                  <Input
                    type="number"
                    value={onrampTest.amount}
                    onChange={(e) => setOnrampTest({ ...onrampTest, amount: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fiat Currency</label>
                  <Select
                    value={onrampTest.fiatCurrency}
                    onValueChange={(value: any) => setOnrampTest({ ...onrampTest, fiatCurrency: value })}
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
                    value={onrampTest.cryptoCurrency}
                    onValueChange={(value: any) => setOnrampTest({ ...onrampTest, cryptoCurrency: value })}
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

              <div className="flex gap-3 pt-4">
                <Button onClick={testCreateOnramp} disabled={loading} className="gap-2">
                  <Download className="w-4 h-4" />
                  {loading ? 'Creating...' : 'Create Test On-Ramp'}
                </Button>
                <Button onClick={testOnrampStatus} disabled={loading || !lastTestResult} variant="outline" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Check Status
                </Button>
              </div>
            </div>
          </Card>

          {/* Last Result */}
          {lastTestResult && lastTestResult.paymentInstructions && (
            <Card className="p-6 bg-gradient-to-br from-green-50 to-teal-50">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Payment Instructions</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Order ID</span>
                  <span className="font-mono text-sm font-medium">{lastTestResult.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Status</span>
                  <Badge className="bg-green-100 text-green-800">{lastTestResult.status}</Badge>
                </div>
                {lastTestResult.paymentInstructions.accountNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Account Number</span>
                    <span className="font-mono text-sm font-medium">{lastTestResult.paymentInstructions.accountNumber}</span>
                  </div>
                )}
                {lastTestResult.paymentInstructions.reference && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Reference</span>
                    <span className="font-mono text-sm font-medium">{lastTestResult.paymentInstructions.reference}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Test Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Test Execution Logs</h3>
              <Button onClick={clearLogs} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-3 h-3" />
                Clear
              </Button>
            </div>

            {testLogs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No test logs yet</p>
                <p className="text-sm text-slate-500">Run a test to see logs here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {testLogs.map((log, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border ${getLogBgColor(log.type)}`}>
                    <div className="flex items-start gap-3">
                      {getLogIcon(log.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-slate-900">{log.title}</p>
                          <span className="text-xs text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{log.message}</p>
                        {log.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                              View details
                            </summary>
                            <pre className="mt-2 p-2 bg-slate-900 text-slate-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}