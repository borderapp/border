import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Shield, ArrowRight, Loader2, AlertCircle, CheckCircle2, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { otpService, OTPMethod } from '@/utils/otp-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { countries, getStates } from '@/utils/countries-data';
import { Badge } from './ui/badge';

interface OnboardingFlowProps {
  onComplete: () => void;
  onLoginClick?: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpMethod, setOtpMethod] = useState<OTPMethod>('email');
  const [otpReference, setOtpReference] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    country: 'Nigeria',
    state: '',
    city: '',
    otp: ''
  });

  const selectedCountry = countries.find(c => c.name === formData.country);
  const availableStates = getStates(formData.country);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/server`;

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleSendOTP = async () => {
    if (!formData.phone || !formData.email || !formData.password || !formData.confirmPassword || !formData.name || !formData.city) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    // Simple email validation
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

    setLoading(true);
    try {
      // Send OTP using selected method
      const identifier = verificationMethod === 'email' ? formData.email : formData.phone;
      const method: OTPMethod = verificationMethod === 'email' ? 'email' : otpMethod;
      
      const response = await otpService.sendOTP(identifier, method);
      
      if (response.success) {
        setOtpReference(response.reference || '');
        toast.success(response.message);
        
        // Show dev OTP if available
        if (response.data?.otp) {
          toast.info(`Dev OTP: ${response.data.otp}`, { duration: 10000 });
        }
        
        setStep(2);
      } else {
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (formData.otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await otpService.verifyOTP(otpReference, formData.otp);
      
      if (response.success) {
        toast.success('Verification successful!');
        handleCreateAccount();
      } else {
        toast.error(response.message || 'Invalid verification code');
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      // Clean phone number
      const cleanPhone = formData.phone.replace(/^(\+234|0)/, '');
      

      // ===== ENTERPRISE: Cloud-Only Signup via Edge Function =====
      try {
        const response = await fetch(`${serverUrl}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            phone: cleanPhone,
            name: formData.name,
            country: formData.country,
            state: formData.state,
            city: formData.city,
          })
        });

        const result = await response.json();

        if (response.ok && result.user) {
          
          // Sign in to get session
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (signInError) {
          } else {
          }
          
          toast.success('Account created successfully!', {
            description: 'Welcome to Border! You\'re now on Tier 0.',
            duration: 4000
          });
          
          setStep(3);
          return;
        } else {
          throw new Error(result.error || 'Failed to create account via server');
        }
      } catch (edgeError: any) {
        
        // ===== FALLBACK: Direct Supabase Client Auth =====
        try {
          const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                phone: cleanPhone,
                name: formData.name,
                country: formData.country,
                city: formData.city,
                kyc_level: 0
              }
            }
          });

          if (error) {
            throw error;
          }

          if (data.user) {

            // Check if email confirmation is required
            if (data.user.identities && data.user.identities.length === 0) {
              // Email confirmation is required
              setPendingEmail(formData.email);
              toast.warning('📧 Email Confirmation Required', {
                description: 'Please check your email and click the confirmation link to activate your account.',
                duration: 10000
              });
              
              // Show a special step for email confirmation
              setStep(4);
              return;
            } else {
              toast.success('Account created successfully!', {
                description: 'Welcome to Border! You\'re now on Tier 0.',
                duration: 4000
              });
            }
            
            setStep(3);
            return;
          }
        } catch (directError: any) {
          throw directError;
        }
      }
    } catch (error: any) {
      
      toast.error('Failed to create account', {
        description: 'Please check your internet connection and try again. If the problem persists, contact support.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const identifier = verificationMethod === 'email' ? formData.email : formData.phone;
      const method: OTPMethod = verificationMethod === 'email' ? 'email' : otpMethod;
      
      const response = await otpService.sendOTP(identifier, method);
      
      if (response.success) {
        setOtpReference(response.reference || '');
        toast.success('New code sent!');
        
        // Show dev OTP if available
        if (response.data?.otp) {
          toast.info(`Dev OTP: ${response.data.otp}`, { duration: 10000 });
        }
      } else {
        toast.error('Failed to resend code');
      }
    } catch (error) {
      toast.error('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 flex flex-col">
      <div className="pt-8 pb-6">
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-green-500 mb-4">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Border</h1>
          <p className="text-gray-600 mt-1">Global payments for Africans</p>
        </div>
        
        <div className="mt-6 px-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Step {step} of {totalSteps}</span>
            <span className="text-sm font-medium text-blue-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full">
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Account</CardTitle>
              <CardDescription>Get started with just your email and phone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Verification Method Selection */}
              <div className="space-y-3">
                <Label>Verification Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('email')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      verificationMethod === 'email'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <Mail className={`w-6 h-6 mx-auto mb-2 ${
                      verificationMethod === 'email' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-xs text-gray-500 mt-1">Free & Instant</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('phone')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      verificationMethod === 'phone'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <Smartphone className={`w-6 h-6 mx-auto mb-2 ${
                      verificationMethod === 'phone' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-xs text-gray-500 mt-1">WhatsApp/SMS</p>
                  </button>
                </div>
              </div>
              
              {/* WhatsApp/SMS/Email selection for phone verification */}
              {verificationMethod === 'phone' && (
                <div className="space-y-2">
                  <Label>Delivery Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpMethod('whatsapp')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        otpMethod === 'whatsapp'
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <MessageCircle className={`w-5 h-5 mx-auto mb-1 ${
                        otpMethod === 'whatsapp' ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <p className="text-xs font-medium">WhatsApp</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpMethod('sms')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        otpMethod === 'sms'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Smartphone className={`w-5 h-5 mx-auto mb-1 ${
                        otpMethod === 'sms' ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <p className="text-xs font-medium">SMS</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpMethod('email')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        otpMethod === 'email'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Mail className={`w-5 h-5 mx-auto mb-1 ${
                        otpMethod === 'email' ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                      <p className="text-xs font-medium">Email</p>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {otpMethod === 'whatsapp' && '✓ Free via WhatsApp'}
                    {otpMethod === 'sms' && '⚡ Traditional SMS'}
                    {otpMethod === 'email' && '📧 Email as backup'}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
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
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                    className="text-sm text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-sm text-gray-500"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value, state: '', city: '' })}>
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
                  <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state/province" />
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
                  Secure and compliant. We protect your data with bank-level encryption.
                </p>
              </div>
              <Button onClick={handleSendOTP} className="w-full" size="lg" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Account <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
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
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Your {verificationMethod === 'email' ? 'Email' : 'Phone'}</CardTitle>
              <CardDescription>
                {verificationMethod === 'email' 
                  ? `We sent a 6-digit code to ${formData.email}`
                  : `We sent a 6-digit code via ${otpMethod === 'whatsapp' ? 'WhatsApp' : otpMethod === 'sms' ? 'SMS' : 'email'} to +234${formData.phone}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={formData.otp} onChange={(value) => setFormData({ ...formData, otp: value })}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Badge variant="outline" className="bg-blue-100 text-blue-900 border-blue-200">
                  {verificationMethod === 'email' ? '📧 Email' : otpMethod === 'whatsapp' ? '📱 WhatsApp' : otpMethod === 'sms' ? '💬 SMS' : '📧 Email'}
                </Badge>
                <p className="text-sm text-blue-900 flex-1">
                  Check your {verificationMethod === 'email' ? 'inbox' : otpMethod === 'whatsapp' ? 'WhatsApp messages' : otpMethod === 'sms' ? 'text messages' : 'email'} for the verification code
                </p>
              </div>
              <div className="text-center">
                <button 
                  className="text-sm text-blue-600 hover:underline disabled:text-gray-400" 
                  onClick={handleResendOTP}
                  disabled={loading}
                >
                  Didn't receive code? Resend
                </button>
              </div>
              <Button onClick={handleVerifyOTP} className="w-full" size="lg" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify & Finish
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="text-center p-8">
            <CardContent className="space-y-6 pt-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <CardTitle className="text-2xl mb-2">Welcome to Border!</CardTitle>
                <CardDescription className="text-base">
                  Your account is ready. You are currently on <span className="font-bold text-gray-900">Tier 0 (Guest)</span>. 
                  Complete your KYC to unlock full banking features.
                </CardDescription>
              </div>
              <Button onClick={onComplete} className="w-full" size="lg">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="text-center p-8">
            <CardContent className="space-y-6 pt-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                <Mail className="w-12 h-12" />
              </div>
              <div>
                <CardTitle className="text-2xl mb-2">Email Confirmation Required</CardTitle>
                <CardDescription className="text-base">
                  We have sent a confirmation link to <span className="font-bold text-gray-900">{pendingEmail}</span>. 
                  Please check your email and click the link to activate your account.
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