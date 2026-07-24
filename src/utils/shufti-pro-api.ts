/**
 * Shufti Pro KYC Integration
 * 
 * Official API Documentation: https://api.shuftipro.com/
 * 
 * Shufti Pro provides instant KYC verification with:
 * - Identity verification (document checks)
 * - Face verification (liveness detection)
 * - Address verification
 * - Background checks
 * - AML screening
 * - 2FA verification
 */

import { API_CONFIG } from './api-config';

// ==================== TYPES ====================

export interface ShuftiProCredentials {
  clientId: string;
  secretKey: string;
}

export interface ShuftiProVerificationRequest {
  reference: string; // Unique reference for this verification (user ID)
  country: string; // ISO 3166-1 alpha-2 country code (e.g., 'NG', 'US')
  language?: string; // Language code (default: 'en')
  email?: string; // User's email
  callback_url?: string; // Webhook URL for results
  redirect_url?: string; // URL to redirect after verification
  verification_mode?: 'image_only' | 'video_only' | 'any'; // Default: 'any'
  show_privacy_policy?: boolean; // Default: true
  show_results?: boolean; // Show results to user (default: false)
  show_feedback_form?: boolean; // Default: false
  allow_offline?: boolean; // Allow offline verification (default: false)
  allow_online?: boolean; // Allow online verification (default: true)
  decline_on_single_step?: boolean; // Decline if single step fails (default: false)
  face?: {
    proof?: string; // Base64 encoded selfie image (optional)
    allow_offline?: boolean;
    allow_online?: boolean;
  };
  document?: {
    supported_types: string[]; // ['passport', 'id_card', 'driving_license', 'credit_or_debit_card']
    name?: {
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      full_name?: string;
    };
    dob?: string; // Date of birth (YYYY-MM-DD)
    document_number?: string;
    expiry_date?: string; // YYYY-MM-DD
    issue_date?: string; // YYYY-MM-DD
    backside_proof_required?: boolean; // Default: false
    allow_offline?: boolean;
    allow_online?: boolean;
  };
  address?: {
    supported_types: string[]; // ['utility_bill', 'bank_statement', 'rent_agreement', 'employer_letter', 'insurance_agreement', 'tax_bill']
    name?: {
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      full_name?: string;
    };
    full_address?: string;
    address_fuzzy_match?: boolean; // Default: true
    allow_offline?: boolean;
    allow_online?: boolean;
  };
  consent?: {
    supported_types: string[]; // ['handwritten', 'printed']
    text: string; // Consent text to be shown
    allow_offline?: boolean;
    allow_online?: boolean;
  };
  phone?: {
    phone_number?: string;
    random_code?: boolean; // Generate random verification code
    text?: string; // Custom SMS text
    allow_offline?: boolean;
    allow_online?: boolean;
  };
  background_checks?: {
    name: {
      first_name: string;
      last_name: string;
      middle_name?: string;
    };
    dob: string; // YYYY-MM-DD
  };
}

export interface ShuftiProVerificationResponse {
  reference: string;
  event: string; // 'verification.accepted' | 'verification.declined' | 'request.pending' | 'request.invalid' | 'request.timeout' | 'request.unauthorized' | 'request.deleted'
  error?: string;
  verification_url?: string; // URL for user to complete verification
  verification_data?: {
    face?: {
      proof?: string;
      proof_url?: string;
    };
    document?: {
      name?: {
        first_name?: string;
        middle_name?: string;
        last_name?: string;
        full_name?: string;
      };
      dob?: string;
      document_number?: string;
      expiry_date?: string;
      issue_date?: string;
      selected_type?: string;
      country?: string;
      proof?: string;
      proof_url?: string;
    };
    address?: {
      name?: {
        first_name?: string;
        middle_name?: string;
        last_name?: string;
        full_name?: string;
      };
      full_address?: string;
      selected_type?: string;
      country?: string;
      proof?: string;
      proof_url?: string;
    };
    background_checks?: any;
  };
  verification_result?: {
    face?: number; // 1 = accepted, 0 = declined
    document?: number;
    address?: number;
    consent?: number;
    phone?: number;
    background_checks?: number;
  };
  declined_reason?: string;
  info?: {
    face?: string;
    document?: string;
    address?: string;
    consent?: string;
    phone?: string;
    background_checks?: string;
  };
}

export interface ShuftiProStatusResponse {
  reference: string;
  event: string;
  verification_url?: string;
  verification_data?: any;
  verification_result?: any;
  declined_reason?: string;
}

// ==================== API CLIENT ====================

class ShuftiProAPI {
  private baseUrl = 'https://api.shuftipro.com';
  private credentials: ShuftiProCredentials;

  constructor(credentials: ShuftiProCredentials) {
    this.credentials = credentials;
  }

  /**
   * Create authentication token for Shufti Pro API
   * Uses HTTP Basic Authentication with Client ID and Secret Key
   */
  private getAuthHeader(): string {
    const token = btoa(`${this.credentials.clientId}:${this.credentials.secretKey}`);
    return `Basic ${token}`;
  }

