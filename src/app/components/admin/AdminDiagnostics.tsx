import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { supabase } from '@/lib/supabase';
import {
  AlertCircle, CheckCircle2, XCircle, RefreshCw,
  Database, Users, Receipt, TrendingUp, Server,
  Zap, Globe, Shield, Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticCheck {
  name: string;
  status: 'checking' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  action?: string;
}

export default function AdminDiagnostics() {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: DiagnosticCheck[] = [];

    // 1. Check Supabase connection
    results.push({
      name: 'Supabase Connection',
      status: 'checking',
      message: 'Testing database connection...',
    });
    setChecks([...results]);

    try {
      const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      if (error) {
        results[results.length - 1] = {
          name: 'Supabase Connection',
          status: 'error',
          message: 'Failed to connect to database',
          details: error.message,
        };
      } else {
        results[results.length - 1] = {
          name: 'Supabase Connection',
          status: 'success',
          message: 'Database connection active',
        };
      }
    } catch (e: any) {
      results[results.length - 1] = {
        name: 'Supabase Connection',
        status: 'error',
        message: 'Connection error',
        details: e.message,
      };
    }
    setChecks([...results]);

    // 2. Check profiles table
    results.push({
      name: 'Users Table',
      status: 'checking',
      message: 'Checking profiles table...',
    });
    setChecks([...results]);

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

      if (error) {
        results[results.length - 1] = {
          name: 'Users Table',
          status: 'error',
          message: 'Failed to query profiles table',
          details: error.message,
        };
      } else if (!profiles || profiles.length === 0) {
        results[results.length - 1] = {
          name: 'Users Table',
          status: 'warning',
          message: 'No users found in database',
          details: 'The profiles table exists but contains no data',
          action: 'Create a new account in the Portal to add users',
        };
      } else {
        results[results.length - 1] = {
          name: 'Users Table',
          status: 'success',
          message: `Found ${profiles.length} user(s)`,
          details: `Latest user: ${profiles[0]?.email || 'N/A'}`,
        };
      }
    } catch (e: any) {
      results[results.length - 1] = {
        name: 'Users Table',
        status: 'error',
        message: 'Query error',
        details: e.message,
      };
    }
    setChecks([...results]);

    // 3. Check transactions table
    results.push({
      name: 'Transactions Table',
      status: 'checking',
      message: 'Checking transactions table...',
    });
    setChecks([...results]);

    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .limit(10);

      if (error) {
        results[results.length - 1] = {
          name: 'Transactions Table',
          status: 'error',
          message: 'Failed to query transactions table',
          details: error.message,
        };
      } else if (!transactions || transactions.length === 0) {
        results[results.length - 1] = {
          name: 'Transactions Table',
          status: 'warning',
          message: 'No transactions found',
          details: 'The transactions table exists but contains no data',
          action: 'Users need to perform transactions first',
        };
      } else {
        results[results.length - 1] = {
          name: 'Transactions Table',
          status: 'success',
          message: `Found ${transactions.length} transaction(s)`,
        };
      }
    } catch (e: any) {
      results[results.length - 1] = {
        name: 'Transactions Table',
        status: 'error',
        message: 'Query error',
        details: e.message,
      };
    }
    setChecks([...results]);

    // 4. Check KYC verifications table
    results.push({
      name: 'KYC Verifications Table',
      status: 'checking',
      message: 'Checking KYC verifications...',
    });
    setChecks([...results]);

    try {
      const { data: kyc, error } = await supabase
        .from('kyc_verifications')
        .select('*')
        .limit(10);

      if (error) {
        results[results.length - 1] = {
          name: 'KYC Verifications Table',
          status: 'error',
          message: 'Failed to query KYC table',
          details: error.message,
        };
      } else if (!kyc || kyc.length === 0) {
        results[results.length - 1] = {
          name: 'KYC Verifications Table',
          status: 'warning',
          message: 'No KYC submissions found',
          details: 'Users haven\'t submitted KYC yet',
        };
      } else {
        results[results.length - 1] = {
          name: 'KYC Verifications Table',
          status: 'success',
          message: `Found ${kyc.length} KYC submission(s)`,
        };
      }
    } catch (e: any) {
      results[results.length - 1] = {
        name: 'KYC Verifications Table',
        status: 'error',
        message: 'Query error',
        details: e.message,
      };
    }
    setChecks([...results]);

    // 5. Check Juicyway Edge Function
    results.push({
      name: 'Juicyway Rates API',
      status: 'checking',
      message: 'Testing Juicyway Edge Function...',
    });
    setChecks([...results]);

    try {
      const response = await fetch(
        'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-rates?from=USDC&to=NGN&amount=1',
        {
          headers: {
            'Authorization': `Bearer ${supabase.auth.getSession()}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.rate) {
        results[results.length - 1] = {
          name: 'Juicyway Rates API',
          status: 'success',
          message: 'Juicyway API responding',
          details: `Current USDC/NGN rate: ${data.rate.toFixed(2)}`,
        };
      } else if (data.error) {
        results[results.length - 1] = {
          name: 'Juicyway Rates API',
          status: 'warning',
          message: 'Juicyway API unavailable',
          details: data.message || 'Using fallback mock rates',
          action: 'The app will use development mock rates until Juicyway API is available',
        };
      } else {
        results[results.length - 1] = {
          name: 'Juicyway Rates API',
          status: 'error',
          message: 'Unexpected response',
          details: JSON.stringify(data),
        };
      }
    } catch (e: any) {
      results[results.length - 1] = {
        name: 'Juicyway Rates API',
        status: 'warning',
        message: 'Cannot reach Juicyway Edge Function',
        details: e.message,
        action: 'Using fallback mock rates for development',
      };
    }
    setChecks([...results]);

    // 6. Check auth session
    results.push({
      name: 'Admin Session',
      status: 'checking',
      message: 'Checking authentication...',
    });
    setChecks([...results]);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        results[results.length - 1] = {
          name: 'Admin Session',
          status: 'success',
          message: 'Authenticated',
          details: `User: ${session.user.email}`,
        };
      } else {
        results[results.length - 1] = {
          name: 'Admin Session',
          status: 'warning',
          message: 'No active session',
          details: 'Using development mode',
        };
      }
    } catch (e: any) {
      results[results.length - 1] = {
        name: 'Admin Session',
        status: 'error',
        message: 'Session check failed',
        details: e.message,
      };
    }
    setChecks([...results]);

    setLastChecked(new Date());
    setLoading(false);

    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    if (errorCount > 0) {
      toast.error(`Diagnostics complete: ${errorCount} error(s) found`);
    } else if (warningCount > 0) {
      toast.warning(`Diagnostics complete: ${warningCount} warning(s) found`);
    } else {
      toast.success('All systems operational');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'checking':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'checking':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const errorCount = checks.filter(c => c.status === 'error').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const successCount = checks.filter(c => c.status === 'success').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Diagnostics</h2>
          <p className="text-slate-500 mt-1">
            {lastChecked && `Last checked: ${lastChecked.toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Re-run Diagnostics
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Passed</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{successCount}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-medium">Warnings</p>
                <p className="text-3xl font-bold text-yellow-900 mt-1">{warningCount}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Errors</p>
                <p className="text-3xl font-bold text-red-900 mt-1">{errorCount}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnostic Results */}
      <div className="space-y-4">
        {checks.map((check, index) => (
          <Card key={index} className={`${getStatusColor(check.status)} border-2`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  {getStatusIcon(check.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-bold text-slate-900">{check.name}</h3>
                    <Badge
                      className={
                        check.status === 'success' ? 'bg-green-100 text-green-700 border-0' :
                        check.status === 'warning' ? 'bg-yellow-100 text-yellow-700 border-0' :
                        check.status === 'error' ? 'bg-red-100 text-red-700 border-0' :
                        'bg-blue-100 text-blue-700 border-0'
                      }
                    >
                      {check.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{check.message}</p>
                  {check.details && (
                    <p className="text-xs text-slate-600 bg-white/50 p-2 rounded-lg font-mono">
                      {check.details}
                    </p>
                  )}
                  {check.action && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900">
                        <strong>Action:</strong> {check.action}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Guide */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Getting Started Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">1</div>
              <div>
                <p className="font-bold">Create User Accounts</p>
                <p className="text-blue-700">Click "Portal" in the top-right switcher and create a new account. Users will appear in the admin panel automatically.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">2</div>
              <div>
                <p className="font-bold">Perform Test Transactions</p>
                <p className="text-blue-700">Use the Portal to add money, send transfers, or exchange currencies. Transactions will show in the admin dashboard.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">3</div>
              <div>
                <p className="font-bold">Submit KYC for Approval</p>
                <p className="text-blue-700">Go to Settings → Account Tier in the Portal and submit KYC documents. They will appear in the KYC panel for review.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">4</div>
              <div>
                <p className="font-bold">Monitor in Admin Console</p>
                <p className="text-blue-700">Switch to Console to view users, approve KYC, manage transactions, and configure rates. All data syncs in real-time.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
