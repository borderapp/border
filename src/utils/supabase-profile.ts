/**
 * Supabase Profile Management Utilities
 * 
 * These functions handle all database operations for user profiles,
 * including KYC data, banking details, and wallet management.
 * 
 * Uses Row Level Security (RLS) - users can only access their own data.
 */

import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// ==================== INTERFACES ====================

export interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  postal_code?: string;
  
  // KYC
  bvn?: string | null;
  nin?: string | null;
  kyc_level?: number;
  kyc_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  bvn_verified?: boolean;
  nin_verified?: boolean;
  documents_submitted?: any[];
  
  // Banking
  account_number?: string | null;
  account_name?: string | null;
  bank_name?: string;
  bank_code?: string;
  customer_id?: string | null;
  account_reference?: string | null;
  
  // Limits
  daily_limit?: number;
  monthly_limit?: number;
  single_transaction_limit?: number;
  
  // Wallets
  wallets?: Record<string, number>;
  stablecoin_wallets?: Record<string, number>;
  celo_wallet_address?: string | null;
  
  // Business
  is_business_account?: boolean;
  business_name?: string | null;
  business_registration_number?: string | null;
  business_type?: string | null;
  
  // Preferences
  preferred_currency?: string;
  notification_preferences?: any;
  
  // Security
  two_factor_enabled?: boolean;
  pin_hash?: string | null;
  biometric_enabled?: boolean;
  
  // Status
  account_status?: 'ACTIVE' | 'SUSPENDED' | 'FROZEN' | 'CLOSED';
  account_tier?: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'BUSINESS';
  
  avatar_url?: string | null;
  metadata?: any;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  email_verified_at?: string | null;
  phone_verified_at?: string | null;
}

export interface CreateProfileInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  bvn?: string;
  nin?: string;
  account_number?: string;
  account_name?: string;
  customer_id?: string;
  account_reference?: string;
  kyc_level?: number;
}

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  preferred_currency?: string;
  avatar_url?: string;
  notification_preferences?: any;
  two_factor_enabled?: boolean;
  biometric_enabled?: boolean;
}

export interface WalletBalance {
  NGN: number;
  USD: number;
  GBP: number;
  EUR: number;
  GHS: number;
  ZAR: number;
  CAD: number;
  CNY: number;
}

// ==================== PROFILE CRUD OPERATIONS ====================

export const profileService = {
  /**
   * Get the current user's profile
   */
  async getCurrentProfile(): Promise<{ data: ProfileData | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: 'No authenticated user' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Get a profile by user ID (admin only or own profile)
   */
  async getProfileById(userId: string): Promise<{ data: ProfileData | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Get a profile by account number
   */
  async getProfileByAccountNumber(accountNumber: string): Promise<{ data: ProfileData | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_number', accountNumber)
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Get a profile by email
   */
  async getProfileByEmail(email: string): Promise<{ data: ProfileData | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Create a new profile (called during signup)
   */
  async createProfile(userId: string, profileData: CreateProfileInput): Promise<{ data: ProfileData | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Update profile (users can only update their own)
   */
  async updateProfile(userId: string, updates: UpdateProfileInput): Promise<{ data: ProfileData | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);

      return { error };
    } catch (error: any) {
      return { error };
    }
  },
};

// ==================== KYC OPERATIONS ====================

export const kycService = {
  /**
   * Update KYC information
   */
  async updateKYC(userId: string, kycData: {
    bvn?: string;
    nin?: string;
    bvn_verified?: boolean;
    nin_verified?: boolean;
    kyc_level?: number;
    kyc_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
    documents_submitted?: any[];
  }): Promise<{ data: ProfileData | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...kycData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Update KYC status
   */
  async updateKYCStatus(
    userId: string, 
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW'
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_status: status })
        .eq('id', userId);

      return { error };
    } catch (error: any) {
      return { error };
    }
  },

  /**
   * Update KYC tier/level
   */
  async updateKYCLevel(userId: string, level: 0 | 1 | 2 | 3 | 4): Promise<{ error: any }> {
    try {
      // Update limits based on tier
      const limits = {
        0: { daily_limit: 0, monthly_limit: 0, single_transaction_limit: 0 },
        1: { daily_limit: 50000, monthly_limit: 200000, single_transaction_limit: 50000 },
        2: { daily_limit: 500000, monthly_limit: 5000000, single_transaction_limit: 500000 },
        3: { daily_limit: 5000000, monthly_limit: 50000000, single_transaction_limit: 5000000 },
        4: { daily_limit: 10000000, monthly_limit: 100000000, single_transaction_limit: 10000000 },
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_level: level,
          ...limits[level as keyof typeof limits],
        })
        .eq('id', userId);

      return { error };
    } catch (error: any) {
      return { error };
    }
  },

  /**
   * Get KYC status
   */
  async getKYCStatus(userId: string): Promise<{ 
    data: { 
      kyc_level: number; 
      kyc_status: string; 
      bvn_verified: boolean;
      nin_verified: boolean;
      documents_submitted: any[];
    } | null; 
    error: any 
  }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_level, kyc_status, bvn_verified, nin_verified, documents_submitted')
        .eq('id', userId)
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  },
};

