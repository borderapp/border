import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  Shield, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Clock,
  UserCheck,
  FileText,
  XCircle,
  Search,
  Loader2,
  MessageSquare,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alert, AlertDescription } from './ui/alert';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { createNotification } from '@/utils/notification-helper';

interface SecurePayProps {
  onBack: () => void;
}

type PaymentStatus = 'setup' | 'pending' | 'buyer-confirmed' | 'seller-confirmed' | 'completed' | 'disputed';

interface BorderUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  border_tag?: string;
}

interface EscrowTransaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  currency: string;
  description: string;
  status: PaymentStatus;
  buyer_confirmed_at?: string;
  seller_confirmed_at?: string;
  created_at: string;
  dispute_reason?: string;
}

export default function SecurePay({ onBack }: SecurePayProps) {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipientIdentifier, setRecipientIdentifier] = useState('');
  const [searchingRecipient, setSearchingRecipient] = useState(false);
  const [recipientUser, setRecipientUser] = useState<BorderUser | null>(null);
  const [currency, setCurrency] = useState('NGN');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('setup');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [currentTransaction, setCurrentTransaction] = useState<EscrowTransaction | null>(null);
  const [myEscrowTransactions, setMyEscrowTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'create' | 'list'>('list');

  const currencies = [
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  ];

  useEffect(() => {
    loadUserAndTransactions();
  }, []);

  const loadUserAndTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to use SecurePay');
        return;
      }
      
      setCurrentUserId(user.id);
      
      // Load all escrow transactions where user is buyer or seller
      const { data: transactions, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
      } else {
        setMyEscrowTransactions(transactions || []);
      }
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const searchBorderUser = async () => {
    if (!recipientIdentifier.trim()) {
      toast.error('Please enter recipient email or Border Tag');
      return;
    }

    setSearchingRecipient(true);
    try {
      // Search by email or border_tag
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, border_tag')
        .or(`email.eq.${recipientIdentifier},border_tag.eq.${recipientIdentifier}`)
        .limit(1);

      if (error) throw error;

      if (!users || users.length === 0) {
        toast.error('No Border account found with that email or tag');
        setRecipientUser(null);
      } else {
        const user = users[0];
        if (user.id === currentUserId) {
          toast.error('You cannot create an escrow with yourself');
          setRecipientUser(null);
        } else {
          setRecipientUser(user);
          toast.success(`Found: ${user.first_name} ${user.last_name}`);
        }
      }
    } catch (error: any) {
      toast.error('Error searching for user');
    } finally {
      setSearchingRecipient(false);
    }
  };

  const handleCreateEscrow = async () => {
    if (!recipientUser || !amount || !description) {
      toast.error('Please fill all required fields');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (numericAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      // Check buyer's wallet balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallets')
        .eq('id', currentUserId)
        .single();

      if (profileError) throw profileError;

      const wallets = profile?.wallets || {};
      const currentBalance = Number(wallets[currency]) || 0;
      const securityFee = numericAmount * 0.01;
      const totalAmount = numericAmount + securityFee;

      if (currentBalance < totalAmount) {
        toast.error(`Insufficient ${currency} balance. You need ${totalAmount.toFixed(2)}`);
        return;
      }

      // Deduct from buyer's wallet
      const newBalance = currentBalance - totalAmount;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallets: {
            ...wallets,
            [currency]: newBalance
          }
        })
        .eq('id', currentUserId);

      if (updateError) throw updateError;

      // Create escrow transaction
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .insert({
          buyer_id: currentUserId,
          seller_id: recipientUser.id,
          amount: numericAmount,
          currency: currency,
          description: description,
          status: 'pending',
          security_fee: securityFee,
        })
        .select()
        .single();

      if (escrowError) throw escrowError;

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: currentUserId,
        transaction_reference: `ESCROW-${escrow.id}`,
        transaction_type: 'ESCROW_DEPOSIT',
        type: 'escrow',
        amount: totalAmount,
        currency: currency,
        status: 'COMPLETED',
        description: `SecurePay escrow created: ${description}`,
        recipient_id: recipientUser.id,
        recipient_name: `${recipientUser.first_name} ${recipientUser.last_name}`,
      });

      // Send notification to seller
      await createNotification({
        userId: recipientUser.id,
        type: 'transaction',
        title: '🛡️ SecurePay Escrow Created',
        message: `${escrow.amount.toLocaleString()} ${currency} held in escrow for: ${description}. Confirm delivery when complete.`,
        metadata: {
          escrow_id: escrow.id,
          amount: escrow.amount,
          currency: currency,
          buyer_id: currentUserId
        }
      });

      toast.success('Escrow payment created successfully!');
      setCurrentTransaction(escrow);
      setPaymentStatus('pending');
      loadUserAndTransactions();
    } catch (error: any) {
      toast.error('Failed to create escrow: ' + error.message);
    }
  };

  const handleBuyerConfirm = async () => {
    if (!currentTransaction) return;

    try {
      const updates: any = {
        buyer_confirmed_at: new Date().toISOString(),
      };

      // Check if seller already confirmed
      if (currentTransaction.seller_confirmed_at) {
        // Both confirmed - release payment
        updates.status = 'completed';
        
        // Transfer funds to seller
        const { data: sellerProfile, error: sellerError } = await supabase
          .from('profiles')
          .select('wallets')
          .eq('id', currentTransaction.seller_id)
          .single();

        if (sellerError) throw sellerError;

        const sellerWallets = sellerProfile?.wallets || {};
        const sellerBalance = Number(sellerWallets[currentTransaction.currency]) || 0;
        
        await supabase
          .from('profiles')
          .update({
            wallets: {
              ...sellerWallets,
              [currentTransaction.currency]: sellerBalance + currentTransaction.amount
            }
          })
          .eq('id', currentTransaction.seller_id);

        // Notify seller of release
        await createNotification({
          userId: currentTransaction.seller_id,
          type: 'transaction',
          title: '💰 Payment Released!',
          message: `${currentTransaction.amount.toLocaleString()} ${currentTransaction.currency} released to your wallet from escrow.`,
          metadata: {
            escrow_id: currentTransaction.id,
            amount: currentTransaction.amount,
            currency: currentTransaction.currency
          }
        });

        setPaymentStatus('completed');
        toast.success('Payment released to seller!');
      } else {
        updates.status = 'buyer-confirmed';
        
        // Notify seller that buyer confirmed
        await createNotification({
          userId: currentTransaction.seller_id,
          type: 'transaction',
          title: '✅ Buyer Confirmed Delivery',
          message: `Buyer confirmed receipt for: ${currentTransaction.description}. Please confirm to release payment.`,
          metadata: {
            escrow_id: currentTransaction.id,
          }
        });

        setPaymentStatus('buyer-confirmed');
        toast.success('Confirmation recorded. Waiting for seller.');
      }

      await supabase
        .from('escrow_transactions')
        .update(updates)
        .eq('id', currentTransaction.id);

      loadUserAndTransactions();
    } catch (error: any) {
      toast.error('Failed to confirm');
    }
  };

  const handleSellerConfirm = async () => {
    if (!currentTransaction) return;

    try {
      const updates: any = {
        seller_confirmed_at: new Date().toISOString(),
      };

      // Check if buyer already confirmed
      if (currentTransaction.buyer_confirmed_at) {
        // Both confirmed - release payment
        updates.status = 'completed';
        
        // Transfer funds to seller
        const { data: sellerProfile, error: sellerError } = await supabase
          .from('profiles')
          .select('wallets')
          .eq('id', currentTransaction.seller_id)
          .single();

        if (sellerError) throw sellerError;

        const sellerWallets = sellerProfile?.wallets || {};
        const sellerBalance = Number(sellerWallets[currentTransaction.currency]) || 0;
        
        await supabase
          .from('profiles')
          .update({
            wallets: {
              ...sellerWallets,
              [currentTransaction.currency]: sellerBalance + currentTransaction.amount
            }
          })
          .eq('id', currentTransaction.seller_id);

        // Notify both parties
        await createNotification({
          userId: currentTransaction.buyer_id,
          type: 'transaction',
          title: '✅ Transaction Complete',
          message: `SecurePay transaction completed for: ${currentTransaction.description}`,
          metadata: {
            escrow_id: currentTransaction.id,
          }
        });

        setPaymentStatus('completed');
        toast.success('Payment released!');
      } else {
        updates.status = 'seller-confirmed';
        
        // Notify buyer that seller confirmed
        await createNotification({
          userId: currentTransaction.buyer_id,
          type: 'transaction',
          title: '✅ Seller Confirmed Delivery',
          message: `Seller confirmed delivery for: ${currentTransaction.description}. Please confirm receipt to release payment.`,
          metadata: {
            escrow_id: currentTransaction.id,
          }
        });

        setPaymentStatus('seller-confirmed');
        toast.success('Confirmation recorded. Waiting for buyer.');
      }

      await supabase
        .from('escrow_transactions')
        .update(updates)
        .eq('id', currentTransaction.id);

      loadUserAndTransactions();
    } catch (error: any) {
      toast.error('Failed to confirm');
    }
  };

  const handleRaiseDispute = async () => {
    if (!currentTransaction || !disputeReason.trim()) return;

    try {
      await supabase
        .from('escrow_transactions')
        .update({
          status: 'disputed',
          dispute_reason: disputeReason,
          disputed_at: new Date().toISOString()
        })
        .eq('id', currentTransaction.id);

      // Notify admin/support (you can implement admin notifications separately)
      await createNotification({
        userId: currentTransaction.buyer_id,
        type: 'alert',
        title: '⚠️ Dispute Raised',
        message: `Your dispute for ${currentTransaction.description} is under review. Support will contact you within 24 hours.`,
        metadata: {
          escrow_id: currentTransaction.id,
        }
      });

      await createNotification({
        userId: currentTransaction.seller_id,
        type: 'alert',
        title: '⚠️ Dispute Raised',
        message: `A dispute has been raised for: ${currentTransaction.description}. Support will contact you within 24 hours.`,
        metadata: {
          escrow_id: currentTransaction.id,
        }
      });

      setPaymentStatus('disputed');
      setShowDisputeForm(false);
      toast.success('Dispute submitted. Our team will review it.');
      loadUserAndTransactions();
    } catch (error: any) {
      toast.error('Failed to submit dispute');
    }
  };

  const selectedCurrency = currencies.find(c => c.code === currency)!;
  const numericAmount = parseFloat(amount) || 0;
  const securityFee = numericAmount * 0.01;
  const totalAmount = numericAmount + securityFee;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // List view showing all escrow transactions
  if (viewMode === 'list' && paymentStatus === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 pt-12 pb-8 px-4">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={onBack}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-white text-2xl font-bold">Border SecurePay</h1>
                  <p className="text-blue-200 text-sm">Protected Escrow Payments</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 -mt-4">
          <Card className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-green-900 mb-1">Safe Transactions with Border Users</p>
                  <p className="text-green-800 text-xs leading-relaxed">
                    Both parties must have Border accounts. Funds are held securely until both buyer and seller confirm completion.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => setViewMode('create')}
            className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 mb-6"
            size="lg"
          >
            <Lock className="w-5 h-5 mr-2" />
            Create New Escrow Payment
          </Button>

          {/* My Escrow Transactions */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 mb-3">My Escrow Transactions</h3>
            
            {myEscrowTransactions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No escrow transactions yet</p>
                </CardContent>
              </Card>
            ) : (
              myEscrowTransactions.map((tx) => (
                <Card 
                  key={tx.id} 
                  className="cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => {
                    setCurrentTransaction(tx);
                    setPaymentStatus(tx.status as PaymentStatus);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg">
                        {currencies.find(c => c.code === tx.currency)?.symbol}{tx.amount.toLocaleString()}
                      </span>
                      <Badge className={
                        tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                        tx.status === 'disputed' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }>
                        {tx.status === 'buyer-confirmed' ? 'Buyer ✓' :
                         tx.status === 'seller-confirmed' ? 'Seller ✓' :
                         tx.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{tx.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{tx.buyer_id === currentUserId ? 'You → Seller' : 'Buyer → You'}</span>
                      <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Setup/Create Screen
  if (paymentStatus === 'setup' && viewMode === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 pt-12 pb-8 px-4">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setViewMode('list')}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-white text-2xl font-bold">Create Escrow</h1>
                  <p className="text-blue-200 text-sm">Protected Payment</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 -mt-4">
          <Card className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-green-900 mb-1">How It Works</p>
                  <p className="text-green-800 text-xs leading-relaxed">
                    Recipient must have a Border account. Funds are held securely until both parties confirm completion.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recipient Search */}
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient (Border Email or Tag)</Label>
                <div className="flex gap-2">
                  <Input
                    id="recipient"
                    value={recipientIdentifier}
                    onChange={(e) => setRecipientIdentifier(e.target.value)}
                    placeholder="email@border.app or @bordertag"
                    className="flex-1"
                  />
                  <Button 
                    onClick={searchBorderUser}
                    disabled={searchingRecipient}
                    variant="outline"
                  >
                    {searchingRecipient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {recipientUser && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <User className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-900">
                      {recipientUser.first_name} {recipientUser.last_name}
                      {recipientUser.border_tag && <span className="text-green-600 ml-1">@{recipientUser.border_tag}</span>}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">What are you paying for?</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Freelance design work, Product purchase"
                />
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <div className="grid grid-cols-4 gap-2">
                  {currencies.map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => setCurrency(curr.code)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currency === curr.code
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{curr.flag}</div>
                      <div className="text-xs font-semibold">{curr.code}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Transaction Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    {selectedCurrency.symbol}
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 text-xl font-bold h-14"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Transaction Amount</span>
                  <span className="font-semibold text-lg">
                    {selectedCurrency.symbol}{numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Security Fee (1%)</span>
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="font-semibold text-green-600">
                    {selectedCurrency.symbol}{securityFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-3 border-t-2 border-dashed flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Payable</span>
                  <span className="font-bold text-2xl text-blue-600">
                    {selectedCurrency.symbol}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <span className="font-semibold">Funds held by Border</span> until both parties confirm completion. This protects buyer and seller.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 mb-6">
            <Button
              onClick={handleCreateEscrow}
              disabled={!amount || !description || !recipientUser}
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              size="lg"
            >
              <Lock className="w-5 h-5 mr-2" />
              Create Escrow & Pay
            </Button>

            <Button
              onClick={() => setViewMode('list')}
              variant="outline"
              className="w-full h-12"
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active Transaction Screen
  if (paymentStatus === 'pending' || paymentStatus === 'buyer-confirmed' || paymentStatus === 'seller-confirmed') {
    if (!currentTransaction) return null;

    const isBuyer = currentTransaction.buyer_id === currentUserId;
    const isSeller = currentTransaction.seller_id === currentUserId;

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 pt-12 pb-8 px-4">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => {
                  setViewMode('list');
                  setPaymentStatus('setup');
                  setCurrentTransaction(null);
                }}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-white text-2xl font-bold">SecurePay Transaction</h1>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 -mt-4">
          <Card className="mb-4 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-20 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Shield className="w-10 h-10 text-blue-600" />
                </motion.div>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 mb-2">
                  <Clock className="w-3 h-3 mr-1" />
                  Payment Held in Escrow
                </Badge>
                <h3 className="font-bold text-xl text-gray-900 mt-2">
                  {currencies.find(c => c.code === currentTransaction.currency)?.symbol}{currentTransaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Held Securely by Border</p>
              </div>

              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-semibold">{isBuyer ? 'Buyer (You)' : 'Seller (You)'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">For:</span>
                  <span className="font-semibold">{currentTransaction.description}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">
                    {currencies.find(c => c.code === currentTransaction.currency)?.symbol}{currentTransaction.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Transaction Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buyer Status */}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentTransaction.buyer_confirmed_at ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {currentTransaction.buyer_confirmed_at ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <UserCheck className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Buyer Confirmation</p>
                  <p className="text-sm text-gray-600">
                    {currentTransaction.buyer_confirmed_at
                      ? 'Buyer confirmed receipt of product/service'
                      : 'Waiting for product/service delivery'}
                  </p>
                </div>
              </div>

              {/* Seller Status */}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentTransaction.seller_confirmed_at ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {currentTransaction.seller_confirmed_at ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <UserCheck className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Seller Confirmation</p>
                  <p className="text-sm text-gray-600">
                    {currentTransaction.seller_confirmed_at
                      ? 'Seller confirmed delivery completion'
                      : 'Waiting for seller to confirm delivery'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              Once both parties confirm, funds will be released immediately to the seller.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            {isBuyer && !currentTransaction.buyer_confirmed_at && (
              <Button
                onClick={handleBuyerConfirm}
                className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                size="lg"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Confirm I Received Product/Service
              </Button>
            )}

            {isSeller && !currentTransaction.seller_confirmed_at && (
              <Button
                onClick={handleSellerConfirm}
                className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                size="lg"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Confirm I Delivered Product/Service
              </Button>
            )}

            {currentTransaction.buyer_confirmed_at && isBuyer && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900 text-sm">
                  You've confirmed receipt. Waiting for seller confirmation to release funds.
                </AlertDescription>
              </Alert>
            )}

            {currentTransaction.seller_confirmed_at && isSeller && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900 text-sm">
                  You've confirmed delivery. Waiting for buyer confirmation to release funds.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => setShowDisputeForm(true)}
              variant="outline"
              className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50"
              size="lg"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Raise a Dispute
            </Button>
          </div>
        </div>

        {/* Dispute Modal */}
        <AnimatePresence>
          {showDisputeForm && (
            <div 
              className="fixed inset-0 bg-black/50 flex items-end z-50"
              onClick={() => setShowDisputeForm(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <h3 className="font-bold text-xl">Raise a Dispute</h3>
                    </div>
                    <button 
                      onClick={() => setShowDisputeForm(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <Alert className="border-amber-200 bg-amber-50">
                      <Info className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-900 text-sm">
                        Our team will review your dispute within 24 hours. Funds will remain held until resolved.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="disputeReason">Reason for Dispute</Label>
                      <textarea
                        id="disputeReason"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Please describe the issue with this transaction..."
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleRaiseDispute}
                      disabled={!disputeReason.trim()}
                      className="w-full h-12 bg-red-600 hover:bg-red-700"
                    >
                      Submit Dispute
                    </Button>
                    <Button
                      onClick={() => setShowDisputeForm(false)}
                      variant="outline"
                      className="w-full h-12"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Completed Screen
  if (paymentStatus === 'completed' && currentTransaction) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-md mx-auto px-4 pt-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center mb-8"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Released!</h2>
            <p className="text-gray-600">
              Your SecurePay transaction has been completed successfully.
            </p>
          </motion.div>

          <Card className="mb-4">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount Released</span>
                <span className="font-bold text-green-600">
                  {currencies.find(c => c.code === currentTransaction.currency)?.symbol}{currentTransaction.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">For</span>
                <span className="font-semibold">{currentTransaction.description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status</span>
                <Badge className="bg-green-100 text-green-800">Completed</Badge>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => {
              setViewMode('list');
              setPaymentStatus('setup');
              setCurrentTransaction(null);
            }}
            className="w-full h-14 text-lg"
            size="lg"
          >
            Back to SecurePay
          </Button>
        </div>
      </div>
    );
  }

  // Disputed Screen
  if (paymentStatus === 'disputed' && currentTransaction) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-md mx-auto px-4 pt-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center mb-8"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-12 h-12 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dispute Under Review</h2>
            <p className="text-gray-600">
              Our team is reviewing your dispute. You'll receive an update within 24 hours.
            </p>
          </motion.div>

          <Card className="mb-4">
            <CardContent className="p-6">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Funds remain securely held by Border until the dispute is resolved. We'll contact both parties.
                </AlertDescription>
              </Alert>

              {currentTransaction.dispute_reason && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Your Dispute Reason:</p>
                  <p className="text-sm text-gray-900">{currentTransaction.dispute_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={() => {
              setViewMode('list');
              setPaymentStatus('setup');
              setCurrentTransaction(null);
            }}
            className="w-full h-14 text-lg"
            size="lg"
          >
            Back to SecurePay
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
