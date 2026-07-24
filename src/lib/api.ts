import { supabase } from './supabase';

const API_BASE_URL = 'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/server';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

/**
 * Border API Client
 * 
 * CRITICAL: This uses custom headers (x-user-token, x-user-id) instead of Authorization header
 * to bypass Supabase's automatic JWT validation that was causing 401 errors.
 */

interface ApiOptions {
  method?: string;
  body?: any;
  requiresAuth?: boolean;
}

/**
 * Make an authenticated API request to Border backend
 */
export async function apiRequest(endpoint: string, options: ApiOptions = {}, baseUrl: string = API_BASE_URL) {
  const { method = 'GET', body, requiresAuth = false } = options;

  const headers: Record<string, string> = {};

  // CORS FIX: Only set Content-Type for POST/PUT requests with body
  // GET requests with Content-Type trigger CORS preflight
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    headers['Content-Type'] = 'application/json';
  }

  // ONLY add apikey header if auth is required
  // This prevents CORS preflight on public endpoints
  if (requiresAuth) {
    headers['apikey'] = ANON_KEY;
  }

  // Add authentication if required
  if (requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      // CRITICAL: Use x-user-token instead of Authorization to bypass Supabase JWT validation
      headers['x-user-token'] = session.access_token;
      
      // Also send user ID directly for faster lookups
      if (session.user?.id) {
        headers['x-user-id'] = session.user.id;
      }
      
    } else {
      throw new Error('Not authenticated');
    }
  }

  const url = `${baseUrl}${endpoint}`;

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  
  
  const responseData = await response.json();
  
  
  if (!response.ok) {
    throw new Error(responseData.error || responseData.message || 'API request failed');
  }

  return responseData;
}

/**
 * Auth API
 */
export const auth = {
  signup: async (data: {
    email: string;
    password: string;
    phone: string;
    name: string;
    country: string;
    city: string;
    state: string;
  }) => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: data,
    });
  },

  signin: async (email: string, password: string) => {
    return apiRequest('/auth/signin', {
      method: 'POST',
      body: { email, password },
    });
  },

  resolvePhone: async (phone: string) => {
    return apiRequest(`/auth/resolve-phone/${phone}`);
  },
};

/**
 * OTP API
 */
export const otp = {
  sendWhatsApp: async (phone: string, otp: string) => {
    return apiRequest('/otp/send-whatsapp', {
      method: 'POST',
      body: { phone, otp },
    });
  },

  sendSMS: async (phone: string, otp: string) => {
    return apiRequest('/otp/send-sms', {
      method: 'POST',
      body: { phone, otp },
    });
  },

  store: async (reference: string, identifier: string, otp: string, method: string, expiresAt: string) => {
    return apiRequest('/otp/store', {
      method: 'POST',
      body: { reference, identifier, otp, method, expiresAt },
    });
  },

  verify: async (reference: string, otp: string) => {
    return apiRequest('/otp/verify', {
      method: 'POST',
      body: { reference, otp },
    });
  },
};

/**
 * Wallet API
 */
export const wallet = {
  getBalances: async () => {
    return apiRequest('/wallet/balances', {
      requiresAuth: true,
    });
  },
};

/**
 * Transfer API
 */
