/**
 * Border Settlement Orchestrator
 * 
 * Implement exclusive country routing:
 * Nigeria → Flutterwave only.
 * All other countries → Circle only.
 * 
 * Architecture:
 * User Balance → Internal Ledger → Border Treasury Ledger → Provider (Circle/Flutterwave) → Recipient
 * 
 * The provider APIs are completely invisible to users.
 * Users only see: "Transfer completed" with fiat balances.
 */

import { CircleTreasury } from './circle-treasury';
import { getSettlementProvider } from './countries-data';
import { getProviderForCountry, providerRegistry } from './settlement-provider';
import { flutterwaveProvider } from './flutterwave-provider';
import { circleProvider } from './circle-provider';

// Register providers
providerRegistry.register('flutterwave', flutterwaveProvider);
providerRegistry.register('circle', circleProvider);

// ==================== TYPES ====================

export interface SettlementRequest {
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  destinationCountry: string; // Crucial for routing engine
  recipientDetails: {
    name: string;
    accountNumber?: string;
    bankCode?: string;
    bankName?: string;
    email?: string;
    phone?: string;
    iban?: string;
    swiftCode?: string;
    routingNumber?: string;
    country: string;
  };
  transferType: 'p2p' | 'bank' | 'conversion' | 'international-business';
  metadata?: {
    narration?: string;
    reference?: string;
  };
}

export interface SettlementResponse {
  success: boolean;
  transactionId: string;
  status: 'completed' | 'pending' | 'failed' | 'processing';
  settlementProvider: 'FLUTTERWAVE' | 'CIRCLE' | 'BORDER-INTERNAL';
  settlementDetails: {
    amountSent: number;
    amountReceived: number;
    fee: number;
    exchangeRate?: number;
    providerReference?: string;
    settlementTime: number; // milliseconds
    estimatedCompletion?: string;
  };
  error?: string;
}

// ==================== SETTLEMENT ROUTING ENGINE ====================

/**
 * Main settlement orchestrator - implements exclusive routing rules
 * Nigeria → Flutterwave
 * International → Circle
 */
export async function executeSettlement(
  request: SettlementRequest
): Promise<SettlementResponse> {
  const startTime = Date.now();

  try {
    // Determine settlement provider based on country
    const countryUpper = request.destinationCountry.toUpperCase();
    const isNigeria = countryUpper === 'NIGERIA' || countryUpper === 'NG' || countryUpper === 'NGA';
    

    if (request.transferType === 'p2p') {
      return await settleBorderInternal(request);
    }

    if (isNigeria) {
      return await settleThroughFlutterwave(request, startTime);
    } else {
      return await settleThroughCircle(request, startTime);
    }

  } catch (error: any) {
    return {
      success: false,
      transactionId: `ERR_${Date.now()}`,
      status: 'failed',
      settlementProvider: 'FLUTTERWAVE',
      settlementDetails: {
        amountSent: request.amount,
        amountReceived: 0,
        fee: 0,
        settlementTime: Date.now() - startTime,
      },
      error: error.message || 'Settlement routing failed',
    };
  }
}

// ==================== PROVIDER IMPLEMENTATIONS ====================

/**
 * Nigeria Route (Exclusive Flutterwave)
 */
async function settleThroughFlutterwave(
  request: SettlementRequest,
  startTime: number
): Promise<SettlementResponse> {
  const reference = request.metadata?.reference || `FLW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fee = calculateNGNFee(request.amount);

  try {
    
    const provider = getProviderForCountry('NG');
    
    const transferResult = await provider.transfer({
      amount: request.amount,
      currency: request.fromCurrency,
      recipientAccount: {
        accountNumber: request.recipientDetails.accountNumber!,
        accountName: request.recipientDetails.name,
        bankCode: request.recipientDetails.bankCode!,
        bankName: request.recipientDetails.bankName || 'Nigerian Bank',
      },
      narration: request.metadata?.narration || 'Border Transfer',
      reference,
      userId: request.userId,
    });

    if (!transferResult.success) {
      throw new Error(transferResult.error || 'Flutterwave transfer failed');
    }

    return {
      success: true,
      transactionId: reference,
      status: transferResult.status === 'completed' ? 'completed' : 'processing',
      settlementProvider: 'FLUTTERWAVE',
      settlementDetails: {
        amountSent: request.amount,
        amountReceived: request.amount - fee,
        fee,
        providerReference: transferResult.providerReference || reference,
        settlementTime: Date.now() - startTime,
      },
    };
  } catch (error: any) {
    throw new Error(`Flutterwave Settlement failed: ${error.message}`);
  }
}

/**
 * Global Route (Exclusive Circle)
 */
async function settleThroughCircle(
  request: SettlementRequest,
  startTime: number
): Promise<SettlementResponse> {
  try {
    
    // Route through Circle Treasury
    const circleResult = await CircleTreasury.processWithdrawal({
      userId: request.userId,
      amount: request.amount,
      currency: request.toCurrency as any,
      bankAccount: {
        accountNumber: request.recipientDetails.accountNumber || request.recipientDetails.iban || '',
        routingNumber: request.recipientDetails.routingNumber,
        iban: request.recipientDetails.iban,
        swiftCode: request.recipientDetails.swiftCode,
        accountName: request.recipientDetails.name,
        bankName: request.recipientDetails.bankName || 'International Bank',
        country: request.recipientDetails.country,
      },
      metadata: request.metadata,
    });

    if (!circleResult.success) {
      throw new Error(circleResult.error || 'Circle withdrawal failed');
    }

    return {
      success: true,
      transactionId: circleResult.withdrawalId,
      status: circleResult.status === 'completed' ? 'completed' : 'processing',
      settlementProvider: 'CIRCLE',
      settlementDetails: {
        amountSent: request.amount,
        amountReceived: request.amount, // Circle payout fees are treasury-side
        fee: 0, 
        providerReference: circleResult.reference,
        settlementTime: Date.now() - startTime,
        estimatedCompletion: circleResult.estimatedCompletion,
      },
    };
  } catch (error: any) {
    throw new Error(`Circle Settlement failed: ${error.message}`);
  }
}

/**
 * Internal Border-to-Border Route
 */
async function settleBorderInternal(
  request: SettlementRequest
): Promise<SettlementResponse> {
  const startTime = Date.now();
  const reference = `P2P-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // This would be handled by internal ledger logic in the backend
  return {
    success: true,
    transactionId: reference,
    status: 'completed',
    settlementProvider: 'BORDER-INTERNAL',
    settlementDetails: {
      amountSent: request.amount,
      amountReceived: request.amount,
      fee: 0,
      settlementTime: Date.now() - startTime,
    },
  };
}

// ==================== HELPERS ====================

function calculateNGNFee(amount: number): number {
  if (amount <= 5000) return 10;
  if (amount <= 50000) return 25;
  return 50;
}

export const SettlementOrchestrator = {
  executeSettlement,
};

export default SettlementOrchestrator;