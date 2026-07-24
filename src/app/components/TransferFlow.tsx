import { useState, useEffect } from 'react';
import { Send, ArrowLeft, CheckCircle, CheckCircle2, X, Info, User, UserCircle, Building2, Smartphone, Search, Loader2, Download, Share2, ChevronRight, Users } from 'lucide-react';
import TransactionPinModal from './TransactionPinModal';
import BiometricConfirm from './BiometricConfirm';
import { getBiometricPrefsSync } from '@/lib/biometric';
import { supabase } from '@/lib/supabase';
import { transfer, flutterwave } from '@/lib/api';
import { countries, getSettlementProvider } from '@/utils/countries-data';
import { SettlementOrchestrator } from '@/utils/settlement-orchestrator';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import ScrollRow from './ScrollRow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/app/components/ui/dialog';
import UserWithdrawal from './UserWithdrawal';
import UserInteracTransfer from './UserInteracTransfer';

interface TransferFlowProps {
  onBack: () => void;
}

// Currency configuration
const CURRENCY_CONFIG = [
  { code: 'NGN', symbol: '₦' },
  { code: 'USD', symbol: '$' },
  { code: 'CAD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
];

const nigerianBanks = [
  'Access Bank', 'GTBank', 'First Bank', 'UBA', 'Zenith Bank',
  'Wema Bank', 'Sterling Bank', 'Fidelity Bank', 'Stanbic IBTC', 'Polaris Bank'
];

const usBanks = [
  'Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank', 'Capital One'
];

interface BorderUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  border_tag?: string;
}