export const transfer = {
  p2p: async (data: {
    recipientId: string;
    amount: number;
    currency: string;
    reference?: string;
    purpose?: string;
  }) => {
    return apiRequest('/transfer/p2p', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  },
};

/**
 * FX API
 */
export const fx = {
  getRates: async () => {
    return apiRequest('/fx/rates');
  },
};

/**
 * Currency Conversion API
 */
export const convert = {
  currency: async (data: {
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    exchangeRate: number;
  }) => {
    return apiRequest('/convert/currency', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  },
};

/**
 * Flutterwave API - Nigerian Settlement Provider
 */
export const flutterwave = {
  // Bank Operations
  getBanks: async () => {
    // Use the lightweight standalone function instead of the heavy server function
    const result = await apiRequest('/banks', {}, 'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1');
    return result;
  },

  verifyAccount: async (bankCode: string, accountNumber: string) => {
    // Use the lightweight standalone function
    const result = await apiRequest('/banks/verify', {
      method: 'POST',
      body: { bankCode, accountNumber },
    }, 'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1');
    return result;
  },

  transfer: async (data: {
    destinationBankCode: string;
    destinationAccountNumber: string;
    amount: number;
    narration?: string;
  }) => {
    
    try {
      // Get user session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // WORKAROUND: Send data as text to avoid Content-Type header CORS preflight
      const response = await fetch('https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/server/flutterwave/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });


      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transfer failed: ${errorText}`);
      }

      const result = await response.json();
      
      if (result?.error) {
        // Flutterwave specific errors
        if (result.error.includes('Insufficient balance') || 
            result.error.includes('insufficient funds')) {
          throw new Error('Transfer failed: Insufficient balance in treasury. Please fund your Flutterwave account.');
        }
        throw new Error(result.error);
      }
      
      return result;
    } catch (err: any) {
      throw err;
    }
  },

  getTransferStatus: async (reference: string) => {
    return apiRequest(`/flutterwave/transfer/status/${reference}`);
  },

  // Bill Payments
  buyAirtime: async (data: {
    phoneNumber: string;
    amount: number;
    network: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
  }) => {
    return apiRequest('/flutterwave/buy-airtime', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  },

  buyData: async (data: {
    phoneNumber: string;
    bundleCode: string;
    network: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
    amount: number;
  }) => {
    return apiRequest('/flutterwave/buy-data', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  },

  payElectricity: async (data: {
    disco: string;
    meterNumber: string;
    amount: number;
    meterType: 'PREPAID' | 'POSTPAID';
  }) => {
    return apiRequest('/flutterwave/pay-electricity', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  },

  payCable: async (data: {
    provider: 'DSTV' | 'GOTV' | 'STARTIMES';
    smartCardNumber: string;
    packageCode: string;
    amount: number;
  }) => {
    return apiRequest('/flutterwave/pay-cable', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  },

  getTransactionStatus: async (reference: string) => {
    return apiRequest(`/flutterwave/transaction/status/${reference}`);
  },

  getProviders: async (serviceType: 'airtime' | 'data' | 'electricity' | 'cable') => {
    return apiRequest(`/flutterwave/providers/${serviceType}`);
  },
};

/**
 * Health check
 */
export const health = {
  check: async () => {
    return apiRequest('/health');
  },
};

/**
 * 9PSB API - Fund Transfer
 */
export const psb = {
  // Bank Transfer Operations
  transfer: {
    getBanks: async () => {
      return apiRequest('/9psb/banks');
    },

    verifyAccount: async (bankCode: string, accountNumber: string) => {
      return apiRequest('/9psb/verify-account', {
        method: 'POST',
        body: { bankCode, accountNumber },
      });
    },

    nipTransfer: async (data: {
      destinationBankCode: string;
      destinationAccountNumber: string;
      amount: number;
      narration: string;
      pin?: string;
    }) => {
      return apiRequest('/9psb/transfer/nip', {
        method: 'POST',
        body: data,
        requiresAuth: true,
      });
    },

    getTransferStatus: async (reference: string) => {
      return apiRequest(`/9psb/transfer/status/${reference}`);
    },

    getBalance: async (accountNumber?: string) => {
      const endpoint = accountNumber 
        ? `/9psb/balance/${accountNumber}` 
        : '/9psb/balance';
      return apiRequest(endpoint);
    },
  },

  // Value Added Services (VAS)
  vas: {
    getProviders: async (serviceType: 'airtime' | 'data' | 'electricity' | 'cable' | 'internet' | 'exams') => {
      return apiRequest(`/9psb/providers/${serviceType}`);
    },

    getDataBundles: async (network: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE') => {
      return apiRequest(`/9psb/data-bundles/${network}`);
    },

    getCablePackages: async (provider: 'DSTV' | 'GOTV' | 'STARTIMES') => {
      return apiRequest(`/9psb/cable-packages/${provider}`);
    },

    validateCustomer: async (data: {
      serviceType: string;
      provider: string;
      customerId: string;
    }) => {
      return apiRequest('/9psb/validate-customer', {
        method: 'POST',
        body: data,
      });
    },

    buyAirtime: async (data: {
      phoneNumber: string;
      amount: number;
      network: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
    }) => {
      return apiRequest('/9psb/buy-airtime', {
        method: 'POST',
        body: data,
        requiresAuth: true,
      });
    },

    buyData: async (data: {
      phoneNumber: string;
      bundleCode: string;
      network: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
      amount: number;
    }) => {
      return apiRequest('/9psb/buy-data', {
        method: 'POST',
        body: data,
        requiresAuth: true,
      });
    },

    payElectricity: async (data: {
      disco: string;
      meterNumber: string;
      amount: number;
      meterType: 'PREPAID' | 'POSTPAID';
    }) => {
      return apiRequest('/9psb/pay-electricity', {
        method: 'POST',
        body: data,
        requiresAuth: true,
      });
    },

    payCable: async (data: {
      provider: 'DSTV' | 'GOTV' | 'STARTIMES';
      smartCardNumber: string;
      packageCode: string;
      amount: number;
    }) => {
      return apiRequest('/9psb/pay-cable', {
        method: 'POST',
        body: data,
        requiresAuth: true,
      });
    },

    getTransactionStatus: async (reference: string) => {
      return apiRequest(`/9psb/transaction/status/${reference}`);
    },
  },
};