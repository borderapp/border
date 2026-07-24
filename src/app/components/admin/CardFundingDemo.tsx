/**
 * Card Funding Demo Page
 * 
 * Demonstrates both admin and customer-facing card funding components
 */

import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import JuicywayCardFunding from './JuicywayCardFunding';
import CustomerCardFunding from '../CustomerCardFunding';
import { CreditCard, UserCircle, Shield, Code } from 'lucide-react';

export default function CardFundingDemo() {
  const [activeTab, setActiveTab] = useState('customer');

  // Mock user data for customer demo
  const mockUser = {
    id: 'test-user-id-123',
    email: 'demo@border.app',
    phone: '+2348118873422',
    firstName: 'Demo',
    lastName: 'User'
  };

  const handleCustomerSuccess = (amount: number, currency: string) => {
    // In real app, you would refresh wallet balance here
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CreditCard className="w-8 h-8" />
          Card Funding System
        </h1>
        <p className="text-gray-600 mt-2">
          Complete Juicyway card payment integration with admin testing panel and customer UI
        </p>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">4-Step Flow</h3>
              <p className="text-sm text-gray-600">
                Initialize → Capture → Authorize → Verify
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Auto Crediting</h3>
              <p className="text-sm text-gray-600">
                Webhook automatically credits wallets
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Code className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Full Control</h3>
              <p className="text-sm text-gray-600">
                Direct Juicyway API integration
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Webhook URL */}
      <Card className="p-6 bg-purple-50 border-purple-200">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          🔔 Webhook URL (Configure in Juicyway Dashboard)
        </h3>
        <div className="bg-white p-3 rounded-lg border border-purple-300">
          <code className="text-sm break-all">
            {import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co'}/functions/v1/juicyway-funding/webhook
          </code>
        </div>
        <p className="text-sm text-gray-700 mt-2">
          This webhook receives <code className="bg-white px-1 rounded">payment.succeeded</code> events and automatically credits user wallets.
          Reference format must be: <code className="bg-white px-1 rounded">ord_[userId]_[timestamp]</code>
        </p>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="customer" className="flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Customer View
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Admin Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="mt-6">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Customer-Facing Interface</h2>
              <p className="text-gray-600">
                Simplified, user-friendly card funding flow for end customers
              </p>
            </div>
            <div className="max-w-2xl">
              <CustomerCardFunding
                userId={mockUser.id}
                userEmail={mockUser.email}
                userPhone={mockUser.phone}
                firstName={mockUser.firstName}
                lastName={mockUser.lastName}
                onSuccess={handleCustomerSuccess}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="mt-6">
          <JuicywayCardFunding />
        </TabsContent>
      </Tabs>

      {/* Integration Notes */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-3">📋 Integration Checklist</h3>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Deploy edge function to Supabase</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Set JUICYWAY_API_KEY environment variable</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Configure webhook URL in Juicyway dashboard</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Test with sandbox card: 4111111111111111</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Verify webhook delivery and wallet crediting</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Add card encryption for production</span>
          </label>
        </div>
      </Card>

      {/* Test Card Info */}
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <h3 className="font-semibold mb-3">💳 Test Card Details (Sandbox)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium mb-1">Successful Payment:</p>
            <ul className="space-y-1 text-gray-700">
              <li>Card: 4111 1111 1111 1111</li>
              <li>CVV: 123</li>
              <li>Expiry: 12/25</li>
              <li>OTP: 123456</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">Failed Payment (for testing):</p>
            <ul className="space-y-1 text-gray-700">
              <li>Card: 4000 0000 0000 0002</li>
              <li>CVV: 123</li>
              <li>Expiry: 12/25</li>
              <li>Triggers decline scenario</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
