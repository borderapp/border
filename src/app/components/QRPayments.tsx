import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { 
  ArrowLeft, QrCode, Scan, TrendingUp, DollarSign, 
  Download, Share2, Settings, Calendar, Filter 
} from 'lucide-react';
import { motion } from 'motion/react';

interface QRPaymentsProps {
  onBack: () => void;
}

export default function QRPayments({ onBack }: QRPaymentsProps) {
  const [activeTab, setActiveTab] = useState<'receive' | 'merchant'>('receive');
  const [showQR, setShowQR] = useState(false);

  const merchantStats = {
    today: { sales: 45, amount: 285000 },
    week: { sales: 234, amount: 1450000 },
    month: { sales: 892, amount: 5680000 },
  };

  const recentPayments = [
    { id: 1, customer: 'Customer #1234', amount: 5000, currency: 'NGN', time: '5 mins ago' },
    { id: 2, customer: 'Customer #1235', amount: 125, currency: 'USD', time: '15 mins ago' },
    { id: 3, customer: 'Customer #1236', amount: 8500, currency: 'NGN', time: '1 hour ago' },
    { id: 4, customer: 'Customer #1237', amount: 3200, currency: 'NGN', time: '2 hours ago' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 pt-12 pb-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-white text-2xl font-bold">QR Payments</h1>
          </div>

          {/* Tab Switcher */}
          <Card className="bg-white/95 border-0">
            <CardContent className="p-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'receive' | 'merchant')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="receive" className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    Receive Payment
                  </TabsTrigger>
                  <TabsTrigger value="merchant" className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Merchant Dashboard
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4">
        {activeTab === 'receive' ? (
          <>
            {/* Personal QR Code */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Your Payment QR Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  {/* QR Code Display */}
                  <div className="bg-white p-6 rounded-xl border-4 border-gray-200 mb-4 inline-block">
                    <div className="w-64 h-64 bg-gray-900 rounded-lg flex items-center justify-center">
                      <div className="grid grid-cols-4 gap-1 p-6">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 bg-white"
                            style={{
                              opacity: Math.random() > 0.3 ? 1 : 0,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="font-semibold text-gray-900">@oluwaseun</p>
                    <p className="text-sm text-gray-600">
                      Anyone can scan this code to send you money instantly
                    </p>

                    <div className="flex gap-2">
                      <Button className="flex-1" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button className="flex-1" variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scan QR Code */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <Button className="w-full h-14" size="lg">
                  <Scan className="w-5 h-5 mr-2" />
                  Scan QR Code to Pay
                </Button>
              </CardContent>
            </Card>

            {/* Multi-Currency Support */}
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Supported Currencies</h3>
                <div className="grid grid-cols-4 gap-2">
                  {['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'CAD', 'CNY'].map((currency) => (
                    <div key={currency} className="bg-white p-2 rounded-lg text-center">
                      <p className="font-semibold text-xs text-blue-900">{currency}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-800 mt-3">
                  Your QR code automatically accepts all supported currencies
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Merchant Stats */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Sales Overview</CardTitle>
                  <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Today
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{merchantStats.today.sales}</p>
                    <p className="text-sm text-gray-500">Sales</p>
                  </div>
                  <div className="text-center border-l border-r">
                    <p className="text-3xl font-bold text-green-600">
                      ₦{(merchantStats.today.amount / 1000).toFixed(0)}k
                    </p>
                    <p className="text-sm text-gray-500">Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      ₦{(merchantStats.today.amount / merchantStats.today.sales).toFixed(0)}
                    </p>
                    <p className="text-sm text-gray-500">Avg. Sale</p>
                  </div>
                </div>

                {/* Period Tabs */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-lg">
                  {[
                    { label: 'Today', value: merchantStats.today },
                    { label: 'Week', value: merchantStats.week },
                    { label: 'Month', value: merchantStats.month },
                  ].map((period) => (
                    <button
                      key={period.label}
                      className="px-3 py-2 rounded-md bg-white shadow-sm text-sm font-medium"
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Generate Payment QR */}
            <Card className="mb-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0">
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <QrCode className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Generate Payment QR</h3>
                  <p className="text-sm text-green-100">
                    Create a new QR code for your customer to scan
                  </p>
                </div>
                <Button 
                  className="w-full bg-white text-green-600 hover:bg-green-50"
                  size="lg"
                  onClick={() => setShowQR(true)}
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  New Payment Request
                </Button>
              </CardContent>
            </Card>

            {/* Analytics Chart */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Sales Trend</CardTitle>
                  <Button variant="ghost" size="sm">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Simple bar chart visualization */}
                <div className="flex items-end gap-2 h-32">
                  {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div 
                        className="bg-gradient-to-t from-indigo-600 to-purple-600 rounded-t"
                        style={{ height: `${height}%` }}
                      />
                      <p className="text-xs text-gray-500 text-center mt-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Recent Payments</h3>
                <button className="text-indigo-600 text-sm hover:underline">
                  View All
                </button>
              </div>
              <div className="space-y-2">
                {recentPayments.map((payment) => (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{payment.customer}</p>
                            <p className="text-xs text-gray-500">{payment.time}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            +{payment.currency === 'USD' ? '$' : '₦'}{payment.amount.toLocaleString()}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {payment.currency}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Merchant Tools */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Merchant Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Export Sales Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Settlement Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Pricing & Fees
                </Button>
              </CardContent>
            </Card>

            {/* Settlement Info */}
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Next Settlement</p>
                    <p className="text-blue-800">
                      ₦{merchantStats.today.amount.toLocaleString()} will be settled to your wallet tomorrow at 9:00 AM
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Generate Payment QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payment QR Generated</h3>
              <p className="text-gray-600">Customer can scan to pay</p>
            </div>
            
            {/* QR Code Placeholder */}
            <div className="bg-white p-6 rounded-xl border-4 border-gray-200 mb-6">
              <div className="aspect-square bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="grid grid-cols-3 gap-1 p-4">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 bg-white"
                      style={{
                        opacity: Math.random() > 0.3 ? 1 : 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Order ID</span>
                <span className="font-mono font-semibold">ORD{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status</span>
                <Badge variant="outline" className="text-xs">
                  Waiting for payment
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowQR(false)} variant="outline" className="flex-1">
                Close
              </Button>
              <Button className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
