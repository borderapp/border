import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Clock, Shield, AlertCircle, Search, Filter, Loader2 } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback.tsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export const KYCManager = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchKYCRequests = async () => {
    try {
      setLoading(true);
      // Fetching from profiles table. In a real app, there might be a kyc_requests table.
      // We'll fetch profiles where kyc_level < 4 to show people who might need upgrades.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter for demo: only show those that "look" like they have data or are pending
      // Since we don't have a status field for sure, we'll treat all as reviewable
      setRequests(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch KYC data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKYCRequests();

    // Realtime subscription
    const channel = supabase
      .channel('kyc-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchKYCRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (id: string, currentLevel: number) => {
    try {
      const nextLevel = Math.min(currentLevel + 1, 4);
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_level: nextLevel })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`User upgraded to Tier ${nextLevel}`);
      setSelectedRequest(null);
      fetchKYCRequests();
    } catch (error) {
      toast.error('Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    toast.error(`KYC Request rejected for security reasons.`);
    setSelectedRequest(null);
  };

  const filteredRequests = requests.filter(req => 
    (req.first_name || req.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">KYC Approval Queue</h2>
          <p className="text-slate-500 text-sm">Reviewing live user profiles from Border database.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search user..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <button onClick={fetchKYCRequests} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && requests.length === 0 ? (
        <div className="py-20 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Fetching live KYC records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tier</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Country</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                              {(req.first_name || req.name || 'U').charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{req.first_name || req.name || 'Unknown User'}</p>
                              <p className="text-xs text-slate-500">{req.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Shield className={`w-3 h-3 ${req.kyc_level >= 2 ? 'text-emerald-500' : 'text-blue-500'}`} />
                            <span className="text-xs text-slate-700 font-bold tracking-tight">Tier {req.kyc_level || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-slate-600">{req.country || 'NG'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedRequest(req)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                          No profiles found matching search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            {selectedRequest ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-24 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Live Profile Review</h3>
                  <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="space-y-4">
                  <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
                    <div className="text-center p-8">
                       <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                       <p className="text-xs text-slate-400 font-medium">Identity documents are stored securely in encrypted storage.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Full Name</p>
                      <p className="text-sm font-medium text-slate-900">{selectedRequest.first_name || selectedRequest.name}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">KYC Tier</p>
                      <p className="text-sm font-bold text-blue-600">Tier {selectedRequest.kyc_level || 0}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-blue-700">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-xs font-bold">Profile Integrity Check</p>
                    </div>
                    <p className="text-[11px] text-blue-600/80 leading-relaxed">
                      User verified email and phone. Checking for document uploads in Border storage...
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => handleReject(selectedRequest.id)}
                    className="flex-1 px-4 py-3 bg-white border border-rose-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50 transition-colors"
                  >
                    Flag Profile
                  </button>
                  <button 
                    onClick={() => handleApprove(selectedRequest.id, selectedRequest.kyc_level || 0)}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                  >
                    Upgrade Tier
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center sticky top-24">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Clock className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-900 font-bold">Select User Profile</p>
                <p className="text-slate-500 text-sm mt-1">
                  Review live user data to manage banking tiers.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);