/**
 * Juicyway Balance Test Panel
 * 
 * Simple panel to test ONLY the Juicyway balance endpoint
 * Uses GET /deposits/accounts endpoint
 */

import React, { useState } from 'react';
import { Wallet, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface JuicywayBalanceTestProps {
  onBack?: () => void;
}

export default function JuicywayBalanceTest({ onBack }: JuicywayBalanceTestProps) {
  const [loading, setLoading] = useState(false);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);

  const getAuthHeaders = async () => {
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

    const { data: { session } } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  };

  const testBalance = async () => {
    setLoading(true);
    setBalanceData(null);
    setRawResponse(null);

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
      const headers = await getAuthHeaders();


      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/test-balance`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();


      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch balance');
      }

      setRawResponse(data.raw_response);
      setBalanceData(data.accounts);

      toast.success('✅ Balance fetched successfully!');

    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🧪 Juicyway Balance Test</h1>
            <p className="text-sm text-gray-600 mt-1">
              Test GET /deposits/accounts endpoint
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                Back
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Test Button */}
          <Card className="p-6">
            <div className="text-center">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold mb-2">Test Juicyway Balance Endpoint</h2>
              <p className="text-gray-600 mb-6">
                This will call GET /deposits/accounts and show the raw response
              </p>
              <Button
                size="lg"
                onClick={testBalance}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Fetching...' : 'Fetch Balance'}
              </Button>
            </div>
          </Card>

          {/* Balance Results */}
          {balanceData && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h2 className="text-lg font-semibold">Balance Accounts</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {balanceData.map((account: any, index: number) => (
                  <div
                    key={index}
                    className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-blue-900">
                        {account.currency}
                      </span>
                      <Wallet className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-blue-600 uppercase tracking-wide">Balance</p>
                        <p className="text-xl font-bold text-gray-900">
                          {parseFloat(account.balance).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 uppercase tracking-wide">Ledger Balance</p>
                        <p className="text-lg font-semibold text-gray-700">
                          {parseFloat(account.ledger_balance).toLocaleString()}
                        </p>
                      </div>
                      {account.payment_methods && account.payment_methods.length > 0 && (
                        <div>
                          <p className="text-xs text-blue-600 uppercase tracking-wide">Payment Methods</p>
                          <p className="text-sm text-gray-600">
                            {account.payment_methods.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Raw Response */}
          {rawResponse && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">📋 Raw API Response</h2>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(rawResponse, null, 2)}
              </pre>
            </Card>
          )}

          {/* Endpoint Info */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-2 text-blue-900">ℹ️ Endpoint Information</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p><strong>Method:</strong> GET</p>
              <p><strong>Endpoint:</strong> /deposits/accounts</p>
              <p><strong>Purpose:</strong> Fetch all Juicyway account balances</p>
              <p><strong>Edge Function:</strong> /payout-orchestration/test-balance</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
