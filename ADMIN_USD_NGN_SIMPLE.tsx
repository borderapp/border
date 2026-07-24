/**
 * ============================================================================
 * SIMPLE ADMIN PANEL - USD → NGN ONLY (FOR TESTING)
 * ============================================================================
 * This simplified version tests LIVE rate fetching from Juicyway
 * ============================================================================
 */

import React, { useState } from 'react'

// UPDATE THESE
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

export default function AdminUSDNGNSimple() {
  const [loading, setLoading] = useState(false)
  const [liveRate, setLiveRate] = useState<number | null>(null)
  const [markup, setMarkup] = useState(2.0)
  const [customRate, setCustomRate] = useState<number | null>(null)
  const [status, setStatus] = useState<string>('')
  const [rawResponse, setRawResponse] = useState<any>(null)

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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Exchange Rate Manager</h1>
        <p className="text-gray-600">Test: USD → NGN (Live Juicyway Rates)</p>
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
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            🐛 Debug: Raw API Response
          </summary>
          <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </details>
      )}

      {/* Instructions */}
      <div className="mt-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="font-semibold mb-2">ℹ️ How This Works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Click "Fetch Live Rate" to get current rate from Juicyway API</li>
          <li>Adjust markup percentage (your profit margin)</li>
          <li>Custom rate is auto-calculated (or manually edit if needed)</li>
          <li>Click "Save" to store in database</li>
          <li>Users will now see your custom rate when converting USD→NGN</li>
        </ol>
      </div>
    </div>
  )
}
