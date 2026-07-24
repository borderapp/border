// Juicyway API Diagnostic Test Script
// Tests all API endpoints to identify errors

const PRODUCTION_URL = 'https://api.spendjuice.com'
const RATES_KEY = '1PR/s5jPV2i0RIdGsORlKVRjI7pslC7LA8ml5LqS80wSN+VgJuTtpac7NOXgc9NCQEki3yeArjy4eQEtdk4kQA=='
const OPERATIONS_KEY = 's99GKOdPoji4ue0rYMqjNjfHSkU/Ubk1+nbn78ox1+VpIX7hqOn8blLkJI201f+mEBrN/GbTypE7nbcr5rDKVg=='

console.log('🧪 Starting Juicyway API Diagnostic Tests...\n')
console.log(`Base URL: ${PRODUCTION_URL}\n`)

// Test 1: Exchange Rate Quote (POST /exchange/swap with dry_run)
async function testExchangeRate() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 TEST 1: Exchange Rate Quote (POST /exchange/swap)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const endpoint = `${PRODUCTION_URL}/exchange/swap`
  const payload = {
    source_currency: 'USD',
    target_currency: 'NGN',
    amount: 100,
    dry_run: true
  }

  console.log(`Endpoint: ${endpoint}`)
  console.log(`Payload:`, JSON.stringify(payload, null, 2))

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RATES_KEY}`,
        'X-API-Key': RATES_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    console.log(`\nResponse Status: ${response.status} ${response.statusText}`)
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()))

    const data = await response.json()
    console.log('Response Body:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('✅ SUCCESS: Exchange rate fetched')
    } else {
      console.log('❌ FAILED: Exchange rate request failed')
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message)
  }
  console.log('\n')
}

// Test 2: Payout (POST /payouts)
async function testPayout() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('💸 TEST 2: Payout (POST /payouts)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const endpoint = `${PRODUCTION_URL}/payouts`
  const payload = {
    source_currency: 'USD',
    destination_currency: 'NGN',
    amount: 10,
    beneficiary: {
      name: 'Test User',
      account_number: '0123456789',
      bank_code: '044',
      bank_name: 'Access Bank',
      country: 'NG',
    },
    purpose: 'Test Payment'
  }

  console.log(`Endpoint: ${endpoint}`)
  console.log(`Payload:`, JSON.stringify(payload, null, 2))

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPERATIONS_KEY}`,
        'X-API-Key': OPERATIONS_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    console.log(`\nResponse Status: ${response.status} ${response.statusText}`)

    const data = await response.json()
    console.log('Response Body:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('✅ SUCCESS: Payout created')
    } else {
      console.log('❌ FAILED: Payout creation failed')
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message)
  }
  console.log('\n')
}

// Test 3: On-Ramp (POST /exchange/swap - Fiat to Crypto)
async function testOnRamp() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('💵 TEST 3: On-Ramp (POST /exchange/swap)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const endpoint = `${PRODUCTION_URL}/exchange/swap`
  const payload = {
    source_currency: 'NGN',
    target_currency: 'USDT',
    amount: 10000,
    payment_method: 'bank_transfer'
  }

  console.log(`Endpoint: ${endpoint}`)
  console.log(`Payload:`, JSON.stringify(payload, null, 2))

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPERATIONS_KEY}`,
        'X-API-Key': OPERATIONS_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    console.log(`\nResponse Status: ${response.status} ${response.statusText}`)

    const data = await response.json()
    console.log('Response Body:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('✅ SUCCESS: On-ramp initiated')
    } else {
      console.log('❌ FAILED: On-ramp failed')
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message)
  }
  console.log('\n')
}

// Test 4: Alternative Rate Endpoint (GET /exchange/quote)
async function testQuoteEndpoint() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📈 TEST 4: Quote Endpoint (GET /exchange/quote)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Try various possible rate endpoints
  const endpoints = [
    `${PRODUCTION_URL}/exchange/quote?from=USD&to=NGN`,
    `${PRODUCTION_URL}/exchange/rates?from=USD&to=NGN`,
    `${PRODUCTION_URL}/rates?from=USD&to=NGN`,
    `${PRODUCTION_URL}/v1/exchange/rates?from=USD&to=NGN`,
  ]

  for (const endpoint of endpoints) {
    console.log(`\nTrying: ${endpoint}`)

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RATES_KEY}`,
          'X-API-Key': RATES_KEY,
          'Content-Type': 'application/json',
        }
      })

      console.log(`Response Status: ${response.status} ${response.statusText}`)

      if (response.status !== 404) {
        const data = await response.json()
        console.log('Response Body:', JSON.stringify(data, null, 2))

        if (response.ok) {
          console.log('✅ SUCCESS: This endpoint works!')
          break
        }
      }
    } catch (error: any) {
      console.log('❌ ERROR:', error.message)
    }
  }
  console.log('\n')
}

// Test 5: Check API Base Connectivity
async function testBaseConnectivity() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌐 TEST 5: Base API Connectivity')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const endpoints = [
    `${PRODUCTION_URL}/`,
    `${PRODUCTION_URL}/health`,
    `${PRODUCTION_URL}/status`,
    `${PRODUCTION_URL}/v1/`,
  ]

  for (const endpoint of endpoints) {
    console.log(`\nTrying: ${endpoint}`)

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RATES_KEY}`,
          'X-API-Key': RATES_KEY,
        }
      })

      console.log(`Response Status: ${response.status} ${response.statusText}`)

      if (response.status !== 404) {
        try {
          const data = await response.json()
          console.log('Response Body:', JSON.stringify(data, null, 2))
        } catch {
          const text = await response.text()
          console.log('Response Body:', text)
        }
      }
    } catch (error: any) {
      console.log('❌ ERROR:', error.message)
    }
  }
  console.log('\n')
}

// Run all tests
async function runAllTests() {
  await testBaseConnectivity()
  await testExchangeRate()
  await testQuoteEndpoint()
  await testOnRamp()
  await testPayout()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ All diagnostic tests completed!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

runAllTests().catch(console.error)
