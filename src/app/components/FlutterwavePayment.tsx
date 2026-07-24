import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { CreditCard, Loader2, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import {
  openFlutterwavePayment,
  FLUTTERWAVE_SUPPORTED_CURRENCIES,
  type FlutterwavePaymentData,
} from '@/utils/flutterwave-service';
import { useWallet } from '@/app/context/WalletContext';
import { createNotification } from '@/utils/notification-helper';

interface FlutterwavePaymentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number, currency: string, reference: string) => void;
  userEmail: string;
  userName: string;
  userPhone?: string;
  userId: string;
  defaultCurrency?: string;
}

export default function FlutterwavePayment({
  isOpen,
  onClose,
  onSuccess,
  userEmail,
  userName,
  userPhone,
  userId,
  defaultCurrency = 'NGN',
}: FlutterwavePaymentProps) {
  const { updateBalanceOptimistically, refreshBalances } = useWallet();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  useEffect(() => {
    if (!isOpen) {
      setPaymentStatus('idle');
      setAmount('');
    }
  }, [isOpen]);

  // Update currency when defaultCurrency changes
  useEffect(() => {
    setCurrency(defaultCurrency);
  }, [defaultCurrency]);

  const handlePayment = async () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountNum < 100) {
      toast.error('Minimum amount is 100');
      return;
    }

    setLoading(true);
    setPaymentStatus('processing');

    // Prevent double-processing
    let isProcessing = false;
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      setLoading(false);
      setPaymentStatus('idle');
    }, 30000);

    try {
      const paymentData: FlutterwavePaymentData = {
        amount: amountNum,
        currency,
        email: userEmail,
        name: userName,
        phone: userPhone,
      };


      await openFlutterwavePayment(
        paymentData,
        async (response) => {
          // Prevent double callback execution
          if (isProcessing) {
            return;
          }
          isProcessing = true;
          
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          if (response.status === 'successful' || response.status === 'completed' || response.status === 'success') {
            setPaymentStatus('processing');
            toast.info('Verifying and crediting your wallet...');
            
            try {
              const { data: { session } } = await supabase.auth.getSession();
              
              // 1. Attempt Edge Function Verification
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
              const verifyUrl = `${supabaseUrl}/functions/v1/verify-flutterwave-payment`;

              let verifySuccess = false;
              let verificationData = null;

              if (session) {
                try {
                  const verifyResponse = await fetch(verifyUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                      transactionId: response.transaction_id,
                      userId: userId,
                    }),
                  });

                  if (verifyResponse.ok) {
                    const result = await verifyResponse.json();
                    if (result.success) {
                      verifySuccess = true;
                      verificationData = result.data;
                    }
                  }
                } catch (e) {
                }
              }

              // 2. Client-Side Fallback (If Edge Function failed or not deployed)
              if (!verifySuccess) {
                
                // Check if this transaction was already processed
                const { data: existingTx } = await supabase
                  .from('flutterwave_transactions')
                  .select('id, wallet_updated')
                  .eq('tx_ref', response.tx_ref)
                  .single();
                
                if (existingTx && existingTx.wallet_updated) {
                  setPaymentStatus('success');
                  toast.success('Wallet funded successfully!');
                  refreshBalances();
                  setTimeout(() => {
                    onSuccess(amountNum, currency, response.tx_ref);
                    onClose();
                  }, 2000);
                  return;
                }
                
                // Get current session for user info
                const { data: { user } } = await supabase.auth.getUser();
                const currentUserEmail = user?.email || userEmail;
                
                // Record the transaction locally
                const { error: txError } = await supabase.from('flutterwave_transactions').upsert({
                  user_id: userId,
                  tx_ref: response.tx_ref,
                  flw_ref: response.flw_ref || response.transaction_id,
                  transaction_id: String(response.transaction_id),
                  amount: amountNum,
                  currency: currency,
                  status: 'successful',
                  customer_email: currentUserEmail,
                  wallet_updated: false,
                  created_at: new Date().toISOString(),
                }, { 
                  onConflict: 'tx_ref',
                  ignoreDuplicates: false 
                });
                
                if (txError) {
                }

                // Get current profile/wallet
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('email, wallets, metadata')
                  .eq('id', userId)
                  .single();
                
                if (profileError) {
                  throw new Error('Could not load user profile: ' + profileError.message);
                }

                const currentWallets = profile?.wallets || {};
                const currentBalance = Number(currentWallets[currency]) || 0;
                const newBalance = currentBalance + amountNum;
                
                const updatedWallets = {
                  ...currentWallets,
                  [currency]: newBalance
                };

                // Update database directly (no optimistic update to avoid double-entry)
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({
                    wallets: updatedWallets,
                    metadata: {
                      ...(profile?.metadata || {}),
                      last_funding_at: new Date().toISOString(),
                      last_funding_amount: amountNum,
                      last_funding_currency: currency,
                      updated_by: 'client_fallback'
                    },
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', userId);

                if (updateError) {
                  throw new Error('Database update failed: ' + updateError.message);
                }

                // Mark transaction as wallet_updated
                await supabase
                  .from('flutterwave_transactions')
                  .update({ wallet_updated: true, wallet_updated_at: new Date().toISOString() })
                  .eq('tx_ref', response.tx_ref);
                
              }

              // 3. Finalize
              // Ensure transaction record is created for notifications regardless of path taken
              try {
                await supabase.from('transactions').upsert({
                  user_id: userId,
                  transaction_reference: response.tx_ref,
                  transaction_type: 'FUNDING',
                  type: 'deposit',
                  amount: amountNum,
                  currency: currency,
                  status: 'COMPLETED',
                  description: `Wallet funding via Flutterwave`,
                  payment_method: 'flutterwave',
                  completed_at: new Date().toISOString(),
                }, { 
                  onConflict: 'transaction_reference'
                });

                // Create notification for the deposit
                await createNotification({
                  userId: userId,
                  type: 'deposit',
                  title: '💰 Money Added to Wallet',
                  message: `You added ${currency} ${amountNum.toLocaleString()} to your ${currency} wallet via Flutterwave`,
                  metadata: {
                    amount: amountNum,
                    currency: currency,
                    transaction_reference: response.tx_ref,
                    payment_method: 'flutterwave'
                  }
                });
              } catch (txHistoryError) {
              }

              setPaymentStatus('success');
              toast.success('Wallet funded successfully!');
              
              // Trigger context refresh to get the latest balance from DB
              await refreshBalances();
              
              // Don't dispatch walletUpdated event to avoid duplicate refreshes
              
              setTimeout(() => {
                onSuccess(amountNum, currency, response.tx_ref);
                onClose();
              }, 2000);

            } catch (error: any) {
              setPaymentStatus('failed');
              toast.error(error.message || 'Failed to process payment');
              isProcessing = false; // Reset on error
            }
          } else {
            setPaymentStatus('failed');
            toast.error('Payment was not successful');
            isProcessing = false;
          }
          setLoading(false);
        },
        () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          setLoading(false);
          setPaymentStatus('idle');
          toast.info('Payment cancelled');
        }
      );
    } catch (error: any) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setLoading(false);
      setPaymentStatus('failed');
      toast.error(error.message || 'Failed to initialize payment');
    }
  };

  const currencySymbols: Record<string, string> = {
    NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵', KES: 'KSh', ZAR: 'R', UGX: 'USh',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Add Money via Flutterwave</DialogTitle>
              <DialogDescription className="text-xs">
                Secure payment via Flutterwave
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {paymentStatus === 'idle' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLUTTERWAVE_SUPPORTED_CURRENCIES.map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        {curr} ({currencySymbols[curr] || curr})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    {currencySymbols[currency] || currency}
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10 text-lg"
                    min="100"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={onClose} variant="outline" className="flex-1" disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handlePayment} className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={loading || !amount}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Pay Now'}
                </Button>
              </div>
            </motion.div>
          )}

          {paymentStatus === 'processing' && (
            <motion.div key="processing" className="py-8 text-center space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Processing your transaction...</p>
            </motion.div>
          )}

          {paymentStatus === 'success' && (
            <motion.div 
              key="success" 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-4"
            >
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Success! Wallet Funded</p>
                <p className="text-sm text-gray-500 mt-1">
                  {currency} {parseFloat(amount).toLocaleString()} added to your wallet
                </p>
              </div>
              <Button 
                onClick={() => {
                  onSuccess(parseFloat(amount), currency, '');
                  onClose();
                }} 
                className="bg-green-600 hover:bg-green-700 w-full"
              >
                Back to Dashboard
              </Button>
              <p className="text-xs text-gray-400">Auto-closing in 2 seconds...</p>
            </motion.div>
          )}

          {paymentStatus === 'failed' && (
            <motion.div key="failed" className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="font-bold text-gray-900">Payment Failed</p>
              <Button onClick={() => setPaymentStatus('idle')} variant="outline">Try Again</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}