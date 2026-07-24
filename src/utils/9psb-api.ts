/**
 * 9PSB (9 Payment Service Bank) API Integration
 * 
 * This module handles all interactions with 9PSB APIs for:
 * - Nigerian bank transfers (NIP, Internal)
 * - Virtual and physical card issuance
 * - Bill payments (airtime, data, electricity, cable, water)
 * - Account management
 * - Transaction verification
 */

// 9PSB Configuration
const PSB_CONFIG = {
  baseUrl: 'https://api.9psb.com.ng/v1', // Replace with actual 9PSB base URL when available
  apiKey: 'BORDER_9PSB_API_KEY_PRODUCTION', // TODO: Replace with your actual 9PSB API key
  clientId: 'BORDER_CLIENT_ID', // TODO: Replace with your actual 9PSB Client ID
  clientSecret: 'BORDER_CLIENT_SECRET', // TODO: Replace with your actual 9PSB Client Secret
  webhookSecret: 'BORDER_WEBHOOK_SECRET', // TODO: Replace with your actual webhook secret
  // Mock mode for development/testing
  useMockData: true, // Set to false when you have real 9PSB credentials
};

// Helper function for 9PSB API requests
async function psbRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  customHeaders?: Record<string, string>
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': PSB_CONFIG.apiKey,
    'X-Client-Id': PSB_CONFIG.clientId,
    ...customHeaders,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${PSB_CONFIG.baseUrl}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `9PSB API Error: ${response.status}`);
  }

  return response.json();
}

// ==================== AUTHENTICATION ====================

