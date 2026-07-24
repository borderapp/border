/**
 * Central API Configuration for Border App
 * 
 * This file contains all API configurations and credentials
 * for easy management and testing
 */

export const API_CONFIG = {
  // ==================== SUPABASE ====================
  supabase: {
    url: 'https://ulolufsmjdlramdtstrr.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA',
    configured: true,
  },

  // ==================== 9PSB (Payment Service Bank) ====================
  ninePSB: {
    baseUrl: 'https://api.9psb.com.ng/v1',
    apiKey: 'BORDER_9PSB_API_KEY', // TODO: Replace with actual key
    clientId: 'BORDER_CLIENT_ID', // TODO: Replace with actual client ID
    clientSecret: 'BORDER_CLIENT_SECRET', // TODO: Replace with actual secret
    webhookSecret: 'BORDER_WEBHOOK_SECRET',
    useMockData: true, // Set to false when you have real credentials
    configured: false, // Set to true when credentials are added
  },

  // ==================== EXCHANGE RATE APIs ====================
  exchangeRates: {
    // Primary provider - ForexRateAPI.com (5,000 requests/month free)
    forexRate: {
      apiKey: '3d6abaa17ea1514dc16c533e7a64d675',
      baseUrl: 'https://api.forexrateapi.com/v1',
      configured: true,
    },
    
    // Fallback 1 - ExchangeRate-API.com (1,500 requests/month free)
    exchangeRateApi: {
      apiKey: 'YOUR_EXCHANGERATE_API_KEY', // Get from: https://www.exchangerate-api.com/
      baseUrl: 'https://v6.exchangerate-api.com/v6',
      configured: false,
    },
    
    // Fallback 2 - Fixer.io (100 requests/month free)
    fixer: {
      apiKey: 'YOUR_FIXER_API_KEY', // Get from: https://fixer.io/
      baseUrl: 'https://api.fixer.io/latest',
      configured: false,
    },
    
    // Fallback 3 - CurrencyAPI.com (300 requests/month free)
    currencyApi: {
      apiKey: 'YOUR_CURRENCYAPI_KEY', // Get from: https://currencyapi.com/
      baseUrl: 'https://api.currencyapi.com/v3/latest',
      configured: false,
    },
  },

  // ==================== CELO BLOCKCHAIN ====================
  celo: {
    // Mainnet
    mainnet: {
      rpcUrl: 'https://forno.celo.org', // Free public RPC
      chainId: 42220,
      contracts: {
        cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        cEUR: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
        USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
        CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438',
      },
    },
    
    // Testnet (Alfajores) - for development
    testnet: {
      rpcUrl: 'https://alfajores-forno.celo-testnet.org',
      chainId: 44787,
      contracts: {
        cUSD: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
        cEUR: '0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F',
        USDC: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
        CELO: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9',
      },
    },
    
    useTestnet: true, // Set to false for production
    useMockMode: true, // Use mock blockchain operations for testing
    masterWalletKey: 'MOCK_WALLET_KEY', // Mock key for testing
    configured: true, // Set to true to enable mock mode
  },

  // ==================== KYC PROVIDERS ====================
  kyc: {
    // PRIMARY: Shufti Pro (Global KYC with instant verification)
    shuftiPro: {
      clientId: 'c68b0b72fc602b23cc26521d2389599047f75aa5482615e67359e9aaae6027ad',
      secretKey: '90uY9B4d5Ncf2ueBSKqN1qgvXHC3nEJP',
      baseUrl: 'https://api.shuftipro.com',
      webhookSecret: 'BORDER_SHUFTI_WEBHOOK_SECRET', // Set your webhook secret
      configured: true, // ✅ Configured with real credentials
    },
    
    // Option 1: Youverify (Nigerian KYC specialist)
    youverify: {
      apiKey: 'YOUR_YOUVERIFY_API_KEY', // Get from: https://youverify.co/
      baseUrl: 'https://api.youverify.co/v2',
      configured: false,
    },
    
    // Option 2: Smile Identity (Pan-African)
    smileIdentity: {
      partnerId: 'YOUR_SMILE_PARTNER_ID', // Get from: https://smileidentity.com/
      apiKey: 'YOUR_SMILE_API_KEY',
      baseUrl: 'https://api.smileidentity.com/v1',
      configured: false,
    },
    
    // Option 3: Onfido (Global)
    onfido: {
      apiKey: 'YOUR_ONFIDO_API_KEY', // Get from: https://onfido.com/
      baseUrl: 'https://api.onfido.com/v3',
      configured: false,
    },
  },

  // ==================== PAYMENT GATEWAYS (for fiat on-ramp) ====================
  payments: {
    // Paystack (Nigerian payments)
    paystack: {
      publicKey: 'YOUR_PAYSTACK_PUBLIC_KEY', // Get from: https://paystack.com/
      secretKey: 'YOUR_PAYSTACK_SECRET_KEY',
      baseUrl: 'https://api.paystack.co',
      configured: false,
    },
    
    // Flutterwave (Multi-currency African payments)
    flutterwave: {
      publicKey: 'YOUR_FLUTTERWAVE_PUBLIC_KEY', // Get from: https://flutterwave.com/
      secretKey: 'YOUR_FLUTTERWAVE_SECRET_KEY',
      encryptionKey: 'YOUR_FLUTTERWAVE_ENCRYPTION_KEY',
      baseUrl: 'https://api.flutterwave.com/v3',
      configured: false,
    },
  },

  // ==================== SMS/OTP PROVIDERS ====================
  sms: {
    // Termii (Nigerian SMS)
    termii: {
      apiKey: 'YOUR_TERMII_API_KEY', // Get from: https://termii.com/
      senderId: 'BORDER', // Your sender ID
      baseUrl: 'https://api.ng.termii.com/api',
      configured: false,
    },
    
    // Twilio (Global fallback)
    twilio: {
      accountSid: 'YOUR_TWILIO_ACCOUNT_SID', // Get from: https://twilio.com/
      authToken: 'YOUR_TWILIO_AUTH_TOKEN',
      phoneNumber: 'YOUR_TWILIO_PHONE_NUMBER',
      baseUrl: 'https://api.twilio.com/2010-04-01',
      configured: false,
    },
  },

  // ==================== CRYPTO PRICE FEEDS ====================
  priceFeeds: {
    // CoinGecko (Free tier: 10-50 requests/minute)
    coingecko: {
      apiKey: 'YOUR_COINGECKO_API_KEY', // Optional for free tier
      baseUrl: 'https://api.coingecko.com/api/v3',
      configured: true, // Works without API key in free tier
    },
    
    // CoinMarketCap
    coinmarketcap: {
      apiKey: 'YOUR_CMC_API_KEY', // Get from: https://coinmarketcap.com/api/
      baseUrl: 'https://pro-api.coinmarketcap.com/v1',
      configured: false,
    },
  },

  // ==================== EMAIL SERVICE ====================
  email: {
    // Resend (Modern email API)
    resend: {
      apiKey: 'YOUR_RESEND_API_KEY', // Get from: https://resend.com/
      fromEmail: 'Border <hello@border.app>',
      baseUrl: 'https://api.resend.com',
      configured: false,
    },
    
    // SendGrid (Alternative)
    sendgrid: {
      apiKey: 'YOUR_SENDGRID_API_KEY', // Get from: https://sendgrid.com/
      fromEmail: 'hello@border.app',
      baseUrl: 'https://api.sendgrid.com/v3',
      configured: false,
    },
  },

  // ==================== ANALYTICS & MONITORING ====================
  monitoring: {
    // Sentry (Error tracking)
    sentry: {
      dsn: 'YOUR_SENTRY_DSN', // Get from: https://sentry.io/
      environment: 'development',
      configured: false,
    },
    
    // Mixpanel (Analytics)
    mixpanel: {
      token: 'YOUR_MIXPANEL_TOKEN', // Get from: https://mixpanel.com/
      configured: false,
    },
  },
};

