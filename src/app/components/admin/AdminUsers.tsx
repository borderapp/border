import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { supabase } from '@/lib/supabase';
import {
  Users, Search, Filter, RefreshCw, Loader2, Shield,
  Mail, Phone, Calendar, Eye, Ban, CheckCircle2,
  AlertCircle, TrendingUp, UserCheck, UserX, ShieldCheck, ShieldOff, Key, X
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');

  // Admin permission modal state
  const [adminModal, setAdminModal] = useState<{ user: any; mode: 'grant' | 'revoke' | 'set-pin' } | null>(null);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinLoading, setAdminPinLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    suspendedUsers: 0
  });

  useEffect(() => {
    fetchUsers();

    // Real-time subscription
    const subscription = supabase
      .channel('admin-users')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          fetchUsers(true);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {

      const { data, error, status, statusText } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }


      if (data && data.length > 0) {
      } else {
      }

      setUsers(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const active = data?.filter((u: any) => !u.is_suspended).length || 0;
      const verified = data?.filter((u: any) => u.kyc_level >= 2).length || 0;
      const suspended = data?.filter((u: any) => u.is_suspended).length || 0;

      setStats({
        totalUsers: total,
        activeUsers: active,
        verifiedUsers: verified,
        suspendedUsers: suspended
      });

      if (total > 0) {
        toast.success(`Loaded ${total} user${total > 1 ? 's' : ''}`);
      } else {
        toast.info('No users found', {
          description: 'Create a new account in the Portal to see users here'
        });
      }
    } catch (error: any) {
      toast.error('Failed to load users', {
        description: error.message || 'Check console for details'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesTier = filterTier === 'all' || user.kyc_level?.toString() === filterTier;
    const matchesSearch =
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    return matchesTier && matchesSearch;
  });

  const handleAdminAction = async () => {
    if (!adminModal) return;
    setAdminPinLoading(true);
    try {
      const { user, mode } = adminModal;
      if (mode === 'grant') {
        if (!adminPin || adminPin.length < 4) { toast.error('Admin PIN must be at least 4 characters'); return; }
        await supabase.from('profiles').update({ is_admin: true, admin_pin: adminPin }).eq('id', user.id);
        toast.success(`Admin access granted to ${user.email}`);
      } else if (mode === 'revoke') {
        await supabase.from('profiles').update({ is_admin: false, admin_pin: null }).eq('id', user.id);
        toast.success(`Admin access revoked from ${user.email}`);
      } else if (mode === 'set-pin') {
        if (!adminPin || adminPin.length < 4) { toast.error('Admin PIN must be at least 4 characters'); return; }
        await supabase.from('profiles').update({ admin_pin: adminPin }).eq('id', user.id);
        toast.success(`Admin PIN updated for ${user.email}`);
      }
      setAdminModal(null);
      setAdminPin('');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setAdminPinLoading(false);
    }
  };

  const getTierBadge = (tier: number) => {
    const tiers = [
      { name: 'Tier 0', color: 'bg-slate-100 text-slate-700' },
      { name: 'Tier 1', color: 'bg-blue-100 text-blue-700' },
      { name: 'Tier 2', color: 'bg-green-100 text-green-700' },
      { name: 'Tier 3', color: 'bg-purple-100 text-purple-700' },
      { name: 'Tier 4', color: 'bg-amber-100 text-amber-700' }
    ];
    return tiers[tier] || tiers[0];
  };

  return (
    <div className="space-y-6 isolate">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Users</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Active</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeUsers}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Verified</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.verifiedUsers}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Suspended</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.suspendedUsers}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>User Management</CardTitle>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Tier Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="all">All Tiers</option>
                <option value="0">Tier 0</option>
                <option value="1">Tier 1</option>
                <option value="2">Tier 2</option>
                <option value="3">Tier 3</option>
                <option value="4">Tier 4</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-xl font-bold text-slate-700 mb-2">No Users Found</p>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                {users.length === 0
                  ? "No users have signed up yet. Go to the Portal (use the switcher above) to create a new account."
                  : "No users match your current filters. Try adjusting your search or filter criteria."
                }
              </p>
              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={fetchUsers}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100 max-w-md mx-auto text-left">
                <p className="text-sm text-blue-900 font-medium mb-2">💡 Quick Guide:</p>
                <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                  <li>Click "Portal" in the top-right switcher</li>
                  <li>Create a new account or log in</li>
                  <li>Come back here - users will appear automatically</li>
                </ol>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                {filteredUsers.map((user) => {
                  const tier = getTierBadge(user.kyc_level || 0);
                  return (
                    <div key={user.id} className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {user.first_name?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {user.is_admin ? (
                            <>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">ADMIN</span>
                              <button onClick={() => { setAdminModal({ user, mode: 'set-pin' }); setAdminPin(''); }} className="p-1.5 hover:bg-white rounded-lg">
                                <Key className="w-4 h-4 text-slate-500" />
                              </button>
                              <button onClick={() => setAdminModal({ user, mode: 'revoke' })} className="p-1.5 hover:bg-white rounded-lg">
                                <ShieldOff className="w-4 h-4 text-red-500" />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => { setAdminModal({ user, mode: 'grant' }); setAdminPin(''); }} className="p-1.5 hover:bg-white rounded-lg">
                              <ShieldCheck className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${tier.color} border-0 text-xs`}>{tier.name}</Badge>
                        {user.is_suspended ? (
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs">Suspended</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">User</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Contact</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">KYC Tier</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const tier = getTierBadge(user.kyc_level || 0);
                      return (
                        <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                                {user.first_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{user.first_name} {user.last_name}</p>
                                <p className="text-xs text-slate-500">ID: {user.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs text-slate-600"><Mail className="w-3 h-3" />{user.email}</div>
                              {user.phone && <div className="flex items-center gap-2 text-xs text-slate-600"><Phone className="w-3 h-3" />{user.phone}</div>}
                            </div>
                          </td>
                          <td className="py-4 px-4"><Badge className={`${tier.color} border-0`}>{tier.name}</Badge></td>
                          <td className="py-4 px-4">
                            {user.is_suspended
                              ? <Badge className="bg-red-100 text-red-700 border-0 flex items-center gap-1 w-fit"><Ban className="w-3 h-3" />Suspended</Badge>
                              : <Badge className="bg-green-100 text-green-700 border-0 flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" />Active</Badge>}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 text-xs text-slate-600"><Calendar className="w-3 h-3" />{new Date(user.created_at).toLocaleDateString()}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1">
                              {user.is_admin ? (
                                <>
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mr-1">ADMIN</span>
                                  <button onClick={() => { setAdminModal({ user, mode: 'set-pin' }); setAdminPin(''); }} className="p-2 hover:bg-slate-100 rounded-lg"><Key className="w-4 h-4 text-slate-500" /></button>
                                  <button onClick={() => setAdminModal({ user, mode: 'revoke' })} className="p-2 hover:bg-red-50 rounded-lg"><ShieldOff className="w-4 h-4 text-red-500" /></button>
                                </>
                              ) : (
                                <button onClick={() => { setAdminModal({ user, mode: 'grant' }); setAdminPin(''); }} className="p-2 hover:bg-blue-50 rounded-lg"><ShieldCheck className="w-4 h-4 text-blue-600" /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Admin permission modal */}
      {adminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">
                {adminModal.mode === 'grant' ? 'Grant Admin Access' : adminModal.mode === 'revoke' ? 'Revoke Admin Access' : 'Change Admin PIN'}
              </h3>
              <button onClick={() => setAdminModal(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {adminModal.mode === 'revoke'
                ? `Remove admin privileges from ${adminModal.user.email}? They will lose all admin access.`
                : `${adminModal.mode === 'grant' ? 'Grant admin access to' : 'Update admin PIN for'} ${adminModal.user.email}. Set a secure PIN they will use to log into the admin console.`}
            </p>
            {adminModal.mode !== 'revoke' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">Admin PIN</label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value)}
                  placeholder="Min 4 characters"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">This PIN is separate from the user's app password.</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setAdminModal(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleAdminAction}
                disabled={adminPinLoading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 ${adminModal.mode === 'revoke' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {adminPinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : adminModal.mode === 'revoke' ? 'Revoke' : adminModal.mode === 'grant' ? 'Grant & Set PIN' : 'Update PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