export const psbAuth = {
  /**
   * Get OAuth access token for 9PSB API
   */
  getAccessToken: async (): Promise<string> => {
    try {
      const response = await fetch(`${PSB_CONFIG.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: PSB_CONFIG.clientId,
          client_secret: PSB_CONFIG.clientSecret,
          grant_type: 'client_credentials',
        }),
      });

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      throw new Error('Failed to authenticate with 9PSB');
    }
  },
};

// ==================== ACCOUNT MANAGEMENT ====================

export const psbAccount = {
  /**
   * Create a new virtual account for user
   */
  createAccount: async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    bvn: string;
    address: string;
  }) => {
    return psbRequest('/accounts/create', 'POST', {
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      bvn: userData.bvn,
      address: userData.address,
      account_type: 'SAVINGS',
    });
  },

  /**
   * Get account details
   */
  getAccountDetails: async (accountNumber: string) => {
    return psbRequest(`/accounts/${accountNumber}`);
  },

  /**
   * Get account balance
   */
  getBalance: async (accountNumber: string) => {
    return psbRequest(`/accounts/${accountNumber}/balance`);
  },

  /**
   * Get account statement
   */
  getStatement: async (accountNumber: string, startDate: string, endDate: string) => {
    return psbRequest(
      `/accounts/${accountNumber}/statement?start_date=${startDate}&end_date=${endDate}`
    );
  },

  /**
   * Freeze/Unfreeze account
   */
  updateAccountStatus: async (accountNumber: string, status: 'ACTIVE' | 'FROZEN') => {
    return psbRequest(`/accounts/${accountNumber}/status`, 'PATCH', { status });
  },
};

// ==================== BANK TRANSFERS ====================

export const psbTransfer = {
  /**
   * Verify bank account name
   */
  verifyAccount: async (bankCode: string, accountNumber: string) => {
    return psbRequest('/transfers/verify-account', 'POST', {
      bank_code: bankCode,
      account_number: accountNumber,
    });
  },

  /**
   * Get list of supported Nigerian banks
   */
  getBankList: async () => {
    return psbRequest('/banks');
  },

  /**
   * Initiate NIP transfer (Nigerian Instant Payment)
   */
  nipTransfer: async (transferData: {
    sourceAccountNumber: string;
    destinationBankCode: string;
    destinationAccountNumber: string;
    amount: number;
    narration: string;
    reference: string;
    pin?: string;
  }) => {
    return psbRequest('/transfers/nip', 'POST', {
      source_account: transferData.sourceAccountNumber,
      destination_bank: transferData.destinationBankCode,
      destination_account: transferData.destinationAccountNumber,
      amount: transferData.amount,
      narration: transferData.narration,
      reference: transferData.reference,
      pin: transferData.pin,
    });
  },

  /**
   * Internal transfer (9PSB to 9PSB)
   */
  internalTransfer: async (transferData: {
    sourceAccountNumber: string;
    destinationAccountNumber: string;
    amount: number;
    narration: string;
    reference: string;
  }) => {
    return psbRequest('/transfers/internal', 'POST', {
      source_account: transferData.sourceAccountNumber,
      destination_account: transferData.destinationAccountNumber,
      amount: transferData.amount,
      narration: transferData.narration,
      reference: transferData.reference,
    });
  },

  /**
   * Get transfer status
   */
  getTransferStatus: async (reference: string) => {
    return psbRequest(`/transfers/status/${reference}`);
  },

  /**
   * Get transfer history
   */
  getTransferHistory: async (accountNumber: string, page: number = 1, limit: number = 50) => {
    return psbRequest(`/transfers/history?account=${accountNumber}&page=${page}&limit=${limit}`);
  },
};

// ==================== CARD SERVICES ====================

export const psbCard = {
  /**
   * Create virtual card (NGN or USD)
   */
  createVirtualCard: async (cardData: {
    accountNumber: string;
    cardType: 'NAIRA' | 'DOLLAR';
    nameOnCard: string;
    currency: 'NGN' | 'USD';
  }) => {
    return psbRequest('/cards/virtual/create', 'POST', {
      account_number: cardData.accountNumber,
      card_type: cardData.cardType,
      name_on_card: cardData.nameOnCard,
      currency: cardData.currency,
    });
  },

  /**
   * Request physical card
   */
  requestPhysicalCard: async (cardData: {
    accountNumber: string;
    cardType: 'NAIRA' | 'DOLLAR';
    nameOnCard: string;
    deliveryAddress: string;
    currency: 'NGN' | 'USD';
  }) => {
    return psbRequest('/cards/physical/request', 'POST', {
      account_number: cardData.accountNumber,
      card_type: cardData.cardType,
      name_on_card: cardData.nameOnCard,
      delivery_address: cardData.deliveryAddress,
      currency: cardData.currency,
    });
  },

  /**
   * Get card details
   */
  getCardDetails: async (cardId: string) => {
    return psbRequest(`/cards/${cardId}`);
  },

  /**
   * Get all user cards
   */
  getUserCards: async (accountNumber: string) => {
    return psbRequest(`/cards?account=${accountNumber}`);
  },

  /**
   * Freeze/Unfreeze card
   */
  updateCardStatus: async (cardId: string, status: 'ACTIVE' | 'FROZEN' | 'TERMINATED') => {
    return psbRequest(`/cards/${cardId}/status`, 'PATCH', { status });
  },

  /**
   * Set card spending limit
   */
  setCardLimit: async (cardId: string, limits: {
    dailyLimit?: number;
    monthlyLimit?: number;
    transactionLimit?: number;
  }) => {
    return psbRequest(`/cards/${cardId}/limits`, 'PATCH', limits);
  },

  /**
   * Enable/Disable card features
   */
  updateCardFeatures: async (cardId: string, features: {
    onlinePayments?: boolean;
    internationalPayments?: boolean;
    atmWithdrawal?: boolean;
    contactless?: boolean;
  }) => {
    return psbRequest(`/cards/${cardId}/features`, 'PATCH', features);
  },

  /**
   * Get card transactions
   */
  getCardTransactions: async (cardId: string, page: number = 1, limit: number = 50) => {
    return psbRequest(`/cards/${cardId}/transactions?page=${page}&limit=${limit}`);
  },

  /**
   * Fund card wallet
   */
  fundCard: async (cardId: string, amount: number, sourceAccount: string) => {
    return psbRequest(`/cards/${cardId}/fund`, 'POST', {
      amount,
      source_account: sourceAccount,
    });
  },

  /**
   * Get card CVV (secure retrieval)
   */
  getCardCVV: async (cardId: string, pin: string) => {
    return psbRequest(`/cards/${cardId}/cvv`, 'POST', { pin });
  },
};

// ==================== BILL PAYMENTS ====================

export const psbBills = {
  /**
   * Get list of billers by category
   */
  getBillers: async (category: 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE' | 'WATER') => {
    return psbRequest(`/bills/billers?category=${category}`);
  },

  /**
   * Validate bill customer (e.g., meter number, decoder number)
   */
  validateCustomer: async (billerCode: string, customerReference: string) => {
    return psbRequest('/bills/validate', 'POST', {
      biller_code: billerCode,
      customer_reference: customerReference,
    });
  },

  /**
   * Purchase airtime
   */
  buyAirtime: async (airtimeData: {
    phoneNumber: string;
    amount: number;
    network: 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE';
    sourceAccount: string;
    reference: string;
  }) => {
    return psbRequest('/bills/airtime', 'POST', {
      phone_number: airtimeData.phoneNumber,
      amount: airtimeData.amount,
      network: airtimeData.network,
      source_account: airtimeData.sourceAccount,
      reference: airtimeData.reference,
    });
  },

  /**
   * Purchase data bundle
   */
  buyData: async (dataData: {
    phoneNumber: string;
    bundleCode: string;
    network: 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE';
    sourceAccount: string;
    reference: string;
  }) => {
    return psbRequest('/bills/data', 'POST', {
      phone_number: dataData.phoneNumber,
      bundle_code: dataData.bundleCode,
      network: dataData.network,
      source_account: dataData.sourceAccount,
      reference: dataData.reference,
    });
  },

  /**
   * Get data bundles
   */
  getDataBundles: async (network: 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE') => {
    return psbRequest(`/bills/data/bundles?network=${network}`);
  },

  /**
   * Pay electricity bill
   */
  payElectricity: async (electricityData: {
    disco: string; // Distribution company code
    meterNumber: string;
    amount: number;
    meterType: 'PREPAID' | 'POSTPAID';
    sourceAccount: string;
    reference: string;
  }) => {
    return psbRequest('/bills/electricity', 'POST', {
      disco: electricityData.disco,
      meter_number: electricityData.meterNumber,
      amount: electricityData.amount,
      meter_type: electricityData.meterType,
      source_account: electricityData.sourceAccount,
      reference: electricityData.reference,
    });
  },

  /**
   * Pay cable TV subscription
   */
  payCableTV: async (cableData: {
    provider: 'DSTV' | 'GOTV' | 'STARTIMES';
    smartCardNumber: string;
    packageCode: string;
    sourceAccount: string;
    reference: string;
  }) => {
    return psbRequest('/bills/cable', 'POST', {
      provider: cableData.provider,
      smartcard_number: cableData.smartCardNumber,
      package_code: cableData.packageCode,
      source_account: cableData.sourceAccount,
      reference: cableData.reference,
    });
  },

  /**
   * Get cable TV packages
   */
  getCablePackages: async (provider: 'DSTV' | 'GOTV' | 'STARTIMES') => {
    return psbRequest(`/bills/cable/packages?provider=${provider}`);
  },

  /**
   * Get bill payment status
   */
  getBillStatus: async (reference: string) => {
    return psbRequest(`/bills/status/${reference}`);
  },

  /**
   * Get bill payment history
   */
  getBillHistory: async (accountNumber: string, page: number = 1, limit: number = 50) => {
    return psbRequest(`/bills/history?account=${accountNumber}&page=${page}&limit=${limit}`);
  },
};

// ==================== VIRTUAL POS ====================

export const psbPOS = {
  /**
   * Register as POS agent
   */
  registerAgent: async (agentData: {
    businessName: string;
    businessAddress: string;
    accountNumber: string;
    businessCategory: string;
  }) => {
    return psbRequest('/pos/agent/register', 'POST', {
      business_name: agentData.businessName,
      business_address: agentData.businessAddress,
      account_number: agentData.accountNumber,
      business_category: agentData.businessCategory,
    });
  },

  /**
   * Generate payment QR code
   */
  generateQRCode: async (amount: number, reference: string, description?: string) => {
    return psbRequest('/pos/qr/generate', 'POST', {
      amount,
      reference,
      description,
    });
  },

  /**
   * Process NFC payment
   */
  processNFCPayment: async (paymentData: {
    amount: number;
    cardData: string; // Encrypted card data from NFC
    reference: string;
    merchantAccount: string;
  }) => {
    return psbRequest('/pos/nfc/process', 'POST', {
      amount: paymentData.amount,
      card_data: paymentData.cardData,
      reference: paymentData.reference,
      merchant_account: paymentData.merchantAccount,
    });
  },

  /**
   * Get POS transaction history
   */
  getTransactions: async (merchantAccount: string, page: number = 1, limit: number = 50) => {
    return psbRequest(
      `/pos/transactions?merchant=${merchantAccount}&page=${page}&limit=${limit}`
    );
  },

  /**
   * Get settlement details
   */
  getSettlements: async (merchantAccount: string, startDate: string, endDate: string) => {
    return psbRequest(
      `/pos/settlements?merchant=${merchantAccount}&start_date=${startDate}&end_date=${endDate}`
    );
  },
};

// ==================== COMPLIANCE & KYC ====================

export const psbCompliance = {
  /**
   * Verify BVN
   */
  verifyBVN: async (bvn: string, dateOfBirth: string) => {
    return psbRequest('/compliance/bvn/verify', 'POST', {
      bvn,
      date_of_birth: dateOfBirth,
    });
  },

  /**
   * Verify NIN
   */
  verifyNIN: async (nin: string) => {
    return psbRequest('/compliance/nin/verify', 'POST', { nin });
  },

  /**
   * Upload KYC document
   */
  uploadKYCDocument: async (documentData: {
    accountNumber: string;
    documentType: 'ID_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'UTILITY_BILL' | 'SELFIE';
    documentFile: File | Blob;
  }) => {
    const formData = new FormData();
    formData.append('account_number', documentData.accountNumber);
    formData.append('document_type', documentData.documentType);
    formData.append('file', documentData.documentFile);

    // Custom request for file upload
    const response = await fetch(`${PSB_CONFIG.baseUrl}/compliance/documents/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': PSB_CONFIG.apiKey,
        'X-Client-Id': PSB_CONFIG.clientId,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload document');
    }

    return response.json();
  },

  /**
   * Get KYC status
   */
  getKYCStatus: async (accountNumber: string) => {
    return psbRequest(`/compliance/kyc/status/${accountNumber}`);
  },

  /**
   * Update KYC tier
   */
  updateKYCTier: async (accountNumber: string, tier: 1 | 2 | 3) => {
    return psbRequest(`/compliance/kyc/tier`, 'PATCH', {
      account_number: accountNumber,
      tier,
    });
  },
};

// ==================== WEBHOOKS ====================

export const psbWebhook = {
  /**
   * Verify webhook signature
   */
  verifySignature: (payload: string, signature: string): boolean => {
    // Implement HMAC verification with webhook secret
    // This is a placeholder - implement based on 9PSB documentation
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', PSB_CONFIG.webhookSecret);
    const computedSignature = hmac.update(payload).digest('hex');
    return computedSignature === signature;
  },

  /**
   * Parse webhook event
   */
  parseWebhookEvent: (payload: any) => {
    return {
      eventType: payload.event_type,
      data: payload.data,
      timestamp: payload.timestamp,
      reference: payload.reference,
    };
  },
};

// ==================== UTILITIES ====================

export const psbUtils = {
  /**
   * Generate unique reference
   */
  generateReference: (prefix: string = 'BDR'): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  },

  /**
   * Validate account number
   */
  validateAccountNumber: (accountNumber: string): boolean => {
    return /^\d{10}$/.test(accountNumber);
  },

  /**
   * Validate BVN
   */
  validateBVN: (bvn: string): boolean => {
    return /^\d{11}$/.test(bvn);
  },

  /**
   * Validate phone number
   */
  validatePhoneNumber: (phone: string): boolean => {
    return /^(\+234|0)[7-9][0-1]\d{8}$/.test(phone);
  },

  /**
   * Format amount to kobo (9PSB uses kobo for amounts)
   */
  toKobo: (amount: number): number => {
    return Math.round(amount * 100);
  },

  /**
   * Format amount from kobo
   */
  fromKobo: (kobo: number): number => {
    return kobo / 100;
  },
};

export default {
  psbAuth,
  psbAccount,
  psbTransfer,
  psbCard,
  psbBills,
  psbPOS,
  psbCompliance,
  psbWebhook,
  psbUtils,
};