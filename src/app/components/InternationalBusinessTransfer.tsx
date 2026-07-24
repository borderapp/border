import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, Briefcase, Ship, Plane, TrendingDown, Clock, 
  CheckCircle2, AlertCircle, Globe, DollarSign, FileText
} from 'lucide-react';
import { motion } from 'motion/react';

interface InternationalBusinessTransferProps {
  onBack: () => void;
}

const currencies = [
  { code: 'NGN', symbol: '₦', flag: '🇳🇬', balance: 5000000 },
  { code: 'USD', symbol: '$', flag: '🇺🇸', balance: 15000 },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', balance: 8000 },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', balance: 6000 },
  { code: 'CNY', symbol: '¥', flag: '🇨🇳', balance: 50000 },
];

const destinationCountries = [
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', settlementTime: '2-4 hours' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', settlementTime: '2-4 hours' },
  { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', settlementTime: '4-6 hours' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', settlementTime: '2-4 hours' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', settlementTime: '3-5 hours' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', settlementTime: '3-5 hours' },
];

const transferPurposes = [
  { id: 'import', label: 'Import Payment', icon: Ship, color: 'blue' },
  { id: 'export', label: 'Export Proceeds', icon: Plane, color: 'green' },
  { id: 'service', label: 'Service Payment', icon: Briefcase, color: 'purple' },
  { id: 'investment', label: 'Investment', icon: DollarSign, color: 'orange' },
];

export default function InternationalBusinessTransfer({ onBack }: InternationalBusinessTransferProps) {
  const [step, setStep] = useState(1);
  const [transferPurpose, setTransferPurpose] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');
  const [amount, setAmount] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryAccount, setBeneficiaryAccount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [transferComplete, setTransferComplete] = useState(false);

  const currencyData = currencies.find(c => c.code === selectedCurrency)!;
  const destinationData = destinationCountries.find(c => c.code === selectedCountry);

  // Simulated FX rate and fees
  const fxRate = 1650; // NGN to USD base rate
  const convertedAmount = selectedCurrency === 'NGN' ? parseFloat(amount) / fxRate : parseFloat(amount);
  const transferFee = convertedAmount * 0.015; // 1.5% fee
  const savingsVsTraditional = convertedAmount * 0.025; // 2.5% savings vs SWIFT

  const handleSubmitTransfer = () => {
    setTransferComplete(true);
  };

  if (transferComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Submitted!</h2>
              <p className="text-gray-600 mb-2">
                Your international business transfer is being processed
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Expected settlement: {destinationData?.settlementTime}
              </p>

              <div className="space-y-3 mb-8 text-left">
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Amount Sent</span>
                  <span className="font-semibold">{currencyData.symbol}{parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Recipient Gets</span>
                  <span className="font-semibold">
                    ${convertedAmount.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Transfer Fee</span>
                  <span className="font-semibold">${transferFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Beneficiary</span>
                  <span className="font-semibold">{beneficiaryName}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-gray-600">Transaction ID</span>
                  <span className="font-mono text-xs">INT{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                </div>
              </div>

              {/* Savings Badge */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-green-900">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-medium">
                    You saved ${savingsVsTraditional.toFixed(2)} vs traditional wire transfer
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Button className="w-full" size="lg">
                  Download Receipt
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={onBack}
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 pt-12 pb-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white text-2xl font-bold">International Business Transfer</h1>
              <p className="text-blue-100 text-sm">For importers, exporters & businesses</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex-1 h-1 rounded-full ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4">
        {step === 1 && (
          <>
            {/* Transfer Purpose */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Select Transfer Purpose</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {transferPurposes.map((purpose) => {
                  const Icon = purpose.icon;
                  return (
                    <button
                      key={purpose.id}
                      onClick={() => setTransferPurpose(purpose.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                        transferPurpose === purpose.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full bg-${purpose.color}-100 flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 text-${purpose.color}-600`} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-gray-900">{purpose.label}</p>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Destination Country */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Select Destination Country</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {destinationCountries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => setSelectedCountry(country.code)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedCountry === country.code
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{country.flag}</div>
                      <p className="font-semibold text-sm">{country.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{country.currency}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={() => setStep(2)}
              disabled={!transferPurpose || !selectedCountry}
              className="w-full h-14 text-lg mb-6"
              size="lg"
            >
              Continue
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            {/* Amount */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Transfer Amount</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Currency</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {currencies.slice(0, 4).map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => setSelectedCurrency(curr.code)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedCurrency === curr.code
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-xl mb-1">{curr.flag}</p>
                        <p className="font-semibold text-xs">{curr.code}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                      {currencyData.symbol}
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 text-2xl font-bold h-14"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Available: {currencyData.symbol}{currencyData.balance.toLocaleString()}
                  </p>
                </div>

                {amount && parseFloat(amount) > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Recipient receives</span>
                      <span className="font-semibold text-blue-900">
                        ${convertedAmount.toFixed(2)} USD
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Exchange rate</span>
                      <span className="font-medium text-blue-900">
                        ₦{fxRate}/USD
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Transfer fee (1.5%)</span>
                      <span className="font-medium text-blue-900">
                        ${transferFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-blue-300 flex justify-between">
                      <span className="font-semibold text-blue-900">Settlement time</span>
                      <span className="font-semibold text-blue-900 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {destinationData?.settlementTime}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Why Border is Better */}
            <Card className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Save up to ${savingsVsTraditional.toFixed(2)} vs traditional banks
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Powered by secure, instant infrastructure
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 mb-6">
              <Button 
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-14"
                size="lg"
              >
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)}
                disabled={!amount || parseFloat(amount) <= 0}
                className="flex-1 h-14"
                size="lg"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {/* Beneficiary Details */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Beneficiary Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="beneficiaryName">Beneficiary Name</Label>
                  <Input
                    id="beneficiaryName"
                    type="text"
                    placeholder="Company or individual name"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beneficiaryAccount">Account/IBAN Number</Label>
                  <Input
                    id="beneficiaryAccount"
                    type="text"
                    placeholder="Enter account number or IBAN"
                    value={beneficiaryAccount}
                    onChange={(e) => setBeneficiaryAccount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice/Reference Number</Label>
                  <Input
                    id="invoiceNumber"
                    type="text"
                    placeholder="Optional: Invoice or PO number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Compliance Notice */}
            <Card className="mb-4 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Compliance & Documentation</p>
                    <p className="text-blue-800 text-xs">
                      All international business transfers are monitored for compliance with CBN, FIRS, 
                      and international AML regulations. You may be required to provide supporting 
                      documentation such as invoices or purchase orders.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 mb-6">
              <Button 
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1 h-14"
                size="lg"
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmitTransfer}
                disabled={!beneficiaryName || !beneficiaryAccount}
                className="flex-1 h-14"
                size="lg"
              >
                Submit Transfer
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
