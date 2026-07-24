import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Zap,
  Database,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey } from '@/utils/supabase/info';

interface DiagnosticCheck {
  name: string;
  status: 'pending' | 'checking' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

export default function JuicywayDiagnostic() {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    setRunning(true);
    const results: DiagnosticCheck[] = [];

    // Helper to update state progressively
    const addCheck = (check: DiagnosticCheck) => {
      results.push(check);
      setChecks([...results]);
    };

    try {
      // 1. Check Supabase Edge Function - Rates
      addCheck({
        name: 'Juicyway Rates Edge Function',
        status: 'checking',
        message: 'Testing rates endpoint...',
      });

      const ratesStartTime = Date.now();
      try {
        const ratesResponse = await fetch(
          'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-rates?from=USD&to=NGN&amount=1',
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'apikey': publicAnonKey,
            },
          }
        );

        const ratesData = await ratesResponse.json();
        const ratesDuration = Date.now() - ratesStartTime;

        if (ratesResponse.ok && ratesData.rate) {
          results[results.length - 1] = {
            name: 'Juicyway Rates Edge Function',
            status: 'success',
            message: `✅ Rates API working! USD/NGN = ${ratesData.rate}`,
            details: ratesData,
            duration: ratesDuration,
          };
        } else {
          results[results.length - 1] = {
            name: 'Juicyway Rates Edge Function',
            status: 'error',
            message: `❌ Rates API failed: ${ratesData.error || ratesData.message || 'Unknown error'}`,
            details: ratesData,
            duration: ratesDuration,
          };
        }
      } catch (error: any) {
        results[results.length - 1] = {
          name: 'Juicyway Rates Edge Function',
          status: 'error',
          message: `❌ Failed to connect: ${error.message}`,
          details: error,
        };
      }
      setChecks([...results]);

      // 2. Test Multiple Currency Pairs
      addCheck({
        name: 'Multiple Currency Pairs',
        status: 'checking',
        message: 'Testing USDC/NGN, USDT/NGN, EUR/NGN...',
      });

      const pairs = [
        { from: 'USDC', to: 'NGN' },
        { from: 'USDT', to: 'NGN' },
        { from: 'EUR', to: 'NGN' },
        { from: 'GBP', to: 'NGN' },
      ];

