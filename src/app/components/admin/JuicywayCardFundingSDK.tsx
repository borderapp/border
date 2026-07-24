/**
 * Juicyway Card Funding Component (SDK-Based)
 *
 * CORRECT FLOW:
 * 1. Initialize - Backend creates payment session and returns payment_key
 * 2. SDK Payment - Frontend Juicyway SDK handles card input (PCI compliant)
 * 3. Verify - Backend confirms payment status
 * 4. Webhook - Automatically credits wallet
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
  Lock,
  Shield,
  AlertCircle
} from 'lucide-react';

declare global {
  interface Window {
    PayWithJuice?: any;
    PayWithJuiceHosted?: any;
  }
}

type PaymentStep = 'form' | 'processing' | 'complete' | 'error';

export default function JuicywayCardFundingSDK() {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<PaymentStep>('form');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string>('');

  // Load Juicyway SDK on component mount
  useEffect(() => {

    // Check if SDK already loaded
    if (window.PayWithJuice || window.PayWithJuiceHosted) {
      setSdkLoaded(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://checkout.juicyway.com/pay.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setSdkLoaded(true);
      });
      existingScript.addEventListener('error', (e) => {
        setSdkError('SDK script failed to load from CDN');
      });
      return;
    }

    // Load SDK script
    const script = document.createElement('script');
    script.src = 'https://checkout.juicyway.com/pay.js';
    // Temporarily remove integrity check to debug
    // script.integrity = 'sha384-ROsbTCP6XBvgKuKoF3VSg21iu7C48d0RZHByswNEGppV+u2KkCt4rbEq9LpO3M9e';
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.onload = () => {
      // Check if the SDK actually exposed the global
      setTimeout(() => {
        if (window.PayWithJuice || window.PayWithJuiceHosted) {
          setSdkLoaded(true);
          toast.success('Payment SDK loaded');
        } else {
          setSdkError('SDK loaded but API not available');
          toast.error('SDK loaded but API not available');
        }
      }, 100);
    };

    script.onerror = (e) => {
      setSdkError('Failed to load SDK from https://checkout.juicyway.com/pay.js');
      toast.error('Failed to load payment SDK - Check console');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

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
    amount: 10000,
    currency: 'USD',
    description: 'Border Wallet Funding',
    reference: `ord_test-user-id_${Date.now()}`
  });

  const currencyAddressMap: Record<string, { country: string; city: string; state: string; zip_code: string; phone: string }> = {
    NGN: { country: 'NG', city: 'Lagos',   state: 'Lagos',   zip_code: '100001',  phone: '+2348118873422' },
    USD: { country: 'US', city: 'New York', state: 'NY',      zip_code: '10001',   phone: '+14165550100' },
    CAD: { country: 'CA', city: 'Toronto',  state: 'ON',      zip_code: 'M5H 2N2', phone: '+14165550100' },
    EUR: { country: 'DE', city: 'Berlin',   state: 'Berlin',  zip_code: '10115',   phone: '+4930000000' },
    GBP: { country: 'GB', city: 'London',   state: 'England', zip_code: 'EC1A 1BB',phone: '+442071234567' },
  };

  const handleCurrencyChange = (newCurrency: string) => {
    const addr = currencyAddressMap[newCurrency] || currencyAddressMap['USD'];
    setPaymentInfo(prev => ({ ...prev, currency: newCurrency }));
    setCustomerInfo(prev => ({
      ...prev,
      phone_number: addr.phone,
      billing_address: {
        ...prev.billing_address,
        city: addr.city,
        state: addr.state,
        country: addr.country,
        zip_code: addr.zip_code,
      }
    }));
  };

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
    setCurrentStep('processing');
    setErrorMessage('');

    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);
    const freshReference = `ord_test-user-id_${ts}_${rand}`;
    // Widget gets a distinct reference — same reference causes "reference_exists" from Juicyway
    const widgetReference = `ord_test-user-id_${ts}_${rand}_pay`;
    setPaymentInfo(prev => ({ ...prev, reference: freshReference }));

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
            reference: freshReference,
            order: {
              identifier: freshReference,
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

      // Try every possible location Juicyway may return the session key
      const paymentKey =
        data.payment_key ||
        data.data?.key ||
        data.data?.payment_key ||
        data.data?.session_key ||
        data.data?.token ||
        data.key ||
        data.session_key ||
        data.token;

      const paymentIdFromResponse =
        data.payment_id ||
        data.data?.id ||
        data.data?.payment_id ||
        data.id;


      if (!paymentKey) {
        throw new Error(
          `No session key found in response. Available fields: top-level=[${Object.keys(data).join(', ')}]${data.data ? `, data=[${Object.keys(data.data).join(', ')}]` : ''}`
        );
      }

      setPaymentId(paymentIdFromResponse);
      toast.success('Payment session created!');

      // ==================== STEP 2: OPEN JUICYWAY SDK ====================

      // Resolve the correct SDK global
      const juicywayWidget = window.PayWithJuice || window.PayWithJuiceHosted;
      if (!juicywayWidget) {
        throw new Error('Juicyway SDK not loaded. Please wait for SDK to load and try again.');
      }


      // The SDK builds an iframe URL from all params — amount/currency/reference must be included
      // or the checkout page receives undefined values and throws "invalid parameters"
      juicywayWidget({
        key: paymentKey,
        amount: paymentInfo.amount,
        currency: paymentInfo.currency,
        description: paymentInfo.description,
        reference: widgetReference,
        customer: {
          first_name: customerInfo.first_name,
          last_name: customerInfo.last_name,
          email: customerInfo.email,
          phone_number: customerInfo.phone_number,
          billing_address: customerInfo.billing_address,
        },
        order: {
          identifier: widgetReference,
          items: [{ name: paymentInfo.description, type: 'digital' }]
        },
        onSuccess: async (response: any) => {
          // Use the actual payment ID from the callback — the widget may create its own
          // payment record with widgetReference, separate from the backend session
          const actualPaymentId =
            response?.id ||
            response?.payment_id ||
            response?.data?.id ||
            response?.data?.payment_id ||
            paymentIdFromResponse;
          toast.success('Payment completed!');
          setCurrentStep('complete');
          setLoading(false);
          // Verify in background — don't block the success UI if verify fails
          handleVerify(actualPaymentId).catch(err => {
          });
        },
        onError: (error: any) => {
          setCurrentStep('error');
          setErrorMessage(error.message || 'Payment failed');
          toast.error('Payment failed: ' + (error.message || 'Unknown error'));
          setLoading(false);
        },
        onClose: () => {
          if (currentStep === 'processing') {
            setCurrentStep('form');
            toast.info('Payment cancelled');
            setLoading(false);
          }
        }
      });

    } catch (error: any) {
      setErrorMessage(error.message);
      setCurrentStep('error');
      toast.error(`Initialize failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 3: VERIFY PAYMENT ====================
  const handleVerify = async (paymentIdToVerify: string) => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();


      const response = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'verify',
          payload: {
            payment_id: paymentIdToVerify
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }

      const data = await response.json();

      if (data.data?.status === 'succeeded') {
        setCurrentStep('complete');
        toast.success('Payment verified! Your wallet will be credited shortly.');
      } else {
        throw new Error('Payment not successful');
      }
    } catch (error: any) {
      setCurrentStep('error');
      setErrorMessage(error.message);
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('form');
    setPaymentId(null);
    setErrorMessage('');
    setPaymentInfo({
      ...paymentInfo,
      reference: `ord_test-user-id_${Date.now()}`
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-7 h-7" />
          Juicyway Card Funding (SDK Mode)
        </h1>
        <p className="text-gray-600 mt-1">Secure card payment with Juicyway SDK</p>
      </div>

      {/* SDK Integration Status */}
      <Card className={`p-6 ${sdkLoaded ? 'bg-green-50 border-green-200' : sdkError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-start gap-3">
          {sdkLoaded ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : sdkError ? (
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          ) : (
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0 animate-pulse" />
          )}
          <div className="flex-1">
            <h3 className={`font-semibold mb-2 ${sdkLoaded ? 'text-green-900' : sdkError ? 'text-red-900' : 'text-blue-900'}`}>
              {sdkLoaded ? '✅ Juicyway SDK Loaded' : sdkError ? '❌ SDK Load Failed' : 'Loading Juicyway SDK...'}
            </h3>
            <p className={`text-sm ${sdkLoaded ? 'text-green-800' : sdkError ? 'text-red-800' : 'text-blue-800'}`}>
              {sdkLoaded
                ? 'Payment SDK is ready. You can now process card payments.'
                : sdkError
                ? sdkError
                : 'Loading payment SDK from Juicyway. Please wait...'
              }
            </p>
            {sdkError && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-red-700">
                  <strong>Troubleshooting:</strong>
                </p>
                <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                  <li>Check browser console for detailed errors</li>
                  <li>Verify network connection</li>
                  <li>Check if firewall/proxy is blocking checkout.juicyway.com</li>
                  <li>Try refreshing the page</li>
                </ul>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Reload Page
                </Button>
              </div>
            )}
            {!sdkLoaded && !sdkError && (
              <div className="mt-3 bg-gray-900 p-3 rounded-lg overflow-x-auto">
                <code className="text-xs text-green-400 font-mono">
                  Waiting for window.PayWithJuice or window.PayWithJuiceHosted...
                </code>
              </div>
            )}
          </div>
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
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
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

            <Button onClick={handleInitialize} disabled={loading || !sdkLoaded} className="w-full">
              <Lock className="w-4 h-4 mr-2" />
              {!sdkLoaded ? 'Loading SDK...' : 'Start Payment'}
            </Button>
            {!sdkLoaded && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Waiting for Juicyway SDK to load...
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Processing Section */}
      {currentStep === 'processing' && (
        <Card className="p-6">
          <div className="text-center">
            <Clock className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-blue-700 mb-2">Processing Payment...</h2>
            <p className="text-gray-600 mb-4">Juicyway payment modal should be open</p>
          </div>
        </Card>
      )}

      {/* Complete Section */}
      {currentStep === 'complete' && (
        <Card className="p-6">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">Your wallet will be credited via webhook</p>
            <p className="text-sm text-gray-500 mb-6">Payment ID: {paymentId}</p>
            <Button onClick={handleReset} className="w-full">
              Start New Payment
            </Button>
          </div>
        </Card>
      )}

      {/* Error Section */}
      {currentStep === 'error' && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-700 mb-2">Payment Failed</h2>
            <p className="text-red-600 mb-6">{errorMessage}</p>
            <Button onClick={handleReset} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Webhook Info */}
      <Card className="p-6 bg-purple-50 border-purple-200">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          🔔 Webhook Configuration
        </h3>
        <div className="text-sm space-y-3">
          <div>
            <p className="text-xs text-gray-600 mb-1">Webhook URL (Configure in Juicyway Dashboard):</p>
            <span className="font-mono text-xs bg-white px-2 py-1 rounded block break-all">
              {SUPABASE_URL}/functions/v1/juicyway-funding/webhook
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Event to Subscribe:</p>
            <span className="font-mono text-xs bg-white px-2 py-1 rounded">
              payment.succeeded
            </span>
          </div>
          <p className="text-xs text-gray-700">
            Reference format: <code className="bg-white px-1 rounded">ord_[userId]_[timestamp]</code>
          </p>
          <div className="pt-2 border-t border-purple-300">
            <p className="text-xs text-gray-600 mb-1">SDK Script (Auto-loaded):</p>
            <code className="text-xs bg-white px-2 py-1 rounded block break-all">
              https://checkout.juicyway.com/pay.js
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
}
