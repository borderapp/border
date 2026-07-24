/**
 * Juicyway Comprehensive Admin Panel
 *
 * Full-stack management interface for:
 * - Beneficiary management
 * - Payout execution
 * - FX swaps
 * - Crypto funding
 * - Wallet balances
 * - Transaction monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Send,
  ArrowRightLeft,
  Wallet,
  Download,
  Activity,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function JuicywayComprehensive() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('beneficiaries');

  // Data states
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [walletBalances, setWalletBalances] = useState<any>(null);
  const [fundingAddresses, setFundingAddresses] = useState<any[]>([]);

  // Form states
  const [beneficiaryType, setBeneficiaryType] = useState<'NGN' | 'USD' | 'Interac'>('NGN');

  const [beneficiaryForm, setBeneficiaryForm] = useState({
    user_id: 'test_user_001',
    type: 'bank_account',
    currency: 'NGN',
    account_name: '',
    account_number: '',
    bank_name: '',
    bank_code: '',
    rail: 'nuban',
    // USD fields
    routing_number: '',
    sort_code: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: 'US',
      zip_code: '',
    },
    bank_address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: 'US',
      zip_code: '',
    },
    // Interac fields
    beneficiary_type: 'personal',
    first_name: '',
    last_name: '',
    email: '',
    question: '',
    answer: '',
    phone_number: '',
  });

  const [swapForm, setSwapForm] = useState({
    user_id: 'admin',
    from_currency: 'USDC',
    to_currency: 'NGN',
    amount: '1000',
  });

  const [depositForm, setDepositForm] = useState({
    tx_hash: '',
    currency: 'USDC',
    network: 'TRX',
    amount: '',
  });

  const [payoutForm, setPayoutForm] = useState({
    user_id: 'test_user_001',
    amount: '100000',
    currency: 'NGN',
    crypto_currency: 'NGN',
    beneficiary_id: '',
    purpose: 'Payout',
  });

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

  const SUPABASE_URL = 'https://ulolufsmjdlramdtstrr.supabase.co';

  // Load all data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Load all data
  const loadAllData = async () => {
    await Promise.all([
      loadBeneficiaries(),
      loadSwaps(),
      loadPayouts(),
      loadWalletBalances(),
      loadFundingAddresses(),
    ]);
  };

  // ==================== BENEFICIARIES ====================

  const loadBeneficiaries = async () => {
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST204' || error.message?.includes('beneficiaries')) {
          toast.error('Beneficiaries table not found. Run database migrations first.');
        } else {
          toast.error(`Failed to load beneficiaries: ${error.message}`);
        }
        setBeneficiaries([]);
        return;
      }

      setBeneficiaries(data || []);
    } catch (error: any) {
      toast.error(`Error loading beneficiaries: ${error.message}`);
      setBeneficiaries([]);
    }
  };

  const createBeneficiary = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      // Build request based on beneficiary type
      let requestBody: any = {
        user_id: beneficiaryForm.user_id,
      };

      if (beneficiaryType === 'NGN') {
        requestBody = {
          ...requestBody,
          type: 'bank_account',
          currency: 'NGN',
          account_name: beneficiaryForm.account_name,
          account_number: beneficiaryForm.account_number,
          bank_name: beneficiaryForm.bank_name,
          bank_code: beneficiaryForm.bank_code,
          rail: 'nuban',
        };
      } else if (beneficiaryType === 'USD') {
        requestBody = {
          ...requestBody,
          type: 'bank_account',
          currency: 'USD',
          account_name: beneficiaryForm.account_name,
          account_number: beneficiaryForm.account_number,
          routing_number: beneficiaryForm.routing_number,
          rail: 'ach',
          sort_code: beneficiaryForm.sort_code,
          address: beneficiaryForm.address,
          bank_address: beneficiaryForm.bank_address,
        };
      } else if (beneficiaryType === 'Interac') {
        requestBody = {
          ...requestBody,
          type: 'interac',
          currency: 'CAD',
          beneficiary_type: beneficiaryForm.beneficiary_type,
          first_name: beneficiaryForm.first_name,
          last_name: beneficiaryForm.last_name,
          email: beneficiaryForm.email,
          question: beneficiaryForm.question,
          answer: beneficiaryForm.answer,
          phone_number: beneficiaryForm.phone_number,
        };
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/beneficiaries/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create beneficiary');
      }

      const data = await response.json();
      toast.success('Beneficiary created successfully!');

      await loadBeneficiaries();
    } catch (error: any) {
      toast.error(`Failed to create beneficiary: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== SWAPS ====================

  const loadSwaps = async () => {
    try {
      const { data, error } = await supabase
        .from('swaps')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSwaps(data || []);
    } catch (error) {
    }
  };

  const executeSwap = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/swap`, {
        method: 'POST',
        headers,
        body: JSON.stringify(swapForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Swap failed');
      }

      const data = await response.json();
      toast.success(`Swap completed! ${data.from_amount} ${swapForm.from_currency} → ${data.to_amount} ${swapForm.to_currency}`);

      await loadSwaps();
      await loadWalletBalances();
    } catch (error: any) {
      toast.error(`Swap failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== PAYOUTS ====================

  const initiatePayout = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      // Get selected beneficiary details
      const selectedBeneficiary = beneficiaries.find(b => b.id === payoutForm.beneficiary_id);
      if (!selectedBeneficiary) {
        throw new Error('Please select a beneficiary');
      }

      const requestBody = {
        user_id: payoutForm.user_id,
        amount: parseFloat(payoutForm.amount),
        currency: payoutForm.currency,
        crypto_currency: payoutForm.crypto_currency,
        beneficiary: {
          id: selectedBeneficiary.juicyway_beneficiary_id,
          type: selectedBeneficiary.type,
          juicyway_beneficiary_id: selectedBeneficiary.juicyway_beneficiary_id,
        },
        purpose: payoutForm.purpose,
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/initiate-payout`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payout initiation failed');
      }

      const data = await response.json();
      toast.success(`Payout initiated! Order ID: ${data.order_id}`);

      // Reset form
      setPayoutForm({
        user_id: 'test_user_001',
        amount: '100000',
        currency: 'NGN',
        crypto_currency: 'USDC',
        beneficiary_id: '',
        purpose: 'Payout',
      });

      await loadPayouts();
      await loadWalletBalances();
    } catch (error: any) {
      toast.error(`Payout failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPayouts = async () => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/payouts/list`, {
        headers,
      });

      if (!response.ok) throw new Error('Failed to load payouts');

      const data = await response.json();
      setPayouts(data.payouts || []);
    } catch (error) {
    }
  };

  // ==================== WALLET BALANCES ====================

  const loadWalletBalances = async () => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/wallets/balances`, {
        headers,
      });

      if (!response.ok) throw new Error('Failed to load balances');

      const data = await response.json();
      setWalletBalances(data);
    } catch (error) {
    }
  };

  // ==================== FUNDING ADDRESSES ====================

  const loadFundingAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('funding_addresses')
        .select('*')
        .eq('active', true);

      if (error) throw error;
      setFundingAddresses(data || []);
    } catch (error) {
    }
  };

  const recordDeposit = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/funding/deposit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(depositForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record deposit');
      }

      toast.success('Deposit recorded successfully!');

      // Reset form
      setDepositForm({
        tx_hash: '',
        currency: 'USDC',
        network: 'TRX',
        amount: '',
      });
    } catch (error: any) {
      toast.error(`Failed to record deposit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Juicyway Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Beneficiaries • Payouts • Swaps • Funding • Wallets
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="beneficiaries">👤 Beneficiaries</TabsTrigger>
            <TabsTrigger value="swaps">🔄 FX Swaps</TabsTrigger>
            <TabsTrigger value="funding">💵 Funding</TabsTrigger>
            <TabsTrigger value="wallets">💰 Wallets</TabsTrigger>
            <TabsTrigger value="payouts">📤 Payouts</TabsTrigger>
          </TabsList>

          {/* BENEFICIARIES TAB */}
          <TabsContent value="beneficiaries" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Beneficiary
              </h2>

              {/* Beneficiary Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary Type</label>
                <div className="flex gap-3">
                  <Button
                    variant={beneficiaryType === 'NGN' ? 'default' : 'outline'}
                    onClick={() => setBeneficiaryType('NGN')}
                    className="flex-1"
                  >
                    🇳🇬 NGN Bank
                  </Button>
                  <Button
                    variant={beneficiaryType === 'USD' ? 'default' : 'outline'}
                    onClick={() => setBeneficiaryType('USD')}
                    className="flex-1"
                  >
                    🇺🇸 USD Bank
                  </Button>
                  <Button
                    variant={beneficiaryType === 'Interac' ? 'default' : 'outline'}
                    onClick={() => setBeneficiaryType('Interac')}
                    className="flex-1"
                  >
                    🇨🇦 Interac
                  </Button>
                </div>
              </div>

              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <Input
                    value={beneficiaryForm.user_id}
                    onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, user_id: e.target.value })}
                  />
                </div>
              </div>

              {/* NGN Bank Account Fields */}
              {beneficiaryType === 'NGN' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <Input
                      value={beneficiaryForm.account_name}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, account_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <Input
                      value={beneficiaryForm.account_number}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, account_number: e.target.value })}
                      placeholder="1234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <Input
                      value={beneficiaryForm.bank_name}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_name: e.target.value })}
                      placeholder="Access Bank"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Code</label>
                    <Input
                      value={beneficiaryForm.bank_code}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_code: e.target.value })}
                      placeholder="044"
                    />
                  </div>
                </div>
              )}

              {/* USD Bank Account Fields */}
              {beneficiaryType === 'USD' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                      <Input
                        value={beneficiaryForm.account_name}
                        onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, account_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <Input
                        value={beneficiaryForm.account_number}
                        onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, account_number: e.target.value })}
                        placeholder="123456789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label>
                      <Input
                        value={beneficiaryForm.routing_number}
                        onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, routing_number: e.target.value })}
                        placeholder="123456789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort Code</label>
                      <Input
                        value={beneficiaryForm.sort_code}
                        onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, sort_code: e.target.value })}
                        placeholder="123456"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-sm mb-3">Beneficiary Address</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Address Line 1</label>
                        <Input
                          value={beneficiaryForm.address.line1}
                          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, address: { ...beneficiaryForm.address, line1: e.target.value } })}
                          placeholder="15 High Road"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Address Line 2</label>
                        <Input
                          value={beneficiaryForm.address.line2}
                          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, address: { ...beneficiaryForm.address, line2: e.target.value } })}
                          placeholder="Unit 12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">City</label>
                        <Input
                          value={beneficiaryForm.address.city}
                          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, address: { ...beneficiaryForm.address, city: e.target.value } })}
                          placeholder="New York"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">State</label>
                        <Input
                          value={beneficiaryForm.address.state}
                          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, address: { ...beneficiaryForm.address, state: e.target.value } })}
                          placeholder="NY"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">ZIP Code</label>
                        <Input
                          value={beneficiaryForm.address.zip_code}
                          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, address: { ...beneficiaryForm.address, zip_code: e.target.value } })}
                          placeholder="10003"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-sm mb-3">Bank Address</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Address Line 1</label>
                        <Input
                          value={beneficiaryForm.bank_address.line1}
                          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_address: { ...beneficiaryForm.bank_address, line1: e.target.value } })}
                          placeholder="20 Finance Blvd"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Address Line 2</label>
                        <Input
                          value={beneficiaryForm.bank_address.line2}
                          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_address: { ...beneficiaryForm.bank_address, line2: e.target.value } })}
                          placeholder="Suite 200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">City</label>
                        <Input
                          value={beneficiaryForm.bank_address.city}
                          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_address: { ...beneficiaryForm.bank_address, city: e.target.value } })}
                          placeholder="Los Angeles"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">State</label>
                        <Input
                          value={beneficiaryForm.bank_address.state}
                          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_address: { ...beneficiaryForm.bank_address, state: e.target.value } })}
                          placeholder="CA"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">ZIP Code</label>
                        <Input
                          value={beneficiaryForm.bank_address.zip_code}
                          onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_address: { ...beneficiaryForm.bank_address, zip_code: e.target.value } })}
                          placeholder="90001"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Interac e-Transfer Fields */}
              {beneficiaryType === 'Interac' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={beneficiaryForm.beneficiary_type}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, beneficiary_type: e.target.value })}
                    >
                      <option value="personal">Personal</option>
                      <option value="business">Business</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <Input
                      type="email"
                      value={beneficiaryForm.email}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, email: e.target.value })}
                      placeholder="alice@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <Input
                      value={beneficiaryForm.first_name}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, first_name: e.target.value })}
                      placeholder="Alice"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <Input
                      value={beneficiaryForm.last_name}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, last_name: e.target.value })}
                      placeholder="Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <Input
                      value={beneficiaryForm.phone_number}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, phone_number: e.target.value })}
                      placeholder="1234567890"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Question</label>
                    <Input
                      value={beneficiaryForm.question}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, question: e.target.value })}
                      placeholder="What is your pet's name?"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Answer</label>
                    <Input
                      value={beneficiaryForm.answer}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, answer: e.target.value })}
                      placeholder="Fluffy"
                    />
                  </div>
                </div>
              )}

              <Button
                className="mt-6 w-full"
                onClick={createBeneficiary}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create {beneficiaryType} Beneficiary
              </Button>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Beneficiary List ({beneficiaries.length})
              </h2>

              {beneficiaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No beneficiaries yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {beneficiaries.map((ben) => (
                    <div
                      key={ben.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">
                          {ben.type === 'interac'
                            ? `${ben.first_name} ${ben.last_name}`
                            : ben.account_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {ben.type === 'interac'
                            ? `${ben.email} • ${ben.phone_number || 'N/A'}`
                            : `${ben.account_number || 'N/A'} • ${ben.bank_name || 'N/A'}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          User: {ben.user_id} • Type: {ben.type === 'interac' ? 'Interac' : ben.rail?.toUpperCase()} • Currency: {ben.currency}
                        </p>
                      </div>
                      <Badge>{ben.currency}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* SWAPS TAB */}
          <TabsContent value="swaps" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Execute FX Swap
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Currency</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={swapForm.from_currency}
                    onChange={(e) => setSwapForm({ ...swapForm, from_currency: e.target.value })}
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Currency</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={swapForm.to_currency}
                    onChange={(e) => setSwapForm({ ...swapForm, to_currency: e.target.value })}
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <Input
                    type="number"
                    value={swapForm.amount}
                    onChange={(e) => setSwapForm({ ...swapForm, amount: e.target.value })}
                  />
                </div>
              </div>

              <Button
                className="mt-6 w-full"
                onClick={executeSwap}
                disabled={loading}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Execute Swap
              </Button>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Swaps ({swaps.length})</h2>

              {swaps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No swaps yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {swaps.map((swap) => (
                    <div
                      key={swap.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">
                          {parseFloat(swap.from_amount).toFixed(2)} {swap.from_currency} → {parseFloat(swap.to_amount || 0).toFixed(2)} {swap.to_currency}
                        </p>
                        <p className="text-sm text-gray-600">
                          Rate: {parseFloat(swap.rate || 0).toFixed(4)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(swap.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={swap.status === 'completed' ? 'default' : 'secondary'}>
                        {swap.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* FUNDING TAB */}
          <TabsContent value="funding" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Crypto Deposit Addresses
              </h2>

              {fundingAddresses.length === 0 ? (
                <p className="text-gray-500">No funding addresses configured</p>
              ) : (
                <div className="space-y-3">
                  {fundingAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{addr.currency} - {addr.network}</p>
                        <Badge>{addr.label}</Badge>
                      </div>
                      <p className="text-sm font-mono bg-white px-3 py-2 rounded border">
                        {addr.address}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Record Crypto Deposit
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Hash</label>
                  <Input
                    value={depositForm.tx_hash}
                    onChange={(e) => setDepositForm({ ...depositForm, tx_hash: e.target.value })}
                    placeholder="0x..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={depositForm.currency}
                    onChange={(e) => setDepositForm({ ...depositForm, currency: e.target.value })}
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={depositForm.network}
                    onChange={(e) => setDepositForm({ ...depositForm, network: e.target.value })}
                  >
                    <option value="TRX">Tron (TRC20)</option>
                    <option value="ETH">Ethereum (ERC20)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <Input
                    type="number"
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  />
                </div>
              </div>

              <Button
                className="mt-6 w-full"
                onClick={recordDeposit}
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Record Deposit
              </Button>
            </Card>
          </TabsContent>

          {/* WALLETS TAB */}
          <TabsContent value="wallets" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Wallet Balances
              </h2>

              {!walletBalances ? (
                <div className="text-center py-8">
                  <Button onClick={loadWalletBalances} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Load Balances
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 mb-1">Juicyway NGN</p>
                    <p className="text-2xl font-bold text-blue-900">
                      ₦{walletBalances.juicyway?.NGN?.toLocaleString() || '0.00'}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 mb-1">Juicyway USDC</p>
                    <p className="text-2xl font-bold text-green-900">
                      ${walletBalances.juicyway?.USDC?.toLocaleString() || '0.00'}
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 mb-1">Openfort USDC</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ${walletBalances.openfort?.USDC?.toLocaleString() || '0.00'}
                    </p>
                  </div>

                  <div className="col-span-3 p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
                    <p className="text-sm text-gray-600 mb-1">Total USDC</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ${walletBalances.total?.USDC?.toLocaleString() || '0.00'}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* PAYOUTS TAB */}
          <TabsContent value="payouts" className="space-y-6">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                    <span>Beneficiary</span>
                    <button
                      onClick={loadBeneficiaries}
                      className="text-xs text-blue-600 hover:text-blue-800"
                      type="button"
                    >
                      <RefreshCw className="w-3 h-3 inline mr-1" />
                      Refresh ({beneficiaries.length})
                    </button>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={payoutForm.beneficiary_id}
                    onChange={(e) => {
                      const selectedBen = beneficiaries.find(b => b.id === e.target.value);
                      setPayoutForm({
                        ...payoutForm,
                        beneficiary_id: e.target.value,
                        currency: selectedBen?.currency || 'NGN',
                      });
                    }}
                  >
                    <option value="">
                      {beneficiaries.length === 0
                        ? '-- No beneficiaries found. Create one in Beneficiaries tab --'
                        : '-- Select beneficiary --'}
                    </option>
                    {beneficiaries.map((ben) => (
                      <option key={ben.id} value={ben.id}>
                        {ben.account_name || `${ben.first_name} ${ben.last_name}` || ben.email} ({ben.currency})
                      </option>
                    ))}
                  </select>
                  {beneficiaries.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Create beneficiaries in the "Beneficiaries" tab first
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <Input
                    type="number"
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                    placeholder="100000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Currency</label>
                  <Input
                    value={payoutForm.currency}
                    onChange={(e) => setPayoutForm({ ...payoutForm, currency: e.target.value })}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Currency</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={payoutForm.crypto_currency}
                    onChange={(e) => setPayoutForm({ ...payoutForm, crypto_currency: e.target.value })}
                  >
                    <option value="NGN">NGN (Nigerian Naira)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="CAD">CAD (Canadian Dollar)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="USDC">USDC (Stablecoin)</option>
                    <option value="USDT">USDT (Stablecoin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                  <Input
                    value={payoutForm.purpose}
                    onChange={(e) => setPayoutForm({ ...payoutForm, purpose: e.target.value })}
                    placeholder="Payout"
                  />
                </div>
              </div>

              <Button
                className="mt-6 w-full"
                onClick={initiatePayout}
                disabled={loading || !payoutForm.beneficiary_id}
              >
                <Send className="w-4 h-4 mr-2" />
                Initiate Payout
              </Button>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Payouts ({payouts.length})
              </h2>

              {payouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No payouts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{payout.user_id}</p>
                          <Badge
                            variant={
                              payout.status === 'completed' ? 'default' :
                              payout.status === 'failed' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {payout.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {payout.amount} {payout.currency}
                        </p>
                        {payout.juicyway_order_id && (
                          <p className="text-xs text-gray-500 mt-1">
                            Order: {payout.juicyway_order_id}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(payout.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        {payout.status === 'completed' && <CheckCircle className="w-6 h-6 text-green-500" />}
                        {payout.status === 'failed' && <XCircle className="w-6 h-6 text-red-500" />}
                        {payout.status === 'processing' && <Clock className="w-6 h-6 text-yellow-500 animate-pulse" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}