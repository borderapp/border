import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Wallet,
  Send,
  DollarSign,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Info
} from 'lucide-react';
import axios from 'axios';

/**
 * ⚠️ DEPRECATED COMPONENT
 * 
 * Circle has been replaced by:
 * - Openfort: For wallet infrastructure and treasury management
 * - Juicyway: For FX rates, liquidity, on/off-ramp, and bank payouts
 * 
 * This component is kept for reference only.
 * Use AdminJuicyway component for production operations.
 */

interface TestResult {
  name: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
  timestamp?: number;
}

interface CircleWallet {
  walletId: string;
  entityId: string;
  type: string;
  description: string;
  balances: Array<{
    amount: string;
    currency: string;
  }>;
}

interface CirclePayout {
  id: string;
  sourceWalletId: string;
  destination: any;
  amount: {
    amount: string;
    currency: string;
  };
  status: string;
  createDate: string;
}

export function CircleTestPanel() {
  const [apiKey, setApiKey] = useState('LIVE_API_KEY:9d8a9dcfd0f77b252e2d6ac7abf9f704:b41eb5ad0eb68cf393f634f075007ca2');
  const [useTestnet, setUseTestnet] = useState(false); // PRODUCTION MODE
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [wallets, setWallets] = useState<CircleWallet[]>([]);
  const [payouts, setPayouts] = useState<CirclePayout[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');

  // Test payout form
  const [testAmount, setTestAmount] = useState('10.00');
  const [testCurrency, setTestCurrency] = useState('USD');
  const [testBankAccount, setTestBankAccount] = useState('1234567890');
  const [testRoutingNumber, setTestRoutingNumber] = useState('121000248');
  const [testAccountName, setTestAccountName] = useState('John Doe');

  const getCircleBaseURL = () => {
    return useTestnet ? 'https://api-sandbox.circle.com/v1' : 'https://api.circle.com/v1';
  };

  const getCircleHeaders = () => {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  };

  const updateTestResult = (testName: string, update: Partial<TestResult>) => {
    setResults(prev => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        name: testName,
        ...update,
        timestamp: Date.now()
      }
    }));
  };

  // Test 1: API Key Validation
  const testAPIKeyValidation = async () => {
    const testName = 'API Key Validation';
    updateTestResult(testName, { status: 'pending' });

    try {
      const response = await axios.get(
        `${getCircleBaseURL()}/configuration`,
        { headers: getCircleHeaders() }
      );

      updateTestResult(testName, {
        status: 'success',
        message: 'API key is valid and active',
        data: {
          environment: useTestnet ? 'Sandbox' : 'Production',
          merchantId: response.data.data?.merchantId || 'N/A'
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.response?.data?.message || error.message || 'API key validation failed',
        data: {
          statusCode: error.response?.status,
          error: error.response?.data
        }
      });
    }
  };

  // Test 2: Get Wallets
  const testGetWallets = async () => {
    const testName = 'Get Wallets';
    updateTestResult(testName, { status: 'pending' });

    try {
      const response = await axios.get(
        `${getCircleBaseURL()}/businessAccount/wallets`,
        { headers: getCircleHeaders() }
      );

      const walletsData = response.data.data?.wallets || [];
      setWallets(walletsData);

      if (walletsData.length > 0 && !selectedWallet) {
        setSelectedWallet(walletsData[0].walletId);
      }

      updateTestResult(testName, {
        status: 'success',
        message: `Found ${walletsData.length} wallet(s)`,
        data: {
          walletsCount: walletsData.length,
          wallets: walletsData.map((w: any) => ({
            id: w.walletId,
            type: w.type,
            balances: w.balances
          }))
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.response?.data?.message || error.message || 'Failed to retrieve wallets',
        data: {
          statusCode: error.response?.status,
          error: error.response?.data
        }
      });
    }
  };

  // Test 3: Get Wallet Details
  const testGetWalletDetails = async (walletId?: string) => {
    const testName = 'Get Wallet Details';
    const targetWallet = walletId || selectedWallet;

    if (!targetWallet) {
      updateTestResult(testName, {
        status: 'error',
        message: 'No wallet selected. Please select a wallet first.'
      });
      return;
    }

    updateTestResult(testName, { status: 'pending' });

    try {
      const response = await axios.get(
        `${getCircleBaseURL()}/businessAccount/wallets/${targetWallet}`,
        { headers: getCircleHeaders() }
      );

      const walletData = response.data.data;

      updateTestResult(testName, {
        status: 'success',
        message: `Wallet details retrieved successfully`,
        data: {
          walletId: walletData.walletId,
          entityId: walletData.entityId,
          type: walletData.type,
          balances: walletData.balances,
          description: walletData.description
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.response?.data?.message || error.message || 'Failed to get wallet details',
        data: {
          statusCode: error.response?.status,
          error: error.response?.data
        }
      });
    }
  };

  // Test 4: Create Test Payout
  const testCreatePayout = async () => {
    const testName = 'Create Test Payout';

    if (!selectedWallet) {
      updateTestResult(testName, {
        status: 'error',
        message: 'No wallet selected. Please select a wallet first.'
      });
      return;
    }

    updateTestResult(testName, { status: 'pending' });

    try {
      const idempotencyKey = `test-payout-${Date.now()}`;

      const payoutData = {
        idempotencyKey,
        source: {
          type: 'wallet',
          id: selectedWallet
        },
        destination: {
          type: 'wire',
          name: testAccountName,
          accountNumber: testBankAccount,
          routingNumber: testRoutingNumber
        },
        amount: {
          amount: testAmount,
          currency: testCurrency
        },
        metadata: {
          beneficiaryEmail: 'test@border.app',
          source: 'Border Testnet',
          description: 'Test payout from Border app'
        }
      };

      const response = await axios.post(
        `${getCircleBaseURL()}/businessAccount/payouts`,
        payoutData,
        { headers: getCircleHeaders() }
      );

      const payoutResult = response.data.data;

      updateTestResult(testName, {
        status: 'success',
        message: `Test payout created successfully`,
        data: {
          payoutId: payoutResult.id,
          amount: payoutResult.amount,
          status: payoutResult.status,
          destination: payoutResult.destination,
          createDate: payoutResult.createDate
        }
      });

      // Refresh payouts list
      testGetPayouts();
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.response?.data?.message || error.message || 'Failed to create payout',
        data: {
          statusCode: error.response?.status,
          error: error.response?.data
        }
      });
    }
  };

  // Test 5: Get Payouts History
  const testGetPayouts = async () => {
    const testName = 'Get Payouts History';
    updateTestResult(testName, { status: 'pending' });

    try {
      const response = await axios.get(
        `${getCircleBaseURL()}/businessAccount/payouts`,
        { 
          headers: getCircleHeaders(),
          params: {
            pageSize: 10
          }
        }
      );

      const payoutsData = response.data.data || [];
      setPayouts(payoutsData);

      updateTestResult(testName, {
        status: 'success',
        message: `Found ${payoutsData.length} payout(s)`,
        data: {
          payoutsCount: payoutsData.length,
          recentPayouts: payoutsData.slice(0, 5).map((p: any) => ({
            id: p.id,
            amount: p.amount,
            status: p.status,
            createDate: p.createDate
          }))
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.response?.data?.message || error.message || 'Failed to get payouts',
        data: {
          statusCode: error.response?.status,
          error: error.response?.data
        }
      });
    }
  };

  // Test 6: Get Payout by ID
  const testGetPayoutById = async (payoutId: string) => {
    const testName = 'Get Payout Status';
    updateTestResult(testName, { status: 'pending' });

    try {
      const response = await axios.get(
        `${getCircleBaseURL()}/businessAccount/payouts/${payoutId}`,
        { headers: getCircleHeaders() }
      );

      const payoutData = response.data.data;

      updateTestResult(testName, {
        status: 'success',
        message: `Payout status: ${payoutData.status}`,
        data: {
          id: payoutData.id,
          amount: payoutData.amount,
          status: payoutData.status,
          destination: payoutData.destination,
          createDate: payoutData.createDate,
          updateDate: payoutData.updateDate
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.response?.data?.message || error.message || 'Failed to get payout status',
        data: {
          statusCode: error.response?.status,
          error: error.response?.data
        }
      });
    }
  };

  // Test 7: Get Supported Countries
  const testGetSupportedCountries = async () => {
    const testName = 'Get Supported Countries';
    updateTestResult(testName, { status: 'pending' });

    try {
      const response = await axios.get(
        `${getCircleBaseURL()}/businessAccount/banks/wires`,
        { headers: getCircleHeaders() }
      );

      const countries = response.data.data || [];

      updateTestResult(testName, {
        status: 'success',
        message: `Circle supports ${countries.length} countries`,
        data: {
          countriesCount: countries.length,
          sampleCountries: countries.slice(0, 10).map((c: any) => c.id || c.code)
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.response?.data?.message || error.message || 'Failed to get countries',
        data: {
          statusCode: error.response?.status,
          error: error.response?.data
        }
      });
    }
  };

  // Run all tests
  const runAllTests = async () => {
    await testAPIKeyValidation();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGetWallets();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGetPayouts();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGetSupportedCountries();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                Circle API Production Panel
              </CardTitle>
              <CardDescription className="mt-2">
                Manage Circle's live payment infrastructure (PRODUCTION MODE)
              </CardDescription>
            </div>
            <Badge variant={useTestnet ? 'default' : 'destructive'} className="text-sm">
              {useTestnet ? '🧪 Sandbox Mode' : '⚠️ Production Mode'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Configuration */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Circle Sandbox Environment:</strong> This is a testing environment. No real money will be moved. 
              You need a Circle sandbox API key to test. <a href="https://developers.circle.com/" target="_blank" rel="noopener noreferrer" className="underline">Get sandbox access here</a>.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="apiKey" className="min-w-24">API Key:</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Circle sandbox API key"
                className="flex-1 font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="min-w-24">Environment:</Label>
              <Button
                variant={useTestnet ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseTestnet(!useTestnet)}
              >
                {useTestnet ? '🧪 Sandbox' : '🚀 Production'}
              </Button>
              <span className="text-sm text-gray-500">
                {useTestnet ? 'Safe testing environment' : 'Live production environment'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={runAllTests} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Run All Tests
            </Button>
            <Button onClick={testGetWallets} variant="outline">
              <Wallet className="w-4 h-4 mr-2" />
              Get Wallets
            </Button>
            <Button onClick={testGetPayouts} variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              Get Payouts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Tabs */}
      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tests">Test Results</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="payout">Create Payout</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
        </TabsList>

        {/* Test Results Tab */}
        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Test Results</CardTitle>
              <CardDescription>
                Status of Circle API integration tests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(results).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tests run yet. Click "Run All Tests" to start.</p>
                </div>
              ) : (
                Object.values(results).map((result, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="mt-0.5">
                      {getStatusIcon(result.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">{result.name}</h4>
                        {result.timestamp && (
                          <span className="text-xs text-gray-500">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {result.message && (
                        <p className={`text-sm ${result.status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                          {result.message}
                        </p>
                      )}
                      {result.data && (
                        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                          <pre className="text-xs text-gray-700 overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Circle Wallets</CardTitle>
                  <CardDescription>
                    Your Circle business wallets and balances
                  </CardDescription>
                </div>
                <Button onClick={testGetWallets} size="sm" variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {wallets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No wallets found. Click "Get Wallets" to fetch.</p>
                </div>
              ) : (
                wallets.map((wallet) => (
                  <div
                    key={wallet.walletId}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedWallet === wallet.walletId
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedWallet(wallet.walletId);
                      testGetWalletDetails(wallet.walletId);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Wallet className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">{wallet.type || 'Business Wallet'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs text-gray-600">{wallet.walletId}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(wallet.walletId);
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {selectedWallet === wallet.walletId && (
                        <Badge variant="default" className="bg-blue-600">Selected</Badge>
                      )}
                    </div>
                    <div className="space-y-1 mt-3">
                      {wallet.balances && wallet.balances.length > 0 ? (
                        wallet.balances.map((balance, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{balance.currency}</span>
                            <span className="font-bold text-gray-900">
                              {parseFloat(balance.amount).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No balances available</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Payout Tab */}
        <TabsContent value="payout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Test Payout</CardTitle>
              <CardDescription>
                Test creating a wire transfer payout (sandbox only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedWallet ? (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Please select a wallet from the Wallets tab first.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-sm">
                      <Wallet className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Source Wallet:</span>
                      <code className="text-xs">{selectedWallet}</code>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={testAmount}
                        onChange={(e) => setTestAmount(e.target.value)}
                        placeholder="10.00"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={testCurrency}
                        onChange={(e) => setTestCurrency(e.target.value)}
                        placeholder="USD"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={testAccountName}
                      onChange={(e) => setTestAccountName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={testBankAccount}
                        onChange={(e) => setTestBankAccount(e.target.value)}
                        placeholder="1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        value={testRoutingNumber}
                        onChange={(e) => setTestRoutingNumber(e.target.value)}
                        placeholder="121000248"
                      />
                    </div>
                  </div>

                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription className="text-xs">
                      <strong>Testnet Note:</strong> Use any test values. In sandbox mode, no real money will be transferred.
                      Common test routing number: 121000248 (Wells Fargo)
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={testCreatePayout}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={!selectedWallet}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Create Test Payout
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Payout History</CardTitle>
                  <CardDescription>
                    Recent payouts from your Circle account
                  </CardDescription>
                </div>
                <Button onClick={testGetPayouts} size="sm" variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No payouts found. Create a test payout to see it here.</p>
                </div>
              ) : (
                payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">
                          {payout.amount.currency} {parseFloat(payout.amount.amount).toLocaleString()}
                        </span>
                      </div>
                      <Badge className={getStatusColor(payout.status)}>
                        {payout.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <code className="text-xs">{payout.id}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(payout.id)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => testGetPayoutById(payout.id)}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-xs">
                        Created: {new Date(payout.createDate).toLocaleString()}
                      </div>
                      {payout.destination && (
                        <div className="text-xs mt-2 p-2 bg-white rounded border border-gray-200">
                          <div className="font-medium mb-1">Destination:</div>
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(payout.destination, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Links Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Circle Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <a
            href="https://developers.circle.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Circle Developer Documentation</span>
          </a>
          <a
            href="https://app-sandbox.circle.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Circle Sandbox Console</span>
          </a>
          <a
            href="https://developers.circle.com/docs/circle-apis-production-sandbox-environments"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Testnet Setup Guide</span>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}