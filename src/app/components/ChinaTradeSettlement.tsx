import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, Package, DollarSign, TrendingDown, Clock, 
  CheckCircle2, AlertCircle, Globe, FileText, Shield
} from 'lucide-react';
import { motion } from 'motion/react';

interface ChinaTradeSettlementProps {
  onBack: () => void;
}

const currencies = [
  { code: 'NGN', symbol: '₦', flag: '🇳🇬', balance: 5000000 },
  { code: 'USD', symbol: '$', flag: '🇺🇸', balance: 15000 },
];

const settlementMethods = [
  {
    id: 'direct',
    name: 'Direct USD Payment',
    description: 'Pay Chinese suppliers directly in USD',
    icon: DollarSign,
    settlementTime: '4-6 hours',
    recommended: true,
  },
  {
    id: 'hongkong',
    name: 'Hong Kong Settlement',
    description: 'Via licensed Hong Kong payment partners',
    icon: Globe,
    settlementTime: '6-12 hours',
    recommended: false,
  },
];

const tradeCategories = [
  { id: 'goods', label: 'Import of Goods', icon: '📦' },
  { id: 'machinery', label: 'Machinery & Equipment', icon: '⚙️' },
  { id: 'electronics', label: 'Electronics', icon: '💻' },
  { id: 'textiles', label: 'Textiles & Clothing', icon: '👕' },
  { id: 'raw-materials', label: 'Raw Materials', icon: '🏭' },
];

export default function ChinaTradeSettlement({ onBack }: ChinaTradeSettlementProps) {
  const [step, setStep] = useState(1);
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');
  const [amount, setAmount] = useState('');
  const [tradeCategory, setTradeCategory] = useState('');
  const [settlementMethod, setSettlementMethod] = useState('direct');
  const [supplierName, setSupplierName] = useState('');
  const [supplierAccount, setSupplierAccount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customsDeclaration, setCustomsDeclaration] = useState('');
  const [transferComplete, setTransferComplete] = useState(false);

  const currencyData = currencies.find(c => c.code === selectedCurrency)!;
  const selectedMethod = settlementMethods.find(m => m.id === settlementMethod)!;

  // Conversion calculations (hidden stablecoin: NGN → USD → cUSD/USDC → Supplier receives USD)
  const fxRate = 1650; // NGN to USD
  const usdAmount = selectedCurrency === 'NGN' ? parseFloat(amount) / fxRate : parseFloat(amount);
  const transferFee = usdAmount * 0.02; // 2% fee for China trade
  const savingsVsTraditional = usdAmount * 0.04; // 4% savings vs traditional methods

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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Processing!</h2>
              <p className="text-gray-600 mb-2">
                Your supplier payment is being processed
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Expected settlement: {selectedMethod.settlementTime}
              </p>

              <div className="space-y-3 mb-8 text-left">
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Amount Sent</span>
                  <span className="font-semibold">{currencyData.symbol}{parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Supplier Receives</span>
                  <span className="font-semibold">${usdAmount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Transfer Fee</span>
                  <span className="font-semibold">${transferFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Supplier</span>
                  <span className="font-semibold">{supplierName}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Invoice Number</span>
                  <span className="font-semibold">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-gray-600">Transaction ID</span>
                  <span className="font-mono text-xs">CHN{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                </div>
              </div>

              {/* Savings Badge */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-green-900">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-medium">
                    You saved ${savingsVsTraditional.toFixed(2)} vs traditional methods
                  </span>
                </div>
              </div>

              {/* Settlement Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6 text-left">
                <div className="flex items-start gap-3 text-sm text-blue-900">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Settlement via USD</p>
                    <p className="text-xs text-blue-800">
                      Your payment is converted to USD and transferred to your supplier via secure 
                      payment infrastructure. No exposure to crypto or volatile currencies.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button className="w-full" size="lg">
                  <FileText className="w-4 h-4 mr-2" />
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
      <div className="bg-gradient-to-br from-red-600 to-orange-600 pt-12 pb-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white text-2xl font-bold">China Trade Settlement</h1>
              <p className="text-orange-100 text-sm">Pay Chinese suppliers directly</p>
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
            {/* Trade Category */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Select Trade Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tradeCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setTradeCategory(category.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      tradeCategory === category.id
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center text-2xl">
                      {category.icon}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">{category.label}</p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Settlement Method */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Settlement Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {settlementMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSettlementMethod(method.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        settlementMethod === method.id
                          ? 'border-red-600 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{method.name}</p>
                            {method.recommended && (
                              <Badge className="bg-green-500 text-white text-xs">Recommended</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{method.description}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {method.settlementTime}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="mb-4 bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-900">
                    <p className="font-medium mb-1">How it works</p>
                    <p className="text-amber-800 text-xs">
                      Your payment is converted to USD and transferred to your Chinese supplier. 
                      Settlement happens via licensed partners, fully compliant with international regulations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={() => setStep(2)}
              disabled={!tradeCategory}
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
                <CardTitle>Payment Amount</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Currency</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {currencies.map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => setSelectedCurrency(curr.code)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedCurrency === curr.code
                            ? 'border-red-600 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-2xl mb-2">{curr.flag}</p>
                        <p className="font-semibold text-sm">{curr.code}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {curr.symbol}{curr.balance.toLocaleString()}
                        </p>
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
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Supplier receives</span>
                      <span className="font-semibold text-red-900">
                        ${usdAmount.toFixed(2)} USD
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Exchange rate</span>
                      <span className="font-medium text-red-900">
                        ₦{fxRate}/USD
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Transfer fee (2%)</span>
                      <span className="font-medium text-red-900">
                        ${transferFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-red-300 flex justify-between">
                      <span className="font-semibold text-red-900">Settlement time</span>
                      <span className="font-semibold text-red-900 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {selectedMethod.settlementTime}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Savings Banner */}
            <Card className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <TrendingDown className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Save up to ${savingsVsTraditional.toFixed(2)} vs traditional methods
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Faster processing and lower fees than banks or money transfer services
                    </p>
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
            {/* Supplier Details */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Supplier Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierName">Supplier Company Name</Label>
                  <Input
                    id="supplierName"
                    type="text"
                    placeholder="Company name in China"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplierAccount">Bank Account / Payment Details</Label>
                  <Input
                    id="supplierAccount"
                    type="text"
                    placeholder="Bank account or payment details"
                    value={supplierAccount}
                    onChange={(e) => setSupplierAccount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number (Required)</Label>
                  <Input
                    id="invoiceNumber"
                    type="text"
                    placeholder="Supplier invoice number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customsDeclaration">Customs Declaration Number (Optional)</Label>
                  <Input
                    id="customsDeclaration"
                    type="text"
                    placeholder="Nigerian customs declaration if available"
                    value={customsDeclaration}
                    onChange={(e) => setCustomsDeclaration(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Compliance Notice */}
            <Card className="mb-4 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Trade Compliance & Documentation</p>
                    <p className="text-blue-800 text-xs">
                      All China trade payments comply with CBN, FIRS, and international trade regulations. 
                      You must provide invoice documentation. Customs declaration and import permits may 
                      be required for verification.
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
                disabled={!supplierName || !supplierAccount || !invoiceNumber}
                className="flex-1 h-14"
                size="lg"
              >
                Submit Payment
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
