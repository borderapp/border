/**
 * Mock API Service for Border App
 * 
 * Provides realistic mock data and responses for testing all features
 * without requiring real API credentials
 */

import { isMockMode } from './api-config';

// ==================== MOCK DATA GENERATORS ====================

function delay(ms: number = 500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateReference(prefix: string = 'BDR'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function generateAccountNumber(): string {
  return '20' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
}

function generateCardNumber(): string {
  return '5399' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
}

// ==================== MOCK 9PSB API ====================

export const mockPSBAccount = {
  createAccount: async (userData: any) => {
    await delay();
    if (Math.random() > 0.9) {
      throw new Error('Account creation failed - BVN validation error');
    }
    return {
      success: true,
      data: {
        accountNumber: generateAccountNumber(),
        accountName: `${userData.firstName} ${userData.lastName}`,
        accountType: 'SAVINGS',
        currency: 'NGN',
        balance: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
    };
  },

  getBalance: async (accountNumber: string) => {
    await delay(300);
    return {
      success: true,
      data: {
        accountNumber,
        availableBalance: Math.floor(Math.random() * 500000),
        ledgerBalance: Math.floor(Math.random() * 500000),
        currency: 'NGN',
      },
    };
  },

  getStatement: async (accountNumber: string, startDate: string, endDate: string) => {
    await delay(800);
    const transactions = Array.from({ length: 15 }, (_, i) => ({
      reference: generateReference('TXN'),
      type: Math.random() > 0.5 ? 'CREDIT' : 'DEBIT',
      amount: Math.floor(Math.random() * 50000),
      balance: Math.floor(Math.random() * 500000),
      narration: ['Salary Payment', 'Transfer to John', 'Bill Payment', 'Airtime Purchase'][Math.floor(Math.random() * 4)],
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    }));
    return {
      success: true,
      data: {
        accountNumber,
        transactions,
        startDate,
        endDate,
      },
    };
  },
};

export const mockPSBTransfer = {
  verifyAccount: async (bankCode: string, accountNumber: string) => {
    await delay();
    const names = ['Adebayo Johnson', 'Chioma Nwosu', 'Oluwaseun Akin', 'Fatima Mohammed'];
    return {
      success: true,
      data: {
        accountNumber,
        accountName: names[Math.floor(Math.random() * names.length)],
        bankCode,
        bankName: 'Access Bank',
      },
    };
  },

  getBankList: async () => {
    await delay(300);
    return {
      success: true,
      data: [
        { code: '044', name: 'Access Bank' },
        { code: '063', name: 'Access Bank (Diamond)' },
        { code: '050', name: 'Ecobank Nigeria' },
        { code: '070', name: 'Fidelity Bank' },
        { code: '011', name: 'First Bank of Nigeria' },
        { code: '214', name: 'First City Monument Bank' },
        { code: '058', name: 'Guaranty Trust Bank' },
        { code: '030', name: 'Heritage Bank' },
        { code: '301', name: 'Jaiz Bank' },
        { code: '082', name: 'Keystone Bank' },
        { code: '526', name: 'Parallex Bank' },
        { code: '076', name: 'Polaris Bank' },
        { code: '101', name: 'Providus Bank' },
        { code: '221', name: 'Stanbic IBTC Bank' },
        { code: '068', name: 'Standard Chartered Bank' },
        { code: '232', name: 'Sterling Bank' },
        { code: '100', name: 'Suntrust Bank' },
        { code: '032', name: 'Union Bank of Nigeria' },
        { code: '033', name: 'United Bank For Africa' },
        { code: '215', name: 'Unity Bank' },
        { code: '035', name: 'Wema Bank' },
        { code: '057', name: 'Zenith Bank' },
      ],
    };
  },

  nipTransfer: async (transferData: any) => {
    await delay(1500);
    if (Math.random() > 0.95) {
      throw new Error('Transfer failed - Insufficient funds');
    }
    return {
      success: true,
      data: {
        reference: transferData.reference,
        status: 'SUCCESS',
        amount: transferData.amount,
        fee: 26.88,
        recipientName: 'Mock Recipient',
        sessionId: generateReference('SES'),
        timestamp: new Date().toISOString(),
      },
    };
  },

  internalTransfer: async (transferData: any) => {
    await delay(800);
    return {
      success: true,
      data: {
        reference: transferData.reference,
        status: 'SUCCESS',
        amount: transferData.amount,
        fee: 0,
        timestamp: new Date().toISOString(),
      },
    };
  },

  getTransferStatus: async (reference: string) => {
    await delay();
    return {
      success: true,
      data: {
        reference,
        status: ['PENDING', 'SUCCESS', 'FAILED'][Math.floor(Math.random() * 3)],
        timestamp: new Date().toISOString(),
      },
    };
  },
};

export const mockPSBCard = {
  createVirtualCard: async (cardData: any) => {
    await delay(1000);
    return {
      success: true,
      data: {
        cardId: generateReference('CARD'),
        cardNumber: generateCardNumber(),
        expiryMonth: '12',
        expiryYear: '2028',
        cvv: '***', // Hidden for security
        nameOnCard: cardData.nameOnCard,
        cardType: cardData.cardType,
        currency: cardData.currency,
        status: 'ACTIVE',
        balance: 0,
        createdAt: new Date().toISOString(),
      },
    };
  },

  requestPhysicalCard: async (cardData: any) => {
    await delay(1200);
    return {
      success: true,
      data: {
        cardId: generateReference('CARD'),
        status: 'REQUESTED',
        deliveryAddress: cardData.deliveryAddress,
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        trackingNumber: generateReference('TRK'),
      },
    };
  },

  getUserCards: async (accountNumber: string) => {
    await delay(500);
    return {
      success: true,
      data: [
        {
          cardId: generateReference('CARD'),
          cardNumber: generateCardNumber(),
          cardType: 'NAIRA',
          currency: 'NGN',
          status: 'ACTIVE',
          balance: 50000,
          isPhysical: false,
        },
        {
          cardId: generateReference('CARD'),
          cardNumber: generateCardNumber(),
          cardType: 'DOLLAR',
          currency: 'USD',
          status: 'ACTIVE',
          balance: 100,
          isPhysical: true,
        },
      ],
    };
  },

  fundCard: async (cardId: string, amount: number) => {
    await delay(800);
    return {
      success: true,
      data: {
        cardId,
        amount,
        newBalance: amount + Math.floor(Math.random() * 10000),
        reference: generateReference('FUND'),
        timestamp: new Date().toISOString(),
      },
    };
  },
};

export const mockPSBBills = {
  getBillers: async (category: string) => {
    await delay(400);
    const billers = {
      AIRTIME: [
        { code: 'MTN', name: 'MTN Nigeria' },
        { code: 'AIRTEL', name: 'Airtel Nigeria' },
        { code: 'GLO', name: 'Globacom' },
        { code: '9MOBILE', name: '9mobile' },
      ],
      DATA: [
        { code: 'MTN_DATA', name: 'MTN Data' },
        { code: 'AIRTEL_DATA', name: 'Airtel Data' },
        { code: 'GLO_DATA', name: 'Glo Data' },
        { code: '9MOBILE_DATA', name: '9mobile Data' },
      ],
      ELECTRICITY: [
        { code: 'EKEDC', name: 'Eko Electricity' },
        { code: 'IKEDC', name: 'Ikeja Electric' },
        { code: 'IBEDC', name: 'Ibadan Electricity' },
        { code: 'KEDCO', name: 'Kano Electricity' },
      ],
      CABLE: [
        { code: 'DSTV', name: 'DStv' },
        { code: 'GOTV', name: 'GOtv' },
        { code: 'STARTIMES', name: 'StarTimes' },
      ],
    };
    return {
      success: true,
      data: billers[category as keyof typeof billers] || [],
    };
  },

  validateCustomer: async (billerCode: string, customerReference: string) => {
    await delay(600);
    return {
      success: true,
      data: {
        customerName: 'John Adebayo',
        customerReference,
        billerCode,
        isValid: true,
      },
    };
  },

  buyAirtime: async (airtimeData: any) => {
    await delay(1000);
    return {
      success: true,
      data: {
        reference: airtimeData.reference,
        status: 'SUCCESS',
        amount: airtimeData.amount,
        phoneNumber: airtimeData.phoneNumber,
        network: airtimeData.network,
        timestamp: new Date().toISOString(),
      },
    };
  },

  getDataBundles: async (network: string) => {
    await delay(400);
    return {
      success: true,
      data: [
        { code: '1GB', name: '1GB - 30 Days', amount: 500 },
        { code: '2GB', name: '2GB - 30 Days', amount: 1000 },
        { code: '5GB', name: '5GB - 30 Days', amount: 2000 },
        { code: '10GB', name: '10GB - 30 Days', amount: 3500 },
        { code: '20GB', name: '20GB - 30 Days', amount: 6000 },
      ],
    };
  },

  payElectricity: async (electricityData: any) => {
    await delay(1500);
    return {
      success: true,
      data: {
        reference: electricityData.reference,
        status: 'SUCCESS',
        token: Math.random().toString(36).substring(2, 18).toUpperCase(),
        units: Math.floor(electricityData.amount / 90) + ' kWh',
        amount: electricityData.amount,
        meterNumber: electricityData.meterNumber,
        timestamp: new Date().toISOString(),
      },
    };
  },

  payCableTV: async (cableData: any) => {
    await delay(1200);
    return {
      success: true,
      data: {
        reference: cableData.reference,
        status: 'SUCCESS',
        smartCardNumber: cableData.smartCardNumber,
        provider: cableData.provider,
        packageCode: cableData.packageCode,
        timestamp: new Date().toISOString(),
      },
    };
  },
};

export const mockPSBCompliance = {
  verifyBVN: async (bvn: string, dateOfBirth: string) => {
    await delay(1500);
    if (bvn.length !== 11) {
      throw new Error('Invalid BVN format');
    }
    return {
      success: true,
      data: {
        bvn,
        firstName: 'Adebayo',
        lastName: 'Johnson',
        dateOfBirth,
        phoneNumber: '08012345678',
        isValid: true,
      },
    };
  },

  verifyNIN: async (nin: string) => {
    await delay(1500);
    if (nin.length !== 11) {
      throw new Error('Invalid NIN format');
    }
    return {
      success: true,
      data: {
        nin,
        firstName: 'Adebayo',
        lastName: 'Johnson',
        isValid: true,
      },
    };
  },

  getKYCStatus: async (accountNumber: string) => {
    await delay(500);
    return {
      success: true,
      data: {
        accountNumber,
        kycTier: Math.floor(Math.random() * 3) + 1,
        status: ['PENDING', 'VERIFIED', 'REJECTED'][Math.floor(Math.random() * 3)],
        documentsSubmitted: {
          bvn: true,
          idCard: Math.random() > 0.5,
          selfie: Math.random() > 0.5,
          proofOfAddress: Math.random() > 0.5,
        },
      },
    };
  },
};

// ==================== MOCK CELO BLOCKCHAIN ====================

export const mockCeloBlockchain = {
  getStablecoinBalance: async (address: string, stablecoin: string) => {
    await delay(800);
    const balances = {
      cUSD: Math.random() * 1000,
      cEUR: Math.random() * 800,
      USDC: Math.random() * 1200,
      CELO: Math.random() * 50,
    };
    return balances[stablecoin as keyof typeof balances] || 0;
  },

  getAllBalances: async (address: string) => {
    await delay(1000);
    return {
      cUSD: Math.random() * 1000,
      cEUR: Math.random() * 800,
      USDC: Math.random() * 1200,
      totalUSD: Math.random() * 3000,
    };
  },

  transferStablecoin: async (params: any) => {
    await delay(2000);
    if (Math.random() > 0.98) {
      throw new Error('Transaction failed - Insufficient gas');
    }
    return {
      txHash: '0x' + Math.random().toString(16).substring(2, 66),
      success: true,
      blockNumber: BigInt(Math.floor(Math.random() * 1000000)),
    };
  },

  estimateTransactionCost: async () => {
    await delay(500);
    return {
      gasCost: 0.001,
      gasCostUSD: 0.0005,
    };
  },

  healthCheck: async () => {
    await delay(300);
    return {
      connected: true,
      blockNumber: BigInt(Math.floor(Math.random() * 1000000)),
      network: 'Alfajores Testnet',
    };
  },
};

// ==================== MOCK EXCHANGE RATES ====================

const mockRates = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1650.0,
  GHS: 15.5,
  ZAR: 18.5,
  CAD: 1.37,
  CNY: 7.24,
};

export const mockExchangeRates = {
  fetchRates: async (baseCurrency: string = 'USD') => {
    await delay(600);
    const baseFactor = mockRates[baseCurrency as keyof typeof mockRates] || 1;
    const rates: Record<string, number> = {};
    
    Object.entries(mockRates).forEach(([code, rate]) => {
      rates[code] = rate / baseFactor;
    });
    
    return rates;
  },

  convertCurrency: async (amount: number, from: string, to: string) => {
    await delay(400);
    const rates = await mockExchangeRates.fetchRates(from);
    return amount * rates[to];
  },
};

// ==================== MOCK KYC PROVIDERS ====================

export const mockKYCService = {
  verifyIdentity: async (documentType: string, documentData: any) => {
    await delay(2000);
    if (Math.random() > 0.95) {
      return {
        success: false,
        error: 'Document verification failed - Image quality too low',
      };
    }
    return {
      success: true,
      data: {
        verified: true,
        confidence: 0.95 + Math.random() * 0.05,
        extractedData: {
          firstName: 'Adebayo',
          lastName: 'Johnson',
          dateOfBirth: '1990-01-15',
          documentNumber: generateReference('DOC'),
        },
      },
    };
  },

  performLivenessCheck: async (selfieData: any) => {
    await delay(1500);
    return {
      success: true,
      data: {
        isLive: true,
        confidence: 0.98,
        faceMatch: 0.96,
      },
    };
  },
};

// ==================== MOCK SMS SERVICE ====================

export const mockSMSService = {
  sendOTP: async (phoneNumber: string) => {
    await delay(800);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return {
      success: true,
      data: {
        messageId: generateReference('MSG'),
        otp, // In production, NEVER return OTP in response
        expiresIn: 300, // 5 minutes
      },
    };
  },

  verifyOTP: async (phoneNumber: string, otp: string) => {
    await delay(500);
    // Mock: accept any 6-digit number
    return {
      success: otp.length === 6,
      data: {
        verified: otp.length === 6,
      },
    };
  },
};

// ==================== MOCK PAYMENT GATEWAY ====================

export const mockPaymentGateway = {
  initializePayment: async (amount: number, email: string) => {
    await delay(1000);
    return {
      success: true,
      data: {
        reference: generateReference('PAY'),
        authorizationUrl: 'https://mock-payment-gateway.com/pay',
        accessCode: generateReference('AC'),
      },
    };
  },

  verifyPayment: async (reference: string) => {
    await delay(800);
    return {
      success: true,
      data: {
        reference,
        status: 'success',
        amount: Math.floor(Math.random() * 100000),
        paidAt: new Date().toISOString(),
      },
    };
  },
};

// ==================== EXPORT ALL MOCKS ====================

export const MockAPIService = {
  psb: {
    account: mockPSBAccount,
    transfer: mockPSBTransfer,
    card: mockPSBCard,
    bills: mockPSBBills,
    compliance: mockPSBCompliance,
  },
  celo: mockCeloBlockchain,
  exchangeRates: mockExchangeRates,
  kyc: mockKYCService,
  sms: mockSMSService,
  payment: mockPaymentGateway,
};

export default MockAPIService;
