import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ulolufsmjdlramdtstrr.supabase.co';
const publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.VLKU9BbibjVs29z5jbYPMpkT0e-N2rRMqO3W-4IK4oA';

const supabase = createClient(supabaseUrl, publicAnonKey);

export default function JWTDebugger() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [testingP2P, setTestingP2P] = useState(false);
  const [p2pResult, setP2pResult] = useState<any>(null);

  // Expose global test function for console access
  useEffect(() => {
    (window as any).testBorderJWT = async () => {
      
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
          return { error: 'No session found' };
        }

        
        const response = await fetch(`${supabaseUrl}/functions/v1/server/test/jwt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`,
            'apikey': publicAnonKey
          },
          body: JSON.stringify({})
        });

        const data = await response.json();
        
        
        if (data.success) {
        } else {
        }
        
        return data;
      } catch (error: any) {
        return { error: error.message };
      }
    };


    return () => {
      delete (window as any).testBorderJWT;
    };
  }, []);

  const checkSession = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
  };

  const testJWT = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setResult({ error: 'No active session. Please log in first.' });
        setLoading(false);
        return;
      }

      
      const response = await fetch(`${supabaseUrl}/functions/v1/server/test/jwt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
          'apikey': publicAnonKey
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error: any) {
      setResult({ error: error.message, stack: error.stack });
    } finally {
      setLoading(false);
    }
  };

  const testP2PTransfer = async () => {
    setTestingP2P(true);
    setP2pResult(null);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setP2pResult({ error: 'No active session. Please log in first.' });
        setTestingP2P(false);
        return;
      }

      
      // Test with invalid data to see if we get past JWT validation
      const response = await fetch(`${supabaseUrl}/functions/v1/server/transfer/p2p`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
          'apikey': publicAnonKey
        },
        body: JSON.stringify({
          recipientId: 'test-recipient-id',
          amount: 1,
          currency: 'USD'
        })
      });

      const data = await response.json();
      
      let interpretation = '';
      let diagnostics = '';
      
      if (response.status === 401) {
        interpretation = '❌ JWT validation failed - Token is being rejected by server';
        diagnostics = 'The server is returning 401, which means the JWT validation is failing. Check:\n' +
                     '1. Is the server deployed with --no-verify-jwt?\n' +
                     '2. Is the Authorization header being sent correctly?\n' +
                     '3. Is the apikey header included?\n' +
                     '4. Does the server have the correct JWT validation logic?';
      } else if (response.status === 404) {
        interpretation = '✅ JWT passed! (404 means endpoint not found, but JWT was valid)';
        diagnostics = 'JWT authentication is working! The 404 error means the endpoint might not be deployed or the route is incorrect.';
      } else if (response.status >= 400 && response.status < 500) {
        interpretation = '✅ JWT passed! (Error is from business logic, not auth)';
        diagnostics = 'JWT authentication is working! The error is coming from application logic, not authentication.';
      } else if (response.status >= 500) {
        interpretation = '⚠️  JWT passed, but server error occurred';
        diagnostics = 'JWT authentication is working, but the server encountered an internal error.';
      } else {
        interpretation = '✅ JWT is valid and request succeeded!';
        diagnostics = 'Everything is working correctly!';
      }
      
      setP2pResult({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: data,
        headers: Object.fromEntries(response.headers.entries()),
        interpretation,
        diagnostics,
        requestDetails: {
          url: `${supabaseUrl}/functions/v1/server/transfer/p2p`,
          authHeader: `Bearer ${currentSession.access_token.substring(0, 20)}...`,
          apikeyHeader: `${publicAnonKey.substring(0, 20)}...`
        }
      });
    } catch (error: any) {
      setP2pResult({ 
        error: error.message, 
        stack: error.stack,
        interpretation: '❌ Network or client-side error',
        diagnostics: 'The request failed before reaching the server. Check your network connection and CORS settings.'
      });
    } finally {
      setTestingP2P(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">JWT Authentication Debugger</h1>
          <p className="text-gray-600 mb-6">
            This tool helps debug JWT authentication issues by testing the token with the server.
          </p>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={checkSession}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
              >
                Check Current Session
              </button>
              
              <button
                onClick={testJWT}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
              >
                {loading ? 'Testing...' : 'Test JWT Token'}
              </button>

              <button
                onClick={testP2PTransfer}
                disabled={testingP2P}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300"
              >
                {testingP2P ? 'Testing P2P...' : 'Test P2P Endpoint'}
              </button>
            </div>
          </div>

          {session && (
            <div className="mt-6 p-4 bg-gray-100 rounded">
              <h3 className="font-bold mb-2">Current Session:</h3>
              <div className="text-sm space-y-1">
                <p><strong>User ID:</strong> {session.user?.id}</p>
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p><strong>Token Length:</strong> {session.access_token?.length}</p>
                <p><strong>Token Prefix:</strong> {session.access_token?.substring(0, 30)}...</p>
                <p><strong>Expires At:</strong> {new Date(session.expires_at * 1000).toLocaleString()}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 bg-gray-900 text-green-400 rounded font-mono text-sm overflow-auto">
              <h3 className="font-bold mb-2 text-white">JWT Test Result:</h3>
              <pre>{JSON.stringify(result, null, 2)}</pre>
              {result.data?.success && (
                <div className="mt-4 p-3 bg-green-900 text-green-200 rounded">
                  ✅ <strong>JWT is VALID!</strong> Authentication is working correctly.
                </div>
              )}
              {result.data?.authError && (
                <div className="mt-4 p-3 bg-red-900 text-red-200 rounded">
                  ❌ <strong>JWT is INVALID!</strong> Error: {result.data.authError.message}
                </div>
              )}
            </div>
          )}

          {p2pResult && (
            <div className="mt-6 p-4 bg-gray-900 text-green-400 rounded font-mono text-sm overflow-auto max-h-[600px]">
              <h3 className="font-bold mb-2 text-white">P2P Endpoint Test Result:</h3>
              
              {p2pResult.interpretation && (
                <div className={`mb-4 p-3 rounded ${
                  p2pResult.interpretation.startsWith('✅') 
                    ? 'bg-green-900 text-green-200' 
                    : p2pResult.interpretation.startsWith('⚠️')
                    ? 'bg-yellow-900 text-yellow-200'
                    : 'bg-red-900 text-red-200'
                }`}>
                  <div className="font-bold mb-2">{p2pResult.interpretation}</div>
                  {p2pResult.diagnostics && (
                    <div className="text-xs mt-2 whitespace-pre-line opacity-90">
                      {p2pResult.diagnostics}
                    </div>
                  )}
                </div>
              )}
              
              {p2pResult.requestDetails && (
                <div className="mb-4 p-3 bg-gray-800 rounded">
                  <div className="text-white font-bold mb-2">Request Details:</div>
                  <div className="text-xs space-y-1">
                    <div><span className="text-gray-400">URL:</span> {p2pResult.requestDetails.url}</div>
                    <div><span className="text-gray-400">Authorization:</span> {p2pResult.requestDetails.authHeader}</div>
                    <div><span className="text-gray-400">API Key:</span> {p2pResult.requestDetails.apikeyHeader}</div>
                  </div>
                </div>
              )}
              
              <details className="cursor-pointer">
                <summary className="text-white font-bold mb-2">Full Response (Click to expand)</summary>
                <pre className="mt-2">{JSON.stringify(p2pResult, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <h3 className="font-bold text-yellow-800">How to Use:</h3>
          <ol className="list-decimal list-inside text-yellow-700 space-y-1 mt-2">
            <li>Make sure you're logged in to Border app</li>
            <li>Click "Check Current Session" to verify your session</li>
            <li>Click "Test JWT Token" to test authentication with the test endpoint</li>
            <li>Click "Test P2P Endpoint" to test the actual P2P transfer endpoint</li>
            <li>Check the results for any errors</li>
          </ol>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <h3 className="font-bold text-blue-800">What to Look For:</h3>
          <ul className="list-disc list-inside text-blue-700 space-y-1 mt-2">
            <li><strong>success: true</strong> - JWT is valid</li>
            <li><strong>userFound: true</strong> - User authenticated successfully</li>
            <li><strong>authError</strong> - Shows why authentication failed</li>
            <li><strong>tokenProvided: false</strong> - Token not sent correctly</li>
            <li><strong>Status 401 on P2P test</strong> - JWT validation is failing</li>
            <li><strong>Status 400/404 on P2P test</strong> - JWT passed, issue is elsewhere</li>
          </ul>
        </div>

        <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
          <div className="mb-3">
            <h3 className="font-bold text-purple-800 mb-1">🚀 Console Test Available</h3>
            <p className="text-sm text-purple-700">Open browser console (F12) and run: <code className="bg-purple-100 px-2 py-1 rounded">testBorderJWT()</code></p>
          </div>
          <div className="mt-3 bg-white p-3 rounded border-2 border-purple-200">
            <p className="font-bold text-purple-900 mb-2">⚡ Quick Steps:</p>
            <ol className="list-decimal list-inside ml-2 space-y-1.5 text-sm text-purple-800">
              <li>Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">F12</kbd> to open console</li>
              <li>Type: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">testBorderJWT()</code></li>
              <li>Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Enter</kbd></li>
              <li>See detailed results with ✅ or ❌ icons</li>
            </ol>
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-xs text-green-800">
                <strong>💡 Pro Tip:</strong> This function is automatically available when you're on this page!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}