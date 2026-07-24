import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Wallet,
  Send,
  RefreshCw,
  ExternalLink,
  Info,
  Copy,
  DollarSign
} from 'lucide-react';
import {
  getStablecoinBalance,
  getAllBalances,
  createUserWallet,
  transferStablecoin,
  estimateTransactionCost,
  type CeloWallet
} from '@/utils/celo-blockchain';

interface TestResult {
  name: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
  timestamp?: number;
}

export function CeloTestPanel() {
  const [testAddress, setTestAddress] = useState('0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1'); // cUSD contract as example
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [generatedWallet, setGeneratedWallet] = useState<CeloWallet | null>(null);
  
  // Transfer form state
  const [transferFrom, setTransferFrom] = useState('');
  const [transferPrivateKey, setTransferPrivateKey] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('1.0');
  const [transferToken, setTransferToken] = useState<'cUSD' | 'cEUR' | 'USDC' | 'CELO'>('cUSD');

  const updateTestResult = (testName: string, update: Partial<TestResult>) => {
    setResults(prev => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        name: testName,
        ...update,
        timestamp: Date.now()
      }
    }));
  };

  // Test 1: Get cUSD Balance
  const testGetBalance = async () => {
    const testName = 'Get Balance';
    updateTestResult(testName, { status: 'pending' });

    try {
      const balance = await getStablecoinBalance(testAddress, 'cUSD');
      
      updateTestResult(testName, {
        status: 'success',
        message: `Balance retrieved successfully`,
        data: {
          address: testAddress,
          balance: `${balance.toFixed(4)} cUSD`,
          raw: balance
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.message || 'Failed to get balance',
        data: { error: String(error) }
      });
    }
  };

  // Test 2: Get All Balances
  const testGetAllBalances = async () => {
    const testName = 'Get All Balances';
    updateTestResult(testName, { status: 'pending' });

    try {
      const balances = await getAllBalances(testAddress);
      
      updateTestResult(testName, {
        status: 'success',
        message: 'All balances retrieved',
        data: {
          cUSD: `${balances.cUSD.toFixed(4)} cUSD`,
          cEUR: `${balances.cEUR.toFixed(4)} cEUR`,
          USDC: `${balances.USDC.toFixed(4)} USDC`,
          totalUSD: `$${balances.totalUSD.toFixed(2)}`
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.message || 'Failed to get balances',
        data: { error: String(error) }
      });
    }
  };

  // Test 3: Generate Wallet
  const testGenerateWallet = async () => {
    const testName = 'Generate Wallet';
    updateTestResult(testName, { status: 'pending' });

    try {
      const wallet = await createUserWallet('test-user-' + Date.now());
      setGeneratedWallet(wallet);
      
      updateTestResult(testName, {
        status: 'success',
        message: 'Wallet generated successfully',
        data: {
          address: wallet.address,
          note: 'Private key stored in component state (check below)'
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.message || 'Failed to generate wallet',
        data: { error: String(error) }
      });
    }
  };

  // Test 4: Estimate Gas
  const testEstimateGas = async () => {
    const testName = 'Estimate Gas';
    updateTestResult(testName, { status: 'pending' });

    try {
      const cost = await estimateTransactionCost(
        testAddress,
        parseFloat(transferAmount),
        transferToken
      );
      
      updateTestResult(testName, {
        status: 'success',
        message: 'Gas cost estimated',
        data: {
          gasCost: `${cost.gasCost.toFixed(6)} CELO`,
          gasCostUSD: `$${cost.gasCostUSD.toFixed(4)}`,
          note: 'Estimated cost to send transaction'
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.message || 'Failed to estimate gas',
        data: { error: String(error) }
      });
    }
  };

  // Test 5: Send Transfer (requires funded wallet)
  const testSendTransfer = async () => {
    const testName = 'Send Transfer';
    
    if (!transferFrom || !transferPrivateKey || !transferTo || !transferAmount) {
      updateTestResult(testName, {
        status: 'error',
        message: 'Please fill in all transfer fields'
      });
      return;
    }

    updateTestResult(testName, { status: 'pending' });

    try {
      const result = await transferStablecoin({
        from: transferFrom,
        fromPrivateKey: transferPrivateKey,
        to: transferTo,
        amount: parseFloat(transferAmount),
        stablecoin: transferToken
      });
      
      updateTestResult(testName, {
        status: 'success',
        message: 'Transfer successful!',
        data: {
          txHash: result.txHash,
          from: result.from,
          to: result.to,
          amount: `${result.amount} ${transferToken}`,
          explorerLink: `https://alfajores.celoscan.io/tx/${result.txHash}`
        }
      });
    } catch (error: any) {
      updateTestResult(testName, {
        status: 'error',
        message: error.message || 'Transfer failed',
        data: { 
          error: String(error),
          hint: 'Make sure the wallet has CELO for gas and sufficient token balance'
        }
      });
    }
  };

  // Run all read-only tests
  const runAllTests = async () => {
    await testGetBalance();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testGetAllBalances();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testEstimateGas();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-blue-50">Pending</Badge>;
      case 'success':
        return <Badge variant="outline" className="bg-green-50">Success</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50">Error</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-600" />
                Celo Blockchain Testnet Testing
              </CardTitle>
              <CardDescription className="mt-2">
                Test Celo Alfajores integration for stablecoin settlements
              </CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              Alfajores Testnet
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Celo Alfajores Testnet:</strong> This is testing on Celo's testnet blockchain. 
          No real money is involved. Get test tokens from{' '}
          <a 
            href="https://faucet.celo.org/alfajores" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline"
          >
            Celo Faucet
          </a>.
        </AlertDescription>
      </Alert>

      {/* Main Testing Interface */}
      <Tabs defaultValue="tests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tests">Blockchain Tests</TabsTrigger>
          <TabsTrigger value="transfer">Send Transfer</TabsTrigger>
          <TabsTrigger value="wallet">Generate Wallet</TabsTrigger>
        </TabsList>

        {/* Tests Tab */}
        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Configuration</CardTitle>
              <CardDescription>
                Enter a Celo address to test balance queries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testAddress">Test Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="testAddress"
                    value={testAddress}
                    onChange={(e) => setTestAddress(e.target.value)}
                    placeholder="0x..."
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={runAllTests}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Run All Tests
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use any Alfajores address or the cUSD contract address above
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Individual Tests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Test 1: Get Balance */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Get cUSD Balance</CardTitle>
                  {results['Get Balance'] && getStatusIcon(results['Get Balance'].status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={testGetBalance}
                  disabled={results['Get Balance']?.status === 'pending'}
                  className="w-full"
                  variant="outline"
                >
                  {results['Get Balance']?.status === 'pending' && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Run Test
                </Button>
                {results['Get Balance'] && (
                  <div className="space-y-2">
                    {getStatusBadge(results['Get Balance'].status)}
                    {results['Get Balance'].message && (
                      <p className="text-sm text-muted-foreground">
                        {results['Get Balance'].message}
                      </p>
                    )}
                    {results['Get Balance'].data && (
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(results['Get Balance'].data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test 2: Get All Balances */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Get All Balances</CardTitle>
                  {results['Get All Balances'] && getStatusIcon(results['Get All Balances'].status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={testGetAllBalances}
                  disabled={results['Get All Balances']?.status === 'pending'}
                  className="w-full"
                  variant="outline"
                >
                  {results['Get All Balances']?.status === 'pending' && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Run Test
                </Button>
                {results['Get All Balances'] && (
                  <div className="space-y-2">
                    {getStatusBadge(results['Get All Balances'].status)}
                    {results['Get All Balances'].message && (
                      <p className="text-sm text-muted-foreground">
                        {results['Get All Balances'].message}
                      </p>
                    )}
                    {results['Get All Balances'].data && (
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(results['Get All Balances'].data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test 3: Estimate Gas */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Estimate Gas Cost</CardTitle>
                  {results['Estimate Gas'] && getStatusIcon(results['Estimate Gas'].status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={testEstimateGas}
                  disabled={results['Estimate Gas']?.status === 'pending'}
                  className="w-full"
                  variant="outline"
                >
                  {results['Estimate Gas']?.status === 'pending' && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Run Test
                </Button>
                {results['Estimate Gas'] && (
                  <div className="space-y-2">
                    {getStatusBadge(results['Estimate Gas'].status)}
                    {results['Estimate Gas'].message && (
                      <p className="text-sm text-muted-foreground">
                        {results['Estimate Gas'].message}
                      </p>
                    )}
                    {results['Estimate Gas'].data && (
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(results['Estimate Gas'].data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transfer Tab */}
        <TabsContent value="transfer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Transfer</CardTitle>
              <CardDescription>
                Send tokens on Alfajores testnet (requires funded wallet)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transferFrom">From Address</Label>
                  <Input
                    id="transferFrom"
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    placeholder="0x..."
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferTo">To Address</Label>
                  <Input
                    id="transferTo"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="0x..."
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferPrivateKey">Private Key (testnet only)</Label>
                <Input
                  id="transferPrivateKey"
                  type="password"
                  value={transferPrivateKey}
                  onChange={(e) => setTransferPrivateKey(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  ⚠️ Only use testnet private keys - never production keys
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transferAmount">Amount</Label>
                  <Input
                    id="transferAmount"
                    type="number"
                    step="0.01"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="1.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferToken">Token</Label>
                  <select
                    id="transferToken"
                    value={transferToken}
                    onChange={(e) => setTransferToken(e.target.value as any)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="cUSD">cUSD</option>
                    <option value="cEUR">cEUR</option>
                    <option value="USDC">USDC</option>
                    <option value="CELO">CELO</option>
                  </select>
                </div>
              </div>

              <Button
                onClick={testSendTransfer}
                disabled={results['Send Transfer']?.status === 'pending'}
                className="w-full flex items-center justify-center gap-2"
              >
                {results['Send Transfer']?.status === 'pending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Transfer
                  </>
                )}
              </Button>

              {results['Send Transfer'] && (
                <div className="space-y-2">
                  {getStatusBadge(results['Send Transfer'].status)}
                  {results['Send Transfer'].message && (
                    <p className="text-sm text-muted-foreground">
                      {results['Send Transfer'].message}
                    </p>
                  )}
                  {results['Send Transfer'].data && (
                    <div className="space-y-2">
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(results['Send Transfer'].data, null, 2)}
                      </pre>
                      {results['Send Transfer'].data.explorerLink && (
                        <a
                          href={results['Send Transfer'].data.explorerLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          View on Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Test Wallet</CardTitle>
              <CardDescription>
                Create a new Celo wallet for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={testGenerateWallet}
                disabled={results['Generate Wallet']?.status === 'pending'}
                className="w-full flex items-center justify-center gap-2"
              >
                {results['Generate Wallet']?.status === 'pending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    Generate New Wallet
                  </>
                )}
              </Button>

              {results['Generate Wallet'] && (
                <div className="space-y-2">
                  {getStatusBadge(results['Generate Wallet'].status)}
                  {results['Generate Wallet'].message && (
                    <p className="text-sm text-muted-foreground">
                      {results['Generate Wallet'].message}
                    </p>
                  )}
                </div>
              )}

              {generatedWallet && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-background rounded text-sm break-all">
                        {generatedWallet.address}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedWallet.address)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Private Key</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-background rounded text-sm break-all">
                        {generatedWallet.privateKey}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedWallet.privateKey)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-red-600">
                      ⚠️ Save this private key securely - it cannot be recovered!
                    </p>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Next Steps:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Copy the address above</li>
                        <li>Visit <a href="https://faucet.celo.org/alfajores" target="_blank" rel="noopener noreferrer" className="underline">Celo Faucet</a></li>
                        <li>Request test tokens (CELO, cUSD, cEUR)</li>
                        <li>Use this wallet for testing transfers</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Testnet Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://faucet.celo.org/alfajores"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <Wallet className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium text-sm">Celo Faucet</div>
                <div className="text-xs text-muted-foreground">Get test tokens</div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </a>

            <a
              href="https://alfajores.celoscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-sm">Block Explorer</div>
                <div className="text-xs text-muted-foreground">View transactions</div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </a>

            <a
              href="https://docs.celo.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <Info className="w-5 h-5 text-purple-600" />
              <div>
                <div className="font-medium text-sm">Documentation</div>
                <div className="text-xs text-muted-foreground">Celo docs</div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
