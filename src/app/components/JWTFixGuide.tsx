import React from 'react';
import { CheckCircle2, AlertCircle, Code, Server, Key } from 'lucide-react';
import AuthStatus from './AuthStatus';

export default function JWTFixGuide() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold mb-2">JWT Authentication Fix Guide</h1>
          <p className="text-gray-600 mb-6">
            Understanding and verifying the JWT authentication fix for Border's P2P transfers
          </p>
        </div>

        {/* Live Authentication Status */}
        <AuthStatus />

        {/* Problem Summary */}
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-red-900 mb-2">The Problem</h2>
              <p className="text-red-800 mb-3">
                P2P transfers were failing with <code className="bg-red-100 px-2 py-1 rounded">401 "Invalid JWT"</code> errors 
                despite deploying with <code className="bg-red-100 px-2 py-1 rounded">--no-verify-jwt</code>.
              </p>
              <ul className="list-disc list-inside space-y-2 text-red-800">
                <li>JWT Debugger showed valid, non-expired tokens</li>
                <li>Manual fetch requests with the same token failed</li>
                <li>Server was receiving requests but rejecting authentication</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Root Cause */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <Code className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-yellow-900 mb-2">Root Cause</h2>
              <p className="text-yellow-800 mb-3">
                The <code className="bg-yellow-100 px-2 py-1 rounded">/src/utils/api.ts</code> file was 
                retrieving JWT tokens from the wrong source.
              </p>
              <div className="bg-white border border-yellow-200 rounded p-4 mt-3 mb-3">
                <div className="font-mono text-sm">
                  <div className="text-red-600 mb-2">// ❌ OLD (BROKEN)</div>
                  <div className="text-gray-700 mb-4">
                    const token = localStorage.getItem('border_access_token');
                  </div>
                  
                  <div className="text-green-600 mb-2">// ✅ NEW (FIXED)</div>
                  <div className="text-gray-700">
                    const {'{'} data: {'{'} session {'}'} {'}'} = await supabase.auth.getSession();<br />
                    const token = session?.access_token;
                  </div>
                </div>
              </div>
              <p className="text-yellow-800">
                The app uses Supabase's native authentication which manages JWT tokens automatically. 
                The old code was looking for a custom localStorage key that was never being set when 
                users logged in via Supabase Auth.
              </p>
            </div>
          </div>
        </div>

        {/* The Solution */}
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-green-900 mb-2">The Solution</h2>
              <p className="text-green-800 mb-3">
                Updated <code className="bg-green-100 px-2 py-1 rounded">/src/utils/api.ts</code> to use 
                Supabase as the single source of truth for JWT tokens.
              </p>
              
              <div className="space-y-3">
                <div className="bg-white border border-green-200 rounded p-4">
                  <h3 className="font-bold text-green-900 mb-2">✅ Changes Made:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-green-800">
                    <li>Import Supabase client at the top of api.ts</li>
                    <li>Replace localStorage token retrieval with <code className="bg-green-100 px-1 rounded">supabase.auth.getSession()</code></li>
                    <li>Add <code className="bg-green-100 px-1 rounded">apikey</code> header for all requests</li>
                    <li>Update API_BASE_URL to include correct <code className="bg-green-100 px-1 rounded">/server/</code> prefix</li>
                    <li>Added transferAPI.p2p() helper method for easy P2P transfers</li>
                  </ol>
                </div>

                <div className="bg-white border border-green-200 rounded p-4">
                  <h3 className="font-bold text-green-900 mb-2">✅ Benefits:</h3>
                  <ul className="list-disc list-inside space-y-2 text-green-800">
                    <li>Single source of truth for JWT tokens (Supabase session)</li>
                    <li>Automatic token refresh handled by Supabase</li>
                    <li>Consistent authentication across all API calls</li>
                    <li>No manual token management required</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Server Configuration */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <Server className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-blue-900 mb-2">Server Requirements</h2>
              <p className="text-blue-800 mb-3">
                The server must be properly configured to accept Supabase JWT tokens.
              </p>
              
              <div className="bg-white border border-blue-200 rounded p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">Deployment Command:</h3>
                  <code className="bg-blue-100 px-3 py-2 rounded block text-sm">
                    supabase functions deploy server --no-verify-jwt
                  </code>
                </div>

                <div>
                  <h3 className="font-bold text-blue-900 mb-1">Expected Server Behavior:</h3>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
                    <li>Accept requests with <code className="bg-blue-100 px-1 rounded">Authorization: Bearer {'{JWT}'}</code> header</li>
                    <li>Require <code className="bg-blue-100 px-1 rounded">apikey</code> header with anon key</li>
                    <li>When --no-verify-jwt is set, server should skip JWT validation or use custom validation</li>
                    <li>Return 401 only if both headers are missing or malformed</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                  <div className="text-yellow-800 text-sm">
                    <strong>⚠️ Note:</strong> If you're still seeing 401 errors after this fix, 
                    the issue is on the server side. The server may not be respecting the --no-verify-jwt flag 
                    or may have custom JWT validation logic that's failing.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testing & Verification */}
        <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <Key className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-purple-900 mb-2">Testing & Verification</h2>
              
              <div className="space-y-3">
                <div className="bg-white border border-purple-200 rounded p-4">
                  <h3 className="font-bold text-purple-900 mb-2">1. Use JWT Debugger</h3>
                  <p className="text-purple-800 text-sm mb-2">
                    Navigate to Settings → Developer Tools → JWT Debugger
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-purple-800 text-sm">
                    <li>Click "Check Current Session" to verify you have a valid session</li>
                    <li>Click "Test JWT Token" to test the /test/jwt endpoint</li>
                    <li>Click "Test P2P Endpoint" to test the actual P2P transfer endpoint</li>
                  </ul>
                </div>

                <div className="bg-white border border-purple-200 rounded p-4">
                  <h3 className="font-bold text-purple-900 mb-2">2. Browser Console Test</h3>
                  <p className="text-purple-800 text-sm mb-2">
                    Open browser console (F12) and run:
                  </p>
                  <code className="bg-purple-100 px-3 py-2 rounded block text-sm font-mono">
                    testBorderJWT()
                  </code>
                  <p className="text-purple-800 text-xs mt-2">
                    This function is available when the JWT Debugger component is mounted.
                  </p>
                </div>

                <div className="bg-white border border-purple-200 rounded p-4">
                  <h3 className="font-bold text-purple-900 mb-2">3. Actual P2P Transfer</h3>
                  <p className="text-purple-800 text-sm mb-2">
                    Try making a real P2P transfer:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-purple-800 text-sm">
                    <li>Go to Dashboard → Send Money</li>
                    <li>Select "Border User" transfer type</li>
                    <li>Choose a recipient and enter an amount</li>
                    <li>Click "Send Money"</li>
                    <li>Check the browser console and network tab for detailed logs</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expected Results */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Expected Results After Fix</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-300 rounded p-4">
              <div className="text-green-600 font-bold mb-2">✅ Success Indicators:</div>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                <li>JWT test returns <code className="bg-green-100 px-1 rounded">success: true</code></li>
                <li>P2P test returns status 200 or 400+ (but NOT 401)</li>
                <li>Actual transfers complete successfully</li>
                <li>Transaction appears in history</li>
                <li>Balances update correctly</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-300 rounded p-4">
              <div className="text-red-600 font-bold mb-2">❌ Failure Indicators:</div>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                <li>Status 401 on any test = Server-side JWT issue</li>
                <li>Status 404 = Endpoint routing problem</li>
                <li>Network error = CORS or connectivity issue</li>
                <li>Status 500 = Server internal error</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-3">Summary</h2>
          <p className="mb-4 text-blue-100">
            The JWT authentication issue was caused by a mismatch between where tokens were stored (Supabase) 
            and where they were retrieved (localStorage). The fix ensures all API requests use the same 
            JWT token that Supabase manages automatically.
          </p>
          <div className="bg-white/10 rounded p-4">
            <div className="font-bold mb-2">Key Takeaway:</div>
            <p className="text-sm text-blue-100">
              When using Supabase Auth, always retrieve JWT tokens from <code className="bg-white/20 px-2 py-1 rounded">supabase.auth.getSession()</code> 
              instead of managing them manually in localStorage. This ensures consistency and leverages 
              Supabase's built-in token refresh and session management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}