import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { 
  Settings, Shield, Bell, Globe, Database, Key,
  Mail, Zap, DollarSign, Users, Lock, Save, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    general: {
      maintenanceMode: false,
      signupsEnabled: true,
      autoKycApproval: false,
      multiCurrencyEnabled: true
    },
    security: {
      twoFactorRequired: false,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordExpiry: 90
    },
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      transactionNotifs: true,
      kycUpdates: true
    },
    limits: {
      tier0DailyLimit: 1000,
      tier1DailyLimit: 5000,
      tier2DailyLimit: 25000,
      tier3DailyLimit: 100000,
      tier4DailyLimit: 500000
    },
    fees: {
      localTransferFee: 0.5,
      internationalTransferFee: 2.5,
      currencyConversionFee: 1.0,
      cardIssuanceFee: 5.0,
      atmWithdrawalFee: 2.0
    }
  });

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Settings saved successfully');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
          <p className="text-slate-500 mt-1">Configure Border platform parameters</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Maintenance Mode</Label>
              <p className="text-sm text-slate-500">Temporarily disable app access</p>
            </div>
            <Switch
              checked={settings.general.maintenanceMode}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  general: { ...settings.general, maintenanceMode: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">User Signups Enabled</Label>
              <p className="text-sm text-slate-500">Allow new user registrations</p>
            </div>
            <Switch
              checked={settings.general.signupsEnabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  general: { ...settings.general, signupsEnabled: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Auto KYC Approval (Tier 1)</Label>
              <p className="text-sm text-slate-500">Automatically approve basic KYC</p>
            </div>
            <Switch
              checked={settings.general.autoKycApproval}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  general: { ...settings.general, autoKycApproval: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Multi-Currency Wallets</Label>
              <p className="text-sm text-slate-500">Enable all 8 currency wallets</p>
            </div>
            <Switch
              checked={settings.general.multiCurrencyEnabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  general: { ...settings.general, multiCurrencyEnabled: checked }
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Require 2FA for Admins</Label>
              <p className="text-sm text-slate-500">Enforce two-factor authentication</p>
            </div>
            <Switch
              checked={settings.security.twoFactorRequired}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  security: { ...settings.security, twoFactorRequired: checked }
                })
              }
            />
          </div>

          <div>
            <Label className="font-medium mb-2 block">Session Timeout (minutes)</Label>
            <input
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                })
              }
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <Label className="font-medium mb-2 block">Max Login Attempts</Label>
            <input
              type="number"
              value={settings.security.maxLoginAttempts}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  security: { ...settings.security, maxLoginAttempts: parseInt(e.target.value) }
                })
              }
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <Label className="font-medium mb-2 block">Password Expiry (days)</Label>
            <input
              type="number"
              value={settings.security.passwordExpiry}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  security: { ...settings.security, passwordExpiry: parseInt(e.target.value) }
                })
              }
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Transaction Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Transaction Limits by KYC Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="font-medium mb-2 block">Tier 0 Daily Limit ($)</Label>
              <input
                type="number"
                value={settings.limits.tier0DailyLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    limits: { ...settings.limits, tier0DailyLimit: parseInt(e.target.value) }
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <Label className="font-medium mb-2 block">Tier 1 Daily Limit ($)</Label>
              <input
                type="number"
                value={settings.limits.tier1DailyLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    limits: { ...settings.limits, tier1DailyLimit: parseInt(e.target.value) }
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <Label className="font-medium mb-2 block">Tier 2 Daily Limit ($)</Label>
              <input
                type="number"
                value={settings.limits.tier2DailyLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    limits: { ...settings.limits, tier2DailyLimit: parseInt(e.target.value) }
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <Label className="font-medium mb-2 block">Tier 3 Daily Limit ($)</Label>
              <input
                type="number"
                value={settings.limits.tier3DailyLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    limits: { ...settings.limits, tier3DailyLimit: parseInt(e.target.value) }
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="font-medium mb-2 block">Tier 4 Daily Limit ($)</Label>
              <input
                type="number"
                value={settings.limits.tier4DailyLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    limits: { ...settings.limits, tier4DailyLimit: parseInt(e.target.value) }
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Fee Structure (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="font-medium mb-2 block">Local Transfer Fee (%)</Label>
              <input
                type="number"
                step="0.1"
                value={settings.fees.localTransferFee}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fees: { ...settings.fees, localTransferFee: parseFloat(e.target.value) }
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <Label className="font-medium mb-2 block">International Transfer Fee (%)</Label>
              <input
                type="number"
                step="0.1"
                value={settings.fees.internationalTransferFee}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fees: { ...settings.fees, internationalTransferFee: parseFloat(e.target.value) }
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <Label className="font-medium mb-2 block">Currency Conversion Fee (%)</Label>
              <input
                type="number"
                step="0.1"
                value={settings.fees.currencyConversionFee}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fees: { ...settings.fees, currencyConversionFee: parseFloat(e.target.value) }
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <Label className="font-medium mb-2 block">Card Issuance Fee ($)</Label>
              <input
                type="number"
                step="0.1"
                value={settings.fees.cardIssuanceFee}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fees: { ...settings.fees, cardIssuanceFee: parseFloat(e.target.value) }
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="font-medium mb-2 block">ATM Withdrawal Fee ($)</Label>
              <input
                type="number"
                step="0.1"
                value={settings.fees.atmWithdrawalFee}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fees: { ...settings.fees, atmWithdrawalFee: parseFloat(e.target.value) }
                  })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Admin Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Email Alerts</Label>
              <p className="text-sm text-slate-500">Receive email notifications</p>
            </div>
            <Switch
              checked={settings.notifications.emailAlerts}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, emailAlerts: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">SMS Alerts</Label>
              <p className="text-sm text-slate-500">Receive SMS notifications</p>
            </div>
            <Switch
              checked={settings.notifications.smsAlerts}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, smsAlerts: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Transaction Notifications</Label>
              <p className="text-sm text-slate-500">Alert on high-value transactions</p>
            </div>
            <Switch
              checked={settings.notifications.transactionNotifs}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, transactionNotifs: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">KYC Update Notifications</Label>
              <p className="text-sm text-slate-500">Alert on new KYC submissions</p>
            </div>
            <Switch
              checked={settings.notifications.kycUpdates}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, kycUpdates: checked }
                })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
