import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Zap, Shield, Globe, TrendingDown, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface UserEducationProps {
  onClose: () => void;
}

/**
 * User Education Component
 * 
 * Explains Border's benefits WITHOUT any crypto or blockchain terminology
 * Focus: Speed, security, lower fees, global reach
 */
export default function UserEducation({ onClose }: UserEducationProps) {
  const benefits = [
    {
      icon: Zap,
      title: 'Instant Transfers',
      description: 'Send money to anyone, anywhere in seconds. No waiting days for international transfers.',
      color: 'blue',
    },
    {
      icon: TrendingDown,
      title: 'Lower Fees',
      description: 'Save up to 70% on international transfers compared to traditional banks and money transfer services.',
      color: 'green',
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description: 'Transfer to over 150 countries with real-time exchange rates and transparent pricing.',
      color: 'purple',
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Your money is protected by enterprise-grade security and regulatory compliance.',
      color: 'orange',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Why Border is Different
          </h1>
          <p className="text-gray-600">
            Modern banking infrastructure for the global economy
          </p>
        </motion.div>

        {/* Benefits */}
        <div className="space-y-4 mb-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 bg-${benefit.color}-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-6 h-6 text-${benefit.color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {benefit.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* How It Works */}
        <Card className="mb-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-4">How It Works</h3>
            <div className="space-y-3">
              {[
                'Secure infrastructure connects directly to global payment networks',
                'Real-time currency conversion at market rates',
                'Instant settlement to bank accounts and wallets worldwide',
                'Full regulatory compliance with CBN and international standards',
              ].map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-900">{point}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compare with Traditional */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Border vs Traditional Banks
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-2">Traditional Banks</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-gray-600">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      2-5 days settlement
                    </li>
                    <li className="flex items-center gap-2 text-gray-600">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      High fees (3-7%)
                    </li>
                    <li className="flex items-center gap-2 text-gray-600">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Hidden charges
                    </li>
                    <li className="flex items-center gap-2 text-gray-600">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Limited hours
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="text-blue-600 mb-2 font-medium">Border</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-blue-900">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Instant settlement
                    </li>
                    <li className="flex items-center gap-2 text-blue-900">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Low fees (0.5-2%)
                    </li>
                    <li className="flex items-center gap-2 text-blue-900">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Transparent pricing
                    </li>
                    <li className="flex items-center gap-2 text-blue-900">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      24/7 availability
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Compliance */}
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-2">
                  Secure & Regulated
                </h3>
                <p className="text-sm text-green-800 mb-3">
                  Border is a licensed and regulated fintech platform operating under 
                  Central Bank of Nigeria oversight with full compliance to local and 
                  international regulations.
                </p>
                <div className="space-y-1 text-xs text-green-700">
                  <p>✓ CBN Licensed Payment Service Provider</p>
                  <p>✓ AML/CFT Compliance</p>
                  <p>✓ KYC Verification Required</p>
                  <p>✓ Funds Segregation & Protection</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Button */}
        <Button 
          onClick={onClose}
          className="w-full h-14 text-lg mb-6"
          size="lg"
        >
          Get Started with Border
        </Button>

        <p className="text-center text-xs text-gray-500">
          Questions? Contact our support team 24/7
        </p>
      </div>
    </div>
  );
}
