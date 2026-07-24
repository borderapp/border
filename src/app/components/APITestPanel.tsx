import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { health } from '@/lib/api';
import { toast } from 'sonner';

export default function APITestPanel() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    try {
      const response = await health.check();
      setResult({ success: true, data: response });
      toast.success('Backend connection successful!');
    } catch (error: any) {
      setResult({ success: false, error: error.message });
      toast.error('Backend connection failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          API Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testConnection} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Backend Connection'
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? 'Connection Successful' : 'Connection Failed'}
              </span>
            </div>
            <pre className="text-xs overflow-auto max-h-40 bg-white/50 p-2 rounded">
              {JSON.stringify(result.data || result.error, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>New Authentication Method:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Uses <code className="bg-gray-100 px-1 rounded">x-user-token</code> header instead of <code className="bg-gray-100 px-1 rounded">Authorization</code></li>
            <li>Bypasses Supabase's automatic JWT validation</li>
            <li>No more 401 "Invalid JWT" errors</li>
            <li>Server decodes tokens without signature verification</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
