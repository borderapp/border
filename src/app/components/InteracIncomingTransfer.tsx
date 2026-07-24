/**
 * Interac Incoming Transfer Component
 * Generates payment links for receiving money via Interac e-Transfer
 */

import { useState, useEffect } from 'react';
import { Link2, XCircle, Loader2, Copy, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface InteracIncomingTransferProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InteracIncomingTransfer({ isOpen, onClose, onSuccess }: InteracIncomingTransferProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setUserEmail(session.user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim());
        setUserPhone(profile.phone || '');
      }
    } catch (error) {
    }
  };

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

  const generatePaymentLink = async () => {
    if (!amount) {
      toast.error('Please enter an amount');
      return;
    }

    const amountCents = parseFloat(amount) * 100;
    if (amountCents < 10000 || amountCents > 1000000) {
      toast.error('Amount must be between $100 and $10,000 CAD');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const headers = await getAuthHeaders();

      const [firstName, ...lastNameParts] = userName.trim().split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      // Step 1: Create payment session
      const sessionPayload = {
        customer: {
          first_name: firstName || 'User',
          last_name: lastName || 'Name',
          email: userEmail,
          phone_number: userPhone || '+14165555555',
          billing_address: {
            line1: '123 Main St',
            city: 'Toronto',
            state: 'ON',
            country: 'CA',
            zip_code: 'M5V 2T6',
          },
        },
        description: 'Payment Request',
        currency: 'CAD',
        amount: Math.round(amountCents),
        reference: `request_${Date.now()}`,
        order: {
          identifier: `REQ_${Date.now()}`,
          items: [
            {
              name: 'Payment Request',
              type: 'digital',
            },
          ],
        },
      };

      const sessionResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/payout-orchestration/payment-sessions`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(sessionPayload),
        }
      );

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(sessionData.message || sessionData.error || 'Failed to create payment session');
      }

      const paymentId = sessionData.payment_id;
      if (!paymentId) {
        throw new Error('No payment ID received from session creation');
      }

      setTransactionId(paymentId);

      // Step 2: Capture payment (generate link)
      const captureResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/payout-orchestration/payment-sessions/${paymentId}/capture`,
        {
          method: 'POST',
          headers,
        }
      );

      const captureData = await captureResponse.json();

      if (!captureResponse.ok) {
        throw new Error(captureData.message || captureData.error || 'Failed to generate payment link');
      }

      // Extract payment link from response
      const link = captureData.payment_link;
      if (!link) {
        throw new Error('No payment link received from capture response');
      }

      setPaymentLink(link);
      setExpiresAt(captureData.expires_at || '');

      toast.success('Payment link generated!');

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      setError(error.message);
      toast.error('Failed to generate payment link', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPaymentLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      toast.success('Payment link copied to clipboard!');
    }
  };

  const sharePaymentLink = async () => {
    if (paymentLink) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Interac Payment Request',
            text: `Please pay $${amount} CAD via Interac e-Transfer`,
            url: paymentLink,
          });
        } catch (error) {
          // User cancelled share
        }
      } else {
        copyPaymentLink();
      }
    }
  };

  const handleClose = () => {
    setAmount('');
    setPaymentLink('');
    setExpiresAt('');
    setTransactionId('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🇨🇦</span>
            Interac e-Transfer
          </DialogTitle>
        </DialogHeader>

        {!paymentLink ? (
          <div className="space-y-4 pt-4">
            <div className="text-center mb-4">
              <Link2 className="w-12 h-12 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Generate a payment link to request money via Interac e-Transfer
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Request Amount (CAD)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="100.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Min: $100 CAD • Max: $10,000 CAD
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>How it works:</strong><br />
                1. Enter the amount you want to receive<br />
                2. We'll generate a secure Interac payment link<br />
                3. Share the link with the person who will pay you<br />
                4. They complete payment through their bank<br />
                5. Funds are deposited to your account automatically
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={generatePaymentLink}
                className="flex-1"
                disabled={!amount || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Generate Link
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="text-center">
              <Link2 className="w-16 h-16 text-green-600 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-gray-900 mb-1">Payment Link Ready!</h3>
              <p className="text-gray-600">Request for ${amount} CAD</p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-blue-300">
              <p className="text-xs text-gray-600 mb-2 font-semibold">Payment Link:</p>
              <p className="text-xs font-mono text-gray-800 break-all mb-3 bg-gray-50 p-2 rounded">
                {paymentLink}
              </p>
              <div className="flex gap-2">
                <Button onClick={copyPaymentLink} variant="outline" size="sm" className="flex-1">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button onClick={sharePaymentLink} size="sm" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {expiresAt && (
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Link expires: {new Date(expiresAt).toLocaleString()}
                </p>
              </div>
            )}

            {transactionId && (
              <div className="text-center">
                <p className="text-xs text-gray-400">
                  Transaction ID: {transactionId}
                </p>
              </div>
            )}

            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <p className="text-xs text-green-800">
                💡 <strong>Tip:</strong> Share this link with the person who will pay you. Once they complete the payment through their bank, your account will be credited automatically.
              </p>
            </div>

            <Button onClick={handleClose} variant="outline" className="w-full">
              Done
            </Button>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center">
          🔒 Secured by Interac e-Transfer
        </p>
      </DialogContent>
    </Dialog>
  );
}
