/**
 * Border Stablecoin Settlement Service
 * 
 * PROMPT 6: CELO DORMANT MODE
 * dormant = true
 * disabled_in_production = true
 */

export const dormant = true;
export const disabled_in_production = true;

import { convertCurrency } from './exchange-rates';

// Stablecoin mapping for each fiat currency
export const STABLECOIN_MAPPING = {
  USD: 'cUSD',
  EUR: 'cEUR',
  GBP: 'cUSD',
  NGN: 'cUSD',
  GHS: 'cUSD',
  ZAR: 'cUSD',
  CAD: 'cUSD',
  CNY: 'cUSD',
  CELO: 'CELO',
} as const;

export interface StablecoinSettlement {
  transactionId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  stablecoinUsed: string;
  celoTxHash?: string;
  settlementTimeMs: number;
  status: 'pending' | 'settled' | 'failed';
}

/**
 * Simulates stablecoin settlement (DORMANT - NOT USED IN PRODUCTION)
 */
export async function settleWithStablecoin(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
  transferType: 'p2p' | 'bank' | 'conversion' | 'international'
): Promise<StablecoinSettlement> {
  // If dormant, we just simulate a success but don't perform any real blockchain actions
  
  return {
    transactionId: `BDR_SIM_${Date.now()}`,
    fromCurrency,
    toCurrency,
    fromAmount: amount,
    toAmount: amount,
    stablecoinUsed: 'NONE',
    settlementTimeMs: 100,
    status: 'settled',
  };
}

export const performSettlement = settleWithStablecoin;

export function getLiquidityPools() {
  return [];
}

export function convertToStablecoin() {
  return { stablecoin: 'NONE', amount: 0 };
}

export function shouldUseStablecoinSettlement() {
  return { shouldUse: false, reason: 'CELO Infrastructure is dormant', savingsUSD: 0 };
}

export function getSettlementMetrics() {
  return {
    last24Hours: { totalTransactions: 0, totalVolumeUSD: 0, avgSettlementTime: 0, successRate: 100 },
    byStablecoin: { cUSD: { count: 0, volume: 0 }, cEUR: { count: 0, volume: 0 }, USDC: { count: 0, volume: 0 } },
  };
}

export async function checkComplianceForSettlement() {
  return { approved: true };
}
