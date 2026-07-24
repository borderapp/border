import React from 'react';
import {
  Layout,
  Wallet,
  ArrowUpRight,
  Users,
  Settings,
  Shield,
  LogOut,
  Bell,
  CreditCard,
  Smartphone,
  Zap,
  PiggyBank,
} from 'lucide-react';

interface CustomerSidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onLogout: () => void;
}

export const CustomerSidebar = ({ currentTab, setTab, onLogout }: CustomerSidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layout },
    { id: 'wallets', label: 'My Wallets', icon: Wallet },
    { id: 'cards', label: 'Virtual Cards', icon: CreditCard },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'send', label: 'Transfers', icon: ArrowUpRight },
    { id: 'pos', label: 'Virtual POS', icon: Smartphone },
    { id: 'bills', label: 'Bill Payments', icon: Zap },
    { id: 'referrals', label: 'Refer & Earn', icon: Users },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Border</h2>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">User Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all group ${
              currentTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon className={`w-5 h-5 ${currentTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-50">
        <button 
          onClick={() => setTab('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all mb-1 ${
            currentTab === 'settings' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-5 h-5 text-slate-400" />
          Settings
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-rose-500 hover:bg-rose-50 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>

      <div className="m-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">Tier 2 Verified</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-[75%] rounded-full"></div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 font-medium">Daily limit: ₦5,000,000</p>
      </div>
    </aside>
  );
};
