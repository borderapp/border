/**
 * Card Deposit Demo
 *
 * Demonstrates Juicyway card deposit/funding flow:
 * 1. Create deposit payment link
 * 2. User pays via card (Juicyway hosted page)
 * 3. Webhook confirms payment
 * 4. User balance credited automatically
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { CreditCard, ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function CardDepositDemo() {
  const [loading, setLoading] = useState(false);
  const [depositForm, setDepositForm] = useState({
    user_id: 'test_user_001',
    amount: 5000,
    currency: 'NGN',
    customer_email: 'customer@example.com',
    customer_name: 'John Doe',
  });
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<any[]>([]);

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

  const loadDeposits = async () => {
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', depositForm.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
    }
  };

  useEffect(() => {
    loadDeposits();
    const interval = setInterval(loadDeposits, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [depositForm.user_id]);

  const handleCreateDeposit = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();


      const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-orchestration/api`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create_deposit',
          payload: depositForm,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create deposit link');
      }

      const data = await response.json();

      setPaymentLink(data.payment_link);
      setDepositId(data.deposit_id);

      toast.success('Payment link created!', {
        description: 'Click the link to complete payment',
      });

      await loadDeposits();
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-7 h-7" />
          Card Deposit Demo
        </h1>
        <p className="text-gray-600 mt-1">Fund accounts via Juicyway card payment gateway</p>
      </div>

      {/* Create Deposit */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Create Deposit Payment Link</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <Input
              value={depositForm.user_id}
              onChange={(e) => setDepositForm({ ...depositForm, user_id: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <Input
              type="number"
              value={depositForm.amount}
              onChange={(e) => setDepositForm({ ...depositForm, amount: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={depositForm.currency}
              onChange={(e) => setDepositForm({ ...depositForm, currency: e.target.value })}
            >
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Customer Email</label>
            <Input
              type="email"
              value={depositForm.customer_email}
              onChange={(e) => setDepositForm({ ...depositForm, customer_email: e.target.value })}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Customer Name</label>
            <Input
              value={depositForm.customer_name}
              onChange={(e) => setDepositForm({ ...depositForm, customer_name: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={handleCreateDeposit} disabled={loading} className="w-full">
          <CreditCard className="w-4 h-4 mr-2" />
          Generate Payment Link
        </Button>

        {paymentLink && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">✅ Payment Link Ready</p>
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Open Payment Page
            </a>
            <p className="text-xs text-gray-600 mt-2">Deposit ID: {depositId}</p>
          </div>
        )}
      </Card>

      {/* Recent Deposits */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Deposits</h2>

        {deposits.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No deposits yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className={`p-4 rounded-lg border ${getStatusColor(deposit.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(deposit.status)}
                      <span className="font-semibold text-sm uppercase">{deposit.status}</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {deposit.amount} {deposit.currency}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Reference: {deposit.reference}
                    </p>
                    {deposit.payment_link && deposit.status === 'pending' && (
                      <a
                        href={deposit.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Complete Payment
                      </a>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {new Date(deposit.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Webhook Info */}
      <Card className="p-6 bg-purple-50 border-purple-200">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          🔔 Webhook Configuration
        </h3>
        <div className="text-sm space-y-2">
          <div>
            <span className="font-mono text-xs bg-white px-2 py-1 rounded">
              {SUPABASE_URL}/functions/v1/payout-orchestration/webhook
            </span>
          </div>
          <p className="text-xs text-gray-700">
            Configure this URL in your Juicyway dashboard to receive payment confirmations.
            The webhook will automatically credit user balances when deposits complete.
          </p>
        </div>
      </Card>
    </div>
  );
}
