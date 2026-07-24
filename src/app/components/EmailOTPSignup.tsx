import borderLogoText from '@/imports/ChatGPT_Image_Jun_29__2026__06_01_55_PM-removebg-preview.png';
import borderLogoIcon from '@/imports/ChatGPT_Image_Jun_29__2026__06_01_55_PM-removebg-preview.png';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { Shield, ArrowRight, Loader2, CheckCircle2, Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { countries, getStates } from '@/utils/countries-data';

interface EmailOTPSignupProps {
  onComplete: () => void;
  onLoginClick?: () => void;
}

export default function EmailOTPSignup({ onComplete, onLoginClick }: EmailOTPSignupProps) {
  const [step, setStep] = useState<'form' | 'verify' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    country: 'Nigeria',
    state: '',
    city: '',
    bvn: '',
  });

  const selectedCountry = countries.find(c => c.name === formData.country);
  const availableStates = getStates(selectedCountry?.code || '');

  // Step 1: Send OTP to email
  const handleSendOTP = async () => {
    // Validation
    if (!formData.email || !formData.password || !formData.name || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // BVN uniqueness check (Nigerian users)
    if (formData.country === 'Nigeria' && formData.bvn) {
      if (!/^\d{11}$/.test(formData.bvn)) {
        toast.error('BVN must be exactly 11 digits');
        return;
      }
      // Check if this BVN is already registered
      const { data: existingBvn } = await supabase
        .from('profiles')
        .select('id')
        .eq('bvn', formData.bvn)
        .maybeSingle();
      if (existingBvn) {
        toast.error('This BVN is already registered to another account. Please contact support if this is an error.');
        return;
      }
    }

    setLoading(true);
    try {

      // Use Supabase's signInWithOtp for email OTP - this will create the user upon verification
      const { data, error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          shouldCreateUser: true, // Allow user creation via OTP
          data: {
            name: formData.name,
            phone: formData.phone.replace(/^(\+234|0)/, ''),
            country: formData.country,
            state: formData.state,
            city: formData.city,
            kyc_level: 0
          }
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Verification code sent!', {
        description: `Check your email at ${formData.email}`,
        duration: 5000
      });

      setStep('verify');
      startResendCooldown();
    } catch (error: any) {
      toast.error('Failed to send verification code', {
        description: error.message || 'Please try again'
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and create account
  const handleVerifyOTP = async () => {
    if (otpCode.length !== 8) {
      toast.error('Please enter the 8-digit code');
      return;
    }

    setLoading(true);
    try {

      // Verify OTP - this will create the user account
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: otpCode,
        type: 'email'
      });

      if (verifyError) {
        throw verifyError;
      }


      // Now set the password for the newly created user
      const { error: passwordError } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (passwordError) {
        throw passwordError;
      }


      // Split the name into first and last name
      const nameParts = formData.name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Create profile with all personal details collected during signup
      
      // Generate a unique border tag based on first name
      const baseTag = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      const borderTag = `@${baseTag}${Math.floor(1000 + Math.random() * 9000)}`;

      // Step 1: Update Auth Metadata first as a reliable backup
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { 
          firstName: firstName,
          lastName: lastName,
          border_tag: borderTag
        }
      });

      if (metadataError) { /* metadata update failed, profile table is primary source */ }


      // Step 2: Try to upsert to profiles table
      const profilePayload = {
        id: verifyData.user!.id,
        email: formData.email,
        first_name: firstName,
        last_name: lastName,
        phone: formData.phone.startsWith('+234') ? formData.phone : `+234${formData.phone}`,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        kyc_level: 0,
        account_status: 'ACTIVE',
        border_tag: borderTag,
        ...(formData.bvn ? { bvn: formData.bvn } : {}),
        wallets: {
          NGN: 0,
          USD: 0,
          GBP: 0,
          EUR: 0
        }
      };

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (profileError) {
        
        // If it failed because border_tag column doesn't exist, try again without it
        if (profileError.message?.includes('border_tag')) {
          const { border_tag, ...fallbackPayload } = profilePayload;
          const { error: fallbackError } = await supabase
            .from('profiles')
            .upsert(fallbackPayload, { onConflict: 'id' });
          
          if (fallbackError) {
            toast.warning('Profile setup incomplete. Please use the Admin Console to fix database schema.');
          } else {
          }
        } else {
          toast.warning('Profile setup incomplete. You can complete it in settings.');
        }
      } else {
      }

      // Verify profile was created by querying it
      const { data: verifyProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', verifyData.user!.id)
        .single();

      if (profileCheckError) {
      } else {
      }


      toast.success('Account created successfully!', {
        description: 'Welcome to Border!',
        duration: 4000
      });

      setStep('success');

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error: any) {
      
      if (error.message?.includes('expired')) {
        toast.error('Code expired', {
          description: 'Please request a new code'
        });
      } else if (error.message?.includes('invalid')) {
        toast.error('Invalid code', {
          description: 'Please check and try again'
        });
      } else {
        toast.error('Verification failed', {
          description: error.message || 'Please try again'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown} seconds before resending`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          shouldCreateUser: false
        }
      });

      if (error) throw error;

      toast.success('New code sent!');
      setOtpCode('');
      startResendCooldown();
    } catch (error: any) {
      toast.error('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={borderLogoText} alt="Border" className="h-14 mx-auto mb-2 object-contain" />
          <p className="text-gray-600 mt-1">Global payments for Africans</p>
        </div>

        {/* Step 1: Form */}
        {step === 'form' && (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Account</CardTitle>
              <CardDescription>We'll send a verification code to your email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="flex gap-2">
                  <div className="w-20 flex items-center justify-center border rounded-md bg-gray-50 px-3 text-sm">
                    +234
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="8012345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="flex-1"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* BVN — Nigerian users only */}
              {formData.country === 'Nigeria' && (
                <div className="space-y-2">
                  <Label htmlFor="bvn">BVN (Bank Verification Number)</Label>
                  <Input
                    id="bvn"
                    type="tel"
                    placeholder="Enter your 11-digit BVN"
                    value={formData.bvn}
                    onChange={(e) => setFormData({ ...formData, bvn: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    maxLength={11}
                    inputMode="numeric"
                  />
                  <p className="text-xs text-gray-400">
                    Your BVN is used for identity verification. Dial *565*0# to get your BVN.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select 
                  value={formData.country} 
                  onValueChange={(value) => setFormData({ ...formData, country: value, state: '' })}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.flag} {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {availableStates.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Enter your city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-900">
                  We'll send an 8-digit code to your email to verify your account.
                </p>
              </div>

              <Button onClick={handleSendOTP} className="w-full" size="lg" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Verification Code <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {onLoginClick && (
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button 
                      onClick={onLoginClick}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Log In
                    </button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Verify OTP */}
        {step === 'verify' && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Your Email</CardTitle>
              <CardDescription>
                Enter the 8-digit code we sent to <span className="font-semibold text-gray-900">{formData.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={8} 
                  value={otpCode} 
                  onChange={setOtpCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                    <InputOTPSlot index={6} />
                    <InputOTPSlot index={7} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900">
                    Check your inbox for the verification code
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    The code expires in 5 minutes
                  </p>
                </div>
              </div>

              <div className="text-center">
                <button 
                  className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline flex items-center justify-center gap-2 mx-auto" 
                  onClick={handleResendOTP}
                  disabled={loading || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? (
                    <>
                      <Clock className="w-4 h-4" />
                      Resend code in {resendCooldown}s
                    </>
                  ) : (
                    "Didn't receive code? Resend"
                  )}
                </button>
              </div>

              <Button 
                onClick={handleVerifyOTP} 
                className="w-full" 
                size="lg" 
                disabled={loading || otpCode.length !== 8}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify & Create Account
              </Button>

              <div className="text-center">
                <button 
                  className="text-sm text-gray-500 hover:underline" 
                  onClick={() => setStep('form')}
                  disabled={loading}
                >
                  ← Back to form
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <Card className="text-center p-8">
            <CardContent className="space-y-6 pt-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <CardTitle className="text-2xl mb-2">Welcome to Border!</CardTitle>
                <CardDescription className="text-base">
                  Your account is ready. You are currently on <span className="font-bold text-gray-900">Tier 0 (Guest)</span>.
                </CardDescription>
              </div>
              <Button onClick={onComplete} className="w-full" size="lg">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}