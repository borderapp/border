/**
 * Border Funding Router
 * 
 * Routes funding requests to appropriate payment provider based on:
 * - User's country/region
 * - Currency
 * - Payment method
 * - Circle availability
 * 
 * Providers:
 * - Circle: Primary for supported countries (US, EU, etc.)
 * - 9PSB: Nigeria NGN transactions
 * - Flutterwave: West Africa (backup/alternative)
 * - Manual: Admin adjustments
 */

import { Currency } from './internal-ledger';

export type FundingProvider = 'circle' | '9psb' | 'flutterwave' | 'manual';
export type PaymentMethod = 'ach' | 'wire' | 'card' | 'bank_transfer' | 'mobile_money' | 'manual';

export interface FundingRoute {
  provider: FundingProvider;
  supportedMethods: PaymentMethod[];
  estimatedTime: string;
  fees: {
    percentage: number;
    fixed: number;
    currency: Currency;
  };
}

// ==================== COUNTRY & CURRENCY SUPPORT ====================

/**
 * Countries where Circle payment rails are fully supported
 */
const CIRCLE_SUPPORTED_COUNTRIES = [
  // North America
  'US', 'CA',
  
  // Europe
  'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'SE', 'DK', 'FI', 'NO',
  'PL', 'PT', 'GR', 'CZ', 'RO', 'HU', 'CH',
  
  // Asia Pacific
  'AU', 'NZ', 'SG', 'HK', 'JP',
  
  // Middle East
  'AE', 'IL',
];

/**
 * Countries where local partners are primary
 */
const LOCAL_PARTNER_COUNTRIES: Record<string, FundingProvider> = {
  // Nigeria - 9PSB
  'NG': '9psb',
  
  // West Africa - Flutterwave
  'GH': 'flutterwave', // Ghana
  'KE': 'flutterwave', // Kenya
  'UG': 'flutterwave', // Uganda
  'TZ': 'flutterwave', // Tanzania
  'RW': 'flutterwave', // Rwanda
  'ZA': 'flutterwave', // South Africa
  'EG': 'flutterwave', // Egypt
};

/**
 * Circle supported currencies
 */
const CIRCLE_SUPPORTED_CURRENCIES: Currency[] = [
  'USD',
  'EUR',
  'GBP',
];

/**
 * Currency to provider mapping
 */
const CURRENCY_PROVIDERS: Record<Currency, FundingProvider[]> = {
  NGN: ['9psb', 'flutterwave'],
  USD: ['circle', 'flutterwave'],
  GBP: ['circle', 'flutterwave'],
  EUR: ['circle', 'flutterwave'],
  CAD: ['circle', 'flutterwave'],
  GHS: ['flutterwave'],
  ZAR: ['flutterwave'],
  CNY: ['manual'], // Requires special integration
};

// ==================== ROUTING LOGIC ====================

/**
 * Determine which funding provider to use based on user context
 */
export function routeFundingProvider(options: {
  country: string;
  currency: Currency;
  preferredMethod?: PaymentMethod;
}): FundingRoute {
  const { country, currency, preferredMethod } = options;
  
  // Check if Circle is available for this country
  const isCircleCountry = CIRCLE_SUPPORTED_COUNTRIES.includes(country.toUpperCase());
  const isCircleCurrency = CIRCLE_SUPPORTED_CURRENCIES.includes(currency);
  
  // Priority 1: Circle (if country and currency supported)
  if (isCircleCountry && isCircleCurrency) {
    return {
      provider: 'circle',
      supportedMethods: ['ach', 'wire', 'card'],
      estimatedTime: 'Instant - 3 business days',
      fees: {
        percentage: 0.01, // 1%
        fixed: 0,
        currency: currency,
      },
    };
  }
  
  // Priority 2: Local partner for specific country
  const localProvider = LOCAL_PARTNER_COUNTRIES[country.toUpperCase()];
  if (localProvider) {
    return getLocalProviderRoute(localProvider, currency);
  }
  
  // Priority 3: Currency-based routing
  const currencyProviders = CURRENCY_PROVIDERS[currency];
  if (currencyProviders && currencyProviders.length > 0) {
    const provider = currencyProviders[0];
    
    if (provider === 'circle' && isCircleCurrency) {
      return {
        provider: 'circle',
        supportedMethods: ['ach', 'wire', 'card'],
        estimatedTime: 'Instant - 3 business days',
        fees: {
          percentage: 0.01,
          fixed: 0,
          currency: currency,
        },
      };
    } else if (provider === '9psb' || provider === 'flutterwave') {
      return getLocalProviderRoute(provider, currency);
    }
  }
  
  // Fallback: Manual processing required
  return {
    provider: 'manual',
    supportedMethods: ['manual'],
    estimatedTime: 'Manual review required',
    fees: {
      percentage: 0,
      fixed: 0,
      currency: currency,
    },
  };
}

/**
 * Get route configuration for local payment partners
 */
function getLocalProviderRoute(provider: '9psb' | 'flutterwave', currency: Currency): FundingRoute {
  if (provider === '9psb') {
    return {
      provider: '9psb',
      supportedMethods: ['bank_transfer', 'mobile_money'],
      estimatedTime: 'Instant - 1 hour',
      fees: {
        percentage: 0.015, // 1.5%
        fixed: currency === 'NGN' ? 100 : 0,
        currency: currency,
      },
    };
  }
  
  if (provider === 'flutterwave') {
    return {
      provider: 'flutterwave',
      supportedMethods: ['bank_transfer', 'card', 'mobile_money'],
      estimatedTime: 'Instant - 24 hours',
      fees: {
        percentage: 0.014, // 1.4%
        fixed: 0,
        currency: currency,
      },
    };
  }
  
  // Should never reach here
  return {
    provider: 'manual',
    supportedMethods: ['manual'],
    estimatedTime: 'Manual review',
    fees: { percentage: 0, fixed: 0, currency },
  };
}

