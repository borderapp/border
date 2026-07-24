import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * QuickFundWallet - Development helper component
 * Instantly adds test money to your wallet for testing send money feature
 * 
 * ⚠️ REMOVE THIS IN PRODUCTION!
 */
export default function QuickFundWallet() {
  const [loading, setLoading] = useState(false);
  const [funded, setFunded] = useState(false);

  const fundWallet = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please login first');
        return;
      }

      // Add test money to all currencies
      const { error } = await supabase
        .from('profiles')
        .update({
          wallets: {
            NGN: 100000,
            USD: 500,
            GBP: 200,
            EUR: 300,
            GHS: 1000,
            ZAR: 2000,
            CAD: 400,
            CNY: 1500
          }
        })
        .eq('id', session.user.id);

      if (error) {
        toast.error('Failed to fund wallet: ' + error.message);
      } else {
        setFunded(true);
        toast.success('🎉 Wallet funded with test money!');
        setTimeout(() => {
          window.location.reload(); // Refresh to show new balances
        }, 1500);
      }
    } catch (error: any) {
      toast.error('Failed to fund wallet');
    } finally {
      setLoading(false);
    }
  };

  if (funded) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-900">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-bold">Wallet Funded!</p>
              <p className="text-sm text-green-700">Refreshing page...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
          <DollarSign className="w-5 h-5" />
          Dev Mode: Quick Fund Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-amber-800">
          Need test money to try the send money feature? Click below to instantly fund your wallet.
        </p>
        <div className="bg-white rounded-lg p-3 text-xs text-amber-900 space-y-1">
          <p className="font-bold">Will add:</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>• ₦100,000 NGN</div>
            <div>• $500 USD</div>
            <div>• £200 GBP</div>
            <div>• €300 EUR</div>
            <div>• GH₵1,000 GHS</div>
            <div>• R2,000 ZAR</div>
            <div>• $400 CAD</div>
            <div>• ¥1,500 CNY</div>
          </div>
        </div>
        <Button
          onClick={fundWallet}
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Funding Wallet...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              Add Test Money Now
            </>
          )}
        </Button>
        <p className="text-xs text-amber-700 text-center">
          ⚠️ Development only - Remove before production!
        </p>
      </CardContent>
    </Card>
  );
}
