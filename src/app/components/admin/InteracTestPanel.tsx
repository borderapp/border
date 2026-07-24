/**
 * Interac e-Transfer Test Panel
 * Tests Canadian Interac payments (incoming and outgoing)
 */

import React, { useState } from 'react';
import { Send, Link2, CheckCircle, XCircle, Loader2, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardContent } from '../ui/card';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  timestamp: number;
}

interface PaymentSession {
  payment_id: string;
  direction: string;
  amount: number;
  status: string;
  payment_link?: string;
  created_at: string;
}

export default function InteracTestPanel() {
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'sessions'>('incoming');

  // Incoming payment fields
  const [incomingAmount, setIncomingAmount] = useState('10000'); // $100.00 CAD
  const [incomingFirstName, setIncomingFirstName] = useState('John');
  const [incomingLastName, setIncomingLastName] = useState('Doe');
  const [incomingEmail, setIncomingEmail] = useState('john.doe@example.com');
  const [incomingPhone, setIncomingPhone] = useState('+14165555555');
  const [incomingAddress, setIncomingAddress] = useState('123 Main St');
  const [incomingCity, setIncomingCity] = useState('Toronto');
  const [incomingProvince, setIncomingProvince] = useState('ON');
  const [incomingPostalCode, setIncomingPostalCode] = useState('M5V 2T6');

  // Outgoing payment fields
  const [outgoingAmount, setOutgoingAmount] = useState('10000'); // $100.00 CAD
  const [outgoingFirstName, setOutgoingFirstName] = useState('Jane');
  const [outgoingLastName, setOutgoingLastName] = useState('Smith');
  const [outgoingEmail, setOutgoingEmail] = useState('jane.smith@example.com');
  const [outgoingPhone, setOutgoingPhone] = useState('+14165556666');
  const [recipientFirstName, setRecipientFirstName] = useState('Alice');
  const [recipientLastName, setRecipientLastName] = useState('Johnson');
  const [recipientEmail, setRecipientEmail] = useState('alice@example.com');
  const [recipientPhone, setRecipientPhone] = useState('+14165557777');
  const [securityQuestion, setSecurityQuestion] = useState('What is our project code?');
  const [securityAnswer, setSecurityAnswer] = useState('ALPHA123');
  const [beneficiaryType, setBeneficiaryType] = useState<'personal' | 'business'>('personal');

  // State
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [sessions, setSessions] = useState<PaymentSession[]>([]);
  const [currentPaymentId, setCurrentPaymentId] = useState<string>('');
  const [paymentLink, setPaymentLink] = useState<string>('');

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [result, ...prev]);
  };

  // Test incoming payment - Create session and generate link
  const testIncomingPayment = async () => {
    setTesting(true);
    setTestResults([]);

    addTestResult({
      step: 'create_session',
      success: false,
      message: '⏳ Creating Interac payment session...',
      timestamp: Date.now(),
    });

    try {
      // Step 1: Create payment session
      const sessionPayload = {
        customer: {
          first_name: incomingFirstName,
          last_name: incomingLastName,
          email: incomingEmail,
          phone_number: incomingPhone,
          billing_address: {
            line1: incomingAddress,
            city: incomingCity,
            state: incomingProvince,
            country: 'CA',
            zip_code: incomingPostalCode,
          },
        },
        description: 'Test Interac Incoming Payment',
        currency: 'CAD',
        amount: parseInt(incomingAmount),
        reference: `test_incoming_${Date.now()}`,
        order: {
          identifier: `ORD_${Date.now()}`,
          items: [
            {
              name: 'Test Payment',
              type: 'digital',
            },
          ],
        },
      };


      const sessionResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/payout-orchestration/payment-sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sessionPayload),
        }
      );

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(sessionData.message || sessionData.error || 'Failed to create session');
      }

      const paymentId = sessionData.payment_id;
      setCurrentPaymentId(paymentId);


      addTestResult({
        step: 'create_session',
        success: true,
        message: `✅ Payment session created! ID: ${paymentId}`,
        data: { payment_id: paymentId, full_response: sessionData },
        timestamp: Date.now(),
      });

      // Step 2: Capture payment (generate link)
      if (!paymentId) {
        throw new Error('No payment ID received from session creation');
      }

      addTestResult({
        step: 'capture_payment',
        success: false,
        message: `⏳ Generating Interac payment link for: ${paymentId}`,
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 1000));


      const captureResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/payout-orchestration/payment-sessions/${paymentId}/capture`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const captureData = await captureResponse.json();

      if (!captureResponse.ok) {
        throw new Error(captureData.message || captureData.error || 'Failed to capture payment');
      }

      const link = captureData.payment_link;
      setPaymentLink(link);

      addTestResult({
        step: 'capture_payment',
        success: true,
        message: `✅ Payment link generated successfully!`,
        data: { payment_link: link, expires_at: captureData.expires_at },
        timestamp: Date.now(),
      });

      toast.success('Interac payment link generated!');

    } catch (error: any) {
      addTestResult({
        step: 'error',
        success: false,
        message: `❌ Failed: ${error.message}`,
        data: { error: error.message },
        timestamp: Date.now(),
      });
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  // Test outgoing payment - Send money to recipient
  const testOutgoingPayment = async () => {
    setTesting(true);
    setTestResults([]);

    addTestResult({
      step: 'create_outgoing',
      success: false,
      message: '⏳ Creating outgoing Interac transfer...',
      timestamp: Date.now(),
    });

    try {
      const outgoingPayload = {
        customer: {
          first_name: outgoingFirstName,
          last_name: outgoingLastName,
          email: outgoingEmail,
          phone_number: outgoingPhone,
          billing_address: {
            line1: '456 Queen St',
            city: 'Toronto',
            state: 'ON',
            country: 'CA',
            zip_code: 'M5V 1A1',
          },
        },
        description: 'Test Outgoing Interac Transfer',
        currency: 'CAD',
        amount: parseInt(outgoingAmount),
        direction: 'outgoing',
        payment_method: {
          type: 'interac',
          beneficiary_type: beneficiaryType,
          first_name: recipientFirstName,
          last_name: recipientLastName,
          email: recipientEmail,
          phone_number: recipientPhone,
          question: securityQuestion,
          answer: securityAnswer,
        },
        reference: `test_outgoing_${Date.now()}`,
        order: {
          identifier: `OUT_${Date.now()}`,
          items: [
            {
              name: 'Test Reimbursement',
              type: 'digital',
            },
          ],
        },
      };


      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/payout-orchestration/payment-sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(outgoingPayload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create outgoing payment');
      }

      setCurrentPaymentId(data.payment_id);

      addTestResult({
        step: 'create_outgoing',
        success: true,
        message: `✅ Outgoing Interac transfer initiated! ID: ${data.payment_id}`,
        data: data,
        timestamp: Date.now(),
      });

      toast.success('Outgoing Interac transfer sent!');

    } catch (error: any) {
      addTestResult({
        step: 'error',
        success: false,
        message: `❌ Failed: ${error.message}`,
        data: { error: error.message },
        timestamp: Date.now(),
      });
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const copyPaymentLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      toast.success('Payment link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span className="text-3xl">🇨🇦</span>
          Interac e-Transfer Test Panel
        </h2>
        <p className="text-slate-500 mt-1">Test Canadian Interac incoming and outgoing payments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'incoming'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          Incoming (Receive)
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'outgoing'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          Outgoing (Send)
        </button>
      </div>

      {/* Incoming Tab */}
      {activeTab === 'incoming' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="font-bold text-lg bg-green-50 border-b-2 border-green-200">
                Incoming Payment - Request Money
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Name *
                    </label>
                    <Input
                      value={incomingFirstName}
                      onChange={(e) => setIncomingFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Last Name *
                    </label>
                    <Input
                      value={incomingLastName}
                      onChange={(e) => setIncomingLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={incomingEmail}
                    onChange={(e) => setIncomingEmail(e.target.value)}
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone (+1) *
                  </label>
                  <Input
                    value={incomingPhone}
                    onChange={(e) => setIncomingPhone(e.target.value)}
                    placeholder="+14165555555"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amount (cents) *
                  </label>
                  <Input
                    type="number"
                    value={incomingAmount}
                    onChange={(e) => setIncomingAmount(e.target.value)}
                    placeholder="10000"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    ${(parseInt(incomingAmount) / 100).toFixed(2)} CAD
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Province *
                    </label>
                    <select
                      value={incomingProvince}
                      onChange={(e) => setIncomingProvince(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="ON">Ontario (ON)</option>
                      <option value="BC">British Columbia (BC)</option>
                      <option value="AB">Alberta (AB)</option>
                      <option value="QC">Quebec (QC)</option>
                      <option value="MB">Manitoba (MB)</option>
                      <option value="SK">Saskatchewan (SK)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Postal Code *
                    </label>
                    <Input
                      value={incomingPostalCode}
                      onChange={(e) => setIncomingPostalCode(e.target.value)}
                      placeholder="M5V 2T6"
                    />
                  </div>
                </div>

                <Button
                  onClick={testIncomingPayment}
                  disabled={testing}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Generate Payment Link
                </Button>
              </CardContent>
            </Card>

            {paymentLink && (
              <Card>
                <CardHeader className="font-bold text-lg bg-blue-50 border-b-2 border-blue-200">
                  Payment Link Generated
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">Interac Payment URL:</p>
                    <p className="text-xs font-mono text-slate-800 break-all">
                      {paymentLink}
                    </p>
                  </div>
                  <Button onClick={copyPaymentLink} variant="outline" className="w-full">
                    Copy Link
                  </Button>
                  <p className="text-xs text-slate-500 text-center">
                    Share this link with the payer to complete the transfer
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Results */}
          <div>
            {testResults.length > 0 && (
              <Card>
                <CardHeader className="font-bold text-lg bg-slate-50 border-b-2 border-slate-200">
                  Test Results
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {testResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 ${
                          result.success
                            ? 'bg-green-50 border-green-200'
                            : result.message.includes('⏳')
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : result.message.includes('⏳') ? (
                            <Loader2 className="w-5 h-5 text-blue-600 mt-0.5 animate-spin" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{result.message}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </div>
                            {result.data && (
                              <details className="mt-2">
                                <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                                  View details
                                </summary>
                                <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(result.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestResults([])}
                    className="w-full mt-4"
                  >
                    Clear Results
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Outgoing Tab */}
      {activeTab === 'outgoing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="font-bold text-lg bg-blue-50 border-b-2 border-blue-200">
                Sender Information
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Name *
                    </label>
                    <Input
                      value={outgoingFirstName}
                      onChange={(e) => setOutgoingFirstName(e.target.value)}
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Last Name *
                    </label>
                    <Input
                      value={outgoingLastName}
                      onChange={(e) => setOutgoingLastName(e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={outgoingEmail}
                    onChange={(e) => setOutgoingEmail(e.target.value)}
                    placeholder="jane.smith@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone (+1) *
                  </label>
                  <Input
                    value={outgoingPhone}
                    onChange={(e) => setOutgoingPhone(e.target.value)}
                    placeholder="+14165556666"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amount (cents) *
                  </label>
                  <Input
                    type="number"
                    value={outgoingAmount}
                    onChange={(e) => setOutgoingAmount(e.target.value)}
                    placeholder="10000"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    ${(parseInt(outgoingAmount) / 100).toFixed(2)} CAD
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="font-bold text-lg bg-purple-50 border-b-2 border-purple-200">
                Recipient Information
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Beneficiary Type *
                  </label>
                  <select
                    value={beneficiaryType}
                    onChange={(e) => setBeneficiaryType(e.target.value as 'personal' | 'business')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Name *
                    </label>
                    <Input
                      value={recipientFirstName}
                      onChange={(e) => setRecipientFirstName(e.target.value)}
                      placeholder="Alice"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Last Name *
                    </label>
                    <Input
                      value={recipientLastName}
                      onChange={(e) => setRecipientLastName(e.target.value)}
                      placeholder="Johnson"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="alice@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone (+1)
                  </label>
                  <Input
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="+14165557777"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Security Question * (10-100 chars)
                  </label>
                  <Input
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    placeholder="What is our project code?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Security Answer * (3-50 chars)
                  </label>
                  <Input
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="ALPHA123"
                  />
                </div>

                <Button
                  onClick={testOutgoingPayment}
                  disabled={testing}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Interac Transfer
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Results */}
          <div>
            {testResults.length > 0 && (
              <Card>
                <CardHeader className="font-bold text-lg bg-slate-50 border-b-2 border-slate-200">
                  Test Results
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {testResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 ${
                          result.success
                            ? 'bg-green-50 border-green-200'
                            : result.message.includes('⏳')
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : result.message.includes('⏳') ? (
                            <Loader2 className="w-5 h-5 text-blue-600 mt-0.5 animate-spin" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{result.message}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </div>
                            {result.data && (
                              <details className="mt-2">
                                <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                                  View details
                                </summary>
                                <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(result.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestResults([])}
                    className="w-full mt-4"
                  >
                    Clear Results
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader className="font-bold text-lg bg-slate-100 border-b-2 border-slate-300">
          📋 Interac e-Transfer Requirements
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Amount Limits:</h4>
              <ul className="space-y-1 text-slate-600">
                <li>• Minimum: CAD $100.00 (10000 cents)</li>
                <li>• Maximum: CAD $10,000.00 (1000000 cents)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Phone Format:</h4>
              <ul className="space-y-1 text-slate-600">
                <li>• Must start with +1</li>
                <li>• Total 11 digits</li>
                <li>• Example: +14165555555</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Postal Code:</h4>
              <ul className="space-y-1 text-slate-600">
                <li>• Format: A1A 1A1</li>
                <li>• Example: M5V 2T6</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Processing Times:</h4>
              <ul className="space-y-1 text-slate-600">
                <li>• Incoming: 15-30 minutes</li>
                <li>• Outgoing: 30-60 minutes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Order Items:</h4>
              <ul className="space-y-1 text-slate-600">
                <li>• Name: 2-80 characters</li>
                <li>• Type: "physical" or "digital" only</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
