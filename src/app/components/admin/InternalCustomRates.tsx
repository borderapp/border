/**
 * Internal Custom Rates Manager
 * Manages custom exchange rates stored in database (not from Juicyway API)
 * These rates show up in the user app
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomRate {
  id?: number;
  from_currency: string;
  to_currency: string;
  custom_rate: number;
  is_active: boolean;
  last_updated?: string;
  created_at?: string;
}

export default function InternalCustomRates() {
  const [activeTab, setActiveTab] = useState<'general' | 'to-ngn'>('general');
  const [rates, setRates] = useState<CustomRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    from_currency: 'USD',
    to_currency: 'NGN',
    custom_rate: '',
  });

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';

  // All supported currencies
  const currencies = ['USD', 'NGN', 'GBP', 'EUR', 'CAD', 'USDC', 'USDT'];

  // Foreign currencies (for to-NGN tab)
  const foreignCurrencies = ['USD', 'GBP', 'EUR', 'CAD', 'USDC', 'USDT'];

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/admin/all-rates`
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setRates(data.rates || []);
      } else {
        toast.error('Failed to load rates');
      }
    } catch (error: any) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const saveRate = async (rateData: CustomRate) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/admin/update-rate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_currency: rateData.from_currency,
            to_currency: rateData.to_currency,
            custom_rate: parseFloat(rateData.custom_rate.toString()),
            reference_rate: null, // Internal custom rate, no reference
            markup_percentage: 0,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(`Rate ${rateData.from_currency}→${rateData.to_currency} saved`);
        loadRates();
        setShowAddForm(false);
        setEditingId(null);
        setFormData({ from_currency: 'USD', to_currency: 'NGN', custom_rate: '' });
      } else {
        toast.error(data.message || 'Failed to save rate');
      }
    } catch (error: any) {
      toast.error('Network error');
    }
  };

  const deleteRate = async (fromCurrency: string, toCurrency: string) => {
    if (!confirm(`Delete rate ${fromCurrency}→${toCurrency}?`)) return;

    try {
      // We'll use the update endpoint to set is_active to false
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/admin/update-rate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            custom_rate: 0,
            reference_rate: null,
            markup_percentage: 0,
            is_active: false,
          }),
        }
      );

      if (response.ok) {
        toast.success('Rate deleted');
        loadRates();
      } else {
        toast.error('Failed to delete rate');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleAddRate = () => {
    if (!formData.custom_rate || parseFloat(formData.custom_rate) <= 0) {
      toast.error('Please enter a valid rate');
      return;
    }

    saveRate({
      from_currency: formData.from_currency,
      to_currency: formData.to_currency,
      custom_rate: parseFloat(formData.custom_rate),
      is_active: true,
    });
  };

  // Filter rates based on active tab
  const filteredRates = rates.filter((rate) => {
    if (activeTab === 'to-ngn') {
      return rate.to_currency === 'NGN' && rate.from_currency !== 'NGN';
    }
    return true; // Show all in general tab
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Custom Exchange Rates</h2>
          <p className="text-slate-500 mt-1">Internal rates (not from Juicyway) - shown in user app</p>
        </div>
        <button
          onClick={loadRates}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex gap-3">
        <DollarSign className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="text-sm text-purple-800">
          <p className="font-bold mb-1">Internal Custom Rates</p>
          <p>
            These rates are stored in your database and shown to users in the app.
            They are independent of Juicyway API rates.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'general'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Custom Rates
        </button>
        <button
          onClick={() => setActiveTab('to-ngn')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'to-ngn'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Foreign Currency → NGN
        </button>
      </div>

      {/* Add New Rate Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border-2 border-purple-300 shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Add New Custom Rate</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ from_currency: 'USD', to_currency: 'NGN', custom_rate: '' });
              }}
              className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">From Currency</label>
              <select
                value={formData.from_currency}
                onChange={(e) => setFormData({ ...formData, from_currency: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 transition-colors"
              >
                {activeTab === 'to-ngn'
                  ? foreignCurrencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  : currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">To Currency</label>
              <select
                value={formData.to_currency}
                onChange={(e) => setFormData({ ...formData, to_currency: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 transition-colors"
                disabled={activeTab === 'to-ngn'}
              >
                {activeTab === 'to-ngn' ? (
                  <option value="NGN">NGN</option>
                ) : (
                  currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Exchange Rate</label>
              <input
                type="number"
                value={formData.custom_rate}
                onChange={(e) => setFormData({ ...formData, custom_rate: e.target.value })}
                placeholder="1650.00"
                step="0.01"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleAddRate}
              className="flex-1 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Custom Rate
            </button>
          </div>
        </div>
      )}

      {/* Add Rate Button */}
      {!showAddForm && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setShowAddForm(true);
              if (activeTab === 'to-ngn') {
                setFormData({ ...formData, to_currency: 'NGN' });
              }
            }}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Custom Rate
          </button>
        </div>
      )}

      {/* Rates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                {activeTab === 'general' ? 'All Custom Rates' : 'Foreign Currency → NGN Rates'}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {filteredRates.length} rate{filteredRates.length !== 1 ? 's' : ''} configured
              </p>
            </div>
          </div>
        </div>

        {filteredRates.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No custom rates yet</p>
            <p className="text-sm text-slate-400 mt-2">
              Click "Add Custom Rate" to create your first rate
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
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Last Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRates.map((rate) => (
                  <tr key={`${rate.from_currency}-${rate.to_currency}`} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">
                        {rate.from_currency} → {rate.to_currency}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-purple-600 text-lg">
                        {parseFloat(rate.custom_rate.toString()).toFixed(4)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                          rate.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <CheckCircle className="w-3 h-3" />
                        {rate.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {rate.last_updated ? new Date(rate.last_updated).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(rate.id || null);
                            setFormData({
                              from_currency: rate.from_currency,
                              to_currency: rate.to_currency,
                              custom_rate: rate.custom_rate.toString(),
                            });
                            setShowAddForm(true);
                          }}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRate(rate.from_currency, rate.to_currency)}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        <h3 className="font-bold text-slate-900 mb-4">How It Works</h3>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              1
            </span>
            <p>
              <strong>Create custom rates:</strong> Set your own exchange rates independent of
              Juicyway
            </p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            <p>
              <strong>Users see these rates:</strong> These rates appear in the user app when
              converting currencies
            </p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              3
            </span>
            <p>
              <strong>Foreign → NGN special:</strong> Use the "Foreign Currency → NGN" tab for
              rates when converting foreign currencies to Naira
            </p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              4
            </span>
            <p>
              <strong>Update anytime:</strong> Edit or delete rates at any time - changes take
              effect immediately
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
