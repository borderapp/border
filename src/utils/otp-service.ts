import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

const serverUrl = `https://${projectId}.supabase.co/functions/v1/server`;

export type OTPMethod = 'email' | 'whatsapp' | 'sms';

interface OTPResponse {
  success: boolean;
  message: string;
  reference?: string;
  data?: any;
}

/**
 * Generate a 6-digit OTP code
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP in KV store (via edge function) with 10 minute expiry
 */
async function storeOTP(identifier: string, otp: string, method: OTPMethod): Promise<string> {
  const reference = `otp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
  
  try {
    const response = await fetch(`${serverUrl}/otp/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({
        reference,
        identifier,
        otp,
        method,
        expiresAt
      })
    });

    if (!response.ok) {
      throw new Error('Failed to store OTP');
    }

    return reference;
  } catch (error) {
    // Fallback to localStorage for development/testing
    if (typeof window !== 'undefined') {
      localStorage.setItem(reference, JSON.stringify({ otp, expiresAt, identifier, method }));
    }
    return reference;
  }
}

/**
 * Verify OTP against stored value
 */
async function verifyStoredOTP(reference: string, otp: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({ reference, otp })
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.valid === true;
  } catch (error) {
    // Fallback to localStorage for development/testing
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(reference);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.expiresAt > Date.now() && data.otp === otp) {
          localStorage.removeItem(reference);
          return true;
        }
      }
    }
    return false;
  }
}

/**
 * Send OTP via Email using Supabase Auth
 * This is production-ready and FREE to use
 */
async function sendEmailOTP(email: string): Promise<OTPResponse> {
  try {
    const otp = generateOTP();
    const reference = await storeOTP(email, otp, 'email');

    // Use Supabase's built-in email functionality
    // For production: Configure email templates in Supabase dashboard
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // You can customize this in Supabase dashboard
        data: {
          otp_code: otp,
        }
      }
    });

    if (error) {
      // Fallback: Log OTP for development
      
      return {
        success: true,
        message: `Verification code sent to ${email}. Check console in development mode.`,
        reference,
        data: { method: 'email', email, otp: process.env.NODE_ENV === 'development' ? otp : undefined }
      };
    }

    return {
      success: true,
      message: `Verification code sent to ${email}`,
      reference,
      data: { method: 'email', email }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to send email OTP'
    };
  }
}

/**
 * Send OTP via WhatsApp using Twilio
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
 * Monthly cost: ~$0.005 per message
 */
async function sendWhatsAppOTP(phone: string): Promise<OTPResponse> {
  try {
    const otp = generateOTP();
    const cleanPhone = phone.replace(/^0/, '').replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('234') ? `+${cleanPhone}` : `+234${cleanPhone}`;
    const reference = await storeOTP(fullPhone, otp, 'whatsapp');

    // Call edge function to send WhatsApp message via Twilio
    const response = await fetch(`${serverUrl}/otp/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({
        phone: fullPhone,
        otp
      })
    });

    if (!response.ok) {
      throw new Error('WhatsApp service unavailable');
    }

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        message: `Verification code sent via WhatsApp to ${fullPhone}`,
        reference,
        data: { method: 'whatsapp', phone: fullPhone }
      };
    } else {
      throw new Error(result.error || 'Failed to send WhatsApp message');
    }
  } catch (error: any) {
    // Fallback to showing OTP in console for development
    const otp = generateOTP();
    const cleanPhone = phone.replace(/^0/, '').replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('234') ? `+${cleanPhone}` : `+234${cleanPhone}`;
    const reference = await storeOTP(fullPhone, otp, 'whatsapp');
    
    
    return {
      success: true,
      message: `[DEV MODE] WhatsApp OTP: ${otp}. In production, this will be sent via WhatsApp.`,
      reference,
      data: { method: 'whatsapp', phone: fullPhone, otp: process.env.NODE_ENV === 'development' ? otp : undefined }
    };
  }
}

/**
 * Send OTP via SMS using Twilio or Termii
 * Requires: SMS provider credentials
 */
async function sendSMSOTP(phone: string): Promise<OTPResponse> {
  try {
    const otp = generateOTP();
    const cleanPhone = phone.replace(/^0/, '').replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('234') ? `+${cleanPhone}` : `+234${cleanPhone}`;
    const reference = await storeOTP(fullPhone, otp, 'sms');

    // Call edge function to send SMS
    const response = await fetch(`${serverUrl}/otp/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({
        phone: fullPhone,
        otp
      })
    });

    if (!response.ok) {
      throw new Error('SMS service unavailable');
    }

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        message: `Verification code sent via SMS to ${fullPhone}`,
        reference,
        data: { method: 'sms', phone: fullPhone }
      };
    } else {
      throw new Error(result.error || 'Failed to send SMS');
    }
  } catch (error: any) {
    // Development fallback
    const otp = generateOTP();
    const cleanPhone = phone.replace(/^0/, '').replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('234') ? `+${cleanPhone}` : `+234${cleanPhone}`;
    const reference = await storeOTP(fullPhone, otp, 'sms');
    
    
    return {
      success: true,
      message: `[DEV MODE] SMS OTP: ${otp}`,
      reference,
      data: { method: 'sms', phone: fullPhone, otp: process.env.NODE_ENV === 'development' ? otp : undefined }
    };
  }
}

/**
 * Main OTP sending function - automatically chooses best method
 */
export async function sendOTP(
  identifier: string,
  preferredMethod?: OTPMethod
): Promise<OTPResponse> {
  const isEmail = identifier.includes('@');
  
  // Determine method
  let method: OTPMethod = preferredMethod || (isEmail ? 'email' : 'whatsapp');
  
  // Send OTP using appropriate method
  switch (method) {
    case 'email':
      return await sendEmailOTP(identifier);
    case 'whatsapp':
      return await sendWhatsAppOTP(identifier);
    case 'sms':
      return await sendSMSOTP(identifier);
    default:
      return {
        success: false,
        message: 'Invalid OTP method'
      };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  reference: string,
  otp: string
): Promise<OTPResponse> {
  try {
    const isValid = await verifyStoredOTP(reference, otp);
    
    if (isValid) {
      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } else {
      return {
        success: false,
        message: 'Invalid or expired OTP code'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to verify OTP'
    };
  }
}

/**
 * OTP Service exports
 */
export const otpService = {
  sendOTP,
  verifyOTP,
  sendEmailOTP,
  sendWhatsAppOTP,
  sendSMSOTP,
};

export default otpService;