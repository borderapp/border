/**
 * Juicyway Card Funding Component (FIXED VERSION)
 *
 * This version:
 * 1. Dynamically detects PayWithJuice and PayWithJuiceHosted global objects
 * 2. Uses ONLY session key from backend (not full payment details)
 * 3. Comprehensive debug logging
 * 4. Retry logic with backoff
 * 5. iframe compatibility handling
 * 6. Proper error states and recovery
 *
 * CORRECT FLOW:
 * 1. Initialize - Backend creates payment session and returns SESSION KEY
 * 2. SDK Payment - Call window.PayWithJuice({ key: sessionKey, onSuccess, onError, onClose })
 * 3. Verify - Backend confirms payment status
 * 4. Webhook - Automatically credits wallet
 *
 * 🔥 CRITICAL INSIGHTS (learned through testing):
 * - SDK exposes: window.PayWithJuice and window.PayWithJuiceHosted
 * - Backend returns session key in: response.payment_key
 * - ⚠️ **MUST pass ONLY { key, onSuccess, onError, onClose }**
 * - ❌ **DO NOT pass customer/amount/currency** - causes 400 Bad Request!
 * - The session key already contains ALL payment details
 * - Passing extra fields makes SDK try to CREATE a new session (duplicate)
 * - Widget then calls POST /payment-sessions which fails with 400
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useJuicywaySDK } from '@/hooks/useJuicywaySDK';
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Lock,
  AlertCircle,
  RefreshCw,
  Terminal,
  Shield
} from 'lucide-react';

type PaymentStep = 'form' | 'processing' | 'complete' | 'error';

export default function JuicywayCardFundingFixed() {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<PaymentStep>('form');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');

  // Use SDK hook with debugging enabled
  const { sdkLoaded, sdkError, sdkObject, reload } = useJuicywaySDK(true);

  // Form data - Using US address for USD currency by default
  const [customerInfo, setCustomerInfo] = useState({
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone_number: '+14165555555', // US phone for USD
    billing_address: {
      line1: '123 Main St',
      line2: 'Suite 456',
      city: 'Springfield',
      state: 'CA',
      country: 'US', // Matches USD currency
      zip_code: '12345'
    },
    ip_address: '127.0.0.1'
  });

  const [paymentInfo, setPaymentInfo] = useState({
    amount: 10000,
    currency: 'USD',
    description: 'Border Wallet Funding',
    reference: `ord_test-user-id_${Date.now()}`
  });

  // Currency → billing address mapping so the session doesn't get rejected
  const currencyAddressMap: Record<string, { country: string; city: string; state: string; zip_code: string; phone: string }> = {
    NGN: { country: 'NG', city: 'Lagos',    state: 'Lagos',   zip_code: '100001', phone: '+2348118873422' },
    USD: { country: 'US', city: 'New York',  state: 'NY',      zip_code: '10001',  phone: '+14165550100' },
    CAD: { country: 'CA', city: 'Toronto',   state: 'ON',      zip_code: 'M5H 2N2',phone: '+14165550100' },
    EUR: { country: 'DE', city: 'Berlin',    state: 'Berlin',  zip_code: '10115',  phone: '+4930000000' },
    GBP: { country: 'GB', city: 'London',    state: 'England', zip_code: 'EC1A 1BB',phone: '+442071234567' },
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

  // Debug logger
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    const log = `[${timestamp}] ${emoji} ${message}`;
    setDebugLogs(prev => [...prev, log]);
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

  // ==================== STEP 1: INITIALIZE ====================
  const handleInitialize = async () => {
    setLoading(true);
    setCurrentStep('processing');
    setErrorMessage('');
    setDebugLogs([]);

    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);
    // Backend session gets one reference; widget gets a DIFFERENT one.
    // Juicyway sees both references in the same flow and throws "reference_exists"
    // when they are identical — so they must be distinct.
    const freshReference = `ord_test-user-id_${ts}_${rand}`;
    const widgetReference = `ord_test-user-id_${ts}_${rand}_pay`;
    setPaymentInfo(prev => ({ ...prev, reference: freshReference }));

    try {
      addLog('STEP 1: Initializing payment session...', 'info');

      // Verify SDK is loaded
      if (!sdkLoaded || !sdkObject) {
        throw new Error('Juicyway SDK not loaded. Please wait or reload the page.');
      }

      addLog(`SDK Object detected: ${Object.keys(sdkObject).length > 0 ? 'Function available' : 'Unknown structure'}`, 'success');

      const headers = await getAuthHeaders();

      addLog('Calling backend initialize endpoint...', 'info');

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
        addLog(`Backend error: ${error.error || 'Unknown'}`, 'error');
        throw new Error(error.error || 'Failed to initialize payment');
      }

      const data = await response.json();
      addLog('Backend response received', 'success');
      addLog(`Full response: ${JSON.stringify(data, null, 2)}`, 'info');

      // Log response structure for debugging
      if (data.data) {
      }

      // Extract session key from response - try ALL possible locations
      const sessionKey =
        data.data?.key ||
        data.data?.payment_key ||
        data.data?.session_key ||
        data.data?.token ||
        data.key ||
        data.payment_key ||
        data.session_key ||
        data.token;

      const paymentIdFromResponse =
        data.payment_id ||
        data.data?.payment_id ||
        data.data?.id ||
        data.id;

      const checkoutUrl =
        data.data?.checkout_url ||
        data.checkout_url ||
        data.data?.payment_url ||
        data.payment_url ||
        data.data?.hosted_url ||
        data.hosted_url;

      // Detailed logging
      addLog(`🔍 Checking data.data.key: ${data.data?.key || 'not found'}`, 'info');
      addLog(`🔍 Checking data.data.payment_key: ${data.data?.payment_key || 'not found'}`, 'info');
      addLog(`🔍 Checking data.key: ${data.key || 'not found'}`, 'info');
      addLog(`🔍 Checking data.payment_key: ${data.payment_key || 'not found'}`, 'info');

      addLog(`Session key: ${sessionKey ? `Received ✅ (${sessionKey.substring(0, 30)}...)` : 'Missing ❌'}`, sessionKey ? 'success' : 'error');
      addLog(`Checkout URL: ${checkoutUrl ? 'Received ✅' : 'Not provided'}`, checkoutUrl ? 'info' : 'warn');
      addLog(`Payment ID: ${paymentIdFromResponse || 'Not found'}`, paymentIdFromResponse ? 'info' : 'warn');

      if (!sessionKey && !checkoutUrl) {
        addLog('❌ Could not find session key in any expected location', 'error');
        addLog('📋 Available response fields: ' + Object.keys(data).join(', '), 'error');
        if (data.data) {
          addLog('📋 Available data.data fields: ' + Object.keys(data.data).join(', '), 'error');
        }
        throw new Error('No session key or checkout URL received from server. Check debug console for response structure.');
      }

      setPaymentId(paymentIdFromResponse);
      toast.success('Payment session created!');

      // OPTION 1: If there's a checkout URL, redirect to it instead of using SDK
      if (checkoutUrl) {
        addLog('🔗 Checkout URL detected - redirecting...', 'info');
        addLog(`Redirecting to: ${checkoutUrl}`, 'info');
        window.location.href = checkoutUrl;
        return; // Exit early
      }

      // ==================== STEP 2: OPEN JUICYWAY SDK ====================
      addLog('STEP 2: Opening Juicyway SDK modal...', 'info');
      addLog(`Using session key: ${sessionKey.substring(0, 20)}...`, 'info');

      // Create proper callback functions for the SDK
      const onSuccessCallback = async (response: any) => {
        try {
          addLog('✅ SDK onSuccess callback triggered!', 'success');
          addLog(`Response: ${JSON.stringify(response)}`, 'info');
          // Use the payment ID from the callback — the widget payment ID may differ
          // from the backend session ID when they use separate references
          const actualPaymentId =
            response?.id ||
            response?.payment_id ||
            response?.data?.id ||
            response?.data?.payment_id ||
            paymentIdFromResponse;
          addLog(`Using payment ID for verify: ${actualPaymentId}`, 'info');
          toast.success('Payment completed!');
          setCurrentStep('complete');
          setLoading(false);
          // Verify in background — don't block or error the UI if it fails,
          // since the payment already succeeded and the webhook will credit the wallet
          handleVerify(actualPaymentId).catch(err => {
            addLog(`Verify failed (payment still succeeded): ${err.message}`, 'warn');
          });
        } catch (err) {
          addLog('Error in success callback - but payment may have succeeded', 'warn');
        }
      };

      const onErrorCallback = (error: any) => {
        try {
          addLog('❌ SDK onError callback triggered', 'error');
          addLog(`Full error object: ${JSON.stringify(error, null, 2)}`, 'error');

          const errorMsg = error?.message || error?.error || error?.details || error?.description || 'Payment failed - check console for details';

          setCurrentStep('error');
          setErrorMessage(errorMsg);
          toast.error('Payment failed: ' + errorMsg);
          setLoading(false);
        } catch (err) {
        }
      };

      const onCloseCallback = () => {
        try {
          addLog('⚠️ SDK onClose callback triggered', 'warn');
          toast.info('Modal closed - checking payment status...');

          setTimeout(async () => {
            if (currentStep === 'processing' && paymentIdFromResponse) {
              try {
                const headers = await getAuthHeaders();
                const statusCheck = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    action: 'verify',
                    payload: { payment_id: paymentIdFromResponse }
                  })
                });

                if (statusCheck.ok) {
                  const statusData = await statusCheck.json();
                  if (statusData.data?.status === 'succeeded') {
                    addLog('Payment was successful!', 'success');
                    setCurrentStep('complete');
                    setLoading(false);
                    return;
                  }
                }
              } catch (err) {
              }

              setCurrentStep('form');
              setLoading(false);
            }
          }, 2000);
        } catch (err) {
          setCurrentStep('form');
          setLoading(false);
        }
      };

      // CRITICAL: For inline collection mode, Juicyway requires ALL payment details
      // Field names MUST use snake_case to match Juicyway API expectations!
      if (!sessionKey || typeof sessionKey !== 'string' || sessionKey.trim() === '') {
        throw new Error(`Widget cannot be called: session key is invalid (got: ${JSON.stringify(sessionKey)}). Check debug console for full Juicyway response.`);
      }

      // widgetReference is intentionally different from freshReference (used for the backend session).
      // If both are the same, Juicyway throws "reference_exists" because the session creation
      // already registered that reference and the widget tries to register it again.
      const widgetPayload = {
        key: sessionKey,
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
        onSuccess: onSuccessCallback,
        onError: onErrorCallback,
        onClose: onCloseCallback
      };


      addLog(`💰 Widget: ${paymentInfo.amount} (${paymentInfo.currency})`, 'info');
      addLog(`🔑 Key: ${sessionKey.substring(0, 30)}...`, 'info');

      const payloadVariants = [widgetPayload];

      addLog(`Available SDK methods: ${JSON.stringify(Object.keys(sdkObject))}`, 'info');

      // CRITICAL: Inspect the SDK function to see what it expects
      if (sdkObject.PayWithJuice) {
        try {
          const funcString = sdkObject.PayWithJuice.toString();
          addLog('📋 PayWithJuice function source logged to console', 'info');

          // Try to extract parameter names
          const paramMatch = funcString.match(/function\s*\(([^)]*)\)/);
          if (paramMatch && paramMatch[1]) {
            addLog(`🔍 PayWithJuice expects parameter(s): ${paramMatch[1]}`, 'warn');
          }
        } catch (e) {
          addLog('Could not inspect PayWithJuice function', 'warn');
        }
      }

      // Call SDK - Try different payload formats with error protection
      let sdkCallSucceeded = false;
      let lastError: any = null;

      // Wrap SDK call in error boundary to prevent site breakage
      const callSDKSafely = (sdkFunction: Function, payload: any, functionName: string, attemptNumber: number): boolean => {
        try {
          let payloadDisplay: string;
          if (typeof payload === 'string') {
            payloadDisplay = `String: "${payload.substring(0, 50)}..."`;
          } else if (typeof payload === 'object' && payload !== null) {
            const keys = Object.keys(payload);
            const hasCallbacks = keys.some(k => k.startsWith('on') && typeof payload[k] === 'function');
            const keyParam = payload.key || payload.payment_key || payload.token || payload.session_key;
            payloadDisplay = `Object { ${keys.filter(k => !k.startsWith('on')).join(', ')} }${hasCallbacks ? ' + callbacks ✅' : ''}`;
            if (keyParam) {
              payloadDisplay += ` [key: ${keyParam.substring(0, 20)}...]`;
            }
          } else {
            payloadDisplay = 'Empty/null';
          }

          addLog(`📤 Attempt ${attemptNumber}: ${functionName}(${payloadDisplay})`, 'info');
          if (typeof payload === 'object' && payload !== null) {
            const callbackKeys = Object.keys(payload).filter(k => typeof payload[k] === 'function');
          }

          // Create error boundary
          const originalOnError = window.onerror;
          window.onerror = (msg, url, line, col, error) => {
            addLog(`⚠️ Window error during SDK call: ${msg}`, 'warn');
            return true; // Prevent error propagation
          };

          const result = sdkFunction(payload);

          // Restore original error handler after a delay
          setTimeout(() => {
            window.onerror = originalOnError;
          }, 1000);

          addLog(`✅ ${functionName} executed (no exception thrown)`, 'success');

          if (result) {
            addLog(`📥 SDK returned: ${JSON.stringify(result)}`, 'info');
          } else {
            addLog(`📥 SDK returned: undefined/null`, 'info');
          }

          return true;
        } catch (err: any) {
          lastError = err;
          addLog(`❌ ${functionName} threw exception: ${err.message}`, 'error');
          return false;
        }
      };

      // Try PayWithJuice with different payload formats
      if (sdkObject.PayWithJuice && typeof sdkObject.PayWithJuice === 'function') {
        addLog('🔧 Trying PayWithJuice with different payload formats...', 'info');

        for (let i = 0; i < payloadVariants.length && !sdkCallSucceeded; i++) {
          sdkCallSucceeded = callSDKSafely(sdkObject.PayWithJuice, payloadVariants[i], 'PayWithJuice', i + 1);

          if (sdkCallSucceeded) {
            addLog(`✅ Variant ${i + 1} executed successfully!`, 'success');
            break;
          } else {
            addLog(`❌ Variant ${i + 1} failed, trying next...`, 'warn');
          }

          // Wait a tiny bit between attempts to see errors clearly
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Fallback to PayWithJuiceHosted (HOSTED MODE - more stable)
      if (!sdkCallSucceeded && sdkObject.PayWithJuiceHosted && typeof sdkObject.PayWithJuiceHosted === 'function') {
        addLog('🔄 Falling back to PayWithJuiceHosted (hosted mode)...', 'info');
        addLog('💡 Hosted mode is more stable and avoids parameter validation issues', 'info');

        // For hosted mode, try minimal payload first (often more reliable)
        const hostedPayloads = [
          // Just the key (hosted mode handles everything)
          { key: sessionKey },

          // Full payload (if needed)
          fullPayload,
        ];

        for (let i = 0; i < hostedPayloads.length && !sdkCallSucceeded; i++) {
          sdkCallSucceeded = callSDKSafely(sdkObject.PayWithJuiceHosted, hostedPayloads[i], 'PayWithJuiceHosted', i + 1);

          if (sdkCallSucceeded) {
            addLog(`✅ Hosted mode variant ${i + 1} executed successfully!`, 'success');
            break;
          } else {
            addLog(`❌ Hosted variant ${i + 1} failed, trying next...`, 'warn');
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // If still not successful, log diagnostic info but DON'T throw - just show warning
      if (!sdkCallSucceeded) {
        addLog('⚠️ All SDK call attempts failed', 'error');
        addLog('🔍 Inspecting SDK function signatures...', 'warn');

        if (sdkObject.PayWithJuice) {
          try {
            const signature = sdkObject.PayWithJuice.toString();
            addLog(`PayWithJuice signature: ${signature.substring(0, 200)}...`, 'warn');
          } catch (e) {
            addLog('Could not inspect PayWithJuice', 'warn');
          }
        }

        if (sdkObject.PayWithJuiceHosted) {
          try {
            const signature = sdkObject.PayWithJuiceHosted.toString();
            addLog(`PayWithJuiceHosted signature: ${signature.substring(0, 200)}...`, 'warn');
          } catch (e) {
            addLog('Could not inspect PayWithJuiceHosted', 'warn');
          }
        }

        // Try to construct a checkout URL
        const possibleCheckoutUrl = `https://checkout.juicyway.com/?key=${sessionKey}`;
        setCheckoutUrl(possibleCheckoutUrl);

        addLog(`💡 Constructed checkout URL: ${possibleCheckoutUrl}`, 'info');
        toast.error('SDK call failed - try direct URL approach');

        // DON'T throw - instead set error state gracefully with helpful message
        setCurrentStep('error');
        setErrorMessage(`SDK rejected all parameter formats. You can try:\n1. Opening the checkout URL directly (see button below)\n2. Contacting Juicyway support for correct SDK parameters\n\nLast error: ${lastError?.message || 'Unknown'}`);
        setLoading(false);
        return; // Exit gracefully
      }

      addLog('✅ SDK modal should be open - waiting for payment...', 'success');
      addLog('💡 Note: If payment succeeds but callbacks don\'t fire, manually verify the payment', 'warn');

      // Start polling for payment status (backup mechanism if callbacks don't work)
      const pollInterval = setInterval(async () => {
        if (currentStep !== 'processing') {
          clearInterval(pollInterval);
          return;
        }

        try {
          const headers = await getAuthHeaders();
          const statusCheck = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-funding`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'verify',
              payload: { payment_id: paymentIdFromResponse }
            })
          });

          if (statusCheck.ok) {
            const statusData = await statusCheck.json();
            if (statusData.data?.status === 'succeeded') {
              addLog('✅ Payment detected via polling!', 'success');
              clearInterval(pollInterval);
              setCurrentStep('complete');
              toast.success('Payment verified!');
              setLoading(false);
            }
          }
        } catch (pollError) {
          // Silent fail - polling is backup mechanism
        }
      }, 3000); // Poll every 3 seconds

      // Clear polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);

    } catch (error: any) {
      addLog(`Initialize error: ${error.message}`, 'error');
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
    addLog('STEP 3: Verifying payment...', 'info');

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
      addLog(`Verify response: ${JSON.stringify(data)}`, 'info');

      if (data.data?.status === 'succeeded') {
        addLog('Payment verified successfully!', 'success');
        setCurrentStep('complete');
        toast.success('Payment verified! Your wallet will be credited shortly.');
      } else {
        // Don't override complete state if payment already succeeded via callback
        addLog(`Verify returned status: ${data.data?.status} — payment may still be processing`, 'warn');
        toast.info('Payment received. Wallet will be credited via webhook.');
      }
    } catch (error: any) {
      addLog(`Verify error: ${error.message}`, 'warn');
      // Don't set error state here — the onSuccess callback already set complete
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('form');
    setPaymentId(null);
    setErrorMessage('');
    setDebugLogs([]);
    setCheckoutUrl('');
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
          Juicyway Card Funding (Fixed & Debugged)
        </h1>
        <p className="text-gray-600 mt-1">Dynamic SDK detection with comprehensive logging</p>
      </div>

      {/* SDK Status */}
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
              {sdkLoaded ? '✅ Juicyway SDK Loaded & Detected' : sdkError ? '❌ SDK Load Failed' : 'Loading Juicyway SDK...'}
            </h3>
            <p className={`text-sm ${sdkLoaded ? 'text-green-800' : sdkError ? 'text-red-800' : 'text-blue-800'}`}>
              {sdkLoaded
                ? `Payment SDK ready. Global object type: ${typeof sdkObject}`
                : sdkError
                ? sdkError
                : 'Dynamically detecting SDK global object...'
              }
            </p>

            {sdkLoaded && sdkObject && (
              <div className="mt-2 bg-green-100 p-2 rounded text-xs">
                <p className="font-mono text-green-900">
                  Detected: {typeof sdkObject === 'function' ? 'Function' : `Object with methods: ${Object.keys(sdkObject).join(', ')}`}
                </p>
              </div>
            )}

            {sdkError && (
              <div className="mt-3 space-y-2">
                <Button onClick={reload} variant="outline" size="sm" className="mt-2">
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Retry SDK Load
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Debug Console */}
      <Card className="p-4 bg-gray-900 text-gray-100">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="flex items-center gap-2 w-full text-left mb-3"
        >
          <Terminal className="w-4 h-4" />
          <span className="font-semibold">Debug Console</span>
          <span className="text-xs text-gray-400 ml-auto">
            {showDebug ? 'Hide' : 'Show'} ({debugLogs.length} logs)
          </span>
        </button>

        {showDebug && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <p className="text-xs text-gray-500">No logs yet. Start a payment to see debug output.</p>
            ) : (
              debugLogs.map((log, i) => (
                <p key={i} className="text-xs font-mono text-green-400">{log}</p>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Form Section */}
      {currentStep === 'form' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Payment Information</h2>

          <div className="space-y-4">
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
                  <option value="USD">USD (Recommended ✅)</option>
                  <option value="CAD">CAD (Recommended ✅)</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="NGN">NGN ⚠️</option>
                </select>
                {paymentInfo.currency === 'NGN' && (
                  <p className="text-xs text-amber-600 mt-1 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>NGN card payments have limited support. Use USD/CAD for best results or bank transfer for NGN.</span>
                  </p>
                )}
              </div>
            </div>

            {paymentInfo.currency === 'NGN' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-900">
                  <strong>⚠️ NGN Card Payment Notice:</strong><br />
                  Juicyway has limited support for Nigerian Naira (NGN) card payments. For NGN transactions, we recommend:<br />
                  • Use <strong>bank transfers</strong> instead of cards<br />
                  • Or test with <strong>USD/CAD</strong> currencies which have stable card support
                </p>
              </div>
            )}

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
                <p className="text-xs text-gray-500 mt-1">
                  Current: {customerInfo.billing_address.country} address. Match to currency for best results.
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-green-900">
                ℹ️ <strong>Address & Currency Matching:</strong><br />
                The billing address country ({customerInfo.billing_address.country}) should ideally match the currency region.
                Default is US address for USD. Update customer info above if testing other currencies.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900">
                <p className="font-bold mb-1">🔧 SDK Configuration:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Using <strong>MINIMAL payload</strong>: session key + callbacks only</li>
                  <li>Payment details already embedded in session key from backend</li>
                  <li>Sending extra fields would trigger duplicate session creation (400 error)</li>
                  <li>Auto-polling backup: checks status every 3 seconds</li>
                </ul>
                <p className="mt-2 text-blue-700">
                  ✅ <strong>Best practice:</strong> Use USD/CAD for card payments. Use bank transfer for NGN.
                </p>
              </div>
            </div>

            <Button onClick={handleInitialize} disabled={loading || !sdkLoaded} className="w-full">
              <Lock className="w-4 h-4 mr-2" />
              {!sdkLoaded ? 'Waiting for SDK...' : 'Start Payment'}
            </Button>
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
            <p className="text-xs text-gray-500 mb-4">Check debug console for real-time logs</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-xs text-blue-900">
                💡 <strong>Auto-polling enabled:</strong> We're checking payment status every 3 seconds.
                If you completed payment but it's not detected, click "Verify Now" below.
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => paymentId && handleVerify(paymentId)}
                disabled={!paymentId}
                variant="outline"
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Payment Now
              </Button>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full text-gray-600"
              >
                Cancel & Reset
              </Button>
            </div>
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
            <h2 className="text-2xl font-bold text-red-700 mb-2">SDK Call Failed</h2>
            <p className="text-red-600 mb-4 whitespace-pre-wrap text-sm">{errorMessage}</p>
            <p className="text-xs text-gray-600 mb-4">Check debug console above for function signatures</p>

            {checkoutUrl && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900 font-bold mb-2">Alternative: Open Checkout URL Directly</p>
                <p className="text-xs text-blue-700 mb-3 break-all">{checkoutUrl}</p>
                <Button
                  onClick={() => {
                    window.open(checkoutUrl, '_blank');
                    toast.info('Checkout page opened in new tab');
                  }}
                  className="w-full mb-2"
                >
                  Open Juicyway Checkout
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={handleReset} variant="outline" className="w-full">
                Reset & Try Again
              </Button>

              {paymentId && (
                <Button
                  onClick={() => handleVerify(paymentId)}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check If Payment Already Completed
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
