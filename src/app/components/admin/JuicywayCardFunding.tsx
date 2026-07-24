/**
 * Juicyway Card Funding Component
 *
 * Complete 4-step payment flow:
 * 1. Initialize - Create payment session with customer details
 * 2. Capture - Submit encrypted card details
 * 3. Authorize - Handle OTP/PIN/3DS/CVV verification
 * 4. Verify - Confirm payment status
 *
 * Webhook URL: {SUPABASE_URL}/functions/v1/juicyway-funding/webhook
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ArrowRight,
  Lock,
  Smartphone,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

type PaymentStep = 'form' | 'initialize' | 'capture' | 'authorize' | 'verify' | 'complete';
type AuthType = 'otp' | 'pin' | '3ds' | 'cvv' | null;

export default function JuicywayCardFunding() {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<PaymentStep>('form');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [authType, setAuthType] = useState<AuthType>(null);
  const [authValue, setAuthValue] = useState('');
  const [showCardDetails, setShowCardDetails] = useState(false);
  
  // Form data
  const [customerInfo, setCustomerInfo] = useState({
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone_number: '+2348118873422',
    billing_address: {
      line1: '123 Main St',
      line2: 'Suite 456',
      city: 'Lagos',
      state: 'Lagos',
      country: 'NG',
      zip_code: '100001'
    },
    ip_address: '127.0.0.1'
  });

  const [paymentInfo, setPaymentInfo] = useState({
    amount: 10000, // Amount in cents (100.00)
    currency: 'USD',
    description: 'Border Wallet Funding',
    reference: `ord_test-user-id_${Date.now()}`
  });

  const [cardInfo, setCardInfo] = useState({
    card_number: '',
    cvv: '',
    expiry_month: '',
    expiry_year: ''
  });

  const [responseData, setResponseData] = useState<any>(null);

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

  // ==================== STEP 1: INITIALIZE ====================
  const handleInitialize = async () => {
    setLoading(true);
    setCurrentStep('initialize');
    try {
      const headers = await getAuthHeaders();


      const response = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'initialize',
          payload: {
            customer: customerInfo,
            description: paymentInfo.description,
            currency: paymentInfo.currency,
            amount: paymentInfo.amount,
            reference: paymentInfo.reference,
            order: {
              identifier: paymentInfo.reference,
              items: [
                {
                  name: paymentInfo.description,
                  type: 'digital'
                }
              ]
            }
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize payment');
      }

      const data = await response.json();

      if (data.data?.id) {
        setPaymentId(data.data.id);
        setResponseData(data.data);
        setCurrentStep('capture');
        toast.success('Payment session created!');
      } else {
        throw new Error('No payment ID received');
      }
    } catch (error: any) {
      toast.error(`Initialize failed: ${error.message}`);
      setCurrentStep('form');
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 2: CAPTURE ====================
  const handleCapture = async () => {
    if (!paymentId) {
      toast.error('No payment session found');
      return;
    }

    setLoading(true);
    setCurrentStep('capture');
    try {
      const headers = await getAuthHeaders();


      // In production, you would encrypt card details here
      // For demo purposes, we're using test card numbers
      const response = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'capture',
          payload: {
            payment_id: paymentId,
            card: {
              card_number: cardInfo.card_number,
              cvv: cardInfo.cvv,
              expiry_month: parseInt(cardInfo.expiry_month),
              expiry_year: parseInt(cardInfo.expiry_year)
            }
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to capture card');
      }

      const data = await response.json();

      setResponseData(data.data);

      // Check if authorization is needed
      if (data.data?.status === 'requires_action') {
        // Determine auth type from response
        if (data.data.next_action?.type === 'otp') {
          setAuthType('otp');
        } else if (data.data.next_action?.type === 'pin') {
          setAuthType('pin');
        } else if (data.data.next_action?.type === '3ds') {
          setAuthType('3ds');
        } else {
          setAuthType('otp'); // Default
        }
        setCurrentStep('authorize');
        toast.info('Authorization required');
      } else if (data.data?.status === 'succeeded') {
        setCurrentStep('complete');
        toast.success('Payment successful!');
      } else {
        throw new Error('Unexpected payment status');
      }
    } catch (error: any) {
      toast.error(`Capture failed: ${error.message}`);
      setCurrentStep('form');
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 3: AUTHORIZE ====================
  const handleAuthorize = async () => {
    if (!paymentId || !authType) {
      toast.error('Missing authorization details');
      return;
    }

    setLoading(true);
    setCurrentStep('authorize');
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
        const error = await response.json();
        throw new Error(error.error || 'Authorization failed');
      }

      const data = await response.json();

      setResponseData(data.data);

      if (data.data?.status === 'succeeded') {
        setCurrentStep('verify');
        await handleVerify();
      } else if (data.data?.status === 'requires_action') {
        toast.warning('Additional authorization required');
      } else {
        throw new Error('Authorization failed');
      }
    } catch (error: any) {
      toast.error(`Authorization failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 4: VERIFY ====================
  const handleVerify = async () => {
    if (!paymentId) {
      toast.error('No payment ID found');
      return;
    }

    setLoading(true);
    setCurrentStep('verify');
    try {
      const headers = await getAuthHeaders();


      const response = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'verify',
          payload: {
            payment_id: paymentId
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }

      const data = await response.json();

      setResponseData(data.data);

      if (data.data?.status === 'succeeded') {
        setCurrentStep('complete');
        toast.success('Payment verified successfully!');
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error: any) {
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('form');
    setPaymentId(null);
    setAuthType(null);
    setAuthValue('');
    setResponseData(null);
    setPaymentInfo({
      ...paymentInfo,
      reference: `ord_test-user-id_${Date.now()}`
    });
  };

  const getStepIcon = (step: PaymentStep) => {
    if (currentStep === step) {
      return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
    }
    const stepOrder = ['form', 'initialize', 'capture', 'authorize', 'verify', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    if (stepIndex < currentIndex) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-7 h-7" />
          Juicyway Card Funding (4-Step Flow)
        </h1>
        <p className="text-gray-600 mt-1">Direct card payment integration with full control</p>
      </div>

      {/* Progress Indicator */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Payment Flow Progress</h2>
        <div className="flex items-center justify-between">
          {[
            { step: 'form', label: 'Form', icon: <CreditCard className="w-4 h-4" /> },
            { step: 'initialize', label: 'Initialize', icon: <Lock className="w-4 h-4" /> },
            { step: 'capture', label: 'Capture', icon: <CreditCard className="w-4 h-4" /> },
            { step: 'authorize', label: 'Authorize', icon: <Smartphone className="w-4 h-4" /> },
            { step: 'verify', label: 'Verify', icon: <Shield className="w-4 h-4" /> },
            { step: 'complete', label: 'Complete', icon: <CheckCircle className="w-4 h-4" /> },
          ].map((item, index, array) => (
            <React.Fragment key={item.step}>
              <div className="flex flex-col items-center gap-1">
                {getStepIcon(item.step as PaymentStep)}
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              {index < array.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-400" />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Form Section */}
      {currentStep === 'form' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Payment Information</h2>

          <div className="space-y-4">
            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (cents)</label>
                <Input
                  type="number"
                  value={paymentInfo.amount}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, amount: parseInt(e.target.value) })}
                  placeholder="10000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(paymentInfo.amount / 100).toFixed(2)} {paymentInfo.currency}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={paymentInfo.currency}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, currency: e.target.value })}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="NGN">NGN</option>
                </select>
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <Input
                  value={customerInfo.first_name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, first_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <Input
                  value={customerInfo.last_name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, last_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={customerInfo.phone_number}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone_number: e.target.value })}
                />
              </div>
            </div>

            {/* Card Details */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Card Details
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Card Number</label>
                  <div className="relative">
                    <Input
                      type={showCardDetails ? 'text' : 'password'}
                      value={cardInfo.card_number}
                      onChange={(e) => setCardInfo({ ...cardInfo, card_number: e.target.value })}
                      placeholder="4111111111111111"
                      maxLength={16}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCardDetails(!showCardDetails)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {showCardDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Test: 4111111111111111</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Month</label>
                    <Input
                      type="number"
                      value={cardInfo.expiry_month}
                      onChange={(e) => setCardInfo({ ...cardInfo, expiry_month: e.target.value })}
                      placeholder="12"
                      max={12}
                      min={1}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Year</label>
                    <Input
                      type="number"
                      value={cardInfo.expiry_year}
                      onChange={(e) => setCardInfo({ ...cardInfo, expiry_year: e.target.value })}
                      placeholder="25"
                      max={99}
                      min={24}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">CVV</label>
                    <Input
                      type={showCardDetails ? 'text' : 'password'}
                      value={cardInfo.cvv}
                      onChange={(e) => setCardInfo({ ...cardInfo, cvv: e.target.value })}
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={handleInitialize} disabled={loading} className="w-full">
              <Lock className="w-4 h-4 mr-2" />
              Initialize Payment
            </Button>
          </div>
        </Card>
      )}

      {/* Capture Section */}
      {currentStep === 'capture' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Capture Card Details
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Payment session initialized. Click to submit card details.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-xs font-mono">Payment ID: {paymentId}</p>
          </div>
          <Button onClick={handleCapture} disabled={loading} className="w-full">
            Submit Card Details
          </Button>
        </Card>
      )}

      {/* Authorize Section */}
      {currentStep === 'authorize' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Authorization Required
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {authType === 'otp' && 'Enter the OTP sent to your phone'}
            {authType === 'pin' && 'Enter your card PIN'}
            {authType === '3ds' && 'Complete 3D Secure verification'}
            {authType === 'cvv' && 'Re-enter your CVV'}
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {authType?.toUpperCase()} Code
              </label>
              <Input
                type="text"
                value={authValue}
                onChange={(e) => setAuthValue(e.target.value)}
                placeholder={`Enter ${authType}`}
                maxLength={authType === 'otp' ? 6 : 4}
              />
            </div>
            <Button onClick={handleAuthorize} disabled={loading || !authValue} className="w-full">
              <Shield className="w-4 h-4 mr-2" />
              Submit Authorization
            </Button>
          </div>
        </Card>
      )}

      {/* Verify/Complete Section */}
      {(currentStep === 'verify' || currentStep === 'complete') && (
        <Card className="p-6">
          <div className="text-center">
            {currentStep === 'complete' ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
                <p className="text-gray-600 mb-4">Your wallet has been funded</p>
              </>
            ) : (
              <>
                <Clock className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold text-blue-700 mb-2">Verifying Payment...</h2>
                <p className="text-gray-600 mb-4">Please wait</p>
              </>
            )}
            
            {responseData && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4 text-left">
                <p className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(responseData, null, 2)}
                </p>
              </div>
            )}

            {currentStep === 'complete' && (
              <Button onClick={handleReset} className="w-full">
                Start New Payment
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Webhook Info */}
      <Card className="p-6 bg-purple-50 border-purple-200">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          🔔 Webhook Configuration
        </h3>
        <div className="text-sm space-y-2">
          <div>
            <span className="font-mono text-xs bg-white px-2 py-1 rounded">
              {SUPABASE_URL}/functions/v1/juicyway-funding/webhook
            </span>
          </div>
          <p className="text-xs text-gray-700">
            Configure this URL in your Juicyway dashboard to receive real-time payment status updates.
            The webhook will handle payment confirmations and automatically credit user wallets.
          </p>
        </div>
      </Card>
    </div>
  );
}