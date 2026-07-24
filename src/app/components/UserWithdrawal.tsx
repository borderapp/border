/**
 * User-Facing Withdrawal Component
 * Uses Juicyway bank verification for secure NGN/USD withdrawals
 */

import React, { useState, useEffect } from 'react';

// ── USD Transfer Fee Schedule ────────────────────────────────────────────────
// Minimum: $50 | Maximum: $100,000 per transaction
const USD_FEE_TIERS: { max: number; fee: number }[] = [
  { max:  10000, fee:  20 },
  { max:  15000, fee:  30 },
  { max:  20000, fee:  40 },
  { max:  25000, fee:  50 },
  { max:  30000, fee:  60 },
  { max:  35000, fee:  65 },
  { max:  40000, fee:  73 },
  { max:  45000, fee:  81 },
  { max:  50000, fee:  90 },
  { max:  55000, fee:  99 },
  { max:  60000, fee: 108 },
  { max:  65000, fee: 115 },
  { max:  70000, fee: 125 },
  { max:  75000, fee: 133 },
  { max:  80000, fee: 142 },
  { max:  85000, fee: 150 },
  { max:  90000, fee: 158 },
  { max:  95000, fee: 167 },
  { max: 100000, fee: 180 },
];
const USD_MIN_TRANSFER = 50;
const USD_MAX_TRANSFER = 100000;

function getUsdTransferFee(amountUsd: number): number {
  for (const tier of USD_FEE_TIERS) {
    if (amountUsd <= tier.max) return tier.fee;
  }
  return 180; // cap at max tier fee
}
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  BadgeCheck,
  DollarSign,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { createTransactionNotification } from '@/utils/notification-helper';
import { supabase } from '@/lib/supabase';
import TransactionPinModal from './TransactionPinModal';

interface Bank {
  name: string;
  code: string;
}

interface VerifiedAccount {
  account_name: string;
  account_number: string;
  bank_code: string;
}

interface UserWithdrawalProps {
  onBack?: () => void;
  currency?: string;
}

