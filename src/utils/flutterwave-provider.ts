/**
 * Flutterwave Settlement Provider
 * 
 * Implements the ISettlementProvider interface for Flutterwave
 * Handles all Nigerian local operations:
 * - Bank transfers (NIP)
 * - Bill payments (airtime, data, electricity, cable)
 * - Account verification
 * 
 * NOTE: All API calls go through the backend (/supabase/functions/server)
 * to avoid CORS issues. Never call Flutterwave API directly from frontend!
 */

import {
  ISettlementProvider,
  TransferRequest,
  TransferResponse,
  BillPaymentRequest,
  BillPaymentResponse,
  AccountVerificationRequest,
  AccountVerificationResponse,
  BanksListResponse,
  BillProvidersResponse,
} from './settlement-provider';
import { flutterwave } from '@/lib/api';

// ==================== PROVIDER IMPLEMENTATION ====================

export class FlutterwaveProvider implements ISettlementProvider {
  name = 'flutterwave';
  
  // ==================== TRANSFER OPERATIONS ====================
  
  async transfer(request: TransferRequest): Promise<TransferResponse> {
    try {
      
      // 🧪 MOCK MODE: Enable this for testing without backend/treasury funds
      // Remove this block when backend is ready
      const MOCK_MODE = false; // Set to true to test UI without backend
      
      if (MOCK_MODE) {
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate successful response
        const mockResponse: TransferResponse = {
          success: true,
          reference: request.reference,
          status: 'completed',
          providerReference: 'MOCK-FLW-' + Date.now(),
          fee: 26.25,
        };
        
        return mockResponse;
      }
      
      // Real transfer code - uses Supabase client to avoid CORS
      // Use the API client which routes through backend
      const response: any = await flutterwave.transfer({
        destinationBankCode: request.recipientAccount.bankCode,
        destinationAccountNumber: request.recipientAccount.accountNumber,
        amount: request.amount,
        narration: request.narration || 'Border Transfer',
      });
      
      
      if (response.success) {
        return {
          success: true,
          reference: response.reference || request.reference,
          status: response.status === 'NEW' ? 'pending' : 
                  response.status === 'PENDING' ? 'processing' :
                  response.status === 'SUCCESSFUL' ? 'completed' : 'failed',
          providerReference: response.flw_id?.toString() || response.reference,
          fee: response.fee || 0,
        };
      } else {
        return {
          success: false,
          reference: request.reference,
          status: 'failed',
          error: response.error || 'Transfer failed',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        reference: request.reference,
        status: 'failed',
        error: error.message,
      };
    }
  }
  
  async getTransferStatus(reference: string): Promise<TransferResponse> {
    try {
      
      // Use the API client's getTransferStatus method
      const response: any = await flutterwave.getTransferStatus(reference);
      
      if (response.success && response.transfer) {
        const transfer = response.transfer;
        return {
          success: true,
          reference,
          status: transfer.status === 'SUCCESSFUL' ? 'completed' :
                  transfer.status === 'PENDING' ? 'processing' :
                  transfer.status === 'NEW' ? 'pending' : 'failed',
          providerReference: transfer.id?.toString(),
          fee: transfer.fee,
        };
      }
      
      return {
        success: false,
        reference,
        status: 'failed',
        error: 'Transfer not found',
      };
    } catch (error: any) {
      return {
        success: false,
        reference,
        status: 'failed',
        error: error.message,
      };
    }
  }
  
  // ==================== ACCOUNT OPERATIONS ====================
  
  async verifyAccount(request: AccountVerificationRequest): Promise<AccountVerificationResponse> {
    // Account verification is handled by the /banks endpoint
    // This method is not needed as we use flutterwave.verifyAccount() from api.ts
    return {
      success: false,
      error: 'Use flutterwave.verifyAccount() from @/lib/api instead',
    };
  }
  
  async getBanksList(country: string = 'NG'): Promise<BanksListResponse> {
    // Banks list is handled by the /banks endpoint
    // This method is not needed as we use flutterwave.getBanks() from api.ts
    return {
      success: false,
      banks: [],
      error: 'Use flutterwave.getBanks() from @/lib/api instead',
    };
  }
  
  // ==================== BILL PAYMENT OPERATIONS ====================
  
  async payBill(request: BillPaymentRequest): Promise<BillPaymentResponse> {
    // Bill payments are handled by specific endpoints in api.ts
    // Use flutterwave.buyAirtime(), buyData(), etc. instead
    return {
      success: false,
      reference: request.reference,
      status: 'failed',
      error: 'Use specific bill payment methods from @/lib/api instead',
    };
  }
  
  async getBillProviders(type: string): Promise<BillProvidersResponse> {
    // Bill providers are handled by backend endpoints
    // Not implemented in current API
    return {
      success: false,
      providers: [],
      error: 'Not implemented - use hardcoded providers',
    };
  }
  
  async getBillStatus(reference: string): Promise<BillPaymentResponse> {
    // Bill status checking not implemented in current API
    return {
      success: false,
      reference,
      status: 'failed',
      error: 'Not implemented',
    };
  }
}

// ==================== SINGLETON INSTANCE ====================

export const flutterwaveProvider = new FlutterwaveProvider();
export default flutterwaveProvider;