  /**
   * Create a new verification request
   * 
   * @param request - Verification request parameters
   * @returns Verification response with URL or immediate result
   */
  async createVerification(request: ShuftiProVerificationRequest): Promise<ShuftiProVerificationResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(),
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Shufti Pro verification failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check status of a verification
   * 
   * @param reference - Unique reference ID for the verification
   * @returns Current status of the verification
   */
  async checkStatus(reference: string): Promise<ShuftiProStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(),
        },
        body: JSON.stringify({ reference }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Status check failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a verification request
   * 
   * @param reference - Unique reference ID for the verification
   */
  async deleteVerification(reference: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(),
        },
        body: JSON.stringify({ reference }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Delete failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Create Shufti Pro client instance
 */
export function createShuftiProClient(credentials?: ShuftiProCredentials): ShuftiProAPI {
  const creds = credentials || {
    clientId: API_CONFIG.shuftiPro.clientId,
    secretKey: API_CONFIG.shuftiPro.secretKey,
  };

  return new ShuftiProAPI(creds);
}

/**
 * Start KYC verification for Border app users
 * 
 * @param userId - Border user ID
 * @param tier - KYC tier level (1-4)
 * @param userData - User data for verification
 * @param callbackUrl - Optional webhook URL for results
 * @param redirectUrl - Optional redirect URL after verification
 */
export async function startKYCVerification(
  userId: string,
  tier: number,
  userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    dob?: string;
    phone?: string;
    country?: string;
  },
  callbackUrl?: string,
  redirectUrl?: string
): Promise<ShuftiProVerificationResponse> {
  const client = createShuftiProClient();

  // Build verification request based on tier
  const request: ShuftiProVerificationRequest = {
    reference: `border-${userId}-tier${tier}-${Date.now()}`,
    country: userData.country || 'NG', // Default to Nigeria
    language: 'en',
    email: userData.email,
    callback_url: callbackUrl,
    redirect_url: redirectUrl,
    verification_mode: 'any',
    show_results: false,
    allow_offline: tier >= 3, // Allow offline for higher tiers
    allow_online: true,
  };

  // Tier 1: Basic - Name + BVN/National ID verification
  if (tier === 1) {
    request.document = {
      supported_types: ['id_card', 'passport', 'driving_license'],
      name: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        full_name: userData.fullName,
      },
      dob: userData.dob,
      backside_proof_required: false,
      allow_online: true,
    };
  }

  // Tier 2: Plus - Document + Selfie/Liveness + Basic Address
  if (tier === 2) {
    request.document = {
      supported_types: ['id_card', 'passport', 'driving_license'],
      name: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        full_name: userData.fullName,
      },
      dob: userData.dob,
      backside_proof_required: true,
      allow_online: true,
    };

    request.face = {
      allow_online: true,
      allow_offline: false,
    };

    request.address = {
      supported_types: ['utility_bill', 'bank_statement', 'rent_agreement'],
      name: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        full_name: userData.fullName,
      },
      address_fuzzy_match: true,
      allow_online: true,
    };
  }

  // Tier 3: Pro - Full KYC + Background Checks
  if (tier === 3) {
    request.document = {
      supported_types: ['id_card', 'passport', 'driving_license'],
      name: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        full_name: userData.fullName,
      },
      dob: userData.dob,
      backside_proof_required: true,
      allow_online: true,
      allow_offline: true,
    };

    request.face = {
      allow_online: true,
      allow_offline: true,
    };

    request.address = {
      supported_types: ['utility_bill', 'bank_statement', 'rent_agreement', 'employer_letter', 'tax_bill'],
      name: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        full_name: userData.fullName,
      },
      address_fuzzy_match: true,
      allow_online: true,
      allow_offline: true,
    };

    if (userData.dob && userData.firstName && userData.lastName) {
      request.background_checks = {
        name: {
          first_name: userData.firstName,
          last_name: userData.lastName,
        },
        dob: userData.dob,
      };
    }
  }

  // Tier 4: Business - Same as Tier 3 + Consent
  if (tier === 4) {
    request.document = {
      supported_types: ['id_card', 'passport', 'driving_license'],
      name: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        full_name: userData.fullName,
      },
      dob: userData.dob,
      backside_proof_required: true,
      allow_online: true,
      allow_offline: true,
    };

    request.face = {
      allow_online: true,
      allow_offline: true,
    };

    request.address = {
      supported_types: ['utility_bill', 'bank_statement', 'rent_agreement', 'employer_letter', 'tax_bill'],
      name: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        full_name: userData.fullName,
      },
      address_fuzzy_match: true,
      allow_online: true,
      allow_offline: true,
    };

    if (userData.dob && userData.firstName && userData.lastName) {
      request.background_checks = {
        name: {
          first_name: userData.firstName,
          last_name: userData.lastName,
        },
        dob: userData.dob,
      };
    }

    request.consent = {
      supported_types: ['handwritten', 'printed'],
      text: 'I hereby consent to Border using my information for KYB verification and compliance purposes.',
      allow_online: true,
      allow_offline: true,
    };

    // Optional: Phone verification
    if (userData.phone) {
      request.phone = {
        phone_number: userData.phone,
        random_code: true,
        allow_online: true,
      };
    }
  }

  return client.createVerification(request);
}

/**
 * Check verification status
 */
export async function checkVerificationStatus(reference: string): Promise<ShuftiProStatusResponse> {
  const client = createShuftiProClient();
  return client.checkStatus(reference);
}

/**
 * Cancel/delete a verification
 */
export async function cancelVerification(reference: string): Promise<{ message: string }> {
  const client = createShuftiProClient();
  return client.deleteVerification(reference);
}

/**
 * Verify webhook signature (for webhook callbacks)
 */
export function verifyWebhookSignature(payload: string, signature: string, secretKey: string): boolean {
  // Shufti Pro uses HMAC SHA256 for webhook signatures
  // Implementation would depend on your backend setup
  // This is a placeholder for the verification logic
  return true;
}

export default ShuftiProAPI;
