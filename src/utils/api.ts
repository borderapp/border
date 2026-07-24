// API configuration and helper functions for Border fintech app
import { supabase } from '@/lib/supabase';

// Development mode - set to false when you have real backend APIs
const DEV_MODE = false;

const API_BASE_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server`
  : 'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/server';

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

// Mock delay to simulate network requests
const mockDelay = (ms: number = 1000) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to make authenticated requests
async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = true
) {
  // In development mode, return mock responses
  if (DEV_MODE) {
    await mockDelay(800); // Simulate network delay
    return mockAPIResponse(endpoint, options);
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if required
  if (requiresAuth) {
    // Get JWT token from Supabase session (the source of truth)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      headers['Authorization'] = `Bearer ${ANON_KEY}`;
    }
  } else {
    headers['Authorization'] = `Bearer ${ANON_KEY}`;
  }

  // Always add apikey header for Supabase Edge Functions
  headers['apikey'] = ANON_KEY;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// Mock API responses for development
function mockAPIResponse(endpoint: string, options: RequestInit) {
  const method = options.method || 'GET';
  
  // Mock signup
  if (endpoint === '/auth/signup' && method === 'POST') {
    return {
      success: true,
      user: {
        id: 'mock-user-' + Date.now(),
        email: 'user@example.com',
        phone: '+2348012345678',
      },
      message: 'OTP sent successfully',
    };
  }
  
  // Mock OTP verification
  if (endpoint === '/auth/verify-otp' && method === 'POST') {
    return {
      success: true,
      message: 'Phone verified successfully',
    };
  }
  
  // Mock KYC submission
  if (endpoint === '/kyc/submit' && method === 'POST') {
    return {
      success: true,
      kycStatus: 'pending',
      message: 'KYC submitted for verification',
    };
  }
  
  // Mock KYC status
  if (endpoint === '/kyc/status' && method === 'GET') {
    return {
      success: true,
      status: 'verified',
      tier: 2,
    };
  }
  
  // Mock wallet balances
  if (endpoint === '/wallet/balances' && method === 'GET') {
    return {
      success: true,
      balances: [
        { currency: 'NGN', balance: 250000 },
        { currency: 'USD', balance: 1250.50 },
        { currency: 'GBP', balance: 850.25 },
      ],
    };
  }
  
  // Mock FX rates
  if (endpoint === '/fx/rates' && method === 'GET') {
    return {
      success: true,
      rates: {
        USDNGN: 1650,
        GBPNGN: 2100,
        EURNGN: 1800,
      },
    };
  }
  
  // Default mock response
  return {
    success: true,
    message: 'Operation completed successfully',
  };
}

// ==================== AUTH API ====================

export const authAPI = {
  // Sign up new user
  signup: async (data: {
    email: string;
    password: string;
    phone: string;
    name: string;
  }) => {
    const result = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
    
    // Store access token
    if (result.user) {
      // In production, you'd get the session token from sign in
    }
    
    return result;
  },

  // Sign in user
  signin: async (email: string, password: string) => {
    const result = await apiRequest('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);
    
    // Store access token
    if (result.session?.access_token) {
      localStorage.setItem('border_access_token', result.session.access_token);
      localStorage.setItem('border_user', JSON.stringify(result.user));
    }
    
    return result;
  },

  // Get current session
  getSession: async () => {
    return apiRequest('/auth/session', {
      method: 'GET',
    });
  },

  // Sign out
  signout: () => {
    localStorage.removeItem('border_access_token');
    localStorage.removeItem('border_user');
  },
};

// ==================== USER API ====================

export const userAPI = {
  // Get user profile
  getProfile: async () => {
    return apiRequest('/user/profile', {
      method: 'GET',
    });
  },

  // Update user profile
  updateProfile: async (updates: Record<string, any>) => {
    return apiRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// ==================== WALLET API ====================

export const walletAPI = {
  // Get wallet balances
  getBalances: async () => {
    return apiRequest('/wallet/balances', {
      method: 'GET',
    });
  },
};

// ==================== TRANSACTION API ====================

export const transactionAPI = {
  // Create transaction
  create: async (transactionData: Record<string, any>) => {
    return apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  },

  // Get user transactions
  getAll: async () => {
    return apiRequest('/transactions', {
      method: 'GET',
    });
  },
};

// ==================== FX API ====================

export const fxAPI = {
  // Get FX rates
  getRates: async () => {
    return apiRequest('/fx/rates', {
      method: 'GET',
    }, false);
  },

  // Convert currency
  convert: async (fromCurrency: string, toCurrency: string, amount: number) => {
    return apiRequest('/fx/convert', {
      method: 'POST',
      body: JSON.stringify({ fromCurrency, toCurrency, amount }),
    });
  },
};

// ==================== KYC API ====================

export const kycAPI = {
  // Submit KYC
  submit: async (kycData: Record<string, any>) => {
    return apiRequest('/kyc/submit', {
      method: 'POST',
      body: JSON.stringify(kycData),
    });
  },

  // Get KYC status
  getStatus: async () => {
    return apiRequest('/kyc/status', {
      method: 'GET',
    });
  },
};

// ==================== BILL PAYMENT API ====================

export const billAPI = {
  // Pay bill
  pay: async (billData: {
    billType: string;
    provider: string;
    amount: number;
    accountNumber: string;
  }) => {
    return apiRequest('/bills/pay', {
      method: 'POST',
      body: JSON.stringify(billData),
    });
  },
};

// ==================== TRANSFER API ====================

export const transferAPI = {
  // P2P Transfer
  p2p: async (transferData: {
    recipientId: string;
    amount: number;
    currency: string;
    reference?: string;
    purpose?: string;
  }) => {
    return apiRequest('/transfer/p2p', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  },
};

// ==================== UTILITY FUNCTIONS ====================

export const utils = {
  // Format currency
  formatCurrency: (amount: number, currency: string): string => {
    const symbols: Record<string, string> = {
      NGN: '₦',
      USD: '$',
      GBP: '£',
      EUR: '€',
      GHS: 'GH₵',
      ZAR: 'R',
      CAD: 'C$',
      CNY: '¥',
    };
    
    return `${symbols[currency] || currency}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },

  // Get current user from storage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('border_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('border_access_token');
  },
};

export default {
  authAPI,
  userAPI,
  walletAPI,
  transactionAPI,
  fxAPI,
  kycAPI,
  billAPI,
  transferAPI,
  utils,
};