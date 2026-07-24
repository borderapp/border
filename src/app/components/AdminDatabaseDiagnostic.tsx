import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2, XCircle, AlertCircle, Database,
  Loader2, RefreshCw, Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function AdminDatabaseDiagnostic() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    setRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    try {
      // Test 1: Connection
      try {
        const { error: connError } = await supabase.from('profiles').select('count').limit(1);
        if (connError) throw connError;
        diagnostics.push({
          test: 'Database Connection',
          status: 'success',
          message: 'Successfully connected to Supabase'
        });
      } catch (error: any) {
        diagnostics.push({
          test: 'Database Connection',
          status: 'error',
          message: `Connection failed: ${error.message}`,
          details: error
        });
      }

      // Test 2: Profiles Table
      try {
        const { data, error, count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' });

        if (error) throw error;

        diagnostics.push({
          test: 'Profiles Table',
          status: data && data.length > 0 ? 'success' : 'warning',
          message: `Found ${count || 0} profile(s)`,
          details: data?.slice(0, 2).map(p => ({
            id: p.id?.slice(0, 8),
            email: p.email,
            first_name: p.first_name,
            last_name: p.last_name
          }))
        });
      } catch (error: any) {
        diagnostics.push({
          test: 'Profiles Table',
          status: 'error',
          message: `Query failed: ${error.message}`,
          details: { code: error.code, hint: error.hint }
        });
      }

      // Test 3: Transactions Table
      try {
        const { data, error, count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact' })
          .limit(5);

        if (error) throw error;

        diagnostics.push({
          test: 'Transactions Table',
          status: data && data.length > 0 ? 'success' : 'warning',
          message: `Found ${count || 0} transaction(s)`,
          details: data?.slice(0, 2).map(t => ({
            id: t.id?.slice(0, 8),
            user_id: t.user_id?.slice(0, 8),
            transaction_type: t.transaction_type,
            amount: t.amount,
            status: t.status
          }))
        });
      } catch (error: any) {
        diagnostics.push({
          test: 'Transactions Table',
          status: 'error',
          message: `Query failed: ${error.message}`,
          details: { code: error.code, hint: error.hint }
        });
      }

      // Test 4: KYC Verifications Table
      try {
        const { data, error, count } = await supabase
          .from('kyc_verifications')
          .select('*', { count: 'exact' })
          .limit(5);

        if (error) throw error;

        diagnostics.push({
          test: 'KYC Verifications Table',
          status: data && data.length > 0 ? 'success' : 'warning',
          message: `Found ${count || 0} verification(s)`,
          details: data?.slice(0, 2).map(k => ({
            id: k.id?.slice(0, 8),
            user_id: k.user_id?.slice(0, 8),
            tier: k.tier,
            status: k.status
          }))
        });
      } catch (error: any) {
        diagnostics.push({
          test: 'KYC Verifications Table',
          status: 'error',
          message: `Query failed: ${error.message}`,
          details: { code: error.code, hint: error.hint }
        });
      }

      // Test 5: Transactions with Profile Join
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            id,
            transaction_reference,
            amount,
            transaction_type,
            profiles:user_id (
              first_name,
              last_name,
              email
            )
          `)
          .limit(3);

        if (error) throw error;

        diagnostics.push({
          test: 'Transaction-Profile Join',
          status: 'success',
          message: `Join query successful`,
          details: data?.map(t => ({
            transaction: t.transaction_reference,
            user: `${t.profiles?.first_name} ${t.profiles?.last_name}`,
            email: t.profiles?.email
          }))
        });
      } catch (error: any) {
        diagnostics.push({
          test: 'Transaction-Profile Join',
          status: 'error',
          message: `Join failed: ${error.message}`,
          details: { code: error.code, hint: error.hint }
        });
      }

      // Test 6: KYC with Profile Join
      try {
        const { data, error } = await supabase
          .from('kyc_verifications')
          .select(`
            id,
            tier,
            status,
            profiles:user_id (
              first_name,
              last_name,
              email
            )
          `)
          .limit(3);

        if (error) throw error;

        diagnostics.push({
          test: 'KYC-Profile Join',
          status: 'success',
          message: `Join query successful`,
          details: data?.map(k => ({
            tier: k.tier,
            status: k.status,
            user: `${k.profiles?.first_name} ${k.profiles?.last_name}`,
            email: k.profiles?.email
          }))
        });
      } catch (error: any) {
        diagnostics.push({
          test: 'KYC-Profile Join',
          status: 'error',
          message: `Join failed: ${error.message}`,
          details: { code: error.code, hint: error.hint }
        });
      }

      // Test 7: Auth Session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        diagnostics.push({
          test: 'Auth Session',
          status: session ? 'success' : 'warning',
          message: session ? 'Active session found' : 'No active session (may affect RLS)',
          details: session ? {
            user_id: session.user.id.slice(0, 8),
            email: session.user.email
          } : null
        });
      } catch (error: any) {
        diagnostics.push({
          test: 'Auth Session',
          status: 'error',
          message: `Session check failed: ${error.message}`,
          details: error
        });
      }

      setResults(diagnostics);

      const hasErrors = diagnostics.some(d => d.status === 'error');
      if (hasErrors) {
        toast.error('Some diagnostic tests failed', {
          description: 'Check the results below for details'
        });
      } else {
        toast.success('All diagnostic tests completed', {
          description: 'Review results below'
        });
      }

    } catch (error: any) {
      toast.error('Diagnostic test failed', {
        description: error.message
      });
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Connection Diagnostics
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Run comprehensive tests to verify database connectivity and data access
              </p>
            </div>
            <Button
              onClick={runDiagnostics}
              disabled={running}
              className="flex items-center gap-2"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Run Diagnostics
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">
                Click "Run Diagnostics" to test your database connection and data access
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <Card key={index} className={`border-2 ${getStatusColor(result.status)}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        {getStatusIcon(result.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{result.test}</h3>
                          <Badge className={`${getStatusColor(result.status)} border-0`}>
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{result.message}</p>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 font-medium">
                              View Details
                            </summary>
                            <pre className="mt-2 p-3 bg-slate-50 rounded-lg text-xs overflow-x-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Fix Suggestions */}
      {results.some(r => r.status === 'error') && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Common Solutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-blue-900">
              <div>
                <p className="font-semibold mb-1">1. Check Row Level Security (RLS) Policies</p>
                <p className="text-blue-800">
                  If queries are failing, you may need to disable RLS or add policies for admin access.
                  In Supabase Dashboard: Authentication → Policies
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">2. Verify Foreign Key Relationships</p>
                <p className="text-blue-800">
                  Ensure tables have proper foreign key constraints set up for joins to work.
                  In Supabase Dashboard: Database → Tables → Relationships
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">3. Check Table Permissions</p>
                <p className="text-blue-800">
                  Ensure the anon role has SELECT permission on all tables.
                  In Supabase Dashboard: Database → Roles & Permissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
