/**
 * Off-Ramp Service
 * 
 * Handles conversion of stablecoins to fiat and settling to bank accounts
 * Integrates with providers like Meso, Circle, and local payment processors
 */

import axios from 'axios';

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Meso - African fiat on/off-ramps (Nigeria, Kenya, Ghana, etc.)
  // Sign up at: https://meso.network/
  MESO_API_KEY: process.env.REACT_APP_MESO_API_KEY || 'YOUR_MESO_API_KEY',
  MESO_API_URL: 'https://api.meso.network/v1',
  MESO_WEBHOOK_SECRET: process.env.REACT_APP_MESO_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET',

  // Circle - USDC infrastructure (PRODUCTION/LIVE MODE)
  CIRCLE_API_KEY: 'LIVE_API_KEY:9d8a9dcfd0f77b252e2d6ac7abf9f704:b41eb5ad0eb68cf393f634f075007ca2',
  CIRCLE_API_URL: 'https://api.circle.com/v1', // PRODUCTION URL

  // Chipper Cash / Flutterwave for Nigerian settlements
  FLUTTERWAVE_SECRET_KEY: process.env.REACT_APP_FLUTTERWAVE_SECRET || 'YOUR_FLW_KEY',
  FLUTTERWAVE_API_URL: 'https://api.flutterwave.com/v3',

  // Real Circle production API - live mode
  USE_MOCK: false,
};

// ==================== TYPES ====================

export interface OffRampRequest {
  userId: string;
  amount: number;
  stablecoin: 'cUSD' | 'cEUR' | 'USDC';
  fiatCurrency: 'NGN' | 'USD' | 'EUR' | 'GHS' | 'ZAR';
  bankAccount: BankAccountInfo;
  reference: string;
}

export interface BankAccountInfo {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
  country: string;
}

export interface OffRampResponse {
  success: boolean;
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amountSent: number;
  amountReceived: number;
  fee: number;
  estimatedSettlementTime: string;
  providerReference?: string;
  error?: string;
}

// ==================== MESO INTEGRATION ====================

/**
 * Meso - African fiat settlements
 * Best for: NGN, GHS, KES, ZAR
 */
