/**
 * Customer-Facing Card Funding Component
 * 
 * Simplified UI for end users to fund their wallets using credit/debit cards.
 * Integrates with Juicyway's 4-step payment flow.
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { 
  CreditCard, 
  CheckCircle, 
  Loader2, 
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';

type FundingStep = 'amount' | 'card-details' | 'processing' | 'authorize' | 'success';
type AuthType = 'otp' | 'pin' | '3ds' | 'cvv' | null;

interface CustomerCardFundingProps {
  userId: string;
  userEmail: string;
  userPhone: string;
  firstName: string;
  lastName: string;
  onSuccess?: (amount: number, currency: string) => void;
  onCancel?: () => void;
}

export default function CustomerCardFunding({
  userId,
  userEmail,
  userPhone,
  firstName,
  lastName,
  onSuccess,
  onCancel
}: CustomerCardFundingProps) {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<FundingStep>('amount');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>(null);
  const [authValue, setAuthValue] = useState('');
  const [showCardDetails, setShowCardDetails] = useState(false);

  // Form data
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [cardInfo, setCardInfo] = useState({
    card_number: '',
    cvv: '',
    expiry_month: '',
    expiry_year: ''
  });

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';

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

  const handleAmountSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountNum < 1) {
      toast.error('Minimum amount is 1.00');
      return;
    }

    if (amountNum > 10000) {
      toast.error('Maximum amount is 10,000.00');
      return;
    }

    setCurrentStep('card-details');
  };

  const handleInitializeAndCapture = async () => {
    if (!cardInfo.card_number || !cardInfo.cvv || !cardInfo.expiry_month || !cardInfo.expiry_year) {
      toast.error('Please fill in all card details');
      return;
    }

    setLoading(true);
    setCurrentStep('processing');

    try {
      const headers = await getAuthHeaders();
      const amountInCents = Math.round(parseFloat(amount) * 100);
      
      // Include user ID in reference for webhook processing
      const reference = `ord_${userId}_${Date.now()}`;

      // Step 1: Initialize
      const initResponse = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'initialize',
          payload: {
            customer: {
              first_name: firstName,
              last_name: lastName,
              email: userEmail,
              phone_number: userPhone,
              billing_address: {
                line1: '123 Main St',
                line2: '',
                city: 'Lagos',
                state: 'Lagos',
                country: 'NG',
                zip_code: '100001'
              },
              ip_address: '127.0.0.1'
            },
            description: 'Border Wallet Funding',
            currency: currency,
            amount: amountInCents,
            reference: reference,
            order: {
              identifier: reference,
              items: [
                {
                  name: 'Wallet Top-up',
                  type: 'digital'
                }
              ]
            }
          }
        })
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initialize payment');
      }

      const initData = await initResponse.json();
      const sessionPaymentId = initData.data?.id;

      if (!sessionPaymentId) {
        throw new Error('No payment session created');
      }

      setPaymentId(sessionPaymentId);

      // Step 2: Capture card
      const captureResponse = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'capture',
          payload: {
            payment_id: sessionPaymentId,
            card: {
              card_number: cardInfo.card_number,
              cvv: cardInfo.cvv,
              expiry_month: parseInt(cardInfo.expiry_month),
              expiry_year: parseInt(cardInfo.expiry_year)
            }
          }
        })
      });

      if (!captureResponse.ok) {
        throw new Error('Failed to process card');
      }

      const captureData = await captureResponse.json();

      // Check if authorization needed
      if (captureData.data?.status === 'requires_action') {
        // Determine auth type
        const nextAction = captureData.data.next_action?.type;
        setAuthType(nextAction === 'otp' ? 'otp' : nextAction === 'pin' ? 'pin' : nextAction === '3ds' ? '3ds' : 'otp');
        setCurrentStep('authorize');
        toast.info('Please complete authorization');
      } else if (captureData.data?.status === 'succeeded') {
        await handleSuccess();
      } else {
        throw new Error('Payment failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment failed');
      setCurrentStep('card-details');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!authValue || !paymentId) {
      toast.error('Please enter the authorization code');
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      
      let authPayload: any = {};
      switch (authType) {
        case 'otp':
          authPayload = { otp: authValue };
          break;
        case 'pin':
          authPayload = { pin: authValue };
          break;
        case '3ds':
          authPayload = { card_enroll: authValue };
          break;
        case 'cvv':
          authPayload = { cvv: authValue };
          break;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'authorize',
          payload: {
            payment_id: paymentId,
            auth: authPayload
          }
        })
      });

      if (!response.ok) {
        throw new Error('Authorization failed');
      }

      const data = await response.json();

      if (data.data?.status === 'succeeded') {
        await handleSuccess();
      } else {
        throw new Error('Authorization failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = async () => {
    setCurrentStep('success');
    toast.success('Payment successful!');
    
    // Wait a moment before calling onSuccess
    setTimeout(() => {
      onSuccess?.(parseFloat(amount), currency);
    }, 2000);
  };

  const handleBack = () => {
    if (currentStep === 'card-details') {
      setCurrentStep('amount');
    } else if (currentStep === 'authorize') {
      setCurrentStep('card-details');
      setAuthValue('');
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    return cleaned;
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Amount Step */}
      {currentStep === 'amount' && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Fund with Card</h2>
              <p className="text-sm text-gray-600">Fast and secure</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {currency === 'USD' && '$'}
                  {currency === 'EUR' && '€'}
                  {currency === 'GBP' && '£'}
                  {currency === 'NGN' && '₦'}
                </span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 text-lg"
                  step="0.01"
                  min="1"
                  max="10000"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum: 1.00 • Maximum: 10,000.00
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Currency</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="NGN">NGN - Nigerian Naira</option>
              </select>
            </div>

            <div className="pt-4 space-y-2">
              <Button onClick={handleAmountSubmit} className="w-full" size="lg">
                Continue
              </Button>
              {onCancel && (
                <Button onClick={onCancel} variant="ghost" className="w-full">
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Card Details Step */}
      {currentStep === 'card-details' && (
        <Card className="p-6">
          <button onClick={handleBack} className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-6">
            <h2 className="text-xl font-bold">Card Details</h2>
            <p className="text-sm text-gray-600">
              Funding {parseFloat(amount).toFixed(2)} {currency}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Card Number</label>
              <div className="relative">
                <Input
                  type={showCardDetails ? 'text' : 'password'}
                  value={cardInfo.card_number}
                  onChange={(e) => setCardInfo({ ...cardInfo, card_number: formatCardNumber(e.target.value) })}
                  placeholder="1234 5678 9012 3456"
                  maxLength={16}
                />
                <button
                  type="button"
                  onClick={() => setShowCardDetails(!showCardDetails)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showCardDetails ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">Month</label>
                <Input
                  type="number"
                  value={cardInfo.expiry_month}
                  onChange={(e) => setCardInfo({ ...cardInfo, expiry_month: e.target.value })}
                  placeholder="MM"
                  max={12}
                  min={1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <Input
                  type="number"
                  value={cardInfo.expiry_year}
                  onChange={(e) => setCardInfo({ ...cardInfo, expiry_year: e.target.value })}
                  placeholder="YY"
                  max={99}
                  min={24}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">CVV</label>
                <Input
                  type={showCardDetails ? 'text' : 'password'}
                  value={cardInfo.cvv}
                  onChange={(e) => setCardInfo({ ...cardInfo, cvv: e.target.value })}
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900">
                Your card details are encrypted and secure. We use industry-standard security measures.
              </p>
            </div>

            <Button onClick={handleInitializeAndCapture} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Pay {parseFloat(amount).toFixed(2)} {currency}
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Processing Step */}
      {currentStep === 'processing' && (
        <Card className="p-6">
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold mb-2">Processing Payment</h2>
            <p className="text-gray-600">Please wait while we process your card...</p>
          </div>
        </Card>
      )}

      {/* Authorization Step */}
      {currentStep === 'authorize' && (
        <Card className="p-6">
          <button onClick={handleBack} className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-6">
            <h2 className="text-xl font-bold">Verification Required</h2>
            <p className="text-sm text-gray-600">
              {authType === 'otp' && 'Enter the OTP sent to your phone'}
              {authType === 'pin' && 'Enter your card PIN'}
              {authType === '3ds' && 'Complete 3D Secure verification'}
              {authType === 'cvv' && 'Re-enter your CVV'}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {authType?.toUpperCase()} Code
              </label>
              <Input
                type="text"
                value={authValue}
                onChange={(e) => setAuthValue(e.target.value)}
                placeholder={`Enter ${authType}`}
                maxLength={authType === 'otp' ? 6 : 4}
                className="text-center text-lg tracking-widest"
              />
            </div>

            <Button 
              onClick={handleAuthorize} 
              disabled={loading || !authValue} 
              className="w-full" 
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Success Step */}
      {currentStep === 'success' && (
        <Card className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-1">
              Your wallet has been funded with
            </p>
            <p className="text-3xl font-bold text-gray-900 mb-6">
              {parseFloat(amount).toFixed(2)} {currency}
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                Your balance will be updated shortly. You can start using your funds immediately.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
