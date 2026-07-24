/**
 * Openfort Treasury Service
 * 
 * Openfort is the PRIMARY wallet infrastructure provider for Border.
 * Replaces Circle for wallet operations and transaction execution.
 * 
 * ⚠️ IMPORTANT: Openfort does NOT create, mint, or issue stablecoins!
 * 
 * What Openfort DOES:
 * - Provides wallet infrastructure (blockchain addresses)
 * - Executes transactions (send/receive)
 * - Signs transactions cryptographically
 * - Manages wallet security
 * 
 * What Openfort DOES NOT DO:
 * - Issue stablecoins (USDT is issued by Tether, USDC by Circle USD Coin)
 * - Mint tokens
 * - Create liquidity
 * - Convert fiat to crypto
 * 
 * Stablecoin Sources (External):
 * - OTC desks (over-the-counter trading)
 * - Cryptocurrency exchanges (Binance, Coinbase, etc.)
 * - Liquidity providers
 * - Treasury management firms
 * 
 * Architecture:
 * - User deposits NGN → Bank (9PSB) → OTC/Exchange (acquire USDT/USDC) → Openfort Wallet (receive)
 * - User withdrawals → Openfort Wallet (send) → Juicyway (convert to fiat) → User Bank
 * - All crypto operations invisible to users (backend only)
 * 
 * Integration:
 * - All Openfort API calls are proxied through Supabase Edge Functions
 * - API keys are stored as Supabase secrets (never exposed to frontend)
 * - Frontend calls backend routes at /openfort/*
 */

import axios from 'axios';
import { Currency } from './internal-ledger';

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Backend API URL - All Openfort calls are proxied through here
  BACKEND_URL: 'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/server',
  
  // Network configuration
  NETWORK: {
    MAINNET: 'polygon', // Using Polygon for low fees
    TESTNET: 'mumbai', // Polygon testnet
  },
  
  USE_PRODUCTION: true, // Set to true for live transactions
};

// ==================== API CLIENT ====================

// Get auth token from localStorage
function getAuthToken(): string | null {
  try {
    const session = localStorage.getItem('supabase.auth.token');
    if (session) {
      const parsed = JSON.parse(session);
      return parsed.access_token || null;
    }
  } catch (e) {
  }
  return null;
}

// Backend API client
const backendClient = axios.create({
  baseURL: CONFIG.BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
backendClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers['x-user-token'] = token;
  }
  return config;
});

// ==================== TYPES ====================

export interface OpenfortDepositRequest {
  userId: string;
  amount: number;
  currency: 'USDC' | 'USDT';
  fromAddress?: string;
  metadata?: Record<string, any>;
}

export interface OpenfortDepositResult {
  success: boolean;
  depositId: string;
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  amount: number;
  currency: Currency;
  confirmations: number;
  reference: string;
  error?: string;
}

export interface OpenfortWithdrawalRequest {
  userId: string;
  amount: number;
  currency: 'USDC' | 'USDT';
  destinationType: 'transak' | 'wallet'; // 'transak' for fiat off-ramp, 'wallet' for crypto transfer
  destination: {
    address?: string; // For crypto transfers
    transakOrderId?: string; // For Transak off-ramp
  };
  metadata?: Record<string, any>;
}

export interface OpenfortWithdrawalResult {
  success: boolean;
  withdrawalId: string;
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  amount: number;
  currency: Currency;
  reference: string;
  estimatedCompletion?: string;
  error?: string;
}

export interface OpenfortTreasuryBalance {
  currency: 'USDC' | 'USDT';
  available: number;
  pending: number;
  total: number;
  walletAddress: string;
}

// ==================== TREASURY BALANCE ====================

/**
 * Get current treasury balance for a specific stablecoin
 * Calls backend API which proxies to Openfort
 */
export async function getTreasuryBalance(currency: 'USDC' | 'USDT'): Promise<OpenfortTreasuryBalance> {
  try {
    
    const response = await backendClient.get(`/openfort/balance/${currency}`);
    const balanceData = response.data;
    
    
    return {
      currency,
      available: balanceData.available || 0,
      pending: balanceData.pending || 0,
      total: balanceData.total || 0,
      walletAddress: balanceData.walletAddress || 'Not configured',
    };
  } catch (error: any) {
    
    // Return zero balance instead of throwing (Openfort not configured yet)
    return {
      currency,
      available: 0,
      pending: 0,
      total: 0,
      walletAddress: 'Not configured',
    };
  }
}

/**
 * Get all treasury balances
 */