export default function UserWithdrawal({
  onBack,
  currency = 'NGN',
}: UserWithdrawalProps) {
  // States
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');

  // Bank search & suggestion state (additive — does not touch existing logic)
  const [bankSearch, setBankSearch] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [accountSuggestions, setAccountSuggestions] = useState<Bank[]>([]);

  // Popular Nigerian banks shown at the top
  const POPULAR_BANK_CODES = [
    '044', // Access Bank
    '058', // GTBank
    '011', // First Bank
    '057', // Zenith Bank
    '033', // UBA
    '032', // Union Bank
    '070', // Fidelity Bank
    '214', // FCMB
    '082', // Keystone Bank
    '076', // Polaris Bank
    '221', // Stanbic IBTC
    '068', // Standard Chartered
    '035', // Wema Bank
    '063', // Access Bank (Diamond)
    '050', // EcoBank
  ];

  // Nigerian account number prefixes → likely bank (first 3 digits hint)
  const ACCOUNT_PREFIX_MAP: Record<string, string[]> = {
    '044': ['0690', '0691', '0692', '0693'],
    '058': ['0029', '0030', '0031', '0032'],
    '011': ['3'],
    '057': ['2'],
    '033': ['1'],
  };

  const sortedBanks = (list: Bank[]) => {
    const popular = list.filter(b => POPULAR_BANK_CODES.includes(b.code));
    const rest    = list.filter(b => !POPULAR_BANK_CODES.includes(b.code));
    return [...popular, ...rest];
  };

  const filteredBanks = sortedBanks(banks).filter(b =>
    !bankSearch || b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  // Suggest banks when account number prefix is typed
  const handleAccountNumberChange = (value: string) => {
    setAccountNumber(value);
    setVerifiedAccount(null);
    setVerificationError('');
    setShowConfirmation(false);

    if (value.length >= 3 && !selectedBank) {
      const prefix = value.substring(0, 4);
      const suggestions = sortedBanks(banks).filter(b => {
        const prefixes = ACCOUNT_PREFIX_MAP[b.code];
        return prefixes?.some(p => prefix.startsWith(p));
      });
      setAccountSuggestions(suggestions.slice(0, 4));
    } else {
      setAccountSuggestions([]);
    }
  };
  const [amount, setAmount]   = useState('');
  const [purpose, setPurpose] = useState('');

  // USD-specific fields
  const [routingNumber, setRoutingNumber] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [bankName, setBankName] = useState('');

  // Verification states
  const [verifying, setVerifying] = useState(false);
  const [verifiedAccount, setVerifiedAccount] = useState<VerifiedAccount | null>(null);
  const [verificationError, setVerificationError] = useState('');

  // Transaction states
  const [transactionState, setTransactionState] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = useState('');

  // User data
  const [userId, setUserId] = useState<string>('');
  const [userBalance, setUserBalance] = useState<number>(0);

  // Confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPin, setShowPin] = useState(false);

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

  // Load user data and banks on mount
  useEffect(() => {
    loadUserData();
    loadBanks();
  }, [currency]);

  // Auto-verify when account number reaches 10 digits
  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank && !verifiedAccount) {
      verifyAccount();
    }
  }, [accountNumber, selectedBank]);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setUserId(session.user.id);

      // Load user balance for selected currency
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallets')
        .eq('id', session.user.id)
        .single();

      if (profile?.wallets) {
        const balance = profile.wallets[currency] || 0;
        setUserBalance(balance);
      }
    } catch (error) {
    }
  };

  const loadBanks = async () => {
    // Skip bank loading for USD (uses routing numbers instead)
    if (currency === 'USD') {
      setLoadingBanks(false);
      return;
    }

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
    } finally {
      setLoadingBanks(false);
    }
  };

  const verifyAccount = async () => {
    // USD doesn't support real-time verification
    if (currency === 'USD') {
      return;
    }

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

  const processWithdrawal = async () => {
    // Validation
    if (currency === 'USD') {
      if (!routingNumber || !accountNumber || !accountHolderName || !amount) {
        toast.error('Please fill all required fields');
        return;
      }
    } else {
      if (!verifiedAccount || !amount) {
        return;
      }
    }

    setTransactionState('pending');

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
      const headers = await getAuthHeaders();

      let beneficiaryId: string;

      if (currency === 'USD') {
        // Create USD beneficiary (no verification)
        const usdBeneficiaryPayload = {
          type: 'bank_account',
          currency: 'USD',
          account_name: accountHolderName,
          account_number: accountNumber,
          routing_number: routingNumber,
          rail: 'ach',
          bank_name: bankName || 'US Bank',
          address: {
            line1: addressLine1 || '123 Main St',
            line2: addressLine2 || '',
            city: city || 'New York',
            state: state || 'NY',
            country: 'US',
            zip_code: zipCode || '10001',
          },
          bank_address: {
            line1: '100 Bank Street',
            line2: '',
            city: 'New York',
            state: 'NY',
            country: 'US',
            zip_code: '10001',
          },
          user_id: userId,
        };

        const beneficiaryResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/payout-orchestration/beneficiaries/create`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(usdBeneficiaryPayload),
          }
        );

        if (!beneficiaryResponse.ok) {
          const errorData = await beneficiaryResponse.json();
          throw new Error(errorData.message || errorData.error || 'Failed to create beneficiary');
        }

        const beneficiaryData = await beneficiaryResponse.json();
        beneficiaryId = beneficiaryData.juicyway_id || beneficiaryData.data?.id;

        if (!beneficiaryId) {
          throw new Error('No beneficiary ID returned');
        }
      } else {
        // NGN: Create verified beneficiary
        const beneficiaryResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/payout-orchestration/beneficiaries/create-verified`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              account_number: verifiedAccount!.account_number,
              bank_code: verifiedAccount!.bank_code,
              bank_name: selectedBank?.name || '',
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
        beneficiaryId = beneficiaryData.data.beneficiary_id;
      }

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

      const txRef = payoutData.order_id || payoutData.transaction_id || `WD-${Date.now()}`;
      setTransactionState('success');
      setTransactionId(txRef);

      const recipientName = currency === 'USD' ? accountHolderName : verifiedAccount!.account_name;
      toast.success('Withdrawal successful!', {
        description: `${amount} ${currency} sent to ${recipientName}`,
      });

      // Create transaction record so it appears in history & receipt
      try {
        await supabase.from('transactions').insert({
          user_id: userId,
          type: 'TRANSFER',
          amount: parseFloat(amount),
          currency,
          status: 'completed',
          description: purpose ? `Transfer to ${recipientName} — ${purpose}` : `Transfer to ${recipientName}`,
          narration: purpose || `Bank transfer to ${recipientName}${selectedBank ? ` — ${selectedBank.name}` : ''}`,
          reference: txRef,
          transaction_reference: txRef,
          recipient_name: recipientName,
          provider: 'juicyway_bank',
          metadata: {
            // All transfer details stored here so ReceiptViewer can reconstruct the receipt
            recipient_name:   recipientName,
            bank:             selectedBank?.name || bankName || '',
            bank_name:        selectedBank?.name || bankName || '',
            account_number:   verifiedAccount?.account_number || accountNumber,
            routing_number:   routingNumber || '',
            currency,
            transfer_type:    currency === 'USD' ? 'ach' : currency === 'CAD' ? 'interac' : 'nuban',
            purpose:          purpose || '',
            payout_response:  payoutData,
          },
        });

        // Rich notification — carries all receipt fields so ReceiptViewer can
        // reconstruct the full receipt even without a DB transaction lookup
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'transaction',
          read: false,
          title: `✅ Transfer to ${recipientName}`,
          message: `${currency} ${parseFloat(amount).toLocaleString()} sent to ${recipientName}${selectedBank ? ` — ${selectedBank.name}` : ''}`,
          metadata: {
            transaction_type: 'sent',
            amount: parseFloat(amount),
            currency,
            reference: txRef,
            transaction_reference: txRef,
            recipient_name: recipientName,
            bank_name:      selectedBank?.name || bankName || '',
            account_number: verifiedAccount?.account_number || accountNumber || '',
            routing_number: routingNumber || '',
            transfer_type:  currency === 'USD' ? 'ach' : currency === 'CAD' ? 'interac' : 'nuban',
            purpose:        purpose || '',
            timestamp: new Date().toISOString(),
          },
        });
      } catch (recordErr) {
      }

      // Deduct balance immediately from the user's wallet
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallets')
          .eq('id', userId)
          .single();

        if (profile?.wallets) {
          const wallets = { ...profile.wallets };
          const current = wallets[currency] || 0;
          const transferAmt = parseFloat(amount);
          // For USD: deduct transfer amount + fee
          const fee = currency === 'USD' ? getUsdTransferFee(transferAmt) : 0;
          const totalDeduct = transferAmt + fee;
          wallets[currency] = Math.max(0, current - totalDeduct);
          await supabase
            .from('profiles')
            .update({ wallets })
            .eq('id', userId);
        }
      } catch (deductErr) {
      }

      // Reload balance
      await loadUserData();

      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (error: any) {
      setTransactionState('failed');
      toast.error('Withdrawal failed', {
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setSelectedBank(null);
    setAccountNumber('');
    setAmount('');
    setPurpose('');
    setVerifiedAccount(null);
    setVerificationError('');
    setShowConfirmation(false);
    setTransactionState('idle');
    setTransactionId('');

    // Clear USD-specific fields
    setRoutingNumber('');
    setSortCode('');
    setAccountHolderName('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setZipCode('');
    setBankName('');
  };

  const handleEdit = () => {
    setVerifiedAccount(null);
    setShowConfirmation(false);
    setVerificationError('');
  };

  // Loading state
  if (loadingBanks) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-600">Loading banks...</p>
        </div>
      </div>
    );
  }

  // Success state — full receipt
  if (transactionState === 'success') {
    const recipientName = currency === 'USD' ? accountHolderName : verifiedAccount?.account_name;
    const bankLabel = currency === 'USD'
      ? `${bankName || 'US Bank'} • Routing: ${routingNumber}`
      : `${selectedBank?.name || ''}`;
    const now = new Date();

    return (
      <div className="max-w-md mx-auto p-4">
        <Card className="overflow-hidden border-green-200">
          {/* Header */}
          <div className="bg-green-600 p-6 text-center text-white">
            <CheckCircle className="w-14 h-14 mx-auto mb-3 opacity-90" />
            <p className="text-sm font-medium opacity-80">Transfer Successful</p>
            <p className="text-4xl font-bold mt-1">
              {currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency + ' '}
              {parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {currency === 'USD' && (
              <p className="text-sm opacity-75 mt-1">
                + ${getUsdTransferFee(parseFloat(amount))} transfer fee
              </p>
            )}
            <p className="text-sm opacity-70 mt-1">{currency}</p>
          </div>

          {/* Receipt rows */}
          <div className="divide-y divide-gray-100">
            {[
              { label: 'Recipient', value: recipientName || '—' },
              { label: 'Bank', value: bankLabel || '—' },
              { label: 'Account', value: accountNumber },
              { label: 'Status', value: '✅ Completed' },
              { label: 'Date', value: now.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
              { label: 'Reference', value: transactionId || '—' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-gray-500">{row.label}</span>
                <span className="text-sm font-medium text-gray-900 text-right max-w-[60%] break-all">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="p-5 space-y-2">
            <p className="text-xs text-center text-gray-400 mb-3">
              This transaction has been recorded in your history
            </p>
            <Button onClick={resetForm} className="w-full bg-green-600 hover:bg-green-700">
              Make Another Transfer
            </Button>
          </div>
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
          <h2 className="text-2xl font-bold text-red-900 mb-2">Withdrawal Failed</h2>
          <p className="text-red-700 mb-6">
            We couldn't complete your withdrawal. Please try again.
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
    const recipientName = currency === 'USD' ? accountHolderName : verifiedAccount?.account_name;

    return (
      <div className="max-w-md mx-auto p-6">
        <Card className="p-8 text-center bg-blue-50 border-blue-200">
          <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Processing Withdrawal...</h2>
          <p className="text-blue-700">
            Sending {amount} {currency} to {recipientName}
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
        <h1 className="text-2xl font-bold text-gray-900">Withdraw to Bank</h1>
        <div className="flex items-center gap-2 mt-2">
          <DollarSign className="w-5 h-5 text-gray-600" />
          <p className="text-sm text-gray-600">
            Available Balance: <span className="font-semibold text-gray-900">{userBalance.toLocaleString()} {currency}</span>
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-6 space-y-6">
        {currency === 'USD' ? (
          /* USD Form Fields */
          <>
            {/* Account Holder Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Holder Name *
              </label>
              <Input
                type="text"
                placeholder="John Doe"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Routing Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Routing Number * (9 digits)
              </label>
              <Input
                type="text"
                placeholder="123456789"
                maxLength={9}
                value={routingNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setRoutingNumber(value);
                }}
                className="text-lg"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number *
              </label>
              <Input
                type="text"
                placeholder="000123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Bank Name (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name (Optional)
              </label>
              <Input
                type="text"
                placeholder="Bank of America"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USD)
              </label>
              <Input
                type="number"
                placeholder={`Min $${USD_MIN_TRANSFER.toLocaleString()} — Max $${USD_MAX_TRANSFER.toLocaleString()}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg"
              />
              {/* USD-specific validations */}
              {currency === 'USD' && amount && parseFloat(amount) > 0 && parseFloat(amount) < USD_MIN_TRANSFER && (
                <p className="text-sm text-amber-600 mt-1 font-medium">
                  Minimum USD transfer is ${USD_MIN_TRANSFER.toLocaleString()}
                </p>
              )}
              {currency === 'USD' && amount && parseFloat(amount) > USD_MAX_TRANSFER && (
                <p className="text-sm text-red-600 mt-1 font-medium">
                  Maximum USD transfer is ${USD_MAX_TRANSFER.toLocaleString()} per transaction
                </p>
              )}
              {parseFloat(amount) > userBalance && (
                <p className="text-sm text-red-600 mt-1">
                  Insufficient balance
                </p>
              )}
            </div>

            {/* Fee breakdown for USD */}
            {currency === 'USD' && amount && parseFloat(amount) >= USD_MIN_TRANSFER && parseFloat(amount) <= USD_MAX_TRANSFER && (() => {
              const amt = parseFloat(amount);
              const fee = getUsdTransferFee(amt);
              const total = amt + fee;
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-blue-900">Transfer Summary</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Transfer Amount</span>
                    <span className="font-medium text-blue-900">${amt.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Transfer Fee</span>
                    <span className="font-medium text-orange-600">${fee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-blue-900">Total Deducted</span>
                    <span className="text-blue-900">${total.toLocaleString()}</span>
                  </div>
                  {total > userBalance && (
                    <p className="text-xs text-red-600 font-medium">
                      Insufficient balance (need ${total.toLocaleString()}, have ${userBalance.toLocaleString()})
                    </p>
                  )}
                </div>
              );
            })()}

            {/* USD Confirmation */}
            {amount && parseFloat(amount) >= USD_MIN_TRANSFER && parseFloat(amount) <= USD_MAX_TRANSFER && (parseFloat(amount) + getUsdTransferFee(parseFloat(amount))) <= userBalance && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 mb-2">Withdraw to this account?</p>
                <p className="text-sm font-semibold text-blue-900 mb-1">{accountHolderName}</p>
                <p className="text-xs text-blue-700 mb-3">
                  Account: {accountNumber} • Routing: {routingNumber}
                </p>
                <Button
                  onClick={() => setShowPin(true)}
                  className="w-full"
                >
                  Confirm Withdrawal
                </Button>
              </div>
            )}

            {/* USD Send Button */}
            {(!amount || parseFloat(amount) <= 0) && (
              <Button
                className="w-full"
                disabled={
                  !routingNumber ||
                  routingNumber.length !== 9 ||
                  !accountNumber ||
                  !accountHolderName ||
                  !amount ||
                  parseFloat(amount) < USD_MIN_TRANSFER ||
                  parseFloat(amount) > USD_MAX_TRANSFER ||
                  (parseFloat(amount) + getUsdTransferFee(parseFloat(amount))) > userBalance
                }
                onClick={() => {}}
              >
                {!routingNumber ? 'Enter routing number' :
                 routingNumber.length !== 9 ? 'Routing number must be 9 digits' :
                 !accountNumber ? 'Enter account number' :
                 !accountHolderName ? 'Enter account holder name' :
                 !amount ? 'Enter amount' :
                 parseFloat(amount) < USD_MIN_TRANSFER ? `Min $${USD_MIN_TRANSFER}` :
                 parseFloat(amount) > USD_MAX_TRANSFER ? `Max $${USD_MAX_TRANSFER.toLocaleString()}` :
                 'Continue'}
              </Button>
            )}
          </>
        ) : (
          /* NGN Form Fields */
          <>
            {/* Bank Selection — searchable with popular banks first */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Bank
              </label>

              {/* Selected bank display / trigger */}
              <button
                type="button"
                disabled={verifiedAccount !== null}
                onClick={() => !verifiedAccount && setShowBankDropdown(v => !v)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left flex items-center justify-between bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                <span className={selectedBank ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedBank ? selectedBank.name : '— Choose a bank —'}
                </span>
                <span className="text-gray-400 text-xs">▼</span>
              </button>

              {showBankDropdown && !verifiedAccount && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  {/* Search input */}
                  <div className="p-2 border-b">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search bank name…"
                      value={bankSearch}
                      onChange={e => setBankSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Bank list */}
                  <div className="max-h-56 overflow-y-auto">
                    {!bankSearch && (
                      <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Popular Banks
                      </p>
                    )}
                    {filteredBanks.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">No banks found</p>
                    ) : (
                      filteredBanks.map((bank, idx) => {
                        const isPopular = POPULAR_BANK_CODES.includes(bank.code);
                        const prevIsPopular = idx > 0 && POPULAR_BANK_CODES.includes(filteredBanks[idx - 1].code);
                        const showDivider = !bankSearch && idx > 0 && !isPopular && prevIsPopular;
                        return (
                          <div key={bank.code}>
                            {showDivider && (
                              <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t mt-1">
                                All Banks
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBank(bank);
                                setBankSearch('');
                                setShowBankDropdown(false);
                                setVerifiedAccount(null);
                                setVerificationError('');
                                setShowConfirmation(false);
                                setAccountSuggestions([]);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between
                                ${selectedBank?.code === bank.code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'}`}
                            >
                              <span>{bank.name}</span>
                              {isPopular && !bankSearch && (
                                <span className="text-[10px] text-blue-500 font-medium">Popular</span>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Backdrop to close dropdown */}
              {showBankDropdown && (
                <div className="fixed inset-0 z-40" onClick={() => setShowBankDropdown(false)} />
              )}
            </div>

            {/* Account Number — shows bank suggestions based on prefix */}
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
                  handleAccountNumberChange(e.target.value.replace(/\D/g, ''));
                }}
                disabled={verifiedAccount !== null}
                className="text-lg"
              />

              {/* Bank suggestions from account prefix */}
              {accountSuggestions.length > 0 && !selectedBank && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-1.5">Suggested banks:</p>
                  <div className="flex flex-wrap gap-2">
                    {accountSuggestions.map(b => (
                      <button
                        key={b.code}
                        type="button"
                        onClick={() => {
                          setSelectedBank(b);
                          setAccountSuggestions([]);
                        }}
                        className="px-3 py-1 bg-white border border-blue-200 rounded-full text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                {amount && parseFloat(amount) > 0 && parseFloat(amount) < 100 && currency === 'NGN' && (
                  <p className="text-sm text-amber-600 mt-1 font-medium">
                    Minimum transfer amount is ₦100
                  </p>
                )}
                {parseFloat(amount) > userBalance && (
                  <p className="text-sm text-red-600 mt-1">
                    Insufficient balance
                  </p>
                )}
              </div>
            )}

            {/* Purpose / Description — optional */}
            {verifiedAccount && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Input
                  placeholder="e.g. Rent, Business payment, School fees…"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  maxLength={100}
                />
              </div>
            )}

            {/* Confirmation — blocked if below minimum */}
            {showConfirmation && verifiedAccount && amount && parseFloat(amount) <= userBalance && !(currency === 'NGN' && parseFloat(amount) < 100) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 mb-2">Withdraw to this account?</p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowPin(true)}
                    className="flex-1"
                  >
                    Confirm Withdrawal
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
                  parseFloat(amount) > userBalance ||
                  (currency === 'NGN' && parseFloat(amount) < 100)
                }
                onClick={() => setShowConfirmation(true)}
              >
                {!selectedBank ? 'Select a bank' :
                 accountNumber.length !== 10 ? 'Enter account number' :
                 !verifiedAccount ? 'Verifying...' :
                 !amount ? 'Enter amount' :
                 (currency === 'NGN' && parseFloat(amount) < 100) ? 'Minimum is ₦100' :
                 'Continue'}
              </Button>
            )}
          </>
        )}
      </Card>

      {/* Security Notice */}
      <p className="text-xs text-gray-500 text-center mt-4">
        🔒 All transactions are encrypted and secure
      </p>

      {/* PIN modal */}
      <TransactionPinModal
        isOpen={showPin}
        onCancel={() => setShowPin(false)}
        onSuccess={() => { setShowPin(false); processWithdrawal(); }}
        amount={parseFloat(amount) || 0}
        currency={currency}
        description={
          currency === 'USD'
            ? `Transfer to ${accountHolderName} — ${accountNumber}`
            : `Transfer to ${verifiedAccount?.account_name || ''} — ${selectedBank?.name || ''}`
        }
      />
    </div>
  );
}
