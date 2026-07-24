import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { supabase } from '@/lib/supabase';
import { 
  CreditCard, Search, Filter, RefreshCw, Loader2, 
  Smartphone, Eye, Lock, Unlock, TrendingUp, DollarSign,
  ShoppingBag, Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCards() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [stats, setStats] = useState({
    totalCards: 0,
    activeCards: 0,
    virtualCards: 0,
    physicalCards: 0,
    totalSpend: 0
  });

  useEffect(() => {
    fetchCards();

    // Real-time subscription
    const subscription = supabase
      .channel('admin-cards')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'cards' }, 
        (payload) => {
          fetchCards();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cards')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCards(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const active = data?.filter((c: any) => c.status === 'active').length || 0;
      const virtual = data?.filter((c: any) => c.card_type === 'virtual').length || 0;
      const physical = data?.filter((c: any) => c.card_type === 'physical').length || 0;

      setStats({
        totalCards: total,
        activeCards: active,
        virtualCards: virtual,
        physicalCards: physical,
        totalSpend: 0 // This would come from transaction aggregation
      });

      toast.success('Cards refreshed');
    } catch (error: any) {
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter(card => {
    const matchesType = filterType === 'all' || card.card_type === filterType;
    const matchesSearch = 
      card.card_number?.includes(searchQuery) ||
      card.card_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'frozen': return 'bg-blue-100 text-blue-700';
      case 'blocked': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getCardIcon = (type: string) => {
    return type === 'virtual' ? (
      <Smartphone className="w-4 h-4" />
    ) : (
      <CreditCard className="w-4 h-4" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Cards</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCards}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Active</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeCards}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Unlock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Virtual</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.virtualCards}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Physical</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.physicalCards}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Cards & POS Management</CardTitle>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchCards}
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
                placeholder="Search by card number, name, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="all">All Types</option>
                <option value="virtual">Virtual</option>
                <option value="physical">Physical</option>
              </select>
            </div>
          </div>

          {/* Cards Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No cards found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Card</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">User</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Currency</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Created</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.map((card) => (
                    <tr key={card.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            card.card_type === 'virtual' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {getCardIcon(card.card_type)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{card.card_name}</p>
                            <p className="text-xs text-slate-500 font-mono">•••• {card.card_number?.slice(-4)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-900">{card.profiles?.first_name} {card.profiles?.last_name}</p>
                        <p className="text-xs text-slate-500">{card.profiles?.email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-900 capitalize">{card.card_type}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-slate-900">{card.currency}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={`${getStatusColor(card.status)} border-0`}>
                          {card.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-900">
                          {new Date(card.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