export default function TransferFlow({ onBack }: TransferFlowProps) {
  const [transferType, setTransferType] = useState<'p2p' | 'bank'>('p2p');
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<BorderUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BorderUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentRecipients, setRecentRecipients] = useState<BorderUser[]>([]);
  const [accountNumber, setAccountNumber] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [bankCountry, setBankCountry] = useState<'nigeria' | 'us'>('nigeria');
  const [destinationCountry, setDestinationCountry] = useState('Nigeria');
  const [transferComplete, setTransferComplete] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [transferReference, setTransferReference] = useState('');
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string>('');
  const [kycLevel, setKycLevel] = useState<number>(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showBioConfirm, setShowBioConfirm] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [senderName, setSenderName] = useState('');

  // Load wallet balances and recent recipients on mount
  useEffect(() => {
    loadWalletData();
    loadRecentRecipients();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('wallets, kyc_level, first_name, last_name, email')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setWalletBalances(profile.wallets || {});
        setKycLevel(profile.kyc_level || 0);
        setSenderName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'User');
        if (profile.country) {
          setDestinationCountry(profile.country);
        }
      }
    } catch (error) {
    }
  };

  const loadRecentRecipients = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get unique recipients from recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('recipient_name, metadata')
        .eq('user_id', session.user.id)
        .eq('transaction_type', 'TRANSFER')
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactions) {
        // Extract unique recipient names/emails from transactions
        const uniqueRecipients = Array.from(new Set(
          transactions
            .map(t => t.recipient_name)
            .filter(Boolean)
        )).slice(0, 3);

        if (uniqueRecipients.length > 0) {
          // Fetch full user details for these recipients if they are emails
          const emails = uniqueRecipients.filter(r => r.includes('@'));
          if (emails.length > 0) {
            const { data: users } = await supabase
              .from('profiles')
              .select('id, email, first_name, last_name, phone')
              .in('email', emails)
              .limit(3);

            if (users) {
              setRecentRecipients(users);
            }
          }
        }
      }
    } catch (error) {
    }
  };

  // Search for Border users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        // Build search query - search across all fields
        const trimmedQuery = searchQuery.trim();
        const searchTerm = `%${trimmedQuery}%`;
        
        let query = supabase.from('profiles').select('*');

        const conditions = [
          `email.ilike.${searchTerm}`,
          `phone.ilike.${searchTerm}`,
          `first_name.ilike.${searchTerm}`,
          `last_name.ilike.${searchTerm}`
        ];

        // Add border_tag if column exists (using OR condition)
        conditions.push(`border_tag.ilike.${searchTerm}`);

        // Handle full name search
        if (trimmedQuery.includes(' ')) {
          const [first, ...rest] = trimmedQuery.split(' ');
          const last = rest.join(' ');
          conditions.push(`and(first_name.ilike.%${first}%,last_name.ilike.%${last}%)`);
        }

        query = query.or(conditions.join(','));

        const { data: users, error } = await query.limit(10);

        if (error) {
          
          // Fallback if border_tag fails
          if (error.message?.includes('border_tag')) {
            const fallbackConditions = conditions.filter(c => !c.includes('border_tag'));
            const { data: fallbackUsers } = await supabase
              .from('profiles')
              .select('*')
              .or(fallbackConditions.join(','))
              .limit(10);
            
            if (fallbackUsers) {
              setSearchResults(fallbackUsers.filter(u => u.id !== userId));
              return;
            }
          }
          setSearchResults([]);
        } else if (users) {
          setSearchResults(users.filter(u => u.id !== userId));
        }
      } catch (error) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, userId]);

  const currencies = CURRENCY_CONFIG.map(config => ({
    ...config,
    balance: walletBalances[config.code] || 0,
  }));

  const currencyData = currencies.find(c => c.code === selectedCurrency)!;

  // Load Nigerian banks from Flutterwave API
  useEffect(() => {
    const loadBanks = async () => {
      // Only load for Nigeria bank transfers
      if (transferType !== 'bank' || bankCountry !== 'nigeria') {
        return;
      }

      setLoadingBanks(true);
      try {
        const response = await flutterwave.getBanks();
        
        
        if (response.success && response.data) {
          setBanks(response.data);
          toast.success(`Loaded ${response.data.length} Nigerian banks`);
        } else {
          toast.warning('Using fallback bank list');
          // Fallback to hardcoded list (popular banks only)
          setBanks([
            { code: '044', name: 'Access Bank' },
            { code: '058', name: 'Guaranty Trust Bank' },
            { code: '057', name: 'Zenith Bank' },
            { code: '033', name: 'United Bank For Africa' },
            { code: '011', name: 'First Bank of Nigeria' },
            { code: '214', name: 'First City Monument Bank' },
            { code: '070', name: 'Fidelity Bank' },
            { code: '232', name: 'Sterling Bank' },
            { code: '999992', name: 'Opay' },
            { code: '999991', name: 'PalmPay' },
            { code: '50211', name: 'Kuda Bank' },
            { code: '50515', name: 'Moniepoint Microfinance Bank' },
          ]);
        }
      } catch (error) {
        // Fallback to hardcoded list (popular banks only)
        setBanks([
          { code: '044', name: 'Access Bank' },
          { code: '058', name: 'Guaranty Trust Bank' },
          { code: '057', name: 'Zenith Bank' },
          { code: '033', name: 'United Bank For Africa' },
          { code: '011', name: 'First Bank of Nigeria' },
          { code: '214', name: 'First City Monument Bank' },
          { code: '070', name: 'Fidelity Bank' },
          { code: '232', name: 'Sterling Bank' },
          { code: '999992', name: 'Opay' },
          { code: '999991', name: 'PalmPay' },
          { code: '50211', name: 'Kuda Bank' },
          { code: '50515', name: 'Moniepoint Microfinance Bank' },
        ]);
      } finally {
        setLoadingBanks(false);
      }
    };

    loadBanks();
  }, [transferType, bankCountry]);

  // Verify account name using Flutterwave
  useEffect(() => {
    const verifyAccount = async () => {
      if (accountNumber.length < 10 || !selectedBank || bankCountry !== 'nigeria') {
        setAccountName('');
        return;
      }

      setVerifyingAccount(true);
      try {
        const bank = banks.find(b => b.name === selectedBank);
        
        if (bank) {
          const response = await flutterwave.verifyAccount(bank.code, accountNumber);
          
          if (response.success && response.data) {
            setAccountName(response.data.accountName);
            toast.success(`Account verified: ${response.data.accountName}`);
          } else {
            setAccountName('Account verification unavailable');
          }
        } else {
        }
      } catch (error: any) {
        // Set placeholder name on error
        setAccountName('Account verification unavailable');
      } finally {
        setVerifyingAccount(false);
      }
    };

    const timer = setTimeout(verifyAccount, 800);
    return () => clearTimeout(timer);
  }, [accountNumber, selectedBank, banks, bankCountry]);

  const handleSelectRecipient = (user: BorderUser) => {
    setSelectedRecipient(user);
    setRecipient(user.email);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleConfirmTransfer = () => {
    const prefs = getBiometricPrefsSync();
    if (prefs.enabled && prefs.requireForTransfers) {
      setShowBioConfirm(true);
    } else {
      setShowPinModal(true);
    }
  };

  const handleDownloadReceipt = () => {
    const receipt = `
══════════════════════════════════════
        BORDER TRANSFER RECEIPT
══════════════════════════════════════
Transaction Successful ✓
FROM:        ${senderName}
TO:          ${transferType === 'p2p' && selectedRecipient ? `${selectedRecipient.first_name} ${selectedRecipient.last_name}` : (accountName || recipient)}
${transferType === 'p2p' && selectedRecipient ? `EMAIL:       ${selectedRecipient.email}` : ''}
${transferType === 'bank' ? `BANK:        ${selectedBank}` : ''}
${transferType === 'bank' ? `ACCOUNT:     ${accountNumber}` : ''}
══════════════════════════════════════
Amount:      ${currencyData.symbol}${amount} ${selectedCurrency}
Fee:         FREE
${purpose ? `Purpose:     ${purpose}` : ''}
Date:        ${new Date().toLocaleString()}
Reference:   ${transferReference}
══════════════════════════════════════
    `;
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Border_Receipt_${transferReference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Receipt downloaded!');
  };

  const handleShareReceipt = async () => {
    const receiptText = `✅ Border Transfer Complete!\n\nAmount: ${currencyData.symbol}${amount} ${selectedCurrency}\nTo: ${transferType === 'p2p' && selectedRecipient ? `${selectedRecipient.first_name} ${selectedRecipient.last_name}` : (accountName || recipient)}\nDate: ${new Date().toLocaleDateString()}\nReference: ${transferReference}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Border Transfer Receipt', text: receiptText }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(receiptText);
      toast.success('Receipt copied to clipboard!');
    }
  };

  const handleSend = async () => {
    setShowConfirmDialog(false);
    const amountNum = parseFloat(amount);
    
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountNum > currencyData.balance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsSettling(true);
    
    try {
      // Generate unique reference
      const reference = `BDR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      setTransferReference(reference);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      if (transferType === 'p2p' && selectedRecipient) {
        const result = await transfer.p2p({
          recipientId: selectedRecipient.id,
          amount: amountNum,
          currency: selectedCurrency,
          reference: reference,
          purpose: purpose
        });

      } else {
        // Bank transfer logic using Settlement Router
        
        const settlementProvider = getSettlementProvider(destinationCountry);
        
        const settlementResult = await SettlementOrchestrator.executeSettlement({
          userId,
          fromCurrency: selectedCurrency,
          toCurrency: selectedCurrency,
          amount: amountNum,
          destinationCountry,
          recipientDetails: {
            name: accountName || recipient || 'External Recipient',
            accountNumber,
            bankName: selectedBank,
            country: destinationCountry,
            bankCode: destinationCountry === 'Nigeria' ? banks.find(b => b.name === selectedBank)?.code : undefined
          },
          transferType: 'bank',
          metadata: { narration: purpose, reference }
        });

        if (!settlementResult.success) {
          throw new Error(settlementResult.error || 'Settlement failed');
        }


        // Local updates (Internal Ledger approach)
        const { data: profile } = await supabase.from('profiles').select('wallets').eq('id', userId).single();
        if (!profile) throw new Error('Failed to load wallet data');

        const currentWallets = profile.wallets || {};
        const newBalance = (currentWallets[selectedCurrency] || 0) - amountNum;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ wallets: { ...currentWallets, [selectedCurrency]: newBalance } })
          .eq('id', userId);

        if (updateError) throw new Error('Failed to update wallet balance');

        const transactionData = {
          user_id: userId,
          transaction_reference: reference,
          transaction_type: 'WITHDRAWAL',
          amount: amountNum,
          currency: selectedCurrency,
          fee: settlementResult.settlementDetails.fee,
          total_amount: amountNum,
          status: settlementResult.status.toUpperCase(),
          payment_method: settlementResult.settlementProvider === 'FLUTTERWAVE' ? 'flutterwave' : 'circle',
          description: `Transfer to ${selectedBank} (${destinationCountry}) - ${accountNumber}`,
          narration: purpose || `Bank transfer to ${accountName || accountNumber}`,
          recipient_account_number: accountNumber,
          recipient_name: accountName || recipient,
          recipient_bank_name: selectedBank,
          metadata: {
            // Full transfer details for receipt reconstruction
            recipient_name:       accountName || recipient,
            bank_name:            selectedBank,
            account_number:       accountNumber,
            bank_country:         destinationCountry,
            transfer_type:        'bank',
            purpose,
            settlement_provider:  settlementResult.settlementProvider,
            provider_reference:   settlementResult.settlementDetails.providerReference,
          },
          completed_at: settlementResult.status === 'completed' ? new Date().toISOString() : null,
        };

        const { error: txError } = await supabase.from('transactions').insert(transactionData);
        if (txError) { /* non-fatal: transaction record failed */ }
      }

      toast.success('Transfer successful!');
      setTransferComplete(true);
      await loadWalletData(); // Refresh local balances

    } catch (error: any) {
      toast.error(error.message || 'Transfer failed. Please check your connection.');
    } finally {
      setIsSettling(false);
    }
  };

  if (transferComplete) {
    const recipientDisplay = transferType === 'p2p' && selectedRecipient
      ? { name: `${selectedRecipient.first_name} ${selectedRecipient.last_name}`, detail: selectedRecipient.email }
      : { name: accountName || 'Bank Account', detail: `${selectedBank} - ${accountNumber}` };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Successful!</h2>
              <p className="text-gray-600 mb-8">{currencyData.symbol}{amount} sent successfully</p>
              
              <div className="space-y-3 mb-8 text-left">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium">FROM</p>
                  <p className="text-sm font-semibold text-blue-900">{senderName}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 font-medium">TO</p>
                  <p className="text-sm font-semibold text-green-900">{recipientDisplay.name}</p>
                  {recipientDisplay.detail && <p className="text-xs text-green-700 mt-1">{recipientDisplay.detail}</p>}
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-semibold">{currencyData.symbol}{amount}</span>
                </div>
                {purpose && (
                  <div className="flex justify-between text-sm py-2 border-b">
                    <span className="text-gray-600">Purpose</span>
                    <span className="font-semibold text-right">{purpose}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm py-2">
                  <span className="text-gray-600">Reference</span>
                  <span className="font-mono text-xs">{transferReference}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={onBack}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Back to Dashboard
                </Button>
                <Button variant="outline" className="w-full" size="lg" onClick={handleDownloadReceipt}>
                  <Download className="w-4 h-4 mr-2" /> Download Receipt
                </Button>
                <Button variant="outline" className="w-full" size="lg" onClick={handleShareReceipt}>
                  Share Receipt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Transfer</DialogTitle>
            <DialogDescription>Please review your transfer details before proceeding</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 font-medium mb-2">FROM</p>
              <p className="text-sm font-semibold text-blue-900">{senderName}</p>
            </div>
            {selectedRecipient && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-700 font-medium mb-2">TO</p>
                <div className="flex items-center gap-3">
                  <UserCircle className="w-10 h-10 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">{selectedRecipient.first_name} {selectedRecipient.last_name}</p>
                    <p className="text-xs text-green-700">{selectedRecipient.email}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Amount</span>
              <span className="text-xl font-bold">{currencyData.symbol}{amount}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Currency</span>
              <span className="font-semibold">{selectedCurrency}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-gray-600">Fee</span>
              <span className="font-semibold text-green-600">Free</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={isSettling} className="bg-green-600 hover:bg-green-700">
              {isSettling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Confirm & Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-blue-600 pt-12 pb-8 px-4 w-full">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={onBack} className="w-10 h-10 shrink-0 bg-white/20 rounded-full flex items-center justify-center text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-xl font-bold truncate min-w-0">Send Money</h1>
        </div>
      </div>

      {/* Page body — inline overflow-hidden is unoverridable by CSS cascade */}
      <div style={{width:'100%',overflowX:'hidden',padding:'0 16px',marginTop:-16,paddingBottom:96,boxSizing:'border-box'}}>
        {/* Transfer type tabs — inline styles guarantee no overflow */}
        <Card className="mb-4" style={{width:'100%',overflow:'hidden',boxSizing:'border-box'}}>
          <CardContent className="p-2">
            <Tabs value={transferType} onValueChange={(v) => setTransferType(v as 'p2p' | 'bank')}>
              <TabsList style={{width:'100%',display:'grid',gridTemplateColumns:'1fr 1fr',overflow:'hidden'}}>
                <TabsTrigger value="p2p" style={{minWidth:0,overflow:'hidden'}}>
                  <Users className="w-4 h-4 mr-1 shrink-0" />
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}>Border to Border</span>
                </TabsTrigger>
                <TabsTrigger value="bank" style={{minWidth:0,overflow:'hidden'}}>
                  <Building2 className="w-4 h-4 mr-1 shrink-0" />
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}>To Bank</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {transferType === 'p2p' ? (
          <Card className="mb-4" style={{width:'100%',overflow:'hidden',boxSizing:'border-box'}}>
            <CardHeader><CardTitle className="text-base">Send to Border User</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div style={{position:'relative',width:'100%',boxSizing:'border-box'}}>
                <Search style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',width:18,height:18,color:'#9ca3af',flexShrink:0}} />
                <Input placeholder="Search by name, email or phone" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{width:'100%',boxSizing:'border-box',paddingLeft:40}} />
                {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />}
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map(user => (
                    <button key={user.id} onClick={() => handleSelectRecipient(user)} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-blue-600 transition-all">
                      <UserCircle className="w-10 h-10 text-blue-600 flex-shrink-0" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {selectedRecipient && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div className="flex-1 text-sm font-semibold">Sending to: {selectedRecipient.first_name} {selectedRecipient.last_name}</div>
                  <button onClick={() => setSelectedRecipient(null)}><X className="w-4 h-4 text-green-600" /></button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="mb-4">
            {/* Country/Currency Selector for Bank Transfers */}
            <Card className="mb-4">
              <CardContent className="pt-6 pb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Destination Country
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedCurrency('NGN')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      selectedCurrency === 'NGN'
                        ? 'border-green-600 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl">🇳🇬</span>
                    <div className="text-center">
                      <p className="font-bold text-sm text-gray-900">Nigeria</p>
                      <p className="text-xs text-gray-500">NGN</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedCurrency('USD')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      selectedCurrency === 'USD'
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl">🇺🇸</span>
                    <div className="text-center">
                      <p className="font-bold text-sm text-gray-900">USA</p>
                      <p className="text-xs text-gray-500">USD</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedCurrency('CAD')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      selectedCurrency === 'CAD'
                        ? 'border-red-600 bg-red-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl">🇨🇦</span>
                    <div className="text-center">
                      <p className="font-bold text-sm text-gray-900">Canada</p>
                      <p className="text-xs text-gray-500">CAD</p>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Render appropriate transfer component based on currency */}
            {selectedCurrency === 'CAD' ? (
              <UserInteracTransfer />
            ) : (
              <UserWithdrawal currency={selectedCurrency} />
            )}
          </div>
        )}

        {transferType === 'p2p' && (
          <Card className="mb-4" style={{width:'100%',overflow:'hidden',boxSizing:'border-box'}}>
            <CardContent className="pt-4 space-y-4">
              {/* Currency chips — outer clips, inner scrolls (guaranteed with inline styles) */}
              <div style={{width:'100%',overflowX:'hidden',boxSizing:'border-box'}}>
                <div style={{display:'flex',gap:8,overflowX:'auto',overflowY:'visible',paddingBottom:4,scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
                  {currencies.map(curr => (
                    <button
                      key={curr.code}
                      onClick={() => setSelectedCurrency(curr.code)}
                      style={{flexShrink:0,whiteSpace:'nowrap'}}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                        ${selectedCurrency === curr.code ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'}`}
                    >
                      {curr.code}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{currencyData.symbol}</span>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pl-8 text-2xl font-black h-14" />
              </div>
              <p className="text-xs text-gray-500">Available: {currencyData.symbol}{currencyData.balance.toLocaleString()}</p>
              <Input placeholder="Purpose (Optional)" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full" />
              <Button onClick={handleConfirmTransfer} disabled={!amount || parseFloat(amount) <= 0 || !selectedRecipient} className="w-full h-12 text-base bg-green-600 hover:bg-green-700">Send Money</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Biometric confirmation — shown when requireForTransfers is enabled */}
      <BiometricConfirm
        open={showBioConfirm}
        title="Confirm Transfer"
        description="Authenticate to authorise this transfer"
        onConfirmed={() => { setShowBioConfirm(false); handleSend(); }}
        onUsePIN={() => { setShowBioConfirm(false); setShowPinModal(true); }}
        onCancel={() => setShowBioConfirm(false)}
      />

      {/* Transaction PIN — required before every transfer */}
      <TransactionPinModal
        isOpen={showPinModal}
        onCancel={() => setShowPinModal(false)}
        onSuccess={() => { setShowPinModal(false); handleSend(); }}
        amount={parseFloat(amount) || 0}
        currency={selectedCurrency}
        description={
          selectedRecipient
            ? `Transfer to ${selectedRecipient.first_name} ${selectedRecipient.last_name}`
            : transferType === 'bank'
            ? `Bank transfer — ${accountNumber}`
            : 'Send Money'
        }
      />
    </div>
  );
}