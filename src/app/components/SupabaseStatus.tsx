import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Database, Key, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

/**
 * Supabase Connection Status Component
 * 
 * Shows real-time connection status and helps debug configuration issues.
 * 
 * Usage:
 * import SupabaseStatus from '@/app/components/SupabaseStatus';
 * 
 * // Add to your App.tsx temporarily for debugging:
 * <SupabaseStatus />
 */

interface ConnectionTest {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function SupabaseStatus() {
  const [tests, setTests] = useState<ConnectionTest[]>([
    { name: 'Environment Variables', status: 'pending', message: 'Checking...' },
    { name: 'Supabase Connection', status: 'pending', message: 'Testing...' },
    { name: 'Database Tables', status: 'pending', message: 'Verifying...' },
    { name: 'Authentication', status: 'pending', message: 'Testing...' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: ConnectionTest[] = [];

    // Test 1: Environment Variables
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || url.includes('YOUR_PROJECT_ID')) {
      results.push({
        name: 'Environment Variables',
        status: 'error',
        message: 'VITE_SUPABASE_URL not configured',
        details: 'Create a .env file with your Supabase credentials. See FIX_FAILED_TO_FETCH.md'
      });
    } else if (!key || key === 'YOUR_ANON_KEY') {
      results.push({
        name: 'Environment Variables',
        status: 'error',
        message: 'VITE_SUPABASE_ANON_KEY not configured',
        details: 'Add your Supabase anon key to .env file'
      });
    } else {
      results.push({
        name: 'Environment Variables',
        status: 'success',
        message: 'Environment variables loaded',
        details: `URL: ${url.substring(0, 30)}...`
      });
    }
    setTests([...results]);

    // Test 2: Supabase Connection
    try {
      const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          results.push({
            name: 'Supabase Connection',
            status: 'warning',
            message: 'Connected, but tables missing',
            details: 'Run database migrations in Supabase SQL Editor'
          });
        } else {
          results.push({
            name: 'Supabase Connection',
            status: 'error',
            message: 'Connection failed',
            details: error.message
          });
        }
      } else {
        results.push({
          name: 'Supabase Connection',
          status: 'success',
          message: 'Connected successfully',
          details: 'Can communicate with Supabase database'
        });
      }
    } catch (err: any) {
      results.push({
        name: 'Supabase Connection',
        status: 'error',
        message: 'Failed to connect',
        details: err.message || 'Check your internet connection and Supabase URL'
      });
    }
    setTests([...results]);

    // Test 3: Database Tables
    const tableTests = ['profiles', 'transactions'];
    let tablesExist = 0;
    
    for (const table of tableTests) {
      try {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (!error) tablesExist++;
      } catch {
        // Silent fail
      }
    }

    if (tablesExist === 0) {
      results.push({
        name: 'Database Tables',
        status: 'error',
        message: 'No tables found',
        details: 'Run the SQL migrations: 001_create_profiles_table.sql and 002_create_transactions_table.sql'
      });
    } else if (tablesExist < tableTests.length) {
      results.push({
        name: 'Database Tables',
        status: 'warning',
        message: `${tablesExist}/${tableTests.length} tables exist`,
        details: 'Some migrations may not have run successfully'
      });
    } else {
      results.push({
        name: 'Database Tables',
        status: 'success',
        message: 'All tables exist',
        details: `Found ${tablesExist} tables: ${tableTests.join(', ')}`
      });
    }
    setTests([...results]);

    // Test 4: Authentication
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        results.push({
          name: 'Authentication',
          status: 'error',
          message: 'Auth error',
          details: error.message
        });
      } else {
        results.push({
          name: 'Authentication',
          status: 'success',
          message: data.session ? 'User logged in' : 'Auth ready (no user)',
          details: data.session ? `User: ${data.session.user.email}` : 'Authentication system is working'
        });
      }
    } catch (err: any) {
      results.push({
        name: 'Authentication',
        status: 'warning',
        message: 'Could not test auth',
        details: err.message
      });
    }
    setTests(results);
    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const allSuccess = tests.every(t => t.status === 'success');
  const hasErrors = tests.some(t => t.status === 'error');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Supabase Connection Status
            </CardTitle>
            <CardDescription>
              Real-time diagnostics for your database connection
            </CardDescription>
          </div>
          <Badge variant={allSuccess ? 'default' : hasErrors ? 'destructive' : 'secondary'}>
            {allSuccess ? 'All Systems Go' : hasErrors ? 'Issues Detected' : 'Checking...'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tests.map((test, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 ${getStatusColor(test.status)}`}
          >
            <div className="flex items-start gap-3">
              {getStatusIcon(test.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm">{test.name}</h4>
                  {test.status === 'success' && (
                    <span className="text-xs text-green-700 font-medium">✓ Passed</span>
                  )}
                  {test.status === 'error' && (
                    <span className="text-xs text-red-700 font-medium">✗ Failed</span>
                  )}
                  {test.status === 'warning' && (
                    <span className="text-xs text-amber-700 font-medium">⚠ Warning</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mb-1">{test.message}</p>
                {test.details && (
                  <p className="text-xs text-gray-600 font-mono bg-white/50 px-2 py-1 rounded mt-2">
                    {test.details}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="pt-3 flex items-center justify-between border-t">
          <Button
            onClick={runTests}
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Run Tests Again'
            )}
          </Button>

          <div className="flex gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>v{import.meta.env.VITE_SUPABASE_URL?.includes('YOUR_PROJECT_ID') ? 'Not Set' : 'OK'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Key className="w-3 h-3" />
              <span>{import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0} chars</span>
            </div>
          </div>
        </div>

        {hasErrors && (
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h5 className="font-semibold text-sm text-blue-900 mb-2">🔧 Quick Fix</h5>
            <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
              <li>Create a <code className="bg-blue-100 px-1 rounded">.env</code> file in your project root</li>
              <li>Add your Supabase credentials from the dashboard</li>
              <li>Restart your dev server: <code className="bg-blue-100 px-1 rounded">npm run dev</code></li>
              <li>Run database migrations in Supabase SQL Editor</li>
            </ol>
            <p className="text-xs text-blue-700 mt-2">
              See <strong>FIX_FAILED_TO_FETCH.md</strong> for detailed instructions
            </p>
          </div>
        )}

        {allSuccess && (
          <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-900">
              <CheckCircle2 className="w-5 h-5" />
              <h5 className="font-semibold text-sm">All Systems Operational!</h5>
            </div>
            <p className="text-sm text-green-800 mt-1">
              Your Supabase connection is fully configured and working. You can now create accounts and store data in the cloud.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
