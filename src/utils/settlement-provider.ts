/**
 * Settlement Provider Abstraction Layer
 * 
 * This provides a unified interface for different settlement providers:
 * - Flutterwave (Nigerian operations)
 * - Circle (International operations)
 * 
 * The abstraction allows easy switching between providers without changing
 * the application logic or frontend.
 */

// ==================== TYPES ====================

export interface BankAccount {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
}

export interface TransferRequest {
  amount: number;
  currency: string;
  recipientAccount: BankAccount;
  narration: string;
  reference: string;
  userId: string;
}

export interface TransferResponse {
  success: boolean;
  reference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  providerReference?: string;
  fee?: number;
  error?: string;
}

export interface BillPaymentRequest {
  type: 'airtime' | 'data' | 'electricity' | 'cable' | 'internet';
  amount: number;
  customerId: string; // Phone number, meter number, smartcard number
  provider: string;
  reference: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface BillPaymentResponse {
  success: boolean;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  token?: string; // For electricity
  providerReference?: string;
  error?: string;
}

export interface AccountVerificationRequest {
  accountNumber: string;
  bankCode: string;
}

export interface AccountVerificationResponse {
  success: boolean;
  accountName?: string;
  accountNumber?: string;
  error?: string;
}

export interface Bank {
  code: string;
  name: string;
}

export interface BanksListResponse {
  success: boolean;
  banks: Bank[];
  error?: string;
}

export interface BillProvider {
  code: string;
  name: string;
  category?: string;
}

export interface BillProvidersResponse {
  success: boolean;
  providers: BillProvider[];
  error?: string;
}

// ==================== PROVIDER INTERFACE ====================

/**
 * All settlement providers must implement this interface
 */
export interface ISettlementProvider {
  name: string;
  
  // Transfer operations
  transfer(request: TransferRequest): Promise<TransferResponse>;
  getTransferStatus(reference: string): Promise<TransferResponse>;
  
  // Account operations
  verifyAccount(request: AccountVerificationRequest): Promise<AccountVerificationResponse>;
  getBanksList(country?: string): Promise<BanksListResponse>;
  
  // Bill payment operations
  payBill(request: BillPaymentRequest): Promise<BillPaymentResponse>;
  getBillProviders(type: string): Promise<BillProvidersResponse>;
  getBillStatus(reference: string): Promise<BillPaymentResponse>;
}

// ==================== PROVIDER REGISTRY ====================

class ProviderRegistry {
  private providers: Map<string, ISettlementProvider> = new Map();
  
  register(name: string, provider: ISettlementProvider): void {
    this.providers.set(name, provider);
  }
  
  get(name: string): ISettlementProvider | undefined {
    return this.providers.get(name);
  }
  
  getAll(): Map<string, ISettlementProvider> {
    return this.providers;
  }
}

export const providerRegistry = new ProviderRegistry();

// ==================== ROUTING LOGIC ====================

/**
 * Get the appropriate settlement provider based on country
 */
export function getProviderForCountry(country: string): ISettlementProvider {
  const countryUpper = country.toUpperCase();
  
  // Nigeria → Flutterwave
  if (countryUpper === 'NIGERIA' || countryUpper === 'NG' || countryUpper === 'NGA') {
    const provider = providerRegistry.get('flutterwave');
    if (!provider) {
      throw new Error('Flutterwave provider not registered');
    }
    return provider;
  }
  
  // All other countries → Circle
  const provider = providerRegistry.get('circle');
  if (!provider) {
    throw new Error('Circle provider not registered');
  }
  return provider;
}

/**
 * Get the appropriate provider for a currency
 */
export function getProviderForCurrency(currency: string): ISettlementProvider {
  const currencyUpper = currency.toUpperCase();
  
  // NGN → Flutterwave
  if (currencyUpper === 'NGN') {
    const provider = providerRegistry.get('flutterwave');
    if (!provider) {
      throw new Error('Flutterwave provider not registered');
    }
    return provider;
  }
  
  // All other currencies → Circle
  const provider = providerRegistry.get('circle');
  if (!provider) {
    throw new Error('Circle provider not registered');
  }
  return provider;
}

// ==================== EXPORTS ====================

export default {
  providerRegistry,
  getProviderForCountry,
  getProviderForCurrency,
};
