/**
 * ============================================================================
 * COMPLETE ADMIN PANEL - USD → NGN WITH TESTING (FOR DEPLOYMENT)
 * ============================================================================
 * This panel includes LIVE rate fetching from Juicyway AND comprehensive testing
 * ============================================================================
 */

import React, { useState } from 'react'

// UPDATE THESE
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

interface TestResult {
  success: boolean
  message: string
  data?: any
  timestamp: number
}

export default function AdminUSDNGNComplete() {
  // Main functionality state
  const [loading, setLoading] = useState(false)
  const [liveRate, setLiveRate] = useState<number | null>(null)
  const [markup, setMarkup] = useState(2.0)
  const [customRate, setCustomRate] = useState<number | null>(null)
  const [status, setStatus] = useState<string>('')
  const [rawResponse, setRawResponse] = useState<any>(null)

  // Testing state
  const [showTests, setShowTests] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [allRates, setAllRates] = useState<any[]>([])
  const [testLoading, setTestLoading] = useState(false)

  // Fetch LIVE rate from Juicyway
  const fetchLiveRate = async () => {
    setLoading(true)
    setStatus('Fetching LIVE rate from Juicyway...')

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/admin/live-rate?from=USD&to=NGN`
      )

      const data = await response.json()
      console.log('📥 Response from Edge Function:', data)
      setRawResponse(data)

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch live rate')
      }

      const rate = parseFloat(data.live_rate)
      if (isNaN(rate)) {
        throw new Error('Invalid rate received')
      }

      setLiveRate(rate)

      // Auto-calculate custom rate with markup
      const calculated = rate * (1 + markup / 100)
      setCustomRate(parseFloat(calculated.toFixed(4)))

      setStatus(`✅ Live rate fetched: ${rate}`)

    } catch (error: any) {
      console.error('❌ Error:', error)
      setStatus(`❌ Error: ${error.message}`)
      setLiveRate(null)
    } finally {
      setLoading(false)
    }
  }

  // Save custom rate to database
  const saveCustomRate = async () => {
    if (!customRate || !liveRate) {
      alert('Please fetch live rate first')
      return
    }

    setLoading(true)
    setStatus('Saving custom rate to database...')

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
      )

      const data = await response.json()
      console.log('💾 Save response:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save rate')
      }

      setStatus(`✅ Saved! Users will see rate: ${customRate}`)
      alert(`Success! Custom rate ${customRate} saved for USD→NGN`)

    } catch (error: any) {
      console.error('❌ Error:', error)
      setStatus(`❌ Error: ${error.message}`)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Recalculate when markup changes
  const handleMarkupChange = (newMarkup: number) => {
    setMarkup(newMarkup)
    if (liveRate) {
      const calculated = liveRate * (1 + newMarkup / 100)
      setCustomRate(parseFloat(calculated.toFixed(4)))
    }
  }

  // ============================================================================
  // TESTING FUNCTIONS
  // ============================================================================

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [result, ...prev])
  }

  // Test 1: Direct Juicyway API test
  const testJuicywayAPI = async () => {
    setTestLoading(true)
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/test-juicyway?from=USD&to=NGN`
      )
      const data = await response.json()

      if (response.ok && data.success) {
        addTestResult({
          success: true,
          message: `✅ Juicyway API working! Rate: ${data.extracted_rate}`,
          data,
          timestamp: Date.now()
        })
      } else {
        addTestResult({
          success: false,
          message: `❌ Juicyway API failed: ${data.error || 'Unknown error'}`,
          data,
          timestamp: Date.now()
        })
      }
    } catch (error: any) {
      addTestResult({
        success: false,
        message: `❌ Network error: ${error.message}`,
        timestamp: Date.now()
      })
    } finally {
      setTestLoading(false)
    }
  }

  // Test 2: Test user-facing rate endpoint
  const testUserRateEndpoint = async () => {
    setTestLoading(true)
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/rate?from=USD&to=NGN&amount=100`
      )
      const data = await response.json()

      if (response.ok) {
        addTestResult({
          success: true,
          message: `✅ User rate endpoint working! $100 → ₦${data.amount_out?.toFixed(2)}`,
          data,
          timestamp: Date.now()
        })
      } else {
        addTestResult({
          success: false,
          message: `❌ ${data.error || 'User endpoint failed'}`,
          data,
          timestamp: Date.now()
        })
      }
    } catch (error: any) {
      addTestResult({
        success: false,
        message: `❌ Network error: ${error.message}`,
        timestamp: Date.now()
      })
    } finally {
      setTestLoading(false)
    }
  }

  // Test 3: Fetch all rates from database
  const fetchAllRates = async () => {
    setTestLoading(true)
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/admin/all-rates`
      )
      const data = await response.json()

      if (response.ok && data.success) {
        setAllRates(data.rates || [])
        addTestResult({
          success: true,
          message: `✅ Database connected! Found ${data.count} rate(s)`,
          data,
          timestamp: Date.now()
        })
      } else {
        addTestResult({
          success: false,
          message: `❌ Database error: ${data.error || 'Unknown error'}`,
          data,
          timestamp: Date.now()
        })
      }
    } catch (error: any) {
      addTestResult({
        success: false,
        message: `❌ Network error: ${error.message}`,
        timestamp: Date.now()
      })
    } finally {
      setTestLoading(false)
    }
  }

  // Test 4: Health check
  const runHealthCheck = async () => {
    setTestLoading(true)
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/juicyway-rates/admin/all-rates`
      )
      const data = await response.json()

      if (response.ok) {
        addTestResult({
          success: true,
          message: `✅ Edge Function is deployed and accessible!`,
          data: { status: 'healthy', endpoint: 'reachable' },
          timestamp: Date.now()
        })
      } else {
        addTestResult({
          success: false,
          message: `⚠️ Edge Function responded but with error: ${data.error}`,
          data,
          timestamp: Date.now()
        })
      }
    } catch (error: any) {
      addTestResult({
        success: false,
        message: `❌ Cannot reach Edge Function. Is it deployed? Error: ${error.message}`,
        timestamp: Date.now()
      })
    } finally {
      setTestLoading(false)
    }
  }

  // Test 5: Run all tests
  const runAllTests = async () => {
    setTestResults([])
    addTestResult({
      success: true,
      message: '🚀 Starting comprehensive test suite...',
      timestamp: Date.now()
    })

    await runHealthCheck()
    await new Promise(resolve => setTimeout(resolve, 1000))

    await testJuicywayAPI()
    await new Promise(resolve => setTimeout(resolve, 1000))

    await fetchAllRates()
    await new Promise(resolve => setTimeout(resolve, 1000))

    await testUserRateEndpoint()

    addTestResult({
      success: true,
      message: '✅ All tests completed!',
      timestamp: Date.now()
    })
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Exchange Rate Manager</h1>
        <p className="text-gray-600">Test: USD → NGN (Live Juicyway Rates)</p>
      </div>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm text-gray-700">System Configuration</h3>
            <p className="text-xs text-gray-500 mt-1">
              Edge Function: {SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runHealthCheck}
              disabled={testLoading}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-200 disabled:opacity-50 transition"
            >
              {testLoading ? '⏳' : '🏥'} Health Check
            </button>
            <button
              onClick={() => setShowTests(true)}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 transition"
            >
              🧪 Open Testing Panel
            </button>
          </div>
        </div>
        {testResults.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            <div className="text-xs font-semibold text-gray-600 mb-2">Latest Test Result:</div>
            <div className={`text-xs px-3 py-2 rounded ${
              testResults[0].success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {testResults[0].message}
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      {status && (
        <div className={`mb-6 p-4 rounded-lg ${
          status.startsWith('✅') ? 'bg-green-50 text-green-800' :
          status.startsWith('❌') ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {status}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
        <div className="space-y-6">

          {/* Currency Pair */}
          <div className="text-center pb-6 border-b-2 border-gray-200">
            <div className="text-5xl font-bold text-gray-800 mb-2">USD → NGN</div>
            <div className="text-gray-500">United States Dollar to Nigerian Naira</div>
          </div>

          {/* Step 1: Fetch Live Rate */}
          <div className="space-y-3">
            <label className="block text-lg font-semibold text-gray-700">
              Step 1: Fetch Live Juicyway Rate
            </label>
            <button
              onClick={fetchLiveRate}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? '⏳ Fetching...' : '🔄 Fetch Live Rate from Juicyway'}
            </button>

            {liveRate && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Juicyway Reference Rate:</div>
                <div className="text-3xl font-bold text-blue-600">
                  {liveRate.toFixed(4)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  This is the live rate from Juicyway (for reference only)
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Set Markup */}
          {liveRate && (
            <div className="space-y-3">
              <label className="block text-lg font-semibold text-gray-700">
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
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-2xl font-semibold text-center focus:border-blue-500 focus:outline-none"
                />
                <span className="text-2xl font-semibold text-gray-700">%</span>
              </div>
              <div className="text-sm text-gray-500">
                Your profit margin (e.g., 2% = you earn ₦{((liveRate * markup / 100)).toFixed(2)} per $1)
              </div>
            </div>
          )}

          {/* Step 3: Custom Rate */}
          {customRate && (
            <div className="space-y-3">
              <label className="block text-lg font-semibold text-gray-700">
                Step 3: Your Custom Rate (What Users See)
              </label>
              <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                <div className="text-sm text-gray-600 mb-2">Custom Rate:</div>
                <div className="text-5xl font-bold text-green-600 mb-2">
                  {customRate.toFixed(4)}
                </div>
                <div className="text-sm text-gray-600">
                  Calculation: {liveRate?.toFixed(4)} × (1 + {markup}%) = {customRate.toFixed(4)}
                </div>
              </div>

              {/* Manual Override */}
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Or manually set custom rate:</label>
                <input
                  type="number"
                  value={customRate}
                  onChange={(e) => setCustomRate(parseFloat(e.target.value))}
                  step="0.0001"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-xl font-mono text-center focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: Save */}
          {customRate && (
            <div className="space-y-3 pt-4 border-t-2 border-gray-200">
              <label className="block text-lg font-semibold text-gray-700">
                Step 4: Save to Database
              </label>
              <button
                onClick={saveCustomRate}
                disabled={loading}
                className="w-full bg-green-600 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? '⏳ Saving...' : '💾 Save Custom Rate'}
              </button>
              <div className="text-sm text-gray-500 text-center">
                Users will see this rate when they convert USD to NGN
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Testing Section */}
      {showTests && (
        <div className="mt-8 bg-white rounded-lg shadow-lg border-2 border-purple-200">
          <button
            onClick={() => setShowTests(false)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-purple-50 transition rounded-t-lg"
          >
            <div>
              <h2 className="text-2xl font-bold text-purple-700">🧪 Testing Panel</h2>
              <p className="text-sm text-gray-600">Test your Edge Function, Juicyway API, and database</p>
            </div>
            <span className="text-3xl text-purple-600">▼</span>
          </button>

          <div className="p-6 border-t-2 border-purple-200 space-y-6">
            {/* Quick Test Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={testJuicywayAPI}
                disabled={testLoading}
                className="bg-blue-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 transition"
              >
                🌐 Test Juicyway API
              </button>
              <button
                onClick={fetchAllRates}
                disabled={testLoading}
                className="bg-green-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 transition"
              >
                💾 Test Database
              </button>
              <button
                onClick={testUserRateEndpoint}
                disabled={testLoading}
                className="bg-orange-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 transition"
              >
                👤 Test User Endpoint
              </button>
              <button
                onClick={runAllTests}
                disabled={testLoading}
                className="bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition"
              >
                ⚡ Run All Tests
              </button>
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Test Results:</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        result.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{result.message}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        {result.data && (
                          <details className="ml-4">
                            <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-w-md">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setTestResults([])}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Clear Results
                </button>
              </div>
            )}

            {/* All Rates from Database */}
            {allRates.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Saved Rates in Database:</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Pair</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Custom Rate</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Reference Rate</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Markup</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRates.map((rate, index) => (
                        <tr key={index} className="border-t border-gray-200">
                          <td className="px-4 py-2 font-mono font-semibold">
                            {rate.from_currency} → {rate.to_currency}
                          </td>
                          <td className="px-4 py-2 font-mono text-green-600 font-bold">
                            {parseFloat(rate.custom_rate).toFixed(4)}
                          </td>
                          <td className="px-4 py-2 font-mono text-gray-600">
                            {rate.reference_rate ? parseFloat(rate.reference_rate).toFixed(4) : 'N/A'}
                          </td>
                          <td className="px-4 py-2">
                            {rate.markup_percentage ? `${rate.markup_percentage}%` : 'N/A'}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              rate.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {rate.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {new Date(rate.last_updated).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calculation Example */}
      {customRate && (
        <div className="mt-8 bg-gray-50 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3">Example: User converts $100</h3>
          <div className="space-y-2 text-gray-700">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-mono font-semibold">$100 USD</span>
            </div>
            <div className="flex justify-between">
              <span>Your Rate:</span>
              <span className="font-mono font-semibold">{customRate.toFixed(4)}</span>
            </div>
            <div className="border-t-2 border-gray-300 pt-2 mt-2 flex justify-between text-xl font-bold">
              <span>User Gets:</span>
              <span className="font-mono text-green-600">₦{(100 * customRate).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="text-sm text-gray-500 mt-3">
              Your profit: ₦{(100 * customRate - 100 * (liveRate || 0)).toFixed(2)} ({markup}%)
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {rawResponse && (
        <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
              🐛 Debug: Raw API Response
            </summary>
            <pre className="mt-4 p-4 bg-white rounded text-xs overflow-auto border border-gray-300 max-h-96">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* API Endpoints Reference */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="font-semibold mb-3 text-blue-900">📡 API Endpoints Reference</h3>
        <div className="space-y-3 text-sm">
          <div className="bg-white p-3 rounded border border-blue-100">
            <div className="font-mono text-xs text-gray-600 mb-1">Test Juicyway Direct:</div>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block overflow-x-auto">
              GET {SUPABASE_URL}/functions/v1/juicyway-rates/test-juicyway?from=USD&to=NGN
            </code>
          </div>
          <div className="bg-white p-3 rounded border border-blue-100">
            <div className="font-mono text-xs text-gray-600 mb-1">Get Live Rate (Admin):</div>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block overflow-x-auto">
              GET {SUPABASE_URL}/functions/v1/juicyway-rates/admin/live-rate?from=USD&to=NGN
            </code>
          </div>
          <div className="bg-white p-3 rounded border border-blue-100">
            <div className="font-mono text-xs text-gray-600 mb-1">Get Custom Rate (Users):</div>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block overflow-x-auto">
              GET {SUPABASE_URL}/functions/v1/juicyway-rates/rate?from=USD&to=NGN&amount=100
            </code>
          </div>
          <div className="bg-white p-3 rounded border border-blue-100">
            <div className="font-mono text-xs text-gray-600 mb-1">Get All Rates (Admin):</div>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block overflow-x-auto">
              GET {SUPABASE_URL}/functions/v1/juicyway-rates/admin/all-rates
            </code>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-4">
          💡 Tip: You can test these endpoints with curl, Postman, or your browser DevTools
        </p>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="font-semibold mb-2">ℹ️ How This Works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Click "Fetch Live Rate" to get current rate from Juicyway API</li>
          <li>Adjust markup percentage (your profit margin)</li>
          <li>Custom rate is auto-calculated (or manually edit if needed)</li>
          <li>Click "Save" to store in database</li>
          <li>Users will now see your custom rate when converting USD→NGN</li>
          <li>Use the Testing Panel to verify everything is working</li>
        </ol>
      </div>
    </div>
  )
}
