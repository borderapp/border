import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function AuthStatus() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    setLoading(true);
    try {
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Check localStorage token (old method - should be empty)
      const oldToken = localStorage.getItem('border_access_token');
      
      setStatus({
        hasSession: !!session,
        hasUser: !!user,
        sessionError: sessionError?.message,
        userError: userError?.message,
        userId: user?.id,
        userEmail: user?.email,
        tokenLength: session?.access_token?.length,
        tokenExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : null,
        oldTokenExists: !!oldToken,
        oldTokenValue: oldToken ? oldToken.substring(0, 20) + '...' : null,
        timestamp: new Date().toLocaleString()
      });
    } catch (error: any) {
      setStatus({
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading && !status) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-gray-600">Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (status?.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900 mb-1">Authentication Error</h3>
            <p className="text-red-700 text-sm">{status.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Authentication Status</h2>
        <button
          onClick={checkAuth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {/* Session Status */}
        <div className={`p-4 rounded-lg border-2 ${
          status?.hasSession 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {status?.hasSession ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            <div>
              <h3 className="font-bold text-gray-900">Supabase Session</h3>
              <p className="text-sm text-gray-600">
                {status?.hasSession ? 'Active session found ✓' : 'No active session ✗'}
              </p>
            </div>
          </div>
        </div>

        {/* User Status */}
        <div className={`p-4 rounded-lg border-2 ${
          status?.hasUser 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {status?.hasUser ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">User Authentication</h3>
              {status?.hasUser ? (
                <div className="text-sm text-gray-700 mt-1 space-y-1">
                  <p><strong>Email:</strong> {status.userEmail}</p>
                  <p><strong>User ID:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{status.userId}</code></p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No authenticated user found</p>
              )}
            </div>
          </div>
        </div>

        {/* JWT Token Status */}
        {status?.hasSession && (
          <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">JWT Token (Supabase)</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Token Length:</strong> {status.tokenLength} characters</p>
                  <p><strong>Expires:</strong> {status.tokenExpiry}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    ✅ This is the correct token source used by /src/utils/api.ts
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Old Token Method (Should be empty) */}
        <div className={`p-4 rounded-lg border-2 ${
          status?.oldTokenExists 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start gap-3">
            {status?.oldTokenExists ? (
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">localStorage Token (Old Method)</h3>
              {status?.oldTokenExists ? (
                <div>
                  <p className="text-sm text-yellow-800 mb-2">
                    ⚠️  Old token detected in localStorage
                  </p>
                  <p className="text-xs text-yellow-700">
                    Value: <code className="bg-yellow-100 px-1 rounded">{status.oldTokenValue}</code>
                  </p>
                  <p className="text-xs text-yellow-600 mt-2">
                    This token is NOT being used anymore (which is correct). The app now uses Supabase session tokens.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  ✅ No old localStorage token (correct - app uses Supabase session)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className={`p-4 rounded-lg border-2 ${
          status?.hasSession && status?.hasUser
            ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-300'
            : 'bg-gray-50 border-gray-300'
        }`}>
          <h3 className="font-bold text-gray-900 mb-2">Summary</h3>
          {status?.hasSession && status?.hasUser ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                ✅ <strong>Authentication is working correctly!</strong>
              </p>
              <p className="text-sm text-gray-600">
                • Supabase session is active<br />
                • User is authenticated<br />
                • JWT token is available<br />
                • API requests will use the correct token from Supabase
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-700 mb-2">
                ❌ <strong>Authentication issue detected</strong>
              </p>
              <p className="text-sm text-gray-600">
                Please log in to activate your session.
              </p>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-400 text-center pt-2 border-t">
          Last checked: {status?.timestamp}
        </div>
      </div>
    </div>
  );
}
