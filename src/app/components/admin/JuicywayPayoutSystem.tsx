/**
 * Complete Juicyway Payout Testing System
 * Supports: Local (NGN), International (USD), Stablecoin (USDT/USDC)
 *
 * Flow: Verify → Save → Check Fee → Confirm → Send → Track Status
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Wallet,
  Globe,
  Building2,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type TransferType = 'local' | 'international' | 'crypto';
type Step = 'select' | 'input' | 'verify' | 'review' | 'pin' | 'processing' | 'complete';

interface Bank {
  name: string;
  code: string;
}

export default function JuicywayPayoutSystem() {
  const [loading, setLoading] = useState(false);
  const [transferType, setTransferType] = useState<TransferType>('local');
  const [step, setStep] = useState<Step>('select');

  // Data states
  const [banks, setBanks] = useState<Bank[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [accountName, setAccountName] = useState('');
  const [feeData, setFeeData] = useState<any>(null);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [useSavedBeneficiary, setUseSavedBeneficiary] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    user_id: 'test_user_001',
    // Bank transfer fields
    account_number: '',
    bank_code: '',
    bank_name: '',
    // Amount and currency
    amount: '100000',
    source_currency: 'NGN',
    destination_currency: 'NGN',
    // Crypto fields
    wallet_address: '',
    network: 'TRX',
    token: 'USDT',
    // Common
    description: 'Test Payout',
    reference: '',
    pin: '',
  });

  const SUPABASE_URL = 'https://ulolufsmjdlramdtstrr.supabase.co';

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

  // Load Beneficiaries
  const loadBeneficiaries = async () => {
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBeneficiaries(data || []);
    } catch (error: any) {
    }
  };

  // STEP 1: Load Banks
  const loadBanks = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/banks`, {
        headers,
      });

      if (!response.ok) throw new Error('Failed to load banks');

      const data = await response.json();
      setBanks(data.banks || []);
      toast.success(`Loaded ${data.banks?.length || 0} banks`);
    } catch (error: any) {
      toast.error(`Failed to load banks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify Account
  const verifyAccount = async () => {
    if (!formData.account_number || !formData.bank_code) {
      toast.error('Please enter account number and select bank');
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/verify-account`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          account_number: formData.account_number,
          bank_code: formData.bank_code,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Account verification failed');
      }

      const data = await response.json();
      setAccountName(data.account_name);
      setStep('verify');
      toast.success(`Account verified: ${data.account_name}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Check Fee
  const checkFee = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/check-fee`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          currency: formData.destination_currency,
          currency_rail: formData.destination_currency,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fee check failed');
      }

      const data = await response.json();
      setFeeData(data);
      setStep('review');
      toast.success('Fee calculated');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 4: Send Payout
  const sendPayout = async () => {
    if (!formData.pin) {
      toast.error('Please enter your PIN');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      const headers = await getAuthHeaders();

      // Generate reference
      const reference = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      let requestBody: any = {
        user_id: formData.user_id,
        amount: parseFloat(formData.amount),
        source_currency: formData.source_currency,
        destination_currency: formData.destination_currency,
        description: formData.description,
        reference,
        pin: formData.pin,
      };

      if (transferType === 'crypto') {
        // Crypto transfer
        requestBody.beneficiary = {
          type: 'crypto_address',
          address: formData.wallet_address,
          network: formData.network,
        };
        requestBody.beneficiary_type = 'crypto_address';
      } else {
        // Bank transfer (local or international)
        requestBody.beneficiary = {
          type: 'bank_account',
          account_number: formData.account_number,
          account_name: accountName,
          bank_code: formData.bank_code,
          bank_name: formData.bank_name,
        };
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/send-payout`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Payout failed');
      }

      const data = await response.json();
      setTransactionResult(data);
      setStep('complete');
      toast.success('Payout initiated successfully!');
    } catch (error: any) {
      toast.error(error.message);
      setStep('pin');
    } finally {
      setLoading(false);
    }
  };

  // Reset flow
  const reset = () => {
    setStep('select');
    setAccountName('');
    setFeeData(null);
    setTransactionResult(null);
    setFormData({
      ...formData,
      account_number: '',
      bank_code: '',
      bank_name: '',
      wallet_address: '',
      amount: '100000',
      reference: '',
      pin: '',
    });
  };

  // Load data on mount
  useEffect(() => {
    loadBeneficiaries();
    if (transferType === 'local' || transferType === 'international') {
      loadBanks();
    }
  }, [transferType]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Juicyway Payout Testing</h1>
        <p className="text-gray-600">Complete flow: Verify → Fee → Confirm → Send → Track</p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <Badge variant={step === 'select' ? 'default' : 'outline'}>1. Select</Badge>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <Badge variant={step === 'input' ? 'default' : 'outline'}>2. Input</Badge>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <Badge variant={step === 'verify' ? 'default' : 'outline'}>3. Verify</Badge>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <Badge variant={step === 'review' ? 'default' : 'outline'}>4. Review</Badge>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <Badge variant={step === 'pin' ? 'default' : 'outline'}>5. PIN</Badge>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <Badge variant={step === 'processing' || step === 'complete' ? 'default' : 'outline'}>6. Status</Badge>
      </div>

      <Card className="p-6">
        {/* STEP: SELECT TRANSFER TYPE */}
        {step === 'select' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Select Transfer Type</h2>

            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setTransferType('local');
                  setStep('input');
                }}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <Building2 className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold mb-1">Bank Transfer</h3>
                <p className="text-sm text-gray-600">Local or International</p>
              </button>

              <button
                onClick={() => {
                  setTransferType('international');
                  setStep('input');
                }}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
              >
                <Globe className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <h3 className="font-semibold mb-1">Cross-Border</h3>
                <p className="text-sm text-gray-600">With FX Conversion</p>
              </button>

              <button
                onClick={() => {
                  setTransferType('crypto');
                  setFormData({ ...formData, source_currency: 'USDC', destination_currency: 'USDT' });
                  setStep('input');
                }}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
              >
                <Wallet className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                <h3 className="font-semibold mb-1">Stablecoin</h3>
                <p className="text-sm text-gray-600">Crypto Wallet</p>
              </button>
            </div>
          </div>
        )}

        {/* STEP: INPUT DETAILS */}
        {step === 'input' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {transferType === 'crypto' ? '🪙 Crypto Transfer' : '💳 Bank Transfer'}
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({formData.source_currency} → {formData.destination_currency})
                </span>
              </h2>
              <Button variant="outline" size="sm" onClick={reset}>Change Type</Button>
            </div>

            {/* Use Saved Beneficiary Toggle */}
            {(transferType === 'local' || transferType === 'international') && (
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSavedBeneficiary}
                    onChange={(e) => setUseSavedBeneficiary(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Use Saved Beneficiary</span>
                </label>
              </div>
            )}

            {/* Saved Beneficiary Selection */}
            {(transferType === 'local' || transferType === 'international') && useSavedBeneficiary && (
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Select Beneficiary</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  onChange={(e) => {
                    const ben = beneficiaries.find(b => b.id === e.target.value);
                    if (ben) {
                      setFormData({
                        ...formData,
                        bank_code: ben.bank_code || '',
                        bank_name: ben.bank_name || '',
                        account_number: ben.account_number || '',
                        destination_currency: ben.currency || formData.destination_currency,
                      });
                      setAccountName(ben.account_name || '');
                    }
                  }}
                >
                  <option value="">-- Select Beneficiary ({beneficiaries.length} available) --</option>
                  {beneficiaries
                    .filter(b => b.type === 'bank_account')
                    .map((ben) => (
                      <option key={ben.id} value={ben.id}>
                        {ben.account_name} - {ben.account_number} ({ben.currency})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Bank Transfer Fields */}
            {(transferType === 'local' || transferType === 'international') && !useSavedBeneficiary && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Select Bank</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.bank_code}
                    onChange={(e) => {
                      const bank = banks.find(b => b.code === e.target.value);
                      setFormData({
                        ...formData,
                        bank_code: e.target.value,
                        bank_name: bank?.name || '',
                      });
                    }}
                  >
                    <option value="">-- Select Bank --</option>
                    {banks.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                  {banks.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadBanks}
                      className="mt-2"
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Load Banks
                    </Button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Account Number</label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="0234247896"
                    maxLength={10}
                  />
                </div>
              </>
            )}

            {/* Crypto Transfer Fields */}
            {transferType === 'crypto' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Token</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.token}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value, destination_currency: e.target.value })}
                  >
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Network</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.network}
                    onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  >
                    <option value="TRX">Tron (TRC20)</option>
                    <option value="ETH">Ethereum (ERC20)</option>
                    <option value="BSC">Binance Smart Chain</option>
                    <option value="MATIC">Polygon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Wallet Address</label>
                  <Input
                    value={formData.wallet_address}
                    onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                    placeholder="0x..."
                  />
                </div>
              </>
            )}

            {/* Source Currency */}
            <div>
              <label className="block text-sm font-medium mb-1">Source Currency (What you're paying with)</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={formData.source_currency}
                onChange={(e) => setFormData({ ...formData, source_currency: e.target.value })}
              >
                <option value="NGN">NGN (Nigerian Naira)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="CAD">CAD (Canadian Dollar)</option>
                <option value="USDC">USDC (Stablecoin)</option>
                <option value="USDT">USDT (Stablecoin)</option>
              </select>
            </div>

            {/* Destination Currency */}
            <div>
              <label className="block text-sm font-medium mb-1">Destination Currency (What they receive)</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={formData.destination_currency}
                onChange={(e) => setFormData({ ...formData, destination_currency: e.target.value })}
              >
                <option value="NGN">NGN (Nigerian Naira)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="CAD">CAD (Canadian Dollar)</option>
                <option value="USDC">USDC (Stablecoin)</option>
                <option value="USDT">USDT (Stablecoin)</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Amount ({formData.source_currency})
              </label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Payment description"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => {
                if (transferType === 'crypto') {
                  checkFee();
                } else if (useSavedBeneficiary && accountName) {
                  // Skip verification, go directly to fee check
                  setStep('verify');
                  setTimeout(() => checkFee(), 100);
                } else {
                  verifyAccount();
                }
              }}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Continue'}
            </Button>
          </div>
        )}

        {/* STEP: VERIFY ACCOUNT */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Account Verified</h2>
              <p className="text-2xl font-bold text-green-600 mb-4">{accountName}</p>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Bank: {formData.bank_name}</p>
                <p>Account: {formData.account_number}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('input')} className="flex-1">
                Back
              </Button>
              <Button onClick={checkFee} disabled={loading} className="flex-1">
                {loading ? 'Checking Fee...' : 'Continue'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP: REVIEW & FEE */}
        {step === 'review' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Review Payment</h2>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">{formData.amount} {formData.source_currency}</span>
              </div>

              {feeData && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fee:</span>
                    <span className="font-semibold">{feeData.fee || 0} {formData.source_currency}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg">
                      {(parseFloat(formData.amount) + (feeData.fee || 0)).toFixed(2)} {formData.source_currency}
                    </span>
                  </div>
                </>
              )}

              {transferType === 'international' && (
                <div className="flex justify-between text-green-600">
                  <span>Recipient gets:</span>
                  <span className="font-semibold">~{feeData?.destination_amount || '---'} USD</span>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <p className="text-sm text-gray-600">
                  {transferType === 'local' && `To: ${accountName} (${formData.bank_name})`}
                  {transferType === 'international' && `International transfer to ${accountName}`}
                  {transferType === 'crypto' && `To: ${formData.wallet_address?.substring(0, 20)}...`}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(transferType === 'crypto' ? 'input' : 'verify')} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep('pin')} className="flex-1">
                Proceed to PIN
              </Button>
            </div>
          </div>
        )}

        {/* STEP: ENTER PIN */}
        {step === 'pin' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Enter Transaction PIN</h2>
              <p className="text-sm text-gray-600">Enter your 6-digit PIN to authorize this transaction</p>
            </div>

            <div>
              <Input
                type="password"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                placeholder="Enter 6-digit PIN"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={sendPayout}
                disabled={loading || formData.pin.length !== 6}
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Send Money'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP: PROCESSING */}
        {step === 'processing' && (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-semibold mb-2">Processing Transfer...</h2>
            <p className="text-gray-600">Please wait while we process your transaction</p>
          </div>
        )}

        {/* STEP: COMPLETE */}
        {step === 'complete' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              {transactionResult?.status === 'pending' || transactionResult?.status === 'processing' ? (
                <>
                  <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Transfer Initiated</h2>
                  <Badge variant="secondary" className="mb-4">Status: {transactionResult?.status}</Badge>
                </>
              ) : transactionResult?.status === 'success' || transactionResult?.status === 'completed' ? (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Transfer Successful!</h2>
                  <Badge className="mb-4">Completed</Badge>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Transfer Failed</h2>
                  <Badge variant="destructive" className="mb-4">Failed</Badge>
                </>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mt-6 text-left space-y-2">
                {transactionResult?.order_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono">{transactionResult.order_id}</span>
                  </div>
                )}
                {transactionResult?.reference && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Reference:</span>
                    <span className="font-mono">{transactionResult.reference}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">{formData.amount} {formData.source_currency}</span>
                </div>
              </div>
            </div>

            <Button onClick={reset} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Send Another Payment
            </Button>
          </div>
        )}
      </Card>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="p-4 bg-gray-50">
          <details>
            <summary className="cursor-pointer font-semibold text-sm">Debug Info</summary>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify({ step, transferType, formData, accountName, feeData, transactionResult }, null, 2)}
            </pre>
          </details>
        </Card>
      )}
    </div>
  );
}
