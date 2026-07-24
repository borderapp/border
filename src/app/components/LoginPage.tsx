import borderLogoText from '@/imports/ChatGPT_Image_Jun_29__2026__06_01_55_PM-removebg-preview.png';
import borderLogoIcon from '@/imports/ChatGPT_Image_Jun_29__2026__06_01_55_PM-removebg-preview.png';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Shield, Loader2, Eye, EyeOff, AlertCircle, Fingerprint, ScanFace } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { getBiometricPrefsSync, authenticateBiometric, isNative } from '@/lib/biometric';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onSignupClick: () => void;
}

export default function LoginPage({ onLoginSuccess, onSignupClick }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  const bioPref = getBiometricPrefsSync();
  const showBiometricButton = isNative() && bioPref.enabled;
  const BiometryIcon = bioPref.biometryType === 'faceid' ? ScanFace : Fingerprint;
  const bioLabel = bioPref.biometryType === 'faceid' ? 'Face ID' : 'Fingerprint';

  const handleBiometricLogin = async () => {
    setBioLoading(true);
    try {
      // Check if there is a stored Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please sign in with your password.');
        setBioLoading(false);
        return;
      }
      const result = await authenticateBiometric('Sign in to Border');
      if (result.success) {
        onLoginSuccess();
      } else if (result.error && result.error !== 'Cancelled.') {
        toast.error(result.error);
      }
    } catch (e: any) {
      toast.error(e.message || 'Biometric login failed.');
    } finally {
      setBioLoading(false);
    }
  };
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '', // Can be email or phone
    password: '',
  });
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleForgotPassword = async () => {
    if (!forgotEmail || !forgotEmail.includes('@')) {
      toast.error('Enter a valid email address'); return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: 'https://border.com.ng/reset-password',
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/server`;

  // Check if Supabase is configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('YOUR_PROJECT_ID');

  // Test Supabase connection on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        setSupabaseConnected(!error);
      } catch (e) {
        setSupabaseConnected(false);
      }
    };
    testConnection();
  }, []);

  const handleLogin = async () => {
    if (!formData.identifier || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    const isEmail = formData.identifier.includes('@');
    
    if (!isEmail && formData.identifier.length < 10) {
      toast.error('Please enter a valid phone number or email');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      
      // 1. Resolve identifier to email if it's a phone number
      let loginEmail = isEmail ? formData.identifier : '';
      
      if (!isEmail) {
        // Try to resolve phone via Edge Function
        try {
          const res = await fetch(`${serverUrl}/auth/resolve-phone/${formData.identifier.replace(/^(\+234|0)/, '')}`, {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          });
          if (res.ok) {
            const data = await res.json();
            loginEmail = data.email;
          } else {
          }
        } catch (e) {
        }

        // Fallback: Try direct profile lookup if Edge Function fails
        if (!loginEmail) {
          try {
            const cleanPhone = formData.identifier.replace(/^(\+234|0)/, '');
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('phone', cleanPhone)
              .single();
            if (profile?.email) {
              loginEmail = profile.email;
            }
          } catch (profileError) {
          }
        }

        if (!loginEmail) {
          throw new Error('Phone number not found. Please sign up or use your email address.');
        }
      }

      // 2. Sign in with Supabase Auth (Enterprise Only)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: formData.password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        
        toast.success('Login successful! Welcome back! 🎉');
        setTimeout(() => onLoginSuccess(), 500);
        return;
      }
      
      throw new Error('Authentication failed');

    } catch (error: any) {
      toast.error(error.message || 'Invalid credentials. Please check your email/phone and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <img src={borderLogoText} alt="Border" className="h-16 mx-auto mb-2 object-contain" />
          <p className="text-gray-600">Global payments for Africans</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your Border account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email or Phone */}
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Phone Number</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="you@example.com or 8012345678"
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                onKeyPress={handleKeyPress}
                className="w-full"
                autoComplete="username"
              />
              <p className="text-[10px] text-gray-500">
                Tip: If using phone number, omit the leading zero or +234
              </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onKeyPress={handleKeyPress}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                onClick={() => { setShowForgot(v => !v); setForgotSent(false); setForgotEmail(''); }}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {showForgot && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                {forgotSent ? (
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-blue-800">Reset link sent!</p>
                    <p className="text-xs text-blue-600">Check your inbox and follow the link to reset your password.</p>
                    <button onClick={() => setShowForgot(false)} className="text-xs text-blue-500 underline mt-1">Close</button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-blue-700 font-medium">Enter your account email to receive a reset link.</p>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                      className="bg-white"
                    />
                    <Button
                      onClick={handleForgotPassword}
                      disabled={forgotLoading}
                      className="w-full h-9 text-sm"
                    >
                      {forgotLoading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</> : 'Send reset link'}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Login Button */}
            <Button 
              onClick={handleLogin} 
              className="w-full" 
              size="lg" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Biometric Login Button */}
            {showBiometricButton && (
              <div className="pt-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400 font-medium shrink-0">or</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <button
                  onClick={handleBiometricLogin}
                  disabled={bioLoading}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-blue-100 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 font-semibold transition-all disabled:opacity-60"
                >
                  {bioLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <BiometryIcon className="w-5 h-5" strokeWidth={1.75} />
                  )}
                  {bioLoading ? `Verifying ${bioLabel}…` : `Sign in with ${bioLabel}`}
                </button>
              </div>
            )}

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={onSignupClick}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Sign Up
                </button>
              </p>
            </div>

            {/* Trust Signal */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 mt-4">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900">
                Your data is protected with bank-level encryption.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trust Signals */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>Bank-level Security</span>
            </div>
            <span>•</span>
            <span>Secured by SSL</span>
            <span>•</span>
            <span>NDPR Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}