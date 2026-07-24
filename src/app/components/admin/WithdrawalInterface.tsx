/**
 * Fintech-Style Withdrawal Interface
 *
 * Features:
 * - Bank selection from Juicyway API
 * - Auto account verification on 10 digits
 * - Shows verified account name
 * - Confirmation flow
 * - Transaction states (pending/success/failed)
 *
 * Flow:
 * 1. User selects bank
 * 2. User enters account number
 * 3. Auto-verify when 10 digits entered
 * 4. Show verified name
 * 5. User confirms
 * 6. Process payout
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Bank {
  name: string;
  code: string;
}

interface VerifiedAccount {
  account_name: string;
  account_number: string;
  bank_code: string;
}

interface WithdrawalInterfaceProps {
  onBack?: () => void;
  userId?: string;
  userBalance?: number;
  currency?: string;
}

export default function WithdrawalInterface({
  onBack,
  userId = 'test_user_001',
  userBalance = 50000,
  currency = 'NGN',
}: WithdrawalInterfaceProps) {
  // States
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');

  // Verification states
  const [verifying, setVerifying] = useState(false);
  const [verifiedAccount, setVerifiedAccount] = useState<VerifiedAccount | null>(null);
  const [verificationError, setVerificationError] = useState('');

  // Transaction states
  const [transactionState, setTransactionState] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = useState('');

  // Confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get auth headers
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

  // Load banks on mount
  useEffect(() => {
    loadBanks();
  }, []);

  // Auto-verify when account number reaches 10 digits
  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank && !verifiedAccount) {
      verifyAccount();
    }
  }, [accountNumber, selectedBank]);

  const loadBanks = async () => {
    setLoadingBanks(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/banks/list`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to load banks');
      }

      const data = await response.json();
      setBanks(data.data || []);
    } catch (error: any) {
      toast.error('Failed to load banks', {
        description: error.message,
      });
      // Set mock banks for testing
      setBanks([
        { name: 'Access Bank', code: '000014' },
        { name: 'GTBank', code: '000013' },
        { name: 'Zenith Bank', code: '000015' },
        { name: 'First Bank', code: '000016' },
        { name: 'UBA', code: '000018' },
      ]);
    } finally {
      setLoadingBanks(false);
    }
  };

  const verifyAccount = async () => {
    if (!selectedBank || accountNumber.length !== 10) {
      return;
    }

    setVerifying(true);
    setVerificationError('');
    setVerifiedAccount(null);

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
      const headers = await getAuthHeaders();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/banks/resolve-account`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          account_number: accountNumber,
          bank_code: selectedBank.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify account');
      }

      setVerifiedAccount(data.data);
      setShowConfirmation(true);
      toast.success('Account verified!', {
        description: data.data.account_name,
      });
    } catch (error: any) {
      setVerificationError(error.message || 'Account verification failed');
      toast.error('Verification failed', {
        description: error.message,
      });
    } finally {
      setVerifying(false);
    }
  };

  const processPayout = async () => {
    if (!verifiedAccount || !amount) {
      return;
    }

    setTransactionState('pending');

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
      const headers = await getAuthHeaders();

      // Create verified beneficiary first
      const beneficiaryResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/payout-orchestration/beneficiaries/create-verified`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            account_number: verifiedAccount.account_number,
            bank_code: verifiedAccount.bank_code,
            bank_name: selectedBank?.name || '',  // ✅ ADDED: bank_name from selected bank
            currency: currency,
            user_id: userId,
          }),
        }
      );

      if (!beneficiaryResponse.ok) {
        const errorData = await beneficiaryResponse.json();
        throw new Error(errorData.message || 'Failed to create beneficiary');
      }

      const beneficiaryData = await beneficiaryResponse.json();
      const beneficiaryId = beneficiaryData.data.beneficiary_id;

      // Execute payout
      const payoutResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/payout-orchestration/test-payout`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            amount: parseFloat(amount),
            source_currency: currency,
            destination_currency: currency,
            beneficiary_id: beneficiaryId,
            description: 'Withdrawal',
            reference: `withdrawal_${Date.now()}`,
          }),
        }
      );

      if (!payoutResponse.ok) {
        const errorData = await payoutResponse.json();
        throw new Error(errorData.message || 'Payout failed');
      }

      const payoutData = await payoutResponse.json();

      setTransactionState('success');
      setTransactionId(payoutData.order_id || payoutData.transaction_id);
      toast.success('Transfer successful!', {
        description: `${amount} ${currency} sent to ${verifiedAccount.account_name}`,
      });

      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (error: any) {
      setTransactionState('failed');
      toast.error('Transfer failed', {
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setSelectedBank(null);
    setAccountNumber('');
    setAmount('');
    setVerifiedAccount(null);
    setVerificationError('');
    setShowConfirmation(false);
    setTransactionState('idle');
    setTransactionId('');
  };

  const handleEdit = () => {
    setVerifiedAccount(null);
    setShowConfirmation(false);
    setVerificationError('');
  };

  // Loading state
  if (loadingBanks) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-600">Loading banks...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (transactionState === 'success') {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card className="p-8 text-center bg-green-50 border-green-200">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">Transfer Successful!</h2>
          <p className="text-green-700 mb-4">
            {amount} {currency} sent to
          </p>
          <p className="text-lg font-semibold text-green-900 mb-2">
            {verifiedAccount?.account_name}
          </p>
          <p className="text-sm text-green-600 mb-6">
            {selectedBank?.name} • {accountNumber}
          </p>
          {transactionId && (
            <p className="text-xs text-green-600 mb-6">
              Transaction ID: {transactionId}
            </p>
          )}
          <Button onClick={resetForm} className="w-full">
            Make Another Transfer
          </Button>
        </Card>
      </div>
    );
  }

  // Failed state
  if (transactionState === 'failed') {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card className="p-8 text-center bg-red-50 border-red-200">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2">Transfer Failed</h2>
          <p className="text-red-700 mb-6">
            We couldn't complete your transfer. Please try again.
          </p>
          <Button onClick={resetForm} className="w-full">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // Pending state
  if (transactionState === 'pending') {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card className="p-8 text-center bg-blue-50 border-blue-200">
          <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Processing Transfer...</h2>
          <p className="text-blue-700">
            Sending {amount} {currency} to {verifiedAccount?.account_name}
          </p>
        </Card>
      </div>
    );
  }

  // Main form
  return (
    <div className="max-w-md mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Withdraw Money</h1>
        <p className="text-sm text-gray-600 mt-1">
          Available Balance: <span className="font-semibold text-gray-900">{userBalance.toLocaleString()} {currency}</span>
        </p>
      </div>

      {/* Form */}
      <Card className="p-6 space-y-6">
        {/* Bank Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Bank
          </label>
          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedBank?.code || ''}
            onChange={(e) => {
              const bank = banks.find(b => b.code === e.target.value);
              setSelectedBank(bank || null);
              setVerifiedAccount(null);
              setVerificationError('');
              setShowConfirmation(false);
            }}
            disabled={verifiedAccount !== null}
          >
            <option value="">-- Choose a bank --</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>

        {/* Account Number */}
        {selectedBank && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number
            </label>
            <Input
              type="text"
              placeholder="0000000000"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setAccountNumber(value);
                setVerifiedAccount(null);
                setVerificationError('');
                setShowConfirmation(false);
              }}
              disabled={verifiedAccount !== null}
              className="text-lg"
            />
            {verifying && (
              <div className="flex items-center gap-2 mt-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Verifying account...</span>
              </div>
            )}
            {verificationError && (
              <div className="flex items-center gap-2 mt-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{verificationError}</span>
              </div>
            )}
          </div>
        )}

        {/* Verified Account Display */}
        {verifiedAccount && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <BadgeCheck className="w-6 h-6 text-green-600 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-green-700 mb-1">Account Verified</p>
                <p className="text-lg font-bold text-green-900">{verifiedAccount.account_name}</p>
                <p className="text-sm text-green-700">
                  {selectedBank?.name} • {accountNumber}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="text-green-700 hover:text-green-900"
              >
                Edit
              </Button>
            </div>
          </div>
        )}

        {/* Amount */}
        {verifiedAccount && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount ({currency})
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg"
            />
            {parseFloat(amount) > userBalance && (
              <p className="text-sm text-red-600 mt-1">
                Insufficient balance
              </p>
            )}
          </div>
        )}

        {/* Confirmation */}
        {showConfirmation && verifiedAccount && amount && parseFloat(amount) <= userBalance && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 mb-2">Send money to this account?</p>
            <div className="flex gap-3">
              <Button
                onClick={processPayout}
                className="flex-1"
              >
                Confirm & Send
              </Button>
              <Button
                variant="outline"
                onClick={handleEdit}
              >
                Edit
              </Button>
            </div>
          </div>
        )}

        {/* Send Button (disabled until verified) */}
        {!showConfirmation && (
          <Button
            className="w-full"
            disabled={
              !selectedBank ||
              accountNumber.length !== 10 ||
              !verifiedAccount ||
              !amount ||
              parseFloat(amount) <= 0 ||
              parseFloat(amount) > userBalance
            }
            onClick={() => setShowConfirmation(true)}
          >
            {!selectedBank ? 'Select a bank' :
             accountNumber.length !== 10 ? 'Enter account number' :
             !verifiedAccount ? 'Verifying...' :
             !amount ? 'Enter amount' :
             'Continue'}
          </Button>
        )}
      </Card>

      {/* Security Notice */}
      <p className="text-xs text-gray-500 text-center mt-4">
        🔒 All transactions are encrypted and secure
      </p>
    </div>
  );
}
