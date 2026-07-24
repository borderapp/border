/**
 * ============================================================================
 * BORDER - ADMIN RATE MANAGEMENT COMPONENT
 * ============================================================================
 * This component allows admins to:
 *   1. View Juicyway reference rates (live from Juicyway API)
 *   2. Set custom rates (reference rate + markup) that users will see
 *   3. Save custom rates to database
 * 
 * Usage: Integrate this into your admin dashboard
 * ============================================================================
 */

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface ExchangeRate {
  id: string
  from_currency: string
  to_currency: string
  custom_rate: number
  reference_rate: number | null
  markup_percentage: number
  is_active: boolean
  last_updated: string
}

interface RateRowProps {
  fromCurrency: string
  toCurrency: string
  customRate?: ExchangeRate
  onUpdate: () => void
}

const RateRow: React.FC<RateRowProps> = ({ fromCurrency, toCurrency, customRate, onUpdate }) => {
  const [loading, setLoading] = useState(false)
  const [juicywayRate, setJuicywayRate] = useState<number | null>(null)
  const [markupPercentage, setMarkupPercentage] = useState(customRate?.markup_percentage || 2.0)
  const [customRateValue, setCustomRateValue] = useState(customRate?.custom_rate || 0)

  // Fetch Juicyway reference rate
  const fetchJuicywayRate = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/juicyway-rates/admin/juicyway-reference?from=${fromCurrency}&to=${toCurrency}`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
          }
        }
      )
      
      if (!response.ok) throw new Error('Failed to fetch Juicyway rate')
      
      const data = await response.json()
      setJuicywayRate(data.reference_rate)
      
      // Auto-calculate custom rate with markup
      const calculatedRate = data.reference_rate * (1 + markupPercentage / 100)
      setCustomRateValue(parseFloat(calculatedRate.toFixed(8)))
      
    } catch (error) {
      console.error('Error fetching Juicyway rate:', error)
      alert('Failed to fetch Juicyway rate. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  // Save custom rate to database
  const saveCustomRate = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/juicyway-rates/admin/update-rate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            custom_rate: customRateValue,
            reference_rate: juicywayRate,
            markup_percentage: markupPercentage,
          })
        }
      )
      
      if (!response.ok) throw new Error('Failed to save rate')
      
      alert(`✅ Saved: ${fromCurrency}/${toCurrency} = ${customRateValue}`)
      onUpdate()
      
    } catch (error) {
      console.error('Error saving rate:', error)
      alert('Failed to save rate. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  // Recalculate custom rate when markup changes
  const handleMarkupChange = (newMarkup: number) => {
    setMarkupPercentage(newMarkup)
    if (juicywayRate) {
      const calculatedRate = juicywayRate * (1 + newMarkup / 100)
      setCustomRateValue(parseFloat(calculatedRate.toFixed(8)))
    }
  }

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3 font-medium">{fromCurrency}</td>
      <td className="px-4 py-3 font-medium">{toCurrency}</td>
      
      {/* Juicyway Reference Rate */}
      <td className="px-4 py-3">
        {juicywayRate ? (
          <span className="text-blue-600 font-mono">{juicywayRate.toFixed(4)}</span>
        ) : (
          <button
            onClick={fetchJuicywayRate}
            disabled={loading}
            className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch Rate'}
          </button>
        )}
      </td>
      
      {/* Markup % */}
      <td className="px-4 py-3">
        <input
          type="number"
          value={markupPercentage}
          onChange={(e) => handleMarkupChange(parseFloat(e.target.value))}
          step="0.1"
          className="w-20 px-2 py-1 border rounded text-center"
        />
        <span className="ml-1">%</span>
      </td>
      
      {/* Custom Rate (what users see) */}
      <td className="px-4 py-3">
        <input
          type="number"
          value={customRateValue}
          onChange={(e) => setCustomRateValue(parseFloat(e.target.value))}
          step="0.00000001"
          className="w-32 px-2 py-1 border rounded font-mono"
        />
      </td>
      
      {/* Current DB Rate */}
      <td className="px-4 py-3 text-gray-500 font-mono text-sm">
        {customRate ? customRate.custom_rate.toFixed(4) : '-'}
      </td>
      
      {/* Actions */}
      <td className="px-4 py-3">
        <button
          onClick={saveCustomRate}
          disabled={loading || !customRateValue}
          className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  )
}

export default function AdminRateManagement() {
  const [customRates, setCustomRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)

  // Currency pairs to manage
  const currencyPairs = [
    { from: 'USD', to: 'NGN' },
    { from: 'USD', to: 'GHS' },
    { from: 'USD', to: 'KES' },
    { from: 'USD', to: 'ZAR' },
    { from: 'USD', to: 'GBP' },
    { from: 'USD', to: 'EUR' },
    { from: 'GBP', to: 'NGN' },
    { from: 'GBP', to: 'USD' },
    { from: 'GBP', to: 'EUR' },
    { from: 'EUR', to: 'NGN' },
    { from: 'EUR', to: 'USD' },
    { from: 'EUR', to: 'GBP' },
    { from: 'USDT', to: 'NGN' },
    { from: 'USDC', to: 'NGN' },
    { from: 'USD', to: 'USDT' },
    { from: 'USD', to: 'USDC' },
  ]

  // Fetch all custom rates from database
  const fetchCustomRates = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/juicyway-rates/admin/all-rates`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
          }
        }
      )
      
      if (!response.ok) throw new Error('Failed to fetch custom rates')
      
      const data = await response.json()
      setCustomRates(data.rates || [])
      
    } catch (error) {
      console.error('Error fetching custom rates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomRates()
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Exchange Rate Management</h1>
        <p className="text-gray-600">
          Set custom rates that users see in the app. Fetch Juicyway reference rates, add your markup, and save.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">From</th>
              <th className="px-4 py-3 text-left">To</th>
              <th className="px-4 py-3 text-left">Juicyway Rate</th>
              <th className="px-4 py-3 text-left">Markup</th>
              <th className="px-4 py-3 text-left">Custom Rate</th>
              <th className="px-4 py-3 text-left">Current DB</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currencyPairs.map((pair) => {
              const existingRate = customRates.find(
                (r) => r.from_currency === pair.from && r.to_currency === pair.to
              )
              return (
                <RateRow
                  key={`${pair.from}_${pair.to}`}
                  fromCurrency={pair.from}
                  toCurrency={pair.to}
                  customRate={existingRate}
                  onUpdate={fetchCustomRates}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Click "Fetch Rate" to get the current Juicyway reference rate (live)</li>
          <li>Adjust the markup percentage (default 2%)</li>
          <li>The custom rate is auto-calculated (Juicyway rate + markup)</li>
          <li>You can manually adjust the custom rate if needed</li>
          <li>Click "Save" to store the custom rate in the database</li>
          <li>Users will see this custom rate in the app when they convert currencies</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold mb-2">⚠️ Important Notes:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li><strong>Juicyway rates are REFERENCE ONLY</strong> - they are not shown to users</li>
          <li><strong>Custom rates are what USERS SEE</strong> - these are stored in your database</li>
          <li>Juicyway API requires NO authentication (confirmed by Juicyway)</li>
          <li>You control your profit margin via the markup percentage</li>
          <li>Update rates regularly to stay competitive</li>
        </ul>
      </div>
    </div>
  )
}