async function settleWithMeso(request: OffRampRequest): Promise<OffRampResponse> {
  const apiKey = CONFIG.MESO_API_KEY;

  if (!apiKey || apiKey === 'YOUR_MESO_API_KEY') {
    throw new Error('Meso API key not configured');
  }

  try {
    // Step 1: Get quote
    const quoteResponse = await axios.post(
      `${CONFIG.MESO_API_URL}/quotes`,
      {
        source_currency: request.stablecoin,
        destination_currency: request.fiatCurrency,
        source_amount: request.amount,
        network: 'celo',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const quote = quoteResponse.data;

    // Step 2: Create transfer
    const transferResponse = await axios.post(
      `${CONFIG.MESO_API_URL}/transfers`,
      {
        quote_id: quote.id,
        destination: {
          type: 'bank_account',
          bank_account: {
            account_number: request.bankAccount.accountNumber,
            account_name: request.bankAccount.accountName,
            bank_code: request.bankAccount.bankCode,
            country: request.bankAccount.country,
          },
        },
        metadata: {
          user_id: request.userId,
          reference: request.reference,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const transfer = transferResponse.data;

    return {
      success: true,
      transactionId: transfer.id,
      status: transfer.status,
      amountSent: request.amount,
      amountReceived: quote.destination_amount,
      fee: quote.fee,
      estimatedSettlementTime: quote.estimated_settlement_time || '30 minutes',
      providerReference: transfer.id,
    };
  } catch (error: any) {
    throw error;
  }
}

// ==================== CIRCLE INTEGRATION ====================

/**
 * Circle - USDC minting/redemption
 * Best for: USD settlements (US bank accounts)
 */
async function settleWithCircle(request: OffRampRequest): Promise<OffRampResponse> {
  const apiKey = CONFIG.CIRCLE_API_KEY;

  if (!apiKey || apiKey === 'YOUR_CIRCLE_API_KEY') {
    throw new Error('Circle API key not configured');
  }

  try {
    // Circle Payouts API
    const response = await axios.post(
      `${CONFIG.CIRCLE_API_URL}/businessAccount/payouts`,
      {
        idempotencyKey: request.reference,
        source: {
          type: 'wallet',
          id: 'master-wallet-id', // Your Circle wallet ID
        },
        destination: {
          type: 'wire',
          name: request.bankAccount.accountName,
          accountNumber: request.bankAccount.accountNumber,
          routingNumber: request.bankAccount.bankCode,
        },
        amount: {
          amount: request.amount.toFixed(2),
          currency: request.fiatCurrency,
        },
        metadata: {
          userId: request.userId,
          beneficiaryEmail: 'user@example.com',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      transactionId: response.data.id,
      status: 'processing',
      amountSent: request.amount,
      amountReceived: request.amount * 0.995, // 0.5% Circle fee
      fee: request.amount * 0.005,
      estimatedSettlementTime: '1-2 business days',
      providerReference: response.data.id,
    };
  } catch (error: any) {
    throw error;
  }
}

// ==================== FLUTTERWAVE INTEGRATION ====================

/**
 * Flutterwave - Nigerian bank transfers
 * Best for: NGN settlements
 */
async function settleWithFlutterwave(request: OffRampRequest): Promise<OffRampResponse> {
  const secretKey = CONFIG.FLUTTERWAVE_SECRET_KEY;

  if (!secretKey || secretKey === 'YOUR_FLW_KEY') {
    throw new Error('Flutterwave secret key not configured');
  }

  try {
    // Flutterwave Transfer API
    const response = await axios.post(
      `${CONFIG.FLUTTERWAVE_API_URL}/transfers`,
      {
        account_bank: request.bankAccount.bankCode,
        account_number: request.bankAccount.accountNumber,
        amount: request.amount,
        narration: `Border Transfer - ${request.reference}`,
        currency: request.fiatCurrency,
        reference: request.reference,
        callback_url: 'https://yourdomain.com/webhooks/flutterwave',
        debit_currency: request.fiatCurrency,
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: response.data.status === 'success',
      transactionId: response.data.data.id,
      status: 'processing',
      amountSent: request.amount,
      amountReceived: request.amount - (response.data.data.fee || 0),
      fee: response.data.data.fee || 0,
      estimatedSettlementTime: '10-30 minutes',
      providerReference: response.data.data.reference,
    };
  } catch (error: any) {
    throw error;
  }
}

// ==================== MOCK SETTLEMENT ====================

function mockOffRamp(request: OffRampRequest): OffRampResponse {

  return {
    success: true,
    transactionId: `MOCK-${Date.now()}`,
    status: 'completed',
    amountSent: request.amount,
    amountReceived: request.amount * 0.985, // 1.5% fee
    fee: request.amount * 0.015,
    estimatedSettlementTime: 'Instant (Mock)',
    providerReference: `MOCK-REF-${Date.now()}`,
  };
}

// ==================== MAIN SETTLEMENT FUNCTION ====================

/**
 * Routes off-ramp request to appropriate provider
 */
export async function settleToFiat(request: OffRampRequest): Promise<OffRampResponse> {
  if (CONFIG.USE_MOCK) {
    return mockOffRamp(request);
  }

  // Route to appropriate provider based on currency and region
  switch (request.fiatCurrency) {
    case 'NGN':
      // Use Flutterwave for Nigeria
      return await settleWithFlutterwave(request);

    case 'GHS':
    case 'ZAR':
      // Use Meso for other African countries
      return await settleWithMeso(request);

    case 'USD':
    case 'EUR':
      // Use Circle for international settlements
      return await settleWithCircle(request);

    default:
      throw new Error(`Unsupported currency: ${request.fiatCurrency}`);
  }
}

// ==================== BANK VERIFICATION ====================

/**
 * Verifies bank account details before settlement
 */
export async function verifyBankAccount(bankAccount: BankAccountInfo): Promise<{
  valid: boolean;
  accountName?: string;
  error?: string;
}> {
  if (CONFIG.USE_MOCK) {
    return {
      valid: true,
      accountName: bankAccount.accountName,
    };
  }

  // Use Flutterwave for Nigerian accounts
  if (bankAccount.country === 'NG') {
    try {
      const response = await axios.post(
        `${CONFIG.FLUTTERWAVE_API_URL}/accounts/resolve`,
        {
          account_number: bankAccount.accountNumber,
          account_bank: bankAccount.bankCode,
        },
        {
          headers: {
            Authorization: `Bearer ${CONFIG.FLUTTERWAVE_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        valid: response.data.status === 'success',
        accountName: response.data.data?.account_name,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.message || 'Verification failed',
      };
    }
  }

  return { valid: true }; // Skip verification for other countries in development
}

// ==================== SETTLEMENT STATUS ====================

/**
 * Checks the status of a settlement transaction
 */
export async function checkSettlementStatus(transactionId: string, provider: 'meso' | 'circle' | 'flutterwave'): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  details?: any;
}> {
  if (CONFIG.USE_MOCK) {
    return { status: 'completed' };
  }

  try {
    switch (provider) {
      case 'meso':
        const mesoResponse = await axios.get(`${CONFIG.MESO_API_URL}/transfers/${transactionId}`, {
          headers: { Authorization: `Bearer ${CONFIG.MESO_API_KEY}` },
        });
        return { status: mesoResponse.data.status, details: mesoResponse.data };

      case 'circle':
        const circleResponse = await axios.get(`${CONFIG.CIRCLE_API_URL}/businessAccount/payouts/${transactionId}`, {
          headers: { Authorization: `Bearer ${CONFIG.CIRCLE_API_KEY}` },
        });
        return { status: circleResponse.data.status, details: circleResponse.data };

      case 'flutterwave':
        const flwResponse = await axios.get(`${CONFIG.FLUTTERWAVE_API_URL}/transfers/${transactionId}`, {
          headers: { Authorization: `Bearer ${CONFIG.FLUTTERWAVE_SECRET_KEY}` },
        });
        return { status: flwResponse.data.status, details: flwResponse.data };

      default:
        throw new Error('Unknown provider');
    }
  } catch (error) {
    return { status: 'failed' };
  }
}

// ==================== UTILITIES ====================

/**
 * Gets supported settlement methods for a currency
 */
export function getSupportedMethods(currency: string): string[] {
  const methods: Record<string, string[]> = {
    NGN: ['bank_transfer', 'mobile_money'],
    USD: ['wire_transfer', 'ach'],
    EUR: ['sepa_transfer'],
    GHS: ['bank_transfer', 'mobile_money'],
    ZAR: ['bank_transfer'],
  };

  return methods[currency] || ['bank_transfer'];
}

/**
 * Estimates settlement fee
 */
export function estimateFee(amount: number, currency: string): number {
  const feeRates: Record<string, number> = {
    NGN: 0.015, // 1.5%
    USD: 0.005, // 0.5%
    EUR: 0.007, // 0.7%
    GHS: 0.02, // 2%
    ZAR: 0.018, // 1.8%
  };

  const rate = feeRates[currency] || 0.015;
  return amount * rate;
}