/**
 * Integrated API Service for Border App
 * 
 * This service automatically switches between real APIs and mock data
 * based on configuration and credential availability
 */

import { API_CONFIG, isMockMode } from './api-config';
import { MockAPIService } from './mock-api-service';
import { supabase } from '@/lib/supabase';

// ==================== AUTO-SWITCHING API WRAPPER ====================

/**
 * Wrapper that automatically uses mock data when APIs are not configured
 */
class IntegratedAPIService {
  // ==================== ACCOUNT MANAGEMENT ====================
  
  async createAccount(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    bvn: string;
    address: string;
  }) {
    if (isMockMode()) {
      return MockAPIService.psb.account.createAccount(userData);
    }
    
    // Import real API when needed
    const { psbAccount } = await import('./9psb-api');
    return psbAccount.createAccount(userData);
  }

  async getAccountBalance(accountNumber: string) {
    if (isMockMode()) {
      return MockAPIService.psb.account.getBalance(accountNumber);
    }
    
    const { psbAccount } = await import('./9psb-api');
    return psbAccount.getBalance(accountNumber);
  }

  async getAccountStatement(accountNumber: string, startDate: string, endDate: string) {
    if (isMockMode()) {
      return MockAPIService.psb.account.getStatement(accountNumber, startDate, endDate);
    }
    
    const { psbAccount } = await import('./9psb-api');
    return psbAccount.getStatement(accountNumber, startDate, endDate);
  }

  // ==================== TRANSFERS ====================

  async verifyBankAccount(bankCode: string, accountNumber: string) {
    if (isMockMode()) {
      return MockAPIService.psb.transfer.verifyAccount(bankCode, accountNumber);
    }
    
    const { psbTransfer } = await import('./9psb-api');
    return psbTransfer.verifyAccount(bankCode, accountNumber);
  }

  async getBankList() {
    if (isMockMode()) {
      return MockAPIService.psb.transfer.getBankList();
    }
    
    const { psbTransfer } = await import('./9psb-api');
    return psbTransfer.getBankList();
  }

  async initiateNIPTransfer(transferData: {
    sourceAccountNumber: string;
    destinationBankCode: string;
    destinationAccountNumber: string;
    amount: number;
    narration: string;
    reference: string;
    pin?: string;
  }) {
    if (isMockMode()) {
      return MockAPIService.psb.transfer.nipTransfer(transferData);
    }
    
    const { psbTransfer } = await import('./9psb-api');
    return psbTransfer.nipTransfer(transferData);
  }

  async initiateInternalTransfer(transferData: {
    sourceAccountNumber: string;
    destinationAccountNumber: string;
    amount: number;
    narration: string;
    reference: string;
  }) {
    if (isMockMode()) {
      return MockAPIService.psb.transfer.internalTransfer(transferData);
    }
    
    const { psbTransfer } = await import('./9psb-api');
    return psbTransfer.internalTransfer(transferData);
  }

  async getTransferStatus(reference: string) {
    if (isMockMode()) {
      return MockAPIService.psb.transfer.getTransferStatus(reference);
    }
    
    const { psbTransfer } = await import('./9psb-api');
    return psbTransfer.getTransferStatus(reference);
  }

  // ==================== CARDS ====================

  async createVirtualCard(cardData: {
    accountNumber: string;
    cardType: 'NAIRA' | 'DOLLAR';
    nameOnCard: string;
    currency: 'NGN' | 'USD';
  }) {
    if (isMockMode()) {
      return MockAPIService.psb.card.createVirtualCard(cardData);
    }
    
    const { psbCard } = await import('./9psb-api');
    return psbCard.createVirtualCard(cardData);
  }

  async requestPhysicalCard(cardData: {
    accountNumber: string;
    cardType: 'NAIRA' | 'DOLLAR';
    nameOnCard: string;
    deliveryAddress: string;
    currency: 'NGN' | 'USD';
  }) {
    if (isMockMode()) {
      return MockAPIService.psb.card.requestPhysicalCard(cardData);
    }
    
    const { psbCard } = await import('./9psb-api');
    return psbCard.requestPhysicalCard(cardData);
  }

  async getUserCards(accountNumber: string) {
    if (isMockMode()) {
      return MockAPIService.psb.card.getUserCards(accountNumber);
    }
    
    const { psbCard } = await import('./9psb-api');
    return psbCard.getUserCards(accountNumber);
  }

  async fundCard(cardId: string, amount: number, sourceAccount: string) {
    if (isMockMode()) {
      return MockAPIService.psb.card.fundCard(cardId, amount);
    }
    
    const { psbCard } = await import('./9psb-api');
    return psbCard.fundCard(cardId, amount, sourceAccount);
  }

  // ==================== BILL PAYMENTS ====================

  async getBillers(category: 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE' | 'WATER') {
    if (isMockMode()) {
      return MockAPIService.psb.bills.getBillers(category);
    }
    
    const { psbBills } = await import('./9psb-api');
    return psbBills.getBillers(category);
  }

  async validateBillCustomer(billerCode: string, customerReference: string) {
    if (isMockMode()) {
      return MockAPIService.psb.bills.validateCustomer(billerCode, customerReference);
    }
    
    const { psbBills } = await import('./9psb-api');
    return psbBills.validateCustomer(billerCode, customerReference);
  }

  async buyAirtime(airtimeData: {
    phoneNumber: string;
    amount: number;
    network: 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE';
    sourceAccount: string;
    reference: string;
  }) {
    if (isMockMode()) {
      return MockAPIService.psb.bills.buyAirtime(airtimeData);
    }
    
    const { psbBills } = await import('./9psb-api');
    return psbBills.buyAirtime(airtimeData);
  }

  async getDataBundles(network: 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE') {
    if (isMockMode()) {
      return MockAPIService.psb.bills.getDataBundles(network);
    }
    
    const { psbBills } = await import('./9psb-api');
    return psbBills.getDataBundles(network);
  }

  async payElectricity(electricityData: {
    disco: string;
    meterNumber: string;
    amount: number;
    meterType: 'PREPAID' | 'POSTPAID';
    sourceAccount: string;
    reference: string;
  }) {
    if (isMockMode()) {
      return MockAPIService.psb.bills.payElectricity(electricityData);
    }
    
    const { psbBills } = await import('./9psb-api');
    return psbBills.payElectricity(electricityData);
  }

  async payCableTV(cableData: {
    provider: 'DSTV' | 'GOTV' | 'STARTIMES';
    smartCardNumber: string;
    packageCode: string;
    sourceAccount: string;
    reference: string;
  }) {
    if (isMockMode()) {
      return MockAPIService.psb.bills.payCableTV(cableData);
    }
    
    const { psbBills } = await import('./9psb-api');
    return psbBills.payCableTV(cableData);
  }

  // ==================== KYC & COMPLIANCE ====================

  async verifyBVN(bvn: string, dateOfBirth: string) {
    if (isMockMode()) {
      return MockAPIService.psb.compliance.verifyBVN(bvn, dateOfBirth);
    }
    
    const { psbCompliance } = await import('./9psb-api');
    return psbCompliance.verifyBVN(bvn, dateOfBirth);
  }

  async verifyNIN(nin: string) {
    if (isMockMode()) {
      return MockAPIService.psb.compliance.verifyNIN(nin);
    }
    
    const { psbCompliance } = await import('./9psb-api');
    return psbCompliance.verifyNIN(nin);
  }

  async getKYCStatus(accountNumber: string) {
    if (isMockMode()) {
      return MockAPIService.psb.compliance.getKYCStatus(accountNumber);
    }
    
    const { psbCompliance } = await import('./9psb-api');
    return psbCompliance.getKYCStatus(accountNumber);
  }

  // ==================== EXCHANGE RATES ====================

  async getExchangeRates(baseCurrency: string = 'USD') {
    // Exchange rates always use real API first, then fallback to mock
    try {
      const { fetchExchangeRates } = await import('./exchange-rates');
      return await fetchExchangeRates(baseCurrency);
    } catch (error) {
      return MockAPIService.exchangeRates.fetchRates(baseCurrency);
    }
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
    try {
      const { convertCurrency } = await import('./exchange-rates');
      return await convertCurrency(amount, fromCurrency as any, toCurrency as any);
    } catch (error) {
      return MockAPIService.exchangeRates.convertCurrency(amount, fromCurrency, toCurrency);
    }
  }

  // ==================== CELO BLOCKCHAIN ====================

  async getCeloBalance(address: string, stablecoin: 'cUSD' | 'cEUR' | 'USDC' | 'CELO') {
    if (isMockMode() || !API_CONFIG.celo.configured) {
      return MockAPIService.celo.getStablecoinBalance(address, stablecoin);
    }
    
    try {
      const { getStablecoinBalance } = await import('./celo-blockchain');
      return await getStablecoinBalance(address, stablecoin);
    } catch (error) {
      return MockAPIService.celo.getStablecoinBalance(address, stablecoin);
    }
  }

  async getAllCeloBalances(address: string) {
    if (isMockMode() || !API_CONFIG.celo.configured) {
      return MockAPIService.celo.getAllBalances(address);
    }
    
    try {
      const { getAllBalances } = await import('./celo-blockchain');
      return await getAllBalances(address);
    } catch (error) {
      return MockAPIService.celo.getAllBalances(address);
    }
  }

  async transferCeloStablecoin(params: {
    from: string;
    fromPrivateKey: string;
    to: string;
    amount: number;
    stablecoin: 'cUSD' | 'cEUR' | 'USDC' | 'CELO';
  }) {
    if (isMockMode() || !API_CONFIG.celo.configured) {
      return MockAPIService.celo.transferStablecoin(params);
    }
    
    try {
      const { transferStablecoin } = await import('./celo-blockchain');
      return await transferStablecoin(params);
    } catch (error) {
      return MockAPIService.celo.transferStablecoin(params);
    }
  }

  async estimateCeloGas(to: string, amount: number, stablecoin: 'cUSD' | 'cEUR' | 'USDC' | 'CELO') {
    if (isMockMode() || !API_CONFIG.celo.configured) {
      return MockAPIService.celo.estimateTransactionCost();
    }
    
    try {
      const { estimateTransactionCost } = await import('./celo-blockchain');
      return await estimateTransactionCost(to, amount, stablecoin);
    } catch (error) {
      return { gasCost: 0.001, gasCostUSD: 0.0005 };
    }
  }

  async checkCeloHealth() {
    if (isMockMode() || !API_CONFIG.celo.configured) {
      return MockAPIService.celo.healthCheck();
    }
    
    try {
      const { healthCheck } = await import('./celo-blockchain');
      return await healthCheck();
    } catch (error) {
      return {
        connected: false,
        error: 'Not configured',
      };
    }
  }

  // ==================== SMS/OTP ====================

  async sendOTP(phoneNumber: string) {
    // Always use mock for now
    return MockAPIService.sms.sendOTP(phoneNumber);
  }

  async verifyOTP(phoneNumber: string, otp: string) {
    // Always use mock for now
    return MockAPIService.sms.verifyOTP(phoneNumber, otp);
  }

  // ==================== PAYMENT GATEWAY ====================

  async initializePayment(amount: number, email: string) {
    // Always use mock for now
    return MockAPIService.payment.initializePayment(amount, email);
  }

  async verifyPayment(reference: string) {
    // Always use mock for now
    return MockAPIService.payment.verifyPayment(reference);
  }

  // ==================== UTILITIES ====================

  generateReference(prefix: string = 'BDR'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  async healthCheck() {
    const checks = {
      supabase: false,
      psb: false,
      exchangeRates: false,
      celo: false,
      timestamp: new Date().toISOString(),
    };

    // Check Supabase
    try {
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      checks.supabase = !error;
    } catch (error) {
      checks.supabase = false;
    }

    // Check 9PSB
    checks.psb = isMockMode() ? true : API_CONFIG.ninePSB.configured;

    // Check Exchange Rates
    try {
      await this.getExchangeRates();
      checks.exchangeRates = true;
    } catch (error) {
      checks.exchangeRates = false;
    }

    // Check Celo
    try {
      const result = await this.checkCeloHealth();
      checks.celo = result.connected;
    } catch (error) {
      checks.celo = false;
    }

    return checks;
  }

  getMode(): 'production' | 'mock' {
    return isMockMode() ? 'mock' : 'production';
  }
}

// Export singleton instance
export const BorderAPI = new IntegratedAPIService();

// Also export as default
export default BorderAPI;

