import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  CheckCircle2, XCircle, Loader2, Zap, CreditCard, Smartphone, 
  ArrowRight, Building2, AlertCircle 
} from 'lucide-react';
import { psb } from '../../lib/api';
import { toast } from 'sonner';

export default function PSBTestPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [bankCode, setBankCode] = useState('058');
  const [accountNumber, setAccountNumber] = useState('0123456789');
  const [amount, setAmount] = useState('1000');
  const [phoneNumber, setPhoneNumber] = useState('08012345678');
  const [network, setNetwork] = useState<'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE'>('MTN');
  const [meterNumber, setMeterNumber] = useState('12345678910');
  const [disco, setDisco] = useState('EKEDC');
  const [smartCard, setSmartCard] = useState('12345678910');
  const [cableProvider, setCableProvider] = useState<'DSTV' | 'GOTV' | 'STARTIMES'>('DSTV');

  const handleTest = async (testType: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      
      switch (testType) {
        case 'getBanks':
          response = await psb.transfer.getBanks();
          break;
          
        case 'verifyAccount':
          response = await psb.transfer.verifyAccount(bankCode, accountNumber);
          break;
          
        case 'getBalance':
          response = await psb.transfer.getBalance();
          break;
          
        case 'getProviders':
          response = await psb.vas.getProviders('airtime');
          break;
          
        case 'getDataBundles':
          response = await psb.vas.getDataBundles(network);
          break;
          
        case 'getCablePackages':
          response = await psb.vas.getCablePackages(cableProvider);
          break;
          
        case 'buyAirtime':
          response = await psb.vas.buyAirtime({
            phoneNumber,
            amount: parseFloat(amount),
            network,
          });
          break;
          
        case 'validateElectricity':
          response = await psb.vas.validateCustomer({
            serviceType: 'electricity',
            provider: disco,
            customerId: meterNumber,
          });
          break;
          
        case 'validateCable':
          response = await psb.vas.validateCustomer({
            serviceType: 'cable',
            provider: cableProvider,
            customerId: smartCard,
          });
          break;
          
        default:
          throw new Error('Unknown test type');
      }
      
      setResult(response);
      toast.success('Test completed successfully!');
    } catch (err: any) {
      setError(err.message || 'Test failed');
      toast.error(err.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-orange-600" />
                9PSB API Test Panel
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Test 9PSB Fund Transfer and VAS integrations
              </p>
            </div>
            <Badge className="bg-orange-100 text-orange-700 border-orange-300">
              IKPOKIANYU TEST MODE
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="transfer" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="transfer">
            <Building2 className="w-4 h-4 mr-2" />
            Fund Transfer
          </TabsTrigger>
          <TabsTrigger value="vas">
            <Smartphone className="w-4 h-4 mr-2" />
            VAS Services
          </TabsTrigger>
          <TabsTrigger value="results">
            <CreditCard className="w-4 h-4 mr-2" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Fund Transfer Tests */}
        <TabsContent value="transfer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Get Bank List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Fetch the list of all Nigerian banks supported by 9PSB
              </p>
              <Button 
                onClick={() => handleTest('getBanks')} 
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Get Banks
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verify Bank Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bank Code</Label>
                <Input
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  placeholder="e.g., 058 for GTBank"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="10-digit account number"
                  maxLength={10}
                />
              </div>
              <Button 
                onClick={() => handleTest('verifyAccount')} 
                disabled={loading || !bankCode || !accountNumber}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Verify Account
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Get Account Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Fetch balance for test account: <strong>1100011303</strong>
              </p>
              <Button 
                onClick={() => handleTest('getBalance')} 
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Get Balance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VAS Tests */}
        <TabsContent value="vas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Get Service Providers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Fetch available providers for airtime service
              </p>
              <Button 
                onClick={() => handleTest('getProviders')} 
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Get Airtime Providers
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Get Data Bundles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Network</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const).map((n) => (
                    <Button
                      key={n}
                      variant={network === n ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNetwork(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <Button 
                onClick={() => handleTest('getDataBundles')} 
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Get Data Bundles
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Get Cable TV Packages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['DSTV', 'GOTV', 'STARTIMES'] as const).map((p) => (
                    <Button
                      key={p}
                      variant={cableProvider === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCableProvider(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
              <Button 
                onClick={() => handleTest('getCablePackages')} 
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Get Packages
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Buy Airtime (TEST)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Network</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const).map((n) => (
                    <Button
                      key={n}
                      variant={network === n ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNetwork(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08012345678"
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (NGN)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    This is a test transaction. In test mode, any phone number works.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => handleTest('buyAirtime')} 
                disabled={loading || !phoneNumber || !amount}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Buy Airtime (Test)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validate Electricity Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Distribution Company</Label>
                <Input
                  value={disco}
                  onChange={(e) => setDisco(e.target.value)}
                  placeholder="EKEDC"
                />
              </div>
              <div className="space-y-2">
                <Label>Meter Number (Test: 12345678910)</Label>
                <Input
                  value={meterNumber}
                  onChange={(e) => setMeterNumber(e.target.value)}
                  placeholder="12345678910"
                />
              </div>
              <Button 
                onClick={() => handleTest('validateElectricity')} 
                disabled={loading || !disco || !meterNumber}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Validate Customer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validate Cable TV Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['DSTV', 'GOTV', 'STARTIMES'] as const).map((p) => (
                    <Button
                      key={p}
                      variant={cableProvider === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCableProvider(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Smartcard Number (Test: 12345678910)</Label>
                <Input
                  value={smartCard}
                  onChange={(e) => setSmartCard(e.target.value)}
                  placeholder="12345678910"
                />
              </div>
              <Button 
                onClick={() => handleTest('validateCable')} 
                disabled={loading || !smartCard}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Validate Customer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results */}
        <TabsContent value="results">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-green-900">Success</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-white p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {!result && !error && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No results yet. Run a test to see results here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Test Credentials Info */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Test Credentials Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold mb-2">Fund Transfer:</p>
              <ul className="space-y-1 text-xs">
                <li>• Public Key: 0F07DF11...F38D8</li>
                <li>• Private Key: XJxGfuAV...widFeAb...</li>
                <li>• Test Account: 1100011303</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">VAS Services:</p>
              <ul className="space-y-1 text-xs">
                <li>• API Key: IKPOKIANYU_TEST...</li>
                <li>• Test Meter: 12345678910</li>
                <li>• Test Phone: Any number</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
