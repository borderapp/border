/**
 * Juicyway Action-Based API Demo
 *
 * Demonstrates the simplified action-based edge function pattern:
 * - get_balance
 * - create_beneficiary
 * - payout
 */

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function JuicywayActionAPI() {
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<any>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    account_name: 'John Doe',
    account_number: '0123456789',
    bank_name: 'First Bank of Nigeria',
    bank_code: '011',
    currency: 'NGN',
    rail: 'nuban',
  });
  const [createdBeneficiary, setCreatedBeneficiary] = useState<any>(null);
  const [payoutForm, setPayoutForm] = useState({
    amount: 1000,
    beneficiary_id: '',
    description: 'Withdrawal',
    source_currency: 'NGN',
    destination_currency: 'NGN',
  });

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';

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

  const callAction = async (action: string, payload?: any) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/api`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Request failed');
    }

    return await response.json();
  };

  const handleGetBalance = async () => {
    setLoading(true);
    try {
      const data = await callAction('get_balance');
      setBalances(data);
      toast.success('Balance fetched successfully!');
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBeneficiary = async () => {
    setLoading(true);
    try {
      const data = await callAction('create_beneficiary', beneficiaryForm);

      // Extract beneficiary ID from response
      const beneficiaryId = data.data?.id || data.id;
      setCreatedBeneficiary(data);

      // Auto-fill payout form
      if (beneficiaryId) {
        setPayoutForm({ ...payoutForm, beneficiary_id: beneficiaryId });
      }

      toast.success('Beneficiary created!', {
        description: `ID: ${beneficiaryId}`,
      });
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async () => {
    setLoading(true);
    try {
      const data = await callAction('payout', payoutForm);

      toast.success('Payout initiated!', {
        description: `Order ID: ${data.data?.id || data.id}`,
      });
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Juicyway Action API Demo</h1>
        <p className="text-gray-600 mt-1">Simplified action-based edge function interface</p>
      </div>

      {/* 1. Get Balance */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">1. Get Balance</h2>
        <Button onClick={handleGetBalance} disabled={loading}>
          Fetch Balance
        </Button>

        {balances && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(balances, null, 2)}
            </pre>
          </div>
        )}
      </Card>

      {/* 2. Create Beneficiary */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">2. Create Beneficiary</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Account Name</label>
            <Input
              value={beneficiaryForm.account_name}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, account_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Account Number</label>
            <Input
              value={beneficiaryForm.account_number}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, account_number: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bank Name</label>
            <Input
              value={beneficiaryForm.bank_name}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bank Code</label>
            <Input
              value={beneficiaryForm.bank_code}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_code: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={handleCreateBeneficiary} disabled={loading}>
          Create Beneficiary
        </Button>

        {createdBeneficiary && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-semibold text-green-800">
              ✅ Beneficiary Created: {createdBeneficiary.data?.id || createdBeneficiary.id}
            </p>
          </div>
        )}
      </Card>

      {/* 3. Payout */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">3. Initiate Payout</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <Input
              type="number"
              value={payoutForm.amount}
              onChange={(e) => setPayoutForm({ ...payoutForm, amount: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Beneficiary ID</label>
            <Input
              value={payoutForm.beneficiary_id}
              onChange={(e) => setPayoutForm({ ...payoutForm, beneficiary_id: e.target.value })}
              placeholder="From step 2"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              value={payoutForm.description}
              onChange={(e) => setPayoutForm({ ...payoutForm, description: e.target.value })}
            />
          </div>
        </div>

        <Button
          onClick={handlePayout}
          disabled={loading || !payoutForm.beneficiary_id}
        >
          Initiate Payout
        </Button>
      </Card>

      {/* API Reference */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2">API Reference</h3>
        <div className="text-sm space-y-2 font-mono">
          <div>
            <span className="text-blue-600">POST</span> /functions/v1/payout-orchestration/api
          </div>
          <div className="pl-4 space-y-1 text-xs">
            <div>{'{ "action": "get_balance" }'}</div>
            <div>{'{ "action": "create_beneficiary", "payload": {...} }'}</div>
            <div>{'{ "action": "payout", "payload": {...} }'}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
