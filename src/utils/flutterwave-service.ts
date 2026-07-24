/**
 * Flutterwave Payment Service for Border App
 * 
 * This service handles payment initialization and verification using Flutterwave's API.
 * Supports both inline payment flow and standard payment flow.
 */

import {
  FLUTTERWAVE_CONFIG,
  FLUTTERWAVE_API,
  FLUTTERWAVE_CUSTOMIZATION,
  FLUTTERWAVE_REDIRECT,
  getPaymentOptions,
} from './flutterwave-config';

export interface FlutterwavePaymentData {
  amount: number;
  currency: string;
  email: string;
  name: string;
  phone?: string;
  tx_ref?: string;
  redirect_url?: string;
}

export interface FlutterwaveResponse {
  status: string;
  message: string;
  data?: any;
}

/**
 * Initialize a Flutterwave payment
 * @param paymentData - Payment details
 * @returns Payment initialization response with payment link
 */
export async function initializeFlutterwavePayment(
  paymentData: FlutterwavePaymentData
): Promise<FlutterwaveResponse> {
  try {
    const tx_ref = paymentData.tx_ref || `BORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const payload = {
      tx_ref,
      amount: paymentData.amount,
      currency: paymentData.currency,
      redirect_url: paymentData.redirect_url || window.location.origin + '/?payment=success',
      payment_options: getPaymentOptions(),
      customer: {
        email: paymentData.email,
        name: paymentData.name,
        phonenumber: paymentData.phone || '',
      },
      customizations: {
        title: FLUTTERWAVE_CUSTOMIZATION.title,
        description: `Add ${paymentData.currency} ${paymentData.amount} to your Border wallet`,
        logo: FLUTTERWAVE_CUSTOMIZATION.logo,
      },
    };

    const response = await fetch(`${FLUTTERWAVE_API.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_CONFIG.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.status === 'success') {
      return {
        status: 'success',
        message: 'Payment initialized successfully',
        data: {
          link: data.data.link,
          tx_ref,
          payment_id: data.data.id,
        },
      };
    } else {
      throw new Error(data.message || 'Payment initialization failed');
    }
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'Failed to initialize payment',
    };
  }
}

/**
 * Verify a Flutterwave payment transaction
 * @param transactionId - Transaction ID to verify
 * @returns Verification response
 */
export async function verifyFlutterwavePayment(
  transactionId: string
): Promise<FlutterwaveResponse> {
  try {
    const response = await fetch(
      `${FLUTTERWAVE_API.baseUrl}/transactions/${transactionId}/verify`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_CONFIG.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.status === 'success') {
      return {
        status: 'success',
        message: 'Payment verified successfully',
        data: data.data,
      };
    } else {
      throw new Error(data.message || 'Payment verification failed');
    }
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'Failed to verify payment',
    };
  }
}

/**
 * Get Flutterwave inline payment script configuration
 * This function returns configuration for using Flutterwave's inline payment popup
 */
export function getFlutterwaveInlineConfig(
  paymentData: FlutterwavePaymentData,
  onSuccess: (response: any) => void,
  onClose: () => void
) {
  const tx_ref = paymentData.tx_ref || `BORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const redirectUrl = FLUTTERWAVE_REDIRECT.successUrl;
  
  
  return {
    public_key: FLUTTERWAVE_CONFIG.publicKey,
    tx_ref,
    amount: paymentData.amount,
    currency: paymentData.currency,
    payment_options: getPaymentOptions(),
    customer: {
      email: paymentData.email,
      name: paymentData.name,
      phone_number: paymentData.phone || '',
    },
    customizations: {
      title: FLUTTERWAVE_CUSTOMIZATION.title,
      description: `Add ${paymentData.currency} ${paymentData.amount} to your Border wallet`,
      logo: FLUTTERWAVE_CUSTOMIZATION.logo,
    },
    callback: onSuccess,
    onclose: onClose,
  };
}

/**
 * Load Flutterwave inline script dynamically
 * @returns Promise that resolves when script is loaded
 */
export function loadFlutterwaveScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.getElementById('flutterwave-inline-script');
    if (existingScript) {
      // Check if window.FlutterwaveCheckout is available
      if (window.FlutterwaveCheckout) {
        resolve();
      } else {
        // Script exists but checkout not loaded - remove and reload
        existingScript.remove();
      }
    }

    const script = document.createElement('script');
    script.id = 'flutterwave-inline-script';
    script.src = FLUTTERWAVE_API.checkoutUrl;
    script.async = true;
    
    let timeoutId: NodeJS.Timeout;
    
    script.onload = () => {
      clearTimeout(timeoutId);
      // Give it a moment to initialize
      setTimeout(() => {
        if (window.FlutterwaveCheckout) {
          resolve();
        } else {
          reject(new Error('Flutterwave checkout not available after script load'));
        }
      }, 100);
    };
    
    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Failed to load Flutterwave script'));
    };
    
    // Add timeout for script loading
    timeoutId = setTimeout(() => {
      script.remove();
      reject(new Error('Flutterwave script loading timed out'));
    }, 15000); // 15 second timeout
    
    document.head.appendChild(script);
  });
}

/**
 * Open Flutterwave inline payment modal
 * @param config - Payment configuration
 */
export async function openFlutterwavePayment(
  paymentData: FlutterwavePaymentData,
  onSuccess: (response: any) => void,
  onClose: () => void
): Promise<void> {
  try {
    // Load the Flutterwave script
    await loadFlutterwaveScript();
    
    // Get configuration
    const config = getFlutterwaveInlineConfig(paymentData, onSuccess, onClose);
    
    // Open payment modal
    if (window.FlutterwaveCheckout) {
      window.FlutterwaveCheckout(config);
    } else {
      throw new Error('Flutterwave checkout not available');
    }
  } catch (error: any) {
    throw error;
  }
}

/**
 * Get supported currencies for Flutterwave
 */
export const FLUTTERWAVE_SUPPORTED_CURRENCIES = [
  'NGN', // Nigerian Naira
  'USD', // US Dollar
  'GBP', // British Pound
  'EUR', // Euro
  'GHS', // Ghanaian Cedi
  'KES', // Kenyan Shilling
  'ZAR', // South African Rand
  'UGX', // Ugandan Shilling
];

/**
 * Check if currency is supported by Flutterwave
 * @param currency - Currency code to check
 * @returns boolean indicating if currency is supported
 */
export function isFlutterwaveCurrencySupported(currency: string): boolean {
  return FLUTTERWAVE_SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
}