// ==================== BANKING OPERATIONS ====================

export const bankingService = {
  /**
   * Update banking details (9PSB account info)
   */
  async updateBankingDetails(userId: string, bankingData: {
    account_number: string;
    account_name: string;
    bank_name?: string;
    bank_code?: string;
    customer_id?: string;
    account_reference?: string;
  }): Promise<{ data: ProfileData | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...bankingData,
          bank_name: bankingData.bank_name || '9 Payment Service Bank',
          bank_code: bankingData.bank_code || '120001',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Get banking details
   */
  async getBankingDetails(userId: string): Promise<{ 
    data: {
      account_number: string | null;
      account_name: string | null;
      bank_name: string;
      bank_code: string;
      customer_id: string | null;
    } | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('account_number, account_name, bank_name, bank_code, customer_id')
        .eq('id', userId)
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  },
};

// ==================== WALLET OPERATIONS ====================

export const walletService = {
  /**
   * Get wallet balances
   */
  async getWalletBalances(userId: string): Promise<{ data: WalletBalance | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallets')
        .eq('id', userId)
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data.wallets as WalletBalance, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Get balance for a specific currency
   */
  async getCurrencyBalance(userId: string, currency: string): Promise<{ balance: number; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallets')
        .eq('id', userId)
        .single();

      if (error) {
        return { balance: 0, error };
      }

      const balance = (data.wallets as any)?.[currency] || 0;
      return { balance, error: null };
    } catch (error: any) {
      return { balance: 0, error };
    }
  },

  /**
   * Update wallet balance (add or subtract)
   * Note: For production, this should be done server-side or use the SQL function
   */
  async updateWalletBalance(
    userId: string, 
    currency: string, 
    amount: number, 
    operation: 'add' | 'subtract'
  ): Promise<{ newBalance: number | null; error: any }> {
    try {
      // Get current balance
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('wallets')
        .eq('id', userId)
        .single();

      if (fetchError) {
        return { newBalance: null, error: fetchError };
      }

      const currentWallets = profileData.wallets as Record<string, number>;
      const currentBalance = currentWallets[currency] || 0;

      // Calculate new balance
      let newBalance: number;
      if (operation === 'add') {
        newBalance = currentBalance + amount;
      } else {
        newBalance = currentBalance - amount;
        if (newBalance < 0) {
          return { 
            newBalance: null, 
            error: { message: `Insufficient balance in ${currency} wallet` }
          };
        }
      }

      // Update wallet
      const updatedWallets = {
        ...currentWallets,
        [currency]: newBalance,
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallets: updatedWallets })
        .eq('id', userId);

      if (updateError) {
        return { newBalance: null, error: updateError };
      }

      return { newBalance, error: null };
    } catch (error: any) {
      return { newBalance: null, error };
    }
  },

  /**
   * Check if user has sufficient balance
   */
  async hasSufficientBalance(userId: string, currency: string, amount: number): Promise<boolean> {
    try {
      const { balance, error } = await this.getCurrencyBalance(userId, currency);
      
      if (error) {
        return false;
      }

      return balance >= amount;
    } catch (error: any) {
      return false;
    }
  },

  /**
   * Transfer between currencies (internal conversion)
   */
  async transferBetweenCurrencies(
    userId: string,
    fromCurrency: string,
    toCurrency: string,
    fromAmount: number,
    toAmount: number
  ): Promise<{ success: boolean; error: any }> {
    try {
      // Check sufficient balance
      const hasFunds = await this.hasSufficientBalance(userId, fromCurrency, fromAmount);
      if (!hasFunds) {
        return { 
          success: false, 
          error: { message: `Insufficient balance in ${fromCurrency} wallet` }
        };
      }

      // Subtract from source currency
      const { error: subtractError } = await this.updateWalletBalance(
        userId, 
        fromCurrency, 
        fromAmount, 
        'subtract'
      );

      if (subtractError) {
        return { success: false, error: subtractError };
      }

      // Add to destination currency
      const { error: addError } = await this.updateWalletBalance(
        userId, 
        toCurrency, 
        toAmount, 
        'add'
      );

      if (addError) {
        // Rollback: add back to source currency
        await this.updateWalletBalance(userId, fromCurrency, fromAmount, 'add');
        return { success: false, error: addError };
      }

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error };
    }
  },
};

// ==================== AUTHENTICATION HELPERS ====================

export const authHelpers = {
  /**
   * Get current user from Supabase Auth
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  },

  /**
   * Get user ID
   */
  async getUserId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.id || null;
  },
};

// ==================== EXPORT DEFAULT ====================

export default {
  profile: profileService,
  kyc: kycService,
  banking: bankingService,
  wallet: walletService,
  auth: authHelpers,
};
