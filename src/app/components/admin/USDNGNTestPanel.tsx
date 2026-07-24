/**
 * USD→NGN Exchange Rate Testing Panel
 * Integrated into Admin Dashboard
 */

import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Database, Eye, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  timestamp: number;
}

export default function USDNGNTestPanel() {
  // Main functionality state
  const [loading, setLoading] = useState(false);
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [rawRate, setRawRate] = useState<number | null>(null);
  const [markup, setMarkup] = useState(2.0);
  const [customRate, setCustomRate] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');

  // Testing state
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [allRates, setAllRates] = useState<any[]>([]);
  const [testLoading, setTestLoading] = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';

  // Fetch LIVE rate from Juicyway
  const fetchLiveRate = async () => {
    setLoading(true);
    setStatus('Fetching LIVE rate from Juicyway...');

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/admin/live-rate?from=USD&to=NGN`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch live rate');
      }

      const rate = parseFloat(data.live_rate);
      const raw = data.raw_rate ? parseFloat(data.raw_rate) : null;

      if (isNaN(rate)) {
        throw new Error('Invalid rate received');
      }

      setLiveRate(rate);
      setRawRate(raw);

      // Auto-calculate custom rate with markup
      const calculated = rate * (1 + markup / 100);
      setCustomRate(parseFloat(calculated.toFixed(4)));

      setStatus(`✅ Live rate fetched: ${rate}`);
      toast.success(`Fetched live rate: ${rate}`);

    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      toast.error(`Failed to fetch rate: ${error.message}`);
      setLiveRate(null);
    } finally {
      setLoading(false);
    }
  };

  // Save custom rate to database
  const saveCustomRate = async () => {
    if (!customRate || !liveRate) {
      toast.error('Please fetch live rate first');
      return;
    }

    setLoading(true);
    setStatus('Saving custom rate to database...');

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/admin/update-rate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from_currency: 'USD',
            to_currency: 'NGN',
            custom_rate: customRate,
            reference_rate: liveRate,
            markup_percentage: markup,
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save rate');
      }

      setStatus(`✅ Saved! Users will see rate: ${customRate}`);
      toast.success(`Custom rate ${customRate} saved for USD→NGN`);

    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate when markup changes
  const handleMarkupChange = (newMarkup: number) => {
    setMarkup(newMarkup);
    if (liveRate) {
      const calculated = liveRate * (1 + newMarkup / 100);
      setCustomRate(parseFloat(calculated.toFixed(4)));
    }
  };

  // Testing functions
  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [result, ...prev]);
  };

  const testJuicywayAPI = async () => {
    setTestLoading(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/test-juicyway?from=USD&to=NGN`
      );
      const data = await response.json();

      if (response.ok && data.success) {
        addTestResult({
          success: true,
          message: `✅ Juicyway API working! Rate: ${data.extracted_rate}`,
          data,
          timestamp: Date.now()
        });
        toast.success('Juicyway API test passed');
      } else {
        addTestResult({
          success: false,
          message: `❌ Juicyway API failed: ${data.error || 'Unknown error'}`,
          data,
          timestamp: Date.now()
        });
        toast.error('Juicyway API test failed');
      }
    } catch (error: any) {
      addTestResult({
        success: false,
        message: `❌ Network error: ${error.message}`,
        timestamp: Date.now()
      });
      toast.error('Network error');
    } finally {
      setTestLoading(false);
    }
  };

  const testUserRateEndpoint = async () => {
    setTestLoading(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/rate?from=USD&to=NGN&amount=100`
      );
      const data = await response.json();

      if (response.ok) {
        addTestResult({
          success: true,
          message: `✅ User rate endpoint working! $100 → ₦${data.amount_out?.toFixed(2)}`,
          data,
          timestamp: Date.now()
        });
        toast.success('User endpoint test passed');
      } else {
        addTestResult({
          success: false,
          message: `❌ ${data.error || 'User endpoint failed'}`,
          data,
          timestamp: Date.now()
        });
        toast.error('User endpoint test failed');
      }
    } catch (error: any) {
      addTestResult({
        success: false,
        message: `❌ Network error: ${error.message}`,
        timestamp: Date.now()
      });
      toast.error('Network error');
    } finally {
      setTestLoading(false);
    }
  };

  const fetchAllRates = async () => {
    setTestLoading(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/admin/all-rates`
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setAllRates(data.rates || []);
        addTestResult({
          success: true,
          message: `✅ Database connected! Found ${data.count} rate(s)`,
          data,
          timestamp: Date.now()
        });
        toast.success(`Found ${data.count} rate(s) in database`);
      } else {
        addTestResult({
          success: false,
          message: `❌ Database error: ${data.error || 'Unknown error'}`,
          data,
          timestamp: Date.now()
        });
        toast.error('Database test failed');
      }
    } catch (error: any) {
      addTestResult({
        success: false,
        message: `❌ Network error: ${error.message}`,
        timestamp: Date.now()
      });
      toast.error('Network error');
    } finally {
      setTestLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    toast.info('Running all tests...');

    await testJuicywayAPI();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await fetchAllRates();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testUserRateEndpoint();

    toast.success('All tests completed!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">USD → NGN Testing Panel</h2>
        <p className="text-slate-500 mt-1">Test live rate fetching, saving, and database operations</p>
      </div>

      {/* Status Banner */}
      {status && (
        <div className={`p-4 rounded-xl ${
          status.startsWith('✅') ? 'bg-green-50 text-green-800 border-2 border-green-200' :
          status.startsWith('❌') ? 'bg-red-50 text-red-800 border-2 border-red-200' :
          'bg-blue-50 text-blue-800 border-2 border-blue-200'
        }`}>
          {status}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Rate Management */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-6">
          <div className="text-center pb-6 border-b-2 border-slate-200">
            <div className="text-4xl font-bold text-slate-800 mb-2">USD → NGN</div>
            <div className="text-slate-500">Live Rate Management</div>
          </div>

          {/* Fetch Live Rate */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700">
              Step 1: Fetch Live Juicyway Rate
            </label>
            <button
              onClick={fetchLiveRate}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl text-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Fetching...' : 'Fetch Live Rate'}
            </button>

            {liveRate && (
              <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200 space-y-2">
                <div>
                  <div className="text-sm text-slate-600 mb-1">Converted Rate:</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {liveRate.toFixed(4)}
                  </div>
                </div>
                {rawRate && (
                  <div className="pt-2 border-t border-blue-200">
                    <div className="text-xs text-slate-500">Raw Rate (kobo/cents):</div>
                    <div className="text-sm font-mono text-slate-600">
                      {rawRate.toFixed(2)} ÷ 100 = {liveRate.toFixed(4)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Set Markup */}
          {liveRate && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700">
                Step 2: Set Your Markup
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={markup}
                  onChange={(e) => handleMarkupChange(parseFloat(e.target.value))}
                  step="0.1"
                  min="0"
                  max="100"
                  className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl text-xl font-semibold text-center focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xl font-semibold text-slate-700">%</span>
              </div>
              <div className="text-sm text-slate-500">
                Profit: ₦{((liveRate * markup / 100)).toFixed(2)} per $1
              </div>
            </div>
          )}

          {/* Custom Rate */}
          {customRate && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700">
                Step 3: Your Custom Rate
              </label>
              <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200">
                <div className="text-sm text-slate-600 mb-2">Custom Rate:</div>
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {customRate.toFixed(4)}
                </div>
                <div className="text-sm text-slate-600">
                  {liveRate?.toFixed(4)} × (1 + {markup}%)
                </div>
              </div>
            </div>
          )}

          {/* Save */}
          {customRate && (
            <div className="space-y-3 pt-4 border-t-2 border-slate-200">
              <button
                onClick={saveCustomRate}
                disabled={loading}
                className="w-full bg-green-600 text-white px-6 py-4 rounded-xl text-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <Database className="w-5 h-5" />
                {loading ? 'Saving...' : 'Save to Database'}
              </button>
            </div>
          )}
        </div>

        {/* Right: Testing */}
        <div className="bg-white rounded-2xl border-2 border-purple-200 p-6 space-y-6">
          <div className="pb-4 border-b-2 border-purple-200">
            <h3 className="text-xl font-bold text-purple-700 flex items-center gap-2">
              <Zap className="w-6 h-6" />
              API Testing
            </h3>
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={testJuicywayAPI}
              disabled={testLoading}
              className="bg-blue-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 transition text-sm"
            >
              🌐 Test API
            </button>
            <button
              onClick={fetchAllRates}
              disabled={testLoading}
              className="bg-green-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 transition text-sm"
            >
              💾 Test DB
            </button>
            <button
              onClick={testUserRateEndpoint}
              disabled={testLoading}
              className="bg-orange-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition text-sm"
            >
              👤 User API
            </button>
            <button
              onClick={runAllTests}
              disabled={testLoading}
              className="bg-purple-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition text-sm"
            >
              ⚡ Run All
            </button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-700">Test Results:</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 text-sm ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="font-semibold">{result.message}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setTestResults([])}
                className="text-sm text-slate-600 hover:text-slate-800 underline"
              >
                Clear Results
              </button>
            </div>
          )}

          {/* Database Rates */}
          {allRates.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-700">Database Rates:</h4>
              <div className="space-y-2">
                {allRates.map((rate, index) => (
                  <div key={index} className="bg-slate-50 p-3 rounded-lg text-sm">
                    <div className="flex justify-between font-semibold">
                      <span>{rate.from_currency} → {rate.to_currency}</span>
                      <span className="text-green-600">{parseFloat(rate.custom_rate).toFixed(4)}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Updated: {new Date(rate.last_updated).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