// ==================== FEATURE FLAGS ====================
export const FEATURES = {
  // Core features
  multiCurrencyWallets: true,
  instantConversions: true,
  bankTransfers: true,
  
  // Advanced features
  stablecoinSettlement: true, // Backend stablecoin operations
  virtualCards: true,
  physicalCards: true,
  billPayments: true,
  virtualPOS: true,
  qrPayments: true,
  nfcPayments: true, // Requires NFC-enabled device
  
  // Business features
  internationalBusinessTransfers: true,
  securePay: true, // Escrow payments
  adminDashboard: true,
  
  // Mock mode (for testing without real APIs)
  useMockData: true, // Set to false in production
};

// ==================== SUPPORTED CURRENCIES ====================
export const CURRENCIES = {
  supported: ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'CAD', 'CNY'],
  default: 'NGN',
  symbols: {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
    GHS: 'GH₵',
    ZAR: 'R',
    CAD: 'C$',
    CNY: '¥',
  },
};

// ==================== TRANSACTION LIMITS ====================
export const LIMITS = {
  kyc: {
    tier1: {
      dailyLimit: 50000, // NGN
      monthlyLimit: 300000,
      singleTransaction: 20000,
    },
    tier2: {
      dailyLimit: 200000,
      monthlyLimit: 5000000,
      singleTransaction: 100000,
    },
    tier3: {
      dailyLimit: 5000000,
      monthlyLimit: 50000000,
      singleTransaction: 1000000,
    },
  },
  
  fees: {
    localTransfer: 0, // Free local transfers
    internationalTransfer: 0.5, // 0.5% fee
    cardCreation: 1000, // NGN 1,000
    billPayment: 0, // Free bill payments
    currencyConversion: 0.3, // 0.3% spread
  },
};

// ==================== API STATUS CHECKER ====================
export function getAPIStatus() {
  return {
    supabase: API_CONFIG.supabase.configured,
    ninePSB: API_CONFIG.ninePSB.configured,
    exchangeRates: API_CONFIG.exchangeRates.forexRate.configured,
    celo: API_CONFIG.celo.configured,
    kyc: Object.values(API_CONFIG.kyc).some(provider => provider.configured),
    payments: Object.values(API_CONFIG.payments).some(provider => provider.configured),
    sms: Object.values(API_CONFIG.sms).some(provider => provider.configured),
  };
}

// ==================== MOCK MODE HELPERS ====================
export function isMockMode(): boolean {
  return FEATURES.useMockData || !API_CONFIG.ninePSB.configured;
}

export function logAPIStatus() {
  // logging removed
}

// Auto-log status in development
if (import.meta.env.DEV) {
  setTimeout(() => logAPIStatus(), 1000);
}

export default API_CONFIG;