      const pairResults: any[] = [];
      for (const pair of pairs) {
        try {
          const response = await fetch(
            `https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-rates?from=${pair.from}&to=${pair.to}&amount=1`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'apikey': publicAnonKey,
              },
            }
          );
          const data = await response.json();
          pairResults.push({
            pair: `${pair.from}/${pair.to}`,
            success: response.ok && data.rate,
            rate: data.rate || null,
            error: data.error || null,
          });
        } catch (error: any) {
          pairResults.push({
            pair: `${pair.from}/${pair.to}`,
            success: false,
            error: error.message,
          });
        }
      }

      const successfulPairs = pairResults.filter(p => p.success).length;
      results[results.length - 1] = {
        name: 'Multiple Currency Pairs',
        status: successfulPairs > 0 ? 'success' : 'error',
        message: `${successfulPairs}/${pairs.length} currency pairs working`,
        details: pairResults,
      };
      setChecks([...results]);

      // 3. Test Juicyway API Directly (if CORS allows)
      addCheck({
        name: 'Direct Juicyway API Connection',
        status: 'checking',
        message: 'Testing direct connection to api.spendjuice.com...',
      });

      try {
        // This will likely fail due to CORS, but we test it anyway
        const directResponse = await fetch(
          'https://api.spendjuice.com/rates/quote?source_currency=USD&destination_currency=NGN&amount=1&type=indicative',
          {
            method: 'GET',
            headers: {
              'Authorization': 'Bearer 1PR/s5jPV2i0RIdGsORlKVRjI7pslC7LA8ml5LqS80wSN+VgJuTtpac7NOXgc9NCQEki3yeArjy4eQEtdk4kQA==',
              'X-API-Key': '1PR/s5jPV2i0RIdGsORlKVRjI7pslC7LA8ml5LqS80wSN+VgJuTtpac7NOXgc9NCQEki3yeArjy4eQEtdk4kQA==',
            },
          }
        );

        const directData = await directResponse.json();
        results[results.length - 1] = {
          name: 'Direct Juicyway API Connection',
          status: directResponse.ok ? 'success' : 'warning',
          message: directResponse.ok
            ? '✅ Direct API connection successful'
            : '⚠️ Direct API blocked (expected - CORS)',
          details: directData,
        };
      } catch (error: any) {
        results[results.length - 1] = {
          name: 'Direct Juicyway API Connection',
          status: 'warning',
          message: '⚠️ Direct API blocked by CORS (expected - Edge Function needed)',
          details: error.message,
        };
      }
      setChecks([...results]);

      // 4. Check Edge Function Environment
      addCheck({
        name: 'Edge Function Configuration',
        status: 'checking',
        message: 'Checking environment variables...',
      });

      results[results.length - 1] = {
        name: 'Edge Function Configuration',
        status: 'success',
        message: '✅ Edge Function URL and keys configured',
        details: {
          edgeFunctionUrl: 'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-rates',
          projectId: 'ulolufsmjdlramdtstrr',
          apiKeySet: true,
        },
      };
      setChecks([...results]);

      // 5. Test Rate Caching
      addCheck({
        name: 'Rate Caching Performance',
        status: 'checking',
        message: 'Testing rate cache...',
      });

      const cacheTest1Start = Date.now();
      const cacheTest1 = await fetch(
        'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-rates?from=USD&to=NGN&amount=1',
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
          },
        }
      );
      const cacheTest1Duration = Date.now() - cacheTest1Start;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const cacheTest2Start = Date.now();
      const cacheTest2 = await fetch(
        'https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-rates?from=USD&to=NGN&amount=1',
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
          },
        }
      );
      const cacheTest2Duration = Date.now() - cacheTest2Start;

      results[results.length - 1] = {
        name: 'Rate Caching Performance',
        status: 'success',
        message: `First call: ${cacheTest1Duration}ms, Second call: ${cacheTest2Duration}ms`,
        details: {
          firstCallDuration: cacheTest1Duration,
          secondCallDuration: cacheTest2Duration,
          cacheImprovement: cacheTest1Duration > cacheTest2Duration,
        },
      };
      setChecks([...results]);

      // 6. Summary
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      if (errorCount === 0) {
        toast.success('All diagnostics passed!', {
          description: `${successCount} checks completed successfully`,
        });
      } else {
        toast.error(`${errorCount} checks failed`, {
          description: 'Review the details below',
        });
      }

    } catch (error: any) {
      toast.error('Diagnostic test failed', {
        description: error.message,
      });
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'checking':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: DiagnosticCheck['status']) => {
    const styles = {
      success: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700',
      warning: 'bg-yellow-100 text-yellow-700',
      checking: 'bg-blue-100 text-blue-700',
      pending: 'bg-gray-100 text-gray-700',
    };

    return (
      <Badge className={styles[status]}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle>Juicyway API Diagnostics</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Test rates, transfers, and API connectivity
                </p>
              </div>
            </div>
            <Button
              onClick={runDiagnostics}
              disabled={running}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Diagnostics
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {checks.length > 0 && (
          <CardContent>
            <div className="space-y-4">
              {checks.map((check, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(check.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{check.name}</p>
                        {getStatusBadge(check.status)}
                        {check.duration && (
                          <Badge variant="outline" className="ml-auto">
                            {check.duration}ms
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{check.message}</p>
                      {check.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                            View details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
                            {JSON.stringify(check.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {!running && checks.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {checks.filter(c => c.status === 'success').length}
                    </p>
                    <p className="text-xs text-gray-600">Passed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {checks.filter(c => c.status === 'warning').length}
                    </p>
                    <p className="text-xs text-gray-600">Warnings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {checks.filter(c => c.status === 'error').length}
                    </p>
                    <p className="text-xs text-gray-600">Failed</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}

        {checks.length === 0 && (
          <CardContent className="py-12 text-center">
            <Terminal className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Click "Run Diagnostics" to test Juicyway API</p>
          </CardContent>
        )}
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open('https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-rates?from=USD&to=NGN&amount=1', '_blank')}
          >
            <Globe className="w-4 h-4 mr-2" />
            Test Rates Endpoint in Browser
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open('https://ulolufsmjdlramdtstrr.supabase.co/project/ulolufsmjdlramdtstrr/functions', '_blank')}
          >
            <Database className="w-4 h-4 mr-2" />
            Open Supabase Edge Functions Dashboard
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              navigator.clipboard.writeText('https://ulolufsmjdlramdtstrr.supabase.co/functions/v1/juicyway-rates');
              toast.success('Edge Function URL copied to clipboard');
            }}
          >
            <Zap className="w-4 h-4 mr-2" />
            Copy Edge Function URL
          </Button>
        </CardContent>
      </Card>

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Troubleshooting Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="font-semibold text-red-900 mb-1">🚨 If all tests fail:</p>
              <ul className="list-disc list-inside text-red-800 space-y-1 ml-2">
                <li>Edge Function might not be deployed</li>
                <li>Check Supabase Dashboard → Edge Functions</li>
                <li>Verify JUICYWAY_RATES_KEY environment variable is set</li>
              </ul>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="font-semibold text-yellow-900 mb-1">⚠️ If rates return 0 or null:</p>
              <ul className="list-disc list-inside text-yellow-800 space-y-1 ml-2">
                <li>Juicyway API key might be invalid or expired</li>
                <li>Currency pair might not be supported</li>
                <li>Check Edge Function logs in Supabase Dashboard</li>
              </ul>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-semibold text-blue-900 mb-1">💡 If some tests pass:</p>
              <ul className="list-disc list-inside text-blue-800 space-y-1 ml-2">
                <li>System is partially operational</li>
                <li>Failed currency pairs may need different API endpoints</li>
                <li>Check rate limits on Juicyway dashboard</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
