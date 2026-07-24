// Countries and their states/provinces for Border app
// Updated with Exclusive Routing Engine (Prompt 8)

export interface SupportedCountry {
  code: string;
  name: string;
  flag: string;
  phoneCode: string;
  provider: '9PSB' | 'Circle';
  transfer_enabled: boolean;
  bank_payout_enabled: boolean;
  stablecoin_enabled: boolean;
  kyc_level_required: number;
  transaction_limits: {
    daily: number;
    monthly: number;
  };
  states?: string[];
}

export const countries: SupportedCountry[] = [
  // 🇳🇬 Nigeria (Exclusive 9PSB Routing)
  {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    phoneCode: '+234',
    provider: '9PSB',
    transfer_enabled: true,
    bank_payout_enabled: true,
    stablecoin_enabled: false,
    kyc_level_required: 1,
    transaction_limits: { daily: 500000, monthly: 5000000 },
    states: [
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 
      'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 
      'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 
      'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 
      'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ]
  },

  // 🌍 Circle Countries (Exclusive Global Routing)
  
  // North America
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    phoneCode: '+1',
    provider: 'Circle',
    transfer_enabled: true,
    bank_payout_enabled: true,
    stablecoin_enabled: true,
    kyc_level_required: 2,
    transaction_limits: { daily: 10000, monthly: 50000 },
    states: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming']
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    phoneCode: '+1',
    provider: 'Circle',
    transfer_enabled: true,
    bank_payout_enabled: true,
    stablecoin_enabled: true,
    kyc_level_required: 2,
    transaction_limits: { daily: 10000, monthly: 50000 }
  },

  // Europe
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', phoneCode: '+44', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', phoneCode: '+49', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'FR', name: 'France', flag: '🇫🇷', phoneCode: '+33', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', phoneCode: '+34', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', phoneCode: '+39', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', phoneCode: '+31', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', phoneCode: '+353', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', phoneCode: '+351', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', phoneCode: '+32', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', phoneCode: '+43', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', phoneCode: '+46', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', phoneCode: '+47', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', phoneCode: '+45', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', phoneCode: '+358', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', phoneCode: '+41', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', phoneCode: '+48', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', phoneCode: '+420', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },

  // Africa
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', phoneCode: '+233', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', phoneCode: '+254', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', phoneCode: '+27', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', phoneCode: '+20', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', phoneCode: '+212', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', phoneCode: '+221', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', phoneCode: '+250', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', phoneCode: '+256', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', phoneCode: '+255', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },

  // Asia
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', phoneCode: '+65', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', phoneCode: '+971', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', phoneCode: '+81', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', phoneCode: '+82', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'IN', name: 'India', flag: '🇮🇳', phoneCode: '+91', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', phoneCode: '+62', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', phoneCode: '+60', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', phoneCode: '+63', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', phoneCode: '+66', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },

  // South America
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', phoneCode: '+55', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', phoneCode: '+54', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', phoneCode: '+56', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', phoneCode: '+57', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', phoneCode: '+51', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 5000, monthly: 20000 } },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', phoneCode: '+52', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },

  // Oceania
  { code: 'AU', name: 'Australia', flag: '🇦🇺', phoneCode: '+61', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', phoneCode: '+64', provider: 'Circle', transfer_enabled: true, bank_payout_enabled: true, stablecoin_enabled: true, kyc_level_required: 2, transaction_limits: { daily: 10000, monthly: 50000 } },
];

export function getCountryByCode(code: string): SupportedCountry | undefined {
  return countries.find(c => c.code === code);
}

export function getCountryByName(name: string): SupportedCountry | undefined {
  return countries.find(c => c.name === name);
}

export function getCountryNames(): string[] {
  return countries.map(c => c.name);
}

export function getStates(countryCode: string): string[] {
  const country = getCountryByCode(countryCode);
  return country?.states || [];
}

/**
 * Global Routing Engine (Prompt 1 & 7)
 * Returns the exclusive settlement provider for a country
 * 
 * NOTE: Nigeria uses '9PSB' internally (legacy) but routes to Flutterwave
 * All other countries route to Circle
 */
export function getSettlementProvider(countryCode: string): '9PSB' | 'Circle' {
  if (countryCode === 'NG' || countryCode === 'Nigeria') {
    // Returns '9PSB' for internal routing, but actually uses Flutterwave
    // See /src/utils/settlement-orchestrator.ts for actual provider selection
    return '9PSB';
  }
  return 'Circle';
}