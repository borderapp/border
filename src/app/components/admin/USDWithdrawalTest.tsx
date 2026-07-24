/**
 * USD Withdrawal Test Panel
 * Tests Juicyway USD beneficiary creation and payouts
 */

import React, { useState } from 'react';
import { DollarSign, Send, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardContent } from '../ui/card';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  timestamp: number;
}

export default function USDWithdrawalTest() {
  // Form fields matching exact Juicyway USD format
  const [accountHolderName, setAccountHolderName] = useState('John Doe');
  const [accountNumber, setAccountNumber] = useState('123456789');
  const [routingNumber, setRoutingNumber] = useState('021000021');
  const [sortCode, setSortCode] = useState('021000021');
  const [bankName, setBankName] = useState('Chase Bank');

  // Address fields
  const [addressLine1, setAddressLine1] = useState('123 Main St');
  const [addressLine2, setAddressLine2] = useState('Apt 4B');
  const [city, setCity] = useState('New York');
  const [state, setState] = useState('NY');
  const [zipCode, setZipCode] = useState('10001');

  // Bank address fields
  const [bankAddressLine1, setBankAddressLine1] = useState('270 Park Avenue');
  const [bankAddressLine2, setBankAddressLine2] = useState('');
  const [bankCity, setBankCity] = useState('New York');
  const [bankState, setBankState] = useState('NY');
  const [bankZipCode, setBankZipCode] = useState('10017');

  // Test parameters
  const [amount, setAmount] = useState('100.00');
  const [userId, setUserId] = useState('test-user-usd');

  // State
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [beneficiaryId, setBeneficiaryId] = useState<string>('');

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [result, ...prev]);
  };

  const testCreateBeneficiary = async () => {
    setTesting(true);
    addTestResult({
      step: 'create_beneficiary',
      success: false,
      message: '⏳ Creating USD beneficiary...',
      timestamp: Date.now(),
    });

    try {
      // Exact payload format - NO sort_code for USD (only for UK banks)
      const beneficiaryPayload = {
        type: 'bank_account',
        currency: 'USD',
        account_name: accountHolderName,
        account_number: accountNumber,
        routing_number: routingNumber,
        rail: 'ach',
        bank_name: bankName,
        address: {
          line1: addressLine1,
          line2: addressLine2,
          city: city,
          state: state,
          country: 'US',
          zip_code: zipCode,
        },
        bank_address: {
          line1: bankAddressLine1,
          line2: bankAddressLine2,
          city: bankCity,
          state: bankState,
          country: 'US',
          zip_code: bankZipCode,
        },
        user_id: userId,
      };


      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/payout-orchestration/beneficiaries/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(beneficiaryPayload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create beneficiary');
      }

      const benId = data.juicyway_id || data.data?.id || data.id;
      setBeneficiaryId(benId);

      addTestResult({
        step: 'create_beneficiary',
        success: true,
        message: `✅ USD Beneficiary created! ID: ${benId}`,
        data: data,
        timestamp: Date.now(),
      });

      toast.success('USD Beneficiary created successfully!');
      return benId;

    } catch (error: any) {
      addTestResult({
        step: 'create_beneficiary',
        success: false,
        message: `❌ Failed: ${error.message}`,
        data: { error: error.message },
        timestamp: Date.now(),
      });
      toast.error(`Beneficiary creation failed: ${error.message}`);
      throw error;
    } finally {
      setTesting(false);
    }
  };

  const testPayout = async (benId?: string) => {
    const beneficiaryToUse = benId || beneficiaryId;

    if (!beneficiaryToUse) {
      toast.error('Please create a beneficiary first');
      return;
    }

    setTesting(true);
    addTestResult({
      step: 'payout',
      success: false,
      message: '⏳ Initiating USD payout...',
      timestamp: Date.now(),
    });

    try {
      // Exact payout payload format from user specification
      const payoutPayload = {
        amount: parseFloat(amount),
        source_currency: 'USD',
        destination_currency: 'USD',
        beneficiary_id: beneficiaryToUse,
        description: 'USD Withdrawal Test',
        reference: `usd_test_${Date.now()}`,
      };


      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/payout-orchestration/test-payout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payoutPayload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Payout failed');
      }

      addTestResult({
        step: 'payout',
        success: true,
        message: `✅ USD Payout successful! ${amount} USD sent`,
        data: data,
        timestamp: Date.now(),
      });

      toast.success(`USD Payout successful!`);

    } catch (error: any) {
      addTestResult({
        step: 'payout',
        success: false,
        message: `❌ Payout failed: ${error.message}`,
        data: { error: error.message },
        timestamp: Date.now(),
      });
      toast.error(`Payout failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const testFullFlow = async () => {
    setTestResults([]);
    try {
      const benId = await testCreateBeneficiary();
      if (benId) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await testPayout(benId);
      }
    } catch (error) {
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-7 h-7 text-green-600" />
          USD Withdrawal Test Panel
        </h2>
        <p className="text-slate-500 mt-1">Test Juicyway USD beneficiary creation and ACH payouts</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form Fields */}
        <div className="space-y-6">
          {/* Account Details */}
          <Card>
            <CardHeader className="font-bold text-lg bg-blue-50 border-b-2 border-blue-200">
              Account Details
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Holder Name *
                </label>
                <Input
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Routing Number * (9 digits)
                </label>
                <Input
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="021000021"
                  maxLength={9}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Number *
                </label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bank Name *
                </label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Chase Bank"
                />
                <p className="text-xs text-slate-500 mt-1">
                  ℹ️ Sort code not required for USD/ACH transfers
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Holder Address */}
          <Card>
            <CardHeader className="font-bold text-lg bg-green-50 border-b-2 border-green-200">
              Account Holder Address
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address Line 1 *
                </label>
                <Input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address Line 2
                </label>
                <Input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apt 4B"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    City *
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New York"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    State *
                  </label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="NY"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ZIP Code *
                </label>
                <Input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="10001"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bank Address */}
          <Card>
            <CardHeader className="font-bold text-lg bg-purple-50 border-b-2 border-purple-200">
              Bank Address
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bank Address Line 1 *
                </label>
                <Input
                  value={bankAddressLine1}
                  onChange={(e) => setBankAddressLine1(e.target.value)}
                  placeholder="270 Park Avenue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bank Address Line 2
                </label>
                <Input
                  value={bankAddressLine2}
                  onChange={(e) => setBankAddressLine2(e.target.value)}
                  placeholder=""
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bank City *
                  </label>
                  <Input
                    value={bankCity}
                    onChange={(e) => setBankCity(e.target.value)}
                    placeholder="New York"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bank State *
                  </label>
                  <Input
                    value={bankState}
                    onChange={(e) => setBankState(e.target.value)}
                    placeholder="NY"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bank ZIP Code *
                </label>
                <Input
                  value={bankZipCode}
                  onChange={(e) => setBankZipCode(e.target.value)}
                  placeholder="10017"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Test Controls & Results */}
        <div className="space-y-6">
          {/* Test Parameters */}
          <Card>
            <CardHeader className="font-bold text-lg bg-orange-50 border-b-2 border-orange-200">
              Test Parameters
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount (USD)
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  User ID
                </label>
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="test-user-usd"
                />
              </div>

              {beneficiaryId && (
                <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="text-xs text-green-700 mb-1">Beneficiary ID:</div>
                  <div className="text-sm font-mono text-green-900 break-all">
                    {beneficiaryId}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Actions */}
          <Card>
            <CardHeader className="font-bold text-lg bg-slate-50 border-b-2 border-slate-200">
              Test Actions
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <Button
                onClick={testCreateBeneficiary}
                disabled={testing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4 mr-2" />
                )}
                Create USD Beneficiary
              </Button>

              <Button
                onClick={() => testPayout()}
                disabled={testing || !beneficiaryId}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Test Payout
              </Button>

              <Button
                onClick={testFullFlow}
                disabled={testing}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Test Full Flow
              </Button>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader className="font-bold text-lg bg-slate-50 border-b-2 border-slate-200">
                Test Results
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        result.success
                          ? 'bg-green-50 border-green-200'
                          : result.message.includes('⏳')
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : result.message.includes('⏳') ? (
                          <Loader2 className="w-5 h-5 text-blue-600 mt-0.5 animate-spin" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{result.message}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </div>
                          {result.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                                View details
                              </summary>
                              <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTestResults([])}
                  className="w-full mt-4"
                >
                  Clear Results
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payload Preview */}
      <Card>
        <CardHeader className="font-bold text-lg bg-slate-100 border-b-2 border-slate-300">
          📋 Exact Payload Preview
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">USD Beneficiary Payload:</h4>
              <pre className="bg-slate-50 p-4 rounded-lg text-xs overflow-x-auto border-2 border-slate-200">
{JSON.stringify({
  type: 'bank_account',
  currency: 'USD',
  account_name: accountHolderName,
  account_number: accountNumber,
  routing_number: routingNumber,
  rail: 'ach',
  bank_name: bankName,
  address: {
    line1: addressLine1,
    line2: addressLine2,
    city: city,
    state: state,
    country: 'US',
    zip_code: zipCode,
  },
  bank_address: {
    line1: bankAddressLine1,
    line2: bankAddressLine2,
    city: bankCity,
    state: bankState,
    country: 'US',
    zip_code: bankZipCode,
  },
  user_id: userId,
}, null, 2)}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">USD Payout Payload:</h4>
              <pre className="bg-slate-50 p-4 rounded-lg text-xs overflow-x-auto border-2 border-slate-200">
{JSON.stringify({
  amount: parseFloat(amount),
  source_currency: 'USD',
  destination_currency: 'USD',
  beneficiary_id: beneficiaryId || '{{beneficiary_id}}',
  description: 'USD Withdrawal Test',
  reference: `usd_test_${Date.now()}`,
}, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
