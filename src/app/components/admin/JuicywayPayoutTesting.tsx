/**
 * Juicyway Payout Testing Panel
 *
 * Admin interface for testing the complete payout orchestration:
 * - Ledger management (user balances)
 * - Funding mode configuration (Direct vs Prefund)
 * - Payout execution and monitoring
 * - Treasury status (Openfort + Juicyway balances)
 * - Reconciliation checks
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Send,
  Wallet,
  Activity,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Download,
  ArrowRightLeft,
  Zap,
  Shield,
  BarChart3,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface PayoutTestingProps {
  onBack?: () => void;
}

export default function JuicywayPayoutTesting({ onBack }: PayoutTestingProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('payout');

  // Funding status
  const [fundingStatus, setFundingStatus] = useState<any>(null);
  const [fundingMode, setFundingMode] = useState<'direct' | 'prefund'>('prefund');
  const [prefundThreshold, setPrefundThreshold] = useState('10000');

  // User balance
  const [testUserId, setTestUserId] = useState('test_user_001');
  const [userBalances, setUserBalances] = useState<any[]>([]);

  // Beneficiaries
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any>(null);

  // Payout form
  const [payoutForm, setPayoutForm] = useState({
    user_id: 'test_user_001',
    amount: '10000',
    source_currency: 'NGN',  // ← Currency you have in Juicyway
    destination_currency: 'NGN',  // ← Currency recipient gets
    beneficiary_name: 'John Doe',
    account_number: '1234567890',
    bank_code: '044',
    bank_name: 'Access Bank',
    purpose: 'Salary Payment',
  });

  // Prefund form
  const [prefundAmount, setPrefundAmount] = useState('5000');

  // Transaction history
  const [transactions, setTransactions] = useState<any[]>([]);

  // Reconciliation
  const [reconciliation, setReconciliation] = useState<any>(null);

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

    const { data: { session } } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  };

  useEffect(() => {
    // Load initial data
    loadAllData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadFundingStatus(),
        loadUserBalances(testUserId),
        loadTransactions(),
        loadBeneficiaries(),
      ]);
    } catch (error) {
    }
  };

  // ==================== FUNDING STATUS ====================

  const loadFundingStatus = async () => {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/funding-status`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch funding status');
      }

      const data = await response.json();

      setFundingStatus(data);
      setFundingMode(data.funding_mode);
      setPrefundThreshold(data.prefund_threshold?.toString() || '10000');
    } catch (error) {
      // Set mock data for testing
      setFundingStatus({
        funding_mode: 'prefund',
        prefund_threshold: 10000,
        openfort_balance: 50000,
        juicyway_balance: 25000,
        needs_prefund: false,
        status: 'healthy',
      });
    }
  };

  const updateFundingConfig = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('funding_config')
        .upsert({
          id: 1,
          funding_mode: fundingMode,
          prefund_threshold: parseFloat(prefundThreshold),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(`Funding mode updated to ${fundingMode}`);
      await loadFundingStatus();
    } catch (error: any) {
      toast.error(`Failed to update config: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== USER BALANCE ====================

  const loadUserBalances = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      setUserBalances(data || []);
    } catch (error) {
      setUserBalances([]);
    }
  };

  const creditTestBalance = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('credit_user_balance', {
        p_user_id: testUserId,
        p_amount: 1000,
        p_currency: 'USDC',
        p_transaction_id: null,
      });

      if (error) throw error;

      toast.success('Credited 1000 USDC to test user');
      await loadUserBalances(testUserId);
    } catch (error: any) {
      toast.error(`Failed to credit balance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== PAYOUT EXECUTION ====================

  const executePayout = async () => {
    setLoading(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
      const headers = await getAuthHeaders();


      // Build the request - either with beneficiary_id OR beneficiary_details
      const requestPayload: any = {
        amount: payoutForm.amount,
        source_currency: payoutForm.source_currency,
        destination_currency: payoutForm.destination_currency,
        description: payoutForm.purpose,
        reference: `test_${Date.now()}`,
      };

      if (selectedBeneficiary) {
        // Option 1: Use existing beneficiary
        requestPayload.beneficiary_id = selectedBeneficiary.id;
      } else {
        // Option 2: Create new beneficiary with manual details
        // Determine rail based on destination currency
        let rail = 'nuban'; // Default for NGN
        if (payoutForm.destination_currency === 'USD') {
          rail = 'ach';
        } else if (payoutForm.destination_currency === 'GBP') {
          rail = 'fps';
        } else if (payoutForm.destination_currency === 'EUR') {
          rail = 'sepa';
        }

        requestPayload.beneficiary_details = {
          account_name: payoutForm.beneficiary_name,
          account_number: payoutForm.account_number,
          bank_code: payoutForm.bank_code,
          bank_name: payoutForm.bank_name,
          rail: rail,
        };
      }


      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/test-payout`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show detailed error information
        
        // Display full error details
        const errorMessage = data.error || 'Failed to execute payout';
        const errorDetails = data.details ? JSON.stringify(data.details, null, 2) : '';
        const availableCurrencies = data.available_currencies ? 
          `\n\nAvailable currencies: ${data.available_currencies.join(', ')}` : '';
        const balanceInfo = data.available !== undefined ? 
          `\n\nRequired: ${data.required} ${data.currency}\nAvailable: ${data.available} ${data.currency}` : '';
        
        throw new Error(`${errorMessage}${availableCurrencies}${balanceInfo}${errorDetails ? `\n\nDetails: ${errorDetails}` : ''}`);
      }

      toast.success(`✅ Payout sent! Order ID: ${data.order_id}`, {
        description: `Status: ${data.status}`,
      });

      // Show balance info if available
      if (data.balance_checked) {
      }

      // Reload data
      await loadAllData();
    } catch (error: any) {
      toast.error(`Payout failed`, {
        description: error.message,
        duration: 10000, // Show for 10 seconds
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== PREFUNDING ====================

  const executePrefund = async () => {
    setLoading(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/prefund`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: parseFloat(prefundAmount),
          currency: 'USDC',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute prefund');
      }

      const data = await response.json();

      toast.success(`Prefunded ${prefundAmount} USDC to Juicyway`, {
        description: `TX Hash: ${data.tx_hash}`,
      });

      await loadFundingStatus();
    } catch (error: any) {
      toast.error(`Prefund failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== TRANSACTIONS ====================

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('ledger_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      setTransactions([]);
    }
  };

  // ==================== RECONCILIATION ====================

  const runReconciliation = async () => {
    setLoading(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/reconcile`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run reconciliation');
      }

      const data = await response.json();

      setReconciliation(data);

      if (data.matched) {
        toast.success('Reconciliation passed! ✅');
      } else {
        toast.error('Reconciliation mismatch detected! ⚠️', {
          description: `Difference: ${data.difference} USDC`,
        });
      }
    } catch (error: any) {
      toast.error(`Reconciliation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== BENEFICIARIES ====================

  const loadBeneficiaries = async () => {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/beneficiaries/juicyway`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch beneficiaries from Juicyway');
      }

      const data = await response.json();
      setBeneficiaries(data.beneficiaries || []);
      
      if (data.beneficiaries && data.beneficiaries.length > 0) {
        toast.success(`Loaded ${data.beneficiaries.length} beneficiaries from Juicyway`);
      }
    } catch (error: any) {
      toast.error(`Failed to load beneficiaries: ${error.message}`);
      setBeneficiaries([]);
    }
  };

  const selectBeneficiary = (beneficiary: any) => {
    setSelectedBeneficiary(beneficiary);
    setPayoutForm({
      ...payoutForm,
      beneficiary_name: beneficiary.account_name || beneficiary.name,
      account_number: beneficiary.account_number,
      bank_code: beneficiary.bank_code || '',
      bank_name: beneficiary.bank_name || '',
      destination_currency: beneficiary.currency || payoutForm.destination_currency,
      purpose: 'Salary Payment',
    });
  };

  // ==================== RENDER ====================

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Juicyway Payout Testing</h1>
            <p className="text-sm text-gray-600 mt-1">
              Test complete orchestration: Ledger → Treasury → Execution → Webhook
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                Back
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="payout">💸 Payout</TabsTrigger>
            <TabsTrigger value="balance">💰 Balance</TabsTrigger>
            <TabsTrigger value="funding">⚙️ Funding</TabsTrigger>
            <TabsTrigger value="transactions">📊 Transactions</TabsTrigger>
            <TabsTrigger value="reconcile">🔍 Reconcile</TabsTrigger>
          </TabsList>

          {/* PAYOUT TAB */}
          <TabsContent value="payout" className="space-y-6">
            {/* Available Balances Info */}
            {userBalances.length > 0 && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">💰 Available Balances</p>
                <div className="flex gap-4 flex-wrap">
                  {userBalances.map((balance, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-semibold text-blue-700">{balance.currency}:</span>{' '}
                      <span className="text-blue-900">{parseFloat(balance.balance).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  ⚠️ Make sure to select a Source Currency that you have sufficient balance for
                </p>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Initiate Payout
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <Input
                    value={payoutForm.user_id}
                    onChange={(e) => setPayoutForm({ ...payoutForm, user_id: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Fiat)</label>
                  <Input
                    type="number"
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Currency (Your Balance)</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={payoutForm.source_currency}
                    onChange={(e) => setPayoutForm({ ...payoutForm, source_currency: e.target.value })}
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="USDC">USDC</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    ⚡ Currency to deduct from your Juicyway balance
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Currency (Recipient Gets)</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={payoutForm.destination_currency}
                    onChange={(e) => setPayoutForm({ ...payoutForm, destination_currency: e.target.value })}
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    💸 Currency the recipient will receive
                  </p>
                </div>

                {/* Beneficiary Selector */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Beneficiary (Optional)</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={selectedBeneficiary?.id || ''}
                    onChange={(e) => {
                      const beneficiary = beneficiaries.find(b => b.id === e.target.value);
                      if (beneficiary) {
                        selectBeneficiary(beneficiary);
                      }
                    }}
                  >
                    <option value="">-- Manual Entry --</option>
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.account_name} - {b.account_number} ({b.bank_name || b.currency})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {beneficiaries.length} beneficiaries loaded from Juicyway
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name</label>
                  <Input
                    value={payoutForm.beneficiary_name}
                    onChange={(e) => setPayoutForm({ ...payoutForm, beneficiary_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <Input
                    value={payoutForm.account_number}
                    onChange={(e) => setPayoutForm({ ...payoutForm, account_number: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Code</label>
                  <Input
                    value={payoutForm.bank_code}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bank_code: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <Input
                    value={payoutForm.bank_name}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bank_name: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                  <Input
                    value={payoutForm.purpose}
                    onChange={(e) => setPayoutForm({ ...payoutForm, purpose: e.target.value })}
                  />
                </div>
              </div>

              <Button
                className="mt-6 w-full"
                onClick={executePayout}
                disabled={loading}
              >
                <Send className="w-4 h-4 mr-2" />
                Execute Payout
              </Button>
            </Card>

            {/* Funding Status Indicator */}
            {fundingStatus && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Current Funding Mode</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {fundingStatus.funding_mode.toUpperCase()}
                    </p>
                  </div>
                  <Badge
                    variant={fundingStatus.status === 'healthy' ? 'default' : 'destructive'}
                  >
                    {fundingStatus.status}
                  </Badge>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* BALANCE TAB */}
          <TabsContent value="balance" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  User Balance
                </h2>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="User ID"
                    value={testUserId}
                    onChange={(e) => setTestUserId(e.target.value)}
                    className="w-48"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadUserBalances(testUserId)}
                  >
                    Load
                  </Button>
                </div>
              </div>

              {userBalances.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No balances found</p>
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={creditTestBalance}
                    disabled={loading}
                  >
                    Credit 1000 USDC (Test)
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {userBalances.map((balance, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm text-gray-600">Currency</p>
                          <p className="text-lg font-semibold">{balance.currency}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Balance</p>
                          <p className="text-2xl font-bold text-green-600">
                            {parseFloat(balance.balance).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={creditTestBalance}
                    disabled={loading}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Credit 1000 USDC (Test)
                  </Button>
                </>
              )}
            </Card>
          </TabsContent>

          {/* FUNDING TAB */}
          <TabsContent value="funding" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Funding Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Funding Mode
                  </label>
                  <div className="flex gap-4">
                    <Button
                      variant={fundingMode === 'direct' ? 'default' : 'outline'}
                      onClick={() => setFundingMode('direct')}
                      className="flex-1"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Direct (per transaction)
                    </Button>
                    <Button
                      variant={fundingMode === 'prefund' ? 'default' : 'outline'}
                      onClick={() => setFundingMode('prefund')}
                      className="flex-1"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Prefund (bulk liquidity)
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prefund Threshold (USDC)
                  </label>
                  <Input
                    type="number"
                    value={prefundThreshold}
                    onChange={(e) => setPrefundThreshold(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Trigger alert when Juicyway balance falls below this amount
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={updateFundingConfig}
                  disabled={loading}
                >
                  Save Configuration
                </Button>
              </div>
            </Card>

            {/* Treasury Status */}
            {fundingStatus && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Treasury Status
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 mb-1">Openfort Balance</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {fundingStatus.openfort_balance?.toLocaleString()} USDC
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 mb-1">Juicyway Balance</p>
                    <p className="text-2xl font-bold text-green-900">
                      {fundingStatus.juicyway_balance?.toLocaleString()} USDC
                    </p>
                  </div>
                </div>

                {fundingStatus.needs_prefund && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="w-5 h-5" />
                      <p className="font-semibold">Low Liquidity Alert</p>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Juicyway balance is below threshold. Consider prefunding.
                    </p>
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Manual Prefund</h3>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Amount (USDC)"
                      value={prefundAmount}
                      onChange={(e) => setPrefundAmount(e.target.value)}
                    />
                    <Button onClick={executePrefund} disabled={loading}>
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Prefund
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TRANSACTIONS TAB */}
          <TabsContent value="transactions" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Transactions
              </h2>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{tx.user_id}</p>
                          <Badge
                            variant={
                              tx.status === 'completed' ? 'default' :
                              tx.status === 'failed' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {tx.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {tx.amount} {tx.currency} • {tx.type}
                        </p>
                        {tx.juicyway_order_id && (
                          <p className="text-xs text-gray-500 mt-1">
                            Order: {tx.juicyway_order_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {tx.status === 'completed' && <CheckCircle className="w-6 h-6 text-green-500" />}
                        {tx.status === 'failed' && <XCircle className="w-6 h-6 text-red-500" />}
                        {tx.status === 'processing' && <Clock className="w-6 h-6 text-yellow-500 animate-pulse" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* RECONCILE TAB */}
          <TabsContent value="reconcile" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                System Reconciliation
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                Verify that total user balances match treasury holdings (Openfort + Juicyway)
              </p>

              <Button
                className="w-full mb-6"
                onClick={runReconciliation}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Run Reconciliation
              </Button>

              {reconciliation && (
                <div
                  className={`p-6 rounded-lg border-2 ${
                    reconciliation.matched
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    {reconciliation.matched ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <p className="text-lg font-semibold">
                      {reconciliation.matched ? 'Reconciliation Passed ✅' : 'Mismatch Detected ⚠️'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">User Balances</p>
                      <p className="text-xl font-bold">
                        {reconciliation.user_balances?.toLocaleString()} USDC
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Total Treasury</p>
                      <p className="text-xl font-bold">
                        {reconciliation.total_treasury?.toLocaleString()} USDC
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Openfort</p>
                      <p className="text-lg">
                        {reconciliation.openfort_balance?.toLocaleString()} USDC
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Juicyway</p>
                      <p className="text-lg">
                        {reconciliation.juicyway_balance?.toLocaleString()} USDC
                      </p>
                    </div>
                  </div>

                  {!reconciliation.matched && (
                    <div className="p-3 bg-red-100 rounded border border-red-300">
                      <p className="text-sm font-semibold text-red-800">
                        Difference: {reconciliation.difference?.toFixed(6)} USDC
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-4">
                    Last checked: {new Date(reconciliation.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}