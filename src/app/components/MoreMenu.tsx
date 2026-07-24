import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, Settings, Bell, HelpCircle, Users, Briefcase, 
  Shield, Globe, Smartphone, QrCode, ShoppingCart, Building2,
  ChevronRight, Sparkles, FileText, MessageCircle, Activity
} from 'lucide-react';

interface MoreMenuProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function MoreMenu({ onBack, onNavigate }: MoreMenuProps) {
  const menuSections = [
    {
      title: 'Account',
      items: [
        { id: 'settings', label: 'Settings & Security', icon: Settings, description: 'Manage your account', badge: null },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alerts and updates', badge: '3' },
        { id: 'kyc', label: 'Account Verification', icon: Shield, description: 'Upgrade your tier', badge: null },
        { id: 'diagnostics', label: 'System Diagnostics', icon: Activity, description: 'Check app status', badge: 'Debug' },
      ]
    },
    {
      title: 'Services',
      items: [
        { id: 'pos', label: 'Virtual POS', icon: Smartphone, description: 'Accept tap payments', badge: null },
        { id: 'qr', label: 'QR Payments', icon: QrCode, description: 'Scan to pay', badge: null },
        { id: 'secure-pay', label: 'SecurePay Escrow', icon: Shield, description: 'Protected transactions', badge: null },
        { id: 'bills', label: 'Bill Payments', icon: ShoppingCart, description: 'Pay utilities & more', badge: null },
      ]
    },
    {
      title: 'Business',
      items: [
        { id: 'business-transfer', label: 'Business Transfers', icon: Briefcase, description: 'International payments', badge: null },
        { id: 'china-trade', label: 'China Trade Settlement', icon: Globe, description: 'CNY transactions', badge: null },
      ]
    },
    {
      title: 'Support',
      items: [
        { id: 'help', label: 'Help & Support', icon: HelpCircle, description: 'Get assistance', badge: null },
        { id: 'referrals', label: 'Refer & Earn', icon: Users, description: 'Invite friends', badge: 'New' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 pt-12 pb-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <div>
            <h1 className="text-white text-3xl font-bold mb-2">More</h1>
            <p className="text-slate-300 text-sm">Explore all Border features and services</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-8 relative z-10">
        <div className="space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 px-2">
                {section.title}
              </h3>
              <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  {section.items.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${
                        index !== section.items.length - 1 ? 'border-b border-slate-100' : ''
                      }`}
                    >
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-slate-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{item.label}</p>
                          {item.badge && (
                            <Badge className="bg-blue-600 text-white border-0 text-[10px] px-2 py-0">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}

          {/* App Info */}
          <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-200">
                <span className="text-white font-bold text-2xl">B</span>
              </div>
              <p className="font-bold text-slate-900 mb-1">Border App</p>
              <p className="text-xs text-slate-500 mb-4">Version 2.5.0 • Build 9PSB-2024</p>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Secured by 9PSB Banking Network</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}