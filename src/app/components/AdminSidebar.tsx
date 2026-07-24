import React from 'react';
import borderLogoIcon from '@/imports/ChatGPT_Image_Jun_29__2026__06_01_55_PM-removebg-preview.png';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  ArrowLeftRight,
  CreditCard,
  ShieldCheck,
  LogOut,
  Zap,
  Smartphone,
  X,
  PiggyBank,
  TrendingUp,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active
        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
        : "text-slate-600 hover:bg-slate-100"
    )}
  >
    <Icon className={cn("w-5 h-5 shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

interface AdminSidebarProps {
  currentTab: string;
  setTab: (t: string) => void;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AdminSidebar = ({ currentTab, setTab, onLogout, isOpen = false, onClose }: AdminSidebarProps) => {
  const navigate = (tab: string) => {
    setTab(tab);
    onClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          "w-72 lg:w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300",
          // Mobile: hidden off-screen by default, slides in when open
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 shrink-0 mt-0">
          <div className="flex items-center gap-2">
            <img src={borderLogoIcon} alt="Border" className="w-8 h-8 object-contain" />
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">Border</span>
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-600" />
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Admin Console</span>
              </div>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Main Menu</p>
          <SidebarItem icon={LayoutDashboard} label="Dashboard"       active={currentTab === 'dashboard'}        onClick={() => navigate('dashboard')} />
          <SidebarItem icon={FileCheck}       label="KYC Approvals"   active={currentTab === 'kyc'}              onClick={() => navigate('kyc')} />
          <SidebarItem icon={Users}           label="User Management" active={currentTab === 'users'}            onClick={() => navigate('users')} />
          <SidebarItem icon={ArrowLeftRight}  label="Transactions"    active={currentTab === 'transactions'}     onClick={() => navigate('transactions')} />
          <SidebarItem icon={CreditCard}      label="Cards & POS"     active={currentTab === 'cards'}            onClick={() => navigate('cards')} />
          <SidebarItem icon={PiggyBank}       label="Savings"         active={currentTab === 'savings'}          onClick={() => navigate('savings')} />
          <SidebarItem icon={Zap}             label="Juicyway FX"     active={currentTab === 'juicyway'}         onClick={() => navigate('juicyway')} />
          <SidebarItem icon={TrendingUp}      label="Strowallet FX"   active={currentTab === 'strowallet-fx'}    onClick={() => navigate('strowallet-fx')} />
          <SidebarItem icon={Smartphone}      label="Strowallet"      active={currentTab === 'strowallet-test'}  onClick={() => navigate('strowallet-test')} />
        </div>

        {/* Logout */}
        <div className="border-t border-slate-100 p-4 shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};
