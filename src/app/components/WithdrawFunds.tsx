import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  User,
  Building,
  Globe,
  RefreshCw,
} from 'lucide-react';
import transferOrchestrator from '@/utils/transfer-orchestrator';
import type { TransferQuote, Recipient } from '@/utils/transfer-orchestrator';

interface WithdrawFundsProps {
  onBack: () => void;
}

export default function WithdrawFunds({ onBack }: WithdrawFundsProps) {
  const [step, setStep] = useState<'amount' | 'recipient' | 'review' | 'processing' | 'complete'>('amount');
  const [amount, setAmount] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState<'USDC' | 'USDT'>('USDC');
  const [targetCurrency, setTargetCurrency] = useState<'NGN' | 'USD' | 'GBP' | 'EUR'>('NGN');
  const [quote, setQuote] = useState<TransferQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteExpiry, setQuoteExpiry] = useState(0);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [savedRecipients, setSavedRecipients] = useState<Recipient[]>([]);
  const [showNewRecipient, setShowNewRecipient] = useState(false);
  const [transfer, setTransfer] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  // New recipient form fields
  const [recipientName, setRecipientName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [country, setCountry] = useState('NG');
  const [swiftCode, setSwiftCode] = useState('');

  useEffect(() => {
    loadSavedRecipients();
  }, []);

  useEffect(() => {
    // Quote expiry countdown
    if (quote && quoteExpiry > 0) {
      const timer = setInterval(() => {
        const remaining = Math.floor((quote.expiresAt - Date.now()) / 1000);
        if (remaining <= 0) {
          setQuote(null);
          setQuoteExpiry(0);
        } else {
          setQuoteExpiry(remaining);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quote, quoteExpiry]);

  const loadSavedRecipients = () => {
    const recipients = transferOrchestrator.getUserRecipients('user123'); // TODO: Get actual userId
    setSavedRecipients(recipients);
  };

  const handleGetQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setQuoteLoading(true);
    try {
      const newQuote = await transferOrchestrator.generateOffRampQuote(
        'user123', // TODO: Get actual userId
        parseFloat(amount),
        sourceCurrency,
        targetCurrency,
        country
      );

      setQuote(newQuote);
      setQuoteExpiry(Math.floor((newQuote.expiresAt - Date.now()) / 1000));
    } catch (error) {
      alert('Failed to get quote: ' + error);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleRecipientSelect = (recipient: Recipient) => {
    setSelectedRecipient(recipient);
    setStep('review');
  };

  const handleSaveNewRecipient = () => {
    if (!recipientName || !accountNumber || !bankName) {
      alert('Please fill in all required fields');
      return;
    }

    const recipient = transferOrchestrator.saveRecipient('user123', {
      name: recipientName,
      bankAccount: {
        accountName: recipientName,
        accountNumber,
        bankCode,
        bankName,
        country,
        currency: targetCurrency,
        swiftCode: swiftCode || undefined,
      },
    });

    setSelectedRecipient(recipient);
    loadSavedRecipients();
    setShowNewRecipient(false);
    setStep('review');
  };

  const handleExecute = async () => {
    if (!quote || !selectedRecipient) return;

    setProcessing(true);
    setStep('processing');

    try {
      const result = await transferOrchestrator.executeOffRamp(
        'user123', // TODO: Get actual userId
        quote,
        selectedRecipient
      );

      setTransfer(result);
      setStep('complete');
    } catch (error) {
      alert('Withdrawal failed: ' + error);
      setStep('review');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 pt-12 pb-8 px-4">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-white text-2xl font-bold">Withdraw to Bank</h1>
            <p className="text-white/80 text-sm mt-1">Convert crypto to fiat</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4">
        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            {['amount', 'recipient', 'review', 'complete'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === s ? 'bg-blue-600 text-white' :
                  ['processing', 'complete'].includes(step) && idx < 3 ? 'bg-green-500 text-white' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {idx + 1}
                </div>
                {idx < 3 && <div className={`w-12 h-1 mx-2 ${
                  ['processing', 'complete'].includes(step) && idx < 3 ? 'bg-green-500' :
                  'bg-slate-200'
                }`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Amount */}
        {step === 'amount' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  You Send
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-2xl font-bold outline-none focus:border-blue-500 transition-colors"
                  />
                  <select
                    value={sourceCurrency}
                    onChange={(e) => setSourceCurrency(e.target.value as 'USDC' | 'USDT')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 outline-none"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-blue-600 rotate-90" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Recipient Gets
                </label>
                <div className="relative">
                  <div className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-2xl font-bold text-slate-400">
                    {quote ? formatCurrency(quote.toAmount, targetCurrency) : '0.00'}
                  </div>
                  <select
                    value={targetCurrency}
                    onChange={(e) => {
                      setTargetCurrency(e.target.value as any);
                      setQuote(null);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 outline-none"
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {quote && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Exchange Rate</span>
                    <span className="font-bold text-slate-900">
                      1 {sourceCurrency} = {quote.exchangeRate.toFixed(4)} {targetCurrency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Processing Fee</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(quote.fees.total, targetCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Estimated Delivery</span>
                    <span className="font-medium text-slate-900">{quote.estimatedDelivery}</span>
                  </div>
                  {quoteExpiry > 0 && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-blue-200">
                      <span className="text-blue-700 font-medium flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Quote expires in
                      </span>
                      <span className="font-bold text-blue-900">{quoteExpiry}s</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200">
              {!quote ? (
                <button
                  onClick={handleGetQuote}
                  disabled={quoteLoading || !amount || parseFloat(amount) <= 0}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {quoteLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Getting Quote...
                    </>
                  ) : (
                    'Get Quote'
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setStep('recipient')}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Recipient Selection */}
        {step === 'recipient' && (
          <div className="space-y-4">
            {savedRecipients.length > 0 && !showNewRecipient && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900">Saved Recipients</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {savedRecipients.map((recipient) => (
                    <button
                      key={recipient.id}
                      onClick={() => handleRecipientSelect(recipient)}
                      className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{recipient.name}</p>
                          <p className="text-sm text-slate-600">
                            {recipient.bankAccount.bankName} • {recipient.bankAccount.accountNumber}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!showNewRecipient ? (
              <button
                onClick={() => setShowNewRecipient(true)}
                className="w-full py-4 bg-white rounded-xl font-bold text-blue-600 border-2 border-blue-600 hover:bg-blue-50 transition-colors"
              >
                + Add New Recipient
              </button>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
                <h3 className="font-bold text-slate-900 mb-4">New Recipient</h3>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Building className="w-4 h-4 inline mr-1" />
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Guaranty Trust Bank"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="0123456789"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="NG">Nigeria</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="CA">Canada</option>
                    <option value="KE">Kenya</option>
                    <option value="GH">Ghana</option>
                    <option value="ZA">South Africa</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewRecipient(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNewRecipient}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Save & Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && quote && selectedRecipient && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-2">You're sending</p>
                <p className="text-4xl font-bold text-slate-900">
                  {formatCurrency(quote.toAmount, targetCurrency)}
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  from {quote.fromAmount} {sourceCurrency}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">To</p>
                    <p className="font-bold text-slate-900">{selectedRecipient.name}</p>
                    <p className="text-sm text-slate-600">
                      {selectedRecipient.bankAccount.bankName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {selectedRecipient.bankAccount.accountNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Exchange Rate</span>
                  <span className="font-medium">1 {sourceCurrency} = {quote.exchangeRate.toFixed(4)} {targetCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Processing Fee</span>
                  <span className="font-medium">{formatCurrency(quote.fees.total, targetCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Delivery Time</span>
                  <span className="font-medium">{quote.estimatedDelivery}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Funds will be sent to the recipient's bank account. Make sure all details are correct.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setStep('recipient')}
                className="flex-1 py-4 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleExecute}
                disabled={processing}
                className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? 'Processing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Processing */}
        {step === 'processing' && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Processing Withdrawal</h3>
            <p className="text-slate-600">
              We're sending your funds to the recipient's bank account...
            </p>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && transfer && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Withdrawal Initiated!</h3>
              <p className="text-slate-600 mb-8">
                Your withdrawal is being processed. The recipient will receive the funds within {quote?.estimatedDelivery}.
              </p>

              <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 text-sm mb-8">
                <div className="flex justify-between">
                  <span className="text-slate-600">Transaction ID</span>
                  <span className="font-mono font-bold text-slate-900">{transfer.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount Sent</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(transfer.destinationAmount, transfer.destinationCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                    {transfer.status}
                  </span>
                </div>
              </div>

              <button
                onClick={onBack}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
