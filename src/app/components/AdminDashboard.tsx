import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft, Users, Activity, DollarSign, TrendingUp,
  UserCheck, AlertCircle, CheckCircle2, XCircle, Search,
  Filter, Download, Settings, Shield, Smartphone, Eye, Coins, Wallet, CreditCard
} from 'lucide-react';
import AdminStablecoinPanel from './AdminStablecoinPanel';
import AdminKYCApproval from './AdminKYCApproval';
import { CircleTestPanel } from './CircleTestPanel';
import { CeloTestPanel } from './CeloTestPanel';
import AdminTreasuryWallets from './admin/AdminTreasuryWallets';
import JuicywayCardFunding from './admin/JuicywayCardFunding';
import USDWithdrawalTest from './admin/USDWithdrawalTest';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'kyc' | 'fx' | 'pos' | 'stablecoin' | 'circle' | 'celo' | 'treasury' | 'card-funding' | 'usd-withdrawal' | 'system'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [realStats, setRealStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    pendingKYC: 0,
    activePOS: 12, // Keep some mock for POS for now
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch profiles count
      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Fetch transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, status, user_id');
      
      const totalTx = transactions?.length || 0;
      const totalVol = transactions?.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) || 0;
      
      // Fetch KYC pending
      const { count: kycPending } = await supabase
        .from('kyc_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      setRealStats({
        totalUsers: profilesCount || 0,
        activeUsers: profilesCount || 0, 
        totalTransactions: totalTx,
        totalVolume: totalVol,
        pendingKYC: kycPending || 0,
        activePOS: 12,
      });
    } catch (error) {
    }
  };

  const rlsSnippet = `-- 1. Add the border_tag column to the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS border_tag TEXT UNIQUE;

-- 2. Allow authenticated users to search profiles
-- Delete existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to search profiles" ON profiles;
CREATE POLICY "Allow authenticated users to search profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- 3. Ensure profiles can be updated by the owner
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
CREATE POLICY "Allow users to update their own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);`;

  const stats = realStats;

  const recentUsers = [
    { id: 1, name: 'John Adebayo', email: 'john@example.com', status: 'verified', joined: '2 mins ago' },
    { id: 2, name: 'Chioma Okonkwo', email: 'chioma@example.com', status: 'pending', joined: '15 mins ago' },
    { id: 3, name: 'Ahmed Ibrahim', email: 'ahmed@example.com', status: 'verified', joined: '1 hour ago' },
  ];

  const recentTransactions = [
    { id: 1, user: 'John Adebayo', type: 'P2P Transfer', amount: 25000, currency: 'NGN', status: 'completed', time: '2 mins ago' },
    { id: 2, user: 'Chioma Okonkwo', type: 'Currency Conversion', amount: 500, currency: 'USD', status: 'completed', time: '5 mins ago' },
    { id: 3, user: 'Ahmed Ibrahim', type: 'Bank Transfer', amount: 150000, currency: 'NGN', status: 'processing', time: '10 mins ago' },
    { id: 4, user: 'Fatima Musa', type: 'Bill Payment', amount: 8000, currency: 'NGN', status: 'completed', time: '30 mins ago' },
  ];

  const fxRates = [
    { pair: 'USD/NGN', rate: 1650, change: '+2.5%', updated: '1 min ago' },
    { pair: 'GBP/NGN', rate: 2100, change: '+1.8%', updated: '1 min ago' },
    { pair: 'EUR/NGN', rate: 1800, change: '-0.5%', updated: '1 min ago' },
    { pair: 'CNY/NGN', rate: 230, change: '+0.3%', updated: '1 min ago' },
  ];

  const posAgents = [
    { id: 1, agent: 'Lagos Agent #001', transactions: 45, volume: 285000, status: 'active' },
    { id: 2, agent: 'Abuja Agent #002', transactions: 32, volume: 198000, status: 'active' },
    { id: 3, agent: 'Kano Agent #003', transactions: 28, volume: 156000, status: 'inactive' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 pt-12 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-white text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-white/80 text-sm">Border Platform Management</p>
            </div>
            <Badge className="bg-green-500 text-white border-0">
              <Shield className="w-3 h-3 mr-1" />
              Admin Access
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-4">
        {/* Navigation Tabs */}
        <Card className="mb-6">
          <CardContent className="p-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <div className="overflow-x-auto">
                <TabsList className="inline-flex w-auto h-auto gap-1">
                  <TabsTrigger value="overview" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Users</span>
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Transactions</span>
                  </TabsTrigger>
                  <TabsTrigger value="kyc" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <UserCheck className="w-4 h-4" />
                    <span className="text-xs">KYC/AML</span>
                  </TabsTrigger>
                  <TabsTrigger value="fx" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs">FX Rates</span>
                  </TabsTrigger>
                  <TabsTrigger value="pos" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-xs">POS Agents</span>
                  </TabsTrigger>
                  <TabsTrigger value="usd-withdrawal" className="flex flex-col gap-1 py-3 px-4 min-w-[80px] bg-green-100">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold">USD Test</span>
                  </TabsTrigger>
                  <TabsTrigger value="card-funding" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs">Card Funding</span>
                  </TabsTrigger>
                  <TabsTrigger value="stablecoin" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <Coins className="w-4 h-4" />
                    <span className="text-xs">Settlement</span>
                  </TabsTrigger>
                  <TabsTrigger value="circle" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Circle Live</span>
                  </TabsTrigger>
                  <TabsTrigger value="celo" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Celo Test</span>
                  </TabsTrigger>
                  <TabsTrigger value="treasury" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <Wallet className="w-4 h-4" />
                    <span className="text-xs">Treasury</span>
                  </TabsTrigger>
                  <TabsTrigger value="system" className="flex flex-col gap-1 py-3 px-4 min-w-[80px]">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs">System</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Stablecoin Tab */}
        {activeTab === 'stablecoin' && (
          <AdminStablecoinPanel />
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-blue-600" />
                    <Badge variant="outline" className="text-xs">+12.5%</Badge>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Total Users</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-8 h-8 text-green-600" />
                    <Badge variant="outline" className="text-xs">+8.2%</Badge>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeUsers.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Active Users</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 text-purple-600" />
                    <Badge variant="outline" className="text-xs">+15.3%</Badge>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalTransactions.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Transactions</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-amber-600" />
                    <Badge variant="outline" className="text-xs">+22.1%</Badge>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ₦{(stats.totalVolume / 1000000000).toFixed(1)}B
                  </p>
                  <p className="text-sm text-gray-500">Total Volume</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transaction Volume (7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-48">
                    {[45, 65, 55, 80, 70, 90, 85].map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end">
                        <div 
                          className="bg-gradient-to-t from-blue-600 to-purple-600 rounded-t"
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Platform Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>System Uptime</span>
                      <span className="font-semibold text-green-600">99.98%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '99.98%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>API Response Time</span>
                      <span className="font-semibold text-blue-600">125ms</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>KYC Approval Rate</span>
                      <span className="font-semibold text-purple-600">94.2%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '94.2%' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">System Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">Pending KYC Reviews</p>
                    <p className="text-sm text-amber-800">{stats.pendingKYC} users awaiting verification</p>
                  </div>
                  <Button size="sm" variant="outline">Review</Button>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">System Update Complete</p>
                    <p className="text-sm text-green-800">Platform upgraded to v2.5.0 successfully</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="flex gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search users by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge variant={user.status === 'verified' ? 'default' : 'outline'}>
                            {user.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">{user.joined}</p>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Transaction Monitor</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{tx.user}</p>
                          <p className="text-sm text-gray-500">{tx.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {tx.currency === 'USD' ? '$' : '₦'}{tx.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">{tx.time}</p>
                        </div>
                        <Badge variant={tx.status === 'completed' ? 'default' : 'outline'}>
                          {tx.status}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* KYC Tab */}
        {activeTab === 'kyc' && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">KYC/AML Review Queue</CardTitle>
                  <Badge variant="outline">Live Data from Supabase</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <AdminKYCApproval />
              </CardContent>
            </Card>
          </>
        )}

        {/* FX Rates Tab */}
        {activeTab === 'fx' && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">FX Rate Management</CardTitle>
                  <Button size="sm">Update Rates</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fxRates.map((rate, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{rate.pair}</p>
                          <p className="text-sm text-gray-500">Updated {rate.updated}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {rate.rate.toLocaleString()}
                          </p>
                          <Badge variant={rate.change.startsWith('+') ? 'default' : 'outline'} className="mt-1">
                            {rate.change}
                          </Badge>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* China Integration Note */}
            <Card className="mb-6 bg-indigo-50 border-indigo-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-indigo-900 mb-2">CNY/RMB Integration Architecture</h3>
                <div className="text-sm text-indigo-800 space-y-2">
                  <p className="font-medium">Recommended Integration Partners:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>UnionPay - Cross-border payment processing</li>
                    <li>Alipay Global / Ant Group - International transfer APIs</li>
                    <li>WeChat Pay - Cross-border payment gateway</li>
                    <li>SWIFT + Correspondent Banks - Traditional banking routes</li>
                    <li>Global FX Liquidity Providers - Real-time rate feeds</li>
                  </ul>
                  <p className="mt-2 pt-2 border-t border-indigo-300">
                    <strong>Compliance:</strong> All CNY transfers must comply with PBOC regulations and China-Africa trade documentation requirements.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* POS Agents Tab */}
        {activeTab === 'pos' && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Virtual POS Agent Network</CardTitle>
                  <Badge variant="outline">{stats.activePOS} Active Agents</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {posAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{agent.agent}</p>
                          <p className="text-sm text-gray-500">
                            {agent.transactions} transactions today
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ₦{agent.volume.toLocaleString()}
                          </p>
                          <Badge variant={agent.status === 'active' ? 'default' : 'outline'} className="mt-1">
                            {agent.status}
                          </Badge>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Circle Test Tab */}
        {activeTab === 'circle' && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Circle Test Panel</CardTitle>
              </CardHeader>
              <CardContent>
                <CircleTestPanel />
              </CardContent>
            </Card>
          </>
        )}

        {/* Celo Test Tab */}
        {activeTab === 'celo' && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Celo Test Panel</CardTitle>
              </CardHeader>
              <CardContent>
                <CeloTestPanel />
              </CardContent>
            </Card>
          </>
        )}

        {/* Treasury Tab */}
        {activeTab === 'treasury' && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Treasury Wallets</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminTreasuryWallets />
              </CardContent>
            </Card>
          </>
        )}

        {/* Card Funding Tab */}
        {activeTab === 'card-funding' && (
          <>
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Juicyway Card Funding Test Panel</h3>
                    <p className="text-sm text-blue-800">
                      Test the complete 4-step card payment flow with test cards.
                      Webhook URL: <code className="bg-white px-1 rounded text-xs">{import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co'}/functions/v1/juicyway-funding/webhook</code>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <JuicywayCardFunding />
          </>
        )}

        {/* USD Withdrawal Test Tab */}
        {activeTab === 'usd-withdrawal' && (
          <>
            <Card className="mb-6 bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">USD Withdrawal Test Panel</h3>
                    <p className="text-sm text-green-800">
                      Test Juicyway USD beneficiary creation and ACH payouts with exact payload format.
                      Uses routing numbers, account holder details, and address information for US bank transfers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <USDWithdrawalTest />
          </>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <CardTitle className="text-base text-amber-900">Search Troubleshooting</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-amber-800">
                  If users are not appearing in search results, it is likely due to <strong>Supabase Row Level Security (RLS)</strong>. 
                  By default, users cannot see other users' profiles.
                </p>
                <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono">
                    {rlsSnippet}
                  </pre>
                </div>
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(rlsSnippet);
                    toast.success('SQL snippet copied to clipboard');
                  }}
                >
                  Copy SQL Snippet
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">System Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Database Schema</p>
                    <p className="font-bold text-gray-900">v2.5.4</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">API Environment</p>
                    <p className="font-bold text-blue-600 uppercase">Staging / Sandbox</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Auto-Approve Tier 1 KYC</p>
                    <p className="text-xs text-gray-500 text-slate-400">Enable automatic approval for basic document uploads</p>
                  </div>
                  <Button variant="outline" size="sm">Disabled</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}