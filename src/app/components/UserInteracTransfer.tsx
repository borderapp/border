/**
 * User-Facing Interac e-Transfer Component
 * Handles Canadian Interac OUTGOING payments (send money)
 * For INCOMING payments (receive money), see InteracIncomingTransfer.tsx
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  User,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface UserInteracTransferProps {
  onBack?: () => void;
}

export default function UserInteracTransfer({ onBack }: UserInteracTransferProps) {
  // User data
  const [userId, setUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userBalance, setUserBalance] = useState<number>(0);
  const [userPhone, setUserPhone] = useState<string>('');

  // Outgoing transfer fields
  const [recipientFirstName, setRecipientFirstName] = useState('');
  const [recipientLastName, setRecipientLastName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [amount, setAmount] = useState('');
  const [beneficiaryType, setBeneficiaryType] = useState<'personal' | 'business'>('personal');

  // Transaction states
  const [transactionState, setTransactionState] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setUserId(session.user.id);
      setUserEmail(session.user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('wallets, first_name, last_name, phone')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        const balance = profile.wallets?.CAD || 0;
        setUserBalance(balance);
        setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim());
        setUserPhone(profile.phone || '');
      }
    } catch (error) {
    }
  };

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

  // Process outgoing transfer
  const processOutgoingTransfer = async () => {
    // Validation
    if (!recipientEmail || !recipientFirstName || !recipientLastName || !amount) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!securityQuestion || securityQuestion.length < 10 || securityQuestion.length > 100) {
      toast.error('Security question must be 10-100 characters');
      return;
    }

    if (!securityAnswer || securityAnswer.length < 3 || securityAnswer.length > 50) {
      toast.error('Security answer must be 3-50 characters');
      return;
    }

    const amountCents = parseFloat(amount) * 100;
    if (amountCents < 10000 || amountCents > 1000000) {
      toast.error('Amount must be between $100 and $10,000 CAD');
      return;
    }

    if (amountCents > userBalance * 100) {
      toast.error('Insufficient balance');
      return;
    }

    setTransactionState('pending');
    setErrorMessage('');

    try {
      const headers = await getAuthHeaders();

      const [firstName, ...lastNameParts] = userName.trim().split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      const payload = {
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: userEmail,
          phone_number: userPhone || '+14165555555',
          billing_address: {
            line1: '123 Main St',
            city: 'Toronto',
            state: 'ON',
            country: 'CA',
            zip_code: 'M5V 2T6',
          },
        },
        description: 'Interac e-Transfer',
        currency: 'CAD',
        amount: Math.round(amountCents),
        direction: 'outgoing',
        payment_method: {
          type: 'interac',
          beneficiary_type: beneficiaryType,
          first_name: recipientFirstName,
          last_name: recipientLastName,
          email: recipientEmail,
          phone_number: recipientPhone || '',
          question: securityQuestion,
          answer: securityAnswer,
        },
        reference: `interac_${Date.now()}`,
        order: {
          identifier: `ORD_${Date.now()}`,
          items: [
            {
              name: 'Interac Transfer',
              type: 'digital',
            },
          ],
        },
      };


      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/payout-orchestration/payment-sessions`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create transfer');
      }

      setTransactionId(data.payment_id);
      setTransactionState('success');

      toast.success('Interac transfer sent!', {
        description: `${recipientFirstName} will receive your transfer via email`,
      });

      // Reload balance
      await loadUserData();

    } catch (error: any) {
      setTransactionState('failed');
      setErrorMessage(error.message);
      toast.error('Transfer failed', {
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setRecipientFirstName('');
    setRecipientLastName('');
    setRecipientEmail('');
    setRecipientPhone('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setAmount('');
    setTransactionState('idle');
    setTransactionId('');
    setErrorMessage('');
  };

  // Success state
  if (transactionState === 'success') {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card className="p-8 text-center bg-green-50 border-green-200">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">Transfer Sent!</h2>
          <p className="text-green-700 mb-4">
            ${amount} CAD sent to
          </p>
          <p className="text-lg font-semibold text-green-900 mb-2">
            {recipientFirstName} {recipientLastName}
          </p>
          <p className="text-sm text-green-600 mb-6">
            {recipientEmail}
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
          <p className="text-red-700 mb-4">
            {errorMessage || "We couldn't complete your transfer. Please try again."}
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
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Processing...</h2>
          <p className="text-blue-700">Sending transfer...</p>
        </Card>
      </div>
    );
  }

  // Main form - Outgoing only
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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-3xl">🇨🇦</span>
          Interac e-Transfer
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-sm text-gray-600">
            Available Balance: <span className="font-semibold text-gray-900">${userBalance.toFixed(2)} CAD</span>
          </p>
        </div>
      </div>

      {/* Outgoing Form */}
      <Card className="p-6 space-y-4">
        <div className="text-center mb-4">
          <Send className="w-12 h-12 text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Send money to anyone in Canada via Interac e-Transfer
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Beneficiary Type
          </label>
          <select
            value={beneficiaryType}
            onChange={(e) => setBeneficiaryType(e.target.value as 'personal' | 'business')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <Input
              type="text"
              placeholder="Jane"
              value={recipientFirstName}
              onChange={(e) => setRecipientFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <Input
              type="text"
              placeholder="Smith"
              value={recipientLastName}
              onChange={(e) => setRecipientLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <Input
            type="email"
            placeholder="jane.smith@example.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number (Optional)
          </label>
          <Input
            type="tel"
            placeholder="+14165556666"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (CAD) *
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="100.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Min: $100 CAD • Max: $10,000 CAD
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Security Question * (10-100 chars)
          </label>
          <Input
            type="text"
            placeholder="What is our project code?"
            value={securityQuestion}
            onChange={(e) => setSecurityQuestion(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Security Answer * (3-50 chars)
          </label>
          <Input
            type="text"
            placeholder="ALPHA123"
            value={securityAnswer}
            onChange={(e) => setSecurityAnswer(e.target.value)}
          />
        </div>

        <Button
          onClick={processOutgoingTransfer}
          className="w-full"
          disabled={
            !recipientFirstName ||
            !recipientLastName ||
            !recipientEmail ||
            !amount ||
            !securityQuestion ||
            !securityAnswer
          }
        >
          <Send className="w-4 h-4 mr-2" />
          Send Interac Transfer
        </Button>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> To receive money via Interac e-Transfer, go to <strong>Add Money</strong> and select the Interac option for CAD.
          </p>
        </div>
      </Card>

      {/* Info */}
      <p className="text-xs text-gray-500 text-center mt-4">
        🔒 Secured by Interac e-Transfer
      </p>
    </div>
  );
}