/**
 * Check if Circle is available for user
 */
export function isCircleAvailable(country: string, currency: Currency): boolean {
  const isCountrySupported = CIRCLE_SUPPORTED_COUNTRIES.includes(country.toUpperCase());
  const isCurrencySupported = CIRCLE_SUPPORTED_CURRENCIES.includes(currency);
  return isCountrySupported && isCurrencySupported;
}

/**
 * Get all available providers for user
 */
export function getAvailableProviders(country: string, currency: Currency): FundingProvider[] {
  const providers: FundingProvider[] = [];
  
  // Check Circle
  if (isCircleAvailable(country, currency)) {
    providers.push('circle');
  }
  
  // Check local partner
  const localProvider = LOCAL_PARTNER_COUNTRIES[country.toUpperCase()];
  if (localProvider) {
    providers.push(localProvider);
  }
  
  // Check currency-based providers
  const currencyProviders = CURRENCY_PROVIDERS[currency];
  if (currencyProviders) {
    currencyProviders.forEach(provider => {
      if (!providers.includes(provider)) {
        providers.push(provider);
      }
    });
  }
  
  return providers;
}

/**
 * Get user-friendly provider name
 */
export function getProviderDisplayName(provider: FundingProvider): string {
  const names: Record<FundingProvider, string> = {
    circle: 'Circle (International)',
    '9psb': 'Bank Transfer (9PSB)',
    flutterwave: 'Flutterwave',
    manual: 'Manual Processing',
  };
  
  return names[provider] || provider;
}

/**
 * Calculate funding fees
 */
export function calculateFees(
  provider: FundingProvider,
  amount: number,
  currency: Currency
): {
  percentageFee: number;
  fixedFee: number;
  totalFee: number;
  netAmount: number;
} {
  const route = routeFundingProvider({ country: 'US', currency }); // Use generic route for fees
  
  let percentageFee = 0;
  let fixedFee = 0;
  
  if (provider === 'circle') {
    percentageFee = amount * 0.01; // 1%
    fixedFee = 0;
  } else if (provider === '9psb') {
    percentageFee = amount * 0.015; // 1.5%
    fixedFee = currency === 'NGN' ? 100 : 0;
  } else if (provider === 'flutterwave') {
    percentageFee = amount * 0.014; // 1.4%
    fixedFee = 0;
  }
  
  const totalFee = percentageFee + fixedFee;
  const netAmount = amount - totalFee;
  
  return {
    percentageFee,
    fixedFee,
    totalFee,
    netAmount,
  };
}

// ==================== PROVIDER CAPABILITIES ====================

/**
 * Check if provider supports specific payment method
 */
export function supportsPaymentMethod(
  provider: FundingProvider,
  method: PaymentMethod
): boolean {
  const capabilities: Record<FundingProvider, PaymentMethod[]> = {
    circle: ['ach', 'wire', 'card'],
    '9psb': ['bank_transfer', 'mobile_money'],
    flutterwave: ['bank_transfer', 'card', 'mobile_money'],
    manual: ['manual'],
  };
  
  return capabilities[provider]?.includes(method) || false;
}

/**
 * Get supported currencies for provider
 */
export function getSupportedCurrencies(provider: FundingProvider): Currency[] {
  if (provider === 'circle') {
    return ['USD', 'EUR', 'GBP'];
  }
  
  if (provider === '9psb') {
    return ['NGN'];
  }
  
  if (provider === 'flutterwave') {
    return ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'CAD'];
  }
  
  return ['NGN', 'USD', 'GBP', 'EUR', 'CAD', 'GHS', 'ZAR', 'CNY'];
}

/**
 * Get deposit limits for provider
 */
export function getDepositLimits(provider: FundingProvider, currency: Currency): {
  min: number;
  max: number;
  daily: number;
  monthly: number;
} {
  // Circle limits
  if (provider === 'circle') {
    if (currency === 'USD') {
      return { min: 1, max: 100000, daily: 250000, monthly: 1000000 };
    }
    if (currency === 'EUR') {
      return { min: 1, max: 90000, daily: 225000, monthly: 900000 };
    }
    if (currency === 'GBP') {
      return { min: 1, max: 80000, daily: 200000, monthly: 800000 };
    }
  }
  
  // 9PSB limits (NGN)
  if (provider === '9psb') {
    return { min: 100, max: 5000000, daily: 10000000, monthly: 50000000 };
  }
  
  // Flutterwave limits
  if (provider === 'flutterwave') {
    if (currency === 'NGN') {
      return { min: 100, max: 10000000, daily: 20000000, monthly: 100000000 };
    }
    return { min: 10, max: 50000, daily: 100000, monthly: 500000 };
  }
  
  // Default limits
  return { min: 1, max: 1000000, daily: 5000000, monthly: 20000000 };
}

// ==================== EXPORTS ====================

export const FundingRouter = {
  routeFundingProvider,
  isCircleAvailable,
  getAvailableProviders,
  getProviderDisplayName,
  calculateFees,
  supportsPaymentMethod,
  getSupportedCurrencies,
  getDepositLimits,
};

export default FundingRouter;