export async function getAllTreasuryBalances(): Promise<OpenfortTreasuryBalance[]> {
  try {
    
    const response = await backendClient.get('/openfort/balances');
    return response.data.balances;
  } catch (error: any) {
    
    // Fallback to fetching individually
    const currencies: Array<'USDC' | 'USDT'> = ['USDC', 'USDT'];
    const balances = await Promise.all(currencies.map(getTreasuryBalance));
    return balances;
  }
}

// ==================== DEPOSITS ====================

/**
 * Record a deposit into Openfort treasury wallet
 * Called after user deposits fiat via bank (9PSB) and it's converted to stablecoin
 */
export async function recordTreasuryDeposit(request: OpenfortDepositRequest): Promise<OpenfortDepositResult> {
  try {
    
    const response = await backendClient.post('/openfort/deposit/monitor', {
      currency: request.currency,
      amount: request.amount,
      fromAddress: request.fromAddress,
      metadata: request.metadata,
    });
    
    const result = response.data;
    
    return {
      success: result.success,
      depositId: result.depositId,
      transactionHash: result.transactionHash,
      status: result.status,
      amount: result.amount,
      currency: result.currency as Currency,
      confirmations: result.confirmations || 0,
      reference: result.reference,
    };
  } catch (error: any) {
    
    return {
      success: false,
      depositId: '',
      transactionHash: '',
      status: 'failed',
      amount: request.amount,
      currency: request.currency as Currency,
      confirmations: 0,
      reference: '',
      error: error.response?.data?.error || error.message,
    };
  }
}

// ==================== WITHDRAWALS ====================

/**
 * Execute withdrawal from Openfort treasury
 * Sends funds to specified destination address
 */
export async function executeTreasuryWithdrawal(request: OpenfortWithdrawalRequest): Promise<OpenfortWithdrawalResult> {
  try {
    
    const response = await backendClient.post('/openfort/withdrawal', {
      currency: request.currency,
      amount: request.amount,
      destinationAddress: request.destination.address,
      network: CONFIG.USE_PRODUCTION ? CONFIG.NETWORK.MAINNET : CONFIG.NETWORK.TESTNET,
      metadata: {
        ...request.metadata,
        destinationType: request.destinationType,
      },
    });
    
    const result = response.data;
    
    return {
      success: result.success,
      withdrawalId: result.withdrawalId,
      transactionHash: result.transactionHash,
      status: result.status,
      amount: result.amount,
      currency: result.currency as Currency,
      reference: result.reference,
      estimatedCompletion: result.estimatedCompletion,
    };
  } catch (error: any) {
    
    return {
      success: false,
      withdrawalId: '',
      transactionHash: '',
      status: 'failed',
      amount: request.amount,
      currency: request.currency as Currency,
      reference: '',
      error: error.response?.data?.error || error.message,
    };
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get wallet address for a specific currency
 */
export async function getWalletAddress(currency: 'USDC' | 'USDT'): Promise<string> {
  try {
    
    const response = await backendClient.get(`/openfort/wallet/${currency}`);
    return response.data.address;
  } catch (error: any) {
    throw error;
  }
}

/**
 * Monitor transaction status
 */
export async function getTransactionStatus(transactionId: string): Promise<{
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  transactionHash: string;
}> {
  try {
    
    const response = await backendClient.get(`/openfort/transaction/${transactionId}`);
    const txData = response.data;
    
    return {
      status: txData.status,
      confirmations: txData.confirmations || 0,
      transactionHash: txData.transactionHash,
    };
  } catch (error: any) {
    throw error;
  }
}

// ==================== STATUS & HEALTH CHECK ====================

/**
 * Check if Openfort integration is operational
 */
export async function checkOpenfortStatus(): Promise<{
  operational: boolean;
  network: string;
  walletsConfigured: boolean;
  lastCheck: string;
}> {
  try {
    
    const response = await backendClient.get('/openfort/status');
    const data = response.data;
    
    return {
      operational: data.operational,
      network: data.network,
      walletsConfigured: data.walletsConfigured.USDC && data.walletsConfigured.USDT,
      lastCheck: data.lastCheck,
    };
  } catch (error: any) {
    
    return {
      operational: false,
      network: CONFIG.USE_PRODUCTION ? CONFIG.NETWORK.MAINNET : CONFIG.NETWORK.TESTNET,
      walletsConfigured: false,
      lastCheck: new Date().toISOString(),
    };
  }
}

export default {
  getTreasuryBalance,
  getAllTreasuryBalances,
  recordTreasuryDeposit,
  executeTreasuryWithdrawal,
  getWalletAddress,
  getTransactionStatus,
  checkOpenfortStatus,
};