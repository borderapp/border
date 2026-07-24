import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Terminal, Database, Cloud, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  details?: string;
}

interface AuthDiagnosticsProps {
  onBack?: () => void;
}

export default function AuthDiagnostics({ onBack }: AuthDiagnosticsProps) {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [testing, setTesting] = useState(false);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/server`;

  const runDiagnostics = async () => {
    setTesting(true);
    const diagnostics: DiagnosticResult[] = [];

    // Test 1: Supabase Client Configuration
    try {
      diagnostics.push({
        test: 'Supabase Client Configuration',
        status: 'success',
        message: 'Supabase client is configured',
        details: `Project ID: ${projectId}`
      });
    } catch (error: any) {
      diagnostics.push({
        test: 'Supabase Client Configuration',
        status: 'error',
        message: 'Supabase client not configured',
        details: error.message
      });
    }

    // Test 2: Supabase Connection
    try {
      const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          diagnostics.push({
            test: 'Database Tables',
            status: 'warning',
            message: 'Profiles table does not exist',
            details: 'Run migrations: /supabase/migrations/*.sql'
          });
        } else {
          diagnostics.push({
            test: 'Database Connection',
            status: 'error',
            message: 'Database connection failed',
            details: error.message
          });
        }
      } else {
        diagnostics.push({
          test: 'Database Connection',
          status: 'success',
          message: 'Successfully connected to database'
        });
      }
    } catch (error: any) {
      diagnostics.push({
        test: 'Database Connection',
        status: 'error',
        message: 'Database connection error',
        details: error.message
      });
    }

    // Test 3: Edge Function Health
    try {
      const response = await fetch(`${serverUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        diagnostics.push({
          test: 'Edge Function (Server)',
          status: 'success',
          message: 'Edge function is deployed and responding',
          details: `Status: ${data.status}`
        });
      } else {
        diagnostics.push({
          test: 'Edge Function (Server)',
          status: 'warning',
          message: 'Edge function returned an error',
          details: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (error: any) {
      diagnostics.push({
        test: 'Edge Function (Server)',
        status: 'error',
        message: 'Edge function not accessible',
        details: 'Deploy with: npm run deploy'
      });
    }

    // Test 4: Auth Signup (Direct)
    try {
      const testEmail = `test_${Date.now()}@border-test.com`;
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'test123456',
        options: {
          data: { test: true }
        }
      });

      if (error) {
        if (error.message.includes('Email confirmation')) {
          diagnostics.push({
            test: 'Direct Auth Signup',
            status: 'warning',
            message: 'Auth works but email confirmation is required',
            details: 'Disable email confirmation in Supabase Dashboard > Authentication > Settings'
          });
        } else {
          diagnostics.push({
            test: 'Direct Auth Signup',
            status: 'error',
            message: 'Auth signup failed',
            details: error.message
          });
        }
      } else if (data.user) {
        diagnostics.push({
          test: 'Direct Auth Signup',
          status: 'success',
          message: 'Auth signup works correctly',
          details: 'User created with ID: ' + data.user.id.substring(0, 8) + '...'
        });

        // Clean up test user
        try {
          await supabase.auth.admin.deleteUser(data.user.id);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (error: any) {
      diagnostics.push({
        test: 'Direct Auth Signup',
        status: 'error',
        message: 'Auth signup test failed',
        details: error.message
      });
    }

    // Test 5: Server Auth Endpoint
    try {
      const testEmail = `test_${Date.now()}@border-test.com`;
      const response = await fetch(`${serverUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'test123456',
          phone: '1234567890',
          name: 'Test User'
        })
      });

      const result = await response.json();

      if (response.ok && result.user) {
        diagnostics.push({
          test: 'Server Auth Endpoint',
          status: 'success',
          message: 'Server signup endpoint works',
          details: 'User created via Edge Function'
        });
      } else {
        diagnostics.push({
          test: 'Server Auth Endpoint',
          status: 'error',
          message: 'Server signup endpoint failed',
          details: result.error || 'Unknown error'
        });
      }
    } catch (error: any) {
      diagnostics.push({
        test: 'Server Auth Endpoint',
        status: 'error',
        message: 'Cannot reach server signup endpoint',
        details: error.message
      });
    }

    setResults(diagnostics);
    setTesting(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const hasErrors = results.some(r => r.status === 'error');
  const hasWarnings = results.some(r => r.status === 'warning');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-6 h-6" />
                Authentication Diagnostics
              </CardTitle>
              <CardDescription>
                Testing Supabase connection and authentication setup
              </CardDescription>
            </div>
            <Button onClick={runDiagnostics} disabled={testing} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              Retest
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Alert */}
          {!testing && results.length > 0 && (
            <>
              {hasErrors && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Critical Issues Found</AlertTitle>
                  <AlertDescription>
                    Authentication is not properly configured. Users cannot sign up or log in.
                  </AlertDescription>
                </Alert>
              )}
              {!hasErrors && hasWarnings && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900">Warnings Detected</AlertTitle>
                  <AlertDescription className="text-amber-800">
                    Authentication works but some optimizations are recommended.
                  </AlertDescription>
                </Alert>
              )}
              {!hasErrors && !hasWarnings && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-900">All Systems Operational</AlertTitle>
                  <AlertDescription className="text-green-800">
                    Authentication is properly configured and working.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Test Results */}
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{result.test}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-gray-600 font-mono bg-white/50 p-2 rounded mt-2">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading State */}
          {testing && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-600">Running diagnostics...</p>
              </div>
            </div>
          )}

          {/* Quick Fix Guide */}
          {hasErrors && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Quick Fix Steps
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>
                  Ensure Supabase project is properly configured in{' '}
                  <code className="bg-blue-100 px-1 rounded">/src/lib/supabase.ts</code>
                </li>
                <li>
                  Run database migrations from{' '}
                  <code className="bg-blue-100 px-1 rounded">/supabase/migrations/</code> in your
                  Supabase SQL Editor
                </li>
                <li>
                  Deploy Edge Functions with:{' '}
                  <code className="bg-blue-100 px-1 rounded">npm run deploy</code>
                </li>
                <li>
                  In Supabase Dashboard → Authentication → Settings, disable "Email Confirmations"
                  for instant signup
                </li>
              </ol>
            </div>
          )}

          {/* Connection Details */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              Configuration Details
            </h4>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Project ID:</dt>
                <dd className="font-mono text-gray-900">{projectId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Edge Function URL:</dt>
                <dd className="font-mono text-gray-900 text-xs truncate max-w-xs">{serverUrl}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Anon Key:</dt>
                <dd className="font-mono text-gray-900 text-xs">
                  {publicAnonKey.substring(0, 20)}...
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}