import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Edit,
  Save,
  X,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Upload,
} from 'lucide-react';
import juicywayRates, { 
  publishCustomRate, 
  getAllCustomRates, 
  revokeCustomRate,
  publishBulkRates,
  type CustomRate 
} from '@/utils/juicyway-rates';

export default function CustomRatesManager() {
  const [customRates, setCustomRates] = useState<CustomRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [newRate, setNewRate] = useState('');
  const [validFor, setValidFor] = useState('60');
  
  // New rate form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPairFrom, setNewPairFrom] = useState<'USDC' | 'USDT' | 'USD'>('USDC');
  const [newPairTo, setNewPairTo] = useState<'NGN' | 'USD' | 'GBP' | 'EUR'>('NGN');
  const [newPairRate, setNewPairRate] = useState('');
  const [newPairDuration, setNewPairDuration] = useState('60');

  useEffect(() => {
    loadCustomRates();
    const interval = setInterval(loadCustomRates, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadCustomRates = () => {
    const rates = getAllCustomRates();
    setCustomRates(rates);
  };

  const handlePublish = async (from: string, to: string, rate: number, duration: number) => {
    setPublishing(true);
    try {
      await publishCustomRate(
        from as any,
        to as any,
        rate,
        duration,
        'admin' // TODO: Get actual admin user ID
      );
      
      alert('✅ Custom rate published successfully!');
      loadCustomRates();
      setEditingPair(null);
      setShowNewForm(false);
    } catch (error) {
      alert('❌ Failed to publish rate: ' + error);
    } finally {
      setPublishing(false);
    }
  };

  const handleRevoke = async (pair: string) => {
    if (!confirm(`Revoke custom rate for ${pair}?`)) return;
    
    const [from, to] = pair.split('_');
    setLoading(true);
    try {
      await revokeCustomRate(from as any, to as any);
      alert('✅ Custom rate revoked successfully!');
      loadCustomRates();
    } catch (error) {
      alert('❌ Failed to revoke rate: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPublish = async () => {
    if (!confirm('Publish all common rates?')) return;
    
    const bulkRates = [
      { from: 'USDC' as const, to: 'NGN' as const, rate: 1680.00 },
      { from: 'USDT' as const, to: 'NGN' as const, rate: 1675.00 },
      { from: 'USDC' as const, to: 'USD' as const, rate: 1.00 },
      { from: 'USD' as const, to: 'GBP' as const, rate: 0.79 },
      { from: 'USD' as const, to: 'EUR' as const, rate: 0.92 },
    ];

    setPublishing(true);
    try {
      const results = await publishBulkRates(bulkRates, 120, 'admin');
      alert(`✅ Published ${results.length} rates successfully!`);
      loadCustomRates();
    } catch (error) {
      alert('❌ Bulk publish failed: ' + error);
    } finally {
      setPublishing(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Custom FX Rates</h2>
          <p className="text-slate-500 mt-1">Publish and manage your own exchange rates to Juicyway</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBulkPublish}
            disabled={publishing}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Publish
          </button>
          <button
            onClick={() => setShowNewForm(true)}
            disabled={publishing}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Rate
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-bold mb-1">Write Rates API Active</p>
          <p>
            Custom rates published here will override Juicyway's wholesale rates and be used for all transactions.
            Set competitive rates to maximize profit while remaining competitive.
          </p>
        </div>
      </div>

      {/* New Rate Form */}
      {showNewForm && (
        <div className="bg-white rounded-2xl border-2 border-blue-300 shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Publish New Custom Rate</h3>
            <button
              onClick={() => setShowNewForm(false)}
              className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                From Currency
              </label>
              <select
                value={newPairFrom}
                onChange={(e) => setNewPairFrom(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
              >
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                To Currency
              </label>
              <select
                value={newPairTo}
                onChange={(e) => setNewPairTo(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
              >
                <option value="NGN">NGN (Nigerian Naira)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Exchange Rate
              </label>
              <input
                type="number"
                value={newPairRate}
                onChange={(e) => setNewPairRate(e.target.value)}
                placeholder="1650.00"
                step="0.01"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">
                1 {newPairFrom} = {newPairRate || '0.00'} {newPairTo}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Valid For (minutes)
              </label>
              <select
                value={newPairDuration}
                onChange={(e) => setNewPairDuration(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
                <option value="480">8 hours</option>
                <option value="1440">24 hours</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              const rate = parseFloat(newPairRate);
              const duration = parseInt(newPairDuration);
              if (!rate || rate <= 0) {
                alert('Please enter a valid rate');
                return;
              }
              handlePublish(newPairFrom, newPairTo, rate, duration);
            }}
            disabled={publishing}
            className="w-full mt-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {publishing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Publish Rate to Juicyway
              </>
            )}
          </button>
        </div>
      )}

      {/* Active Custom Rates */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Active Custom Rates</h3>
              <p className="text-sm text-slate-600 mt-1">
                {customRates.length} rate{customRates.length !== 1 ? 's' : ''} currently published
              </p>
            </div>
            <button
              onClick={loadCustomRates}
              disabled={loading}
              className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {customRates.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No custom rates published yet</p>
            <p className="text-sm text-slate-400 mt-2">
              Click "New Rate" to publish your first custom exchange rate
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Pair</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Expires In</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Published</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customRates.map((rate) => (
                  <tr key={rate.pair} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{rate.pair}</span>
                    </td>
                    <td className="px-6 py-4">
                      {editingPair === rate.pair ? (
                        <input
                          type="number"
                          value={newRate}
                          onChange={(e) => setNewRate(e.target.value)}
                          className="w-32 px-3 py-2 bg-white border-2 border-blue-500 rounded-lg font-mono outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="font-mono font-bold text-blue-600">
                          {rate.rate.toFixed(4)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {formatTime(rate.validUntil)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(rate.publishedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {editingPair === rate.pair ? (
                          <>
                            <button
                              onClick={() => {
                                const updatedRate = parseFloat(newRate);
                                if (!updatedRate || updatedRate <= 0) {
                                  alert('Invalid rate');
                                  return;
                                }
                                const [from, to] = rate.pair.split('_');
                                const duration = parseInt(validFor);
                                handlePublish(from, to, updatedRate, duration);
                              }}
                              disabled={publishing}
                              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingPair(null);
                                setNewRate('');
                              }}
                              className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingPair(rate.pair);
                                setNewRate(rate.rate.toString());
                              }}
                              disabled={publishing}
                              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRevoke(rate.pair)}
                              disabled={loading}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage Info */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4">How Custom Rates Work</h3>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <p>
              <strong>Publish rates:</strong> Set your own exchange rates that override Juicyway's wholesale rates
            </p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <p>
              <strong>Automatic sync:</strong> Rates are pushed to Juicyway immediately and used for all transactions
            </p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <p>
              <strong>Time-limited:</strong> Set expiry times (1-24 hours) to manage rate volatility
            </p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <p>
              <strong>Update anytime:</strong> Edit or revoke rates at any time to respond to market changes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
