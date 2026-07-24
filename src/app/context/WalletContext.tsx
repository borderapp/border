import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface WalletContextType {
  walletBalances: Record<string, number>;
  loading: boolean;
  refreshBalances: () => Promise<void>;
  updateBalanceOptimistically: (currency: string, amount: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  const refreshBalances = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }


      // Attempt to fetch profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('wallets')
        .eq('id', session.user.id)
        .single();

      if (error) {
        // If profile doesn't exist, set empty wallets but don't throw
        setWalletBalances({});
        setLoading(false);
        return;
      }

      const rawWallets = profile?.wallets || {};
      const processedWallets: Record<string, number> = {};
      
      // Ensure all values are numbers
      Object.entries(rawWallets).forEach(([code, balance]) => {
        processedWallets[code] = Number(balance) || 0;
      });
      
      setWalletBalances(processedWallets);
    } catch (err) {
      setWalletBalances({});
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBalanceOptimistically = useCallback((currency: string, amount: number) => {
    setWalletBalances(prev => {
      const current = Number(prev[currency]) || 0;
      return {
        ...prev,
        [currency]: current + amount
      };
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    let channel: any;

    const initialize = async () => {
      // Wait for session to be ready
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (session?.user) {
        setSessionReady(true);
        await refreshBalances();
        
        // Set up realtime listener
        channel = supabase
          .channel(`wallet-realtime-${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${session.user.id}`,
            },
            (payload) => {
              if (payload.new && payload.new.wallets) {
                const processed: Record<string, number> = {};
                Object.entries(payload.new.wallets).forEach(([code, balance]) => {
                  processed[code] = Number(balance) || 0;
                });
                setWalletBalances(processed);
              }
            }
          )
          .subscribe((status) => {
          });
      } else {
        setLoading(false);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSessionReady(true);
        await refreshBalances();
      } else if (event === 'SIGNED_OUT') {
        setSessionReady(false);
        setWalletBalances({});
        setLoading(false);
      }
    });

    initialize();

    // Listen for custom events (manual triggers from components)
    const handleWalletUpdateEvent = (event: any) => {
      refreshBalances();
    };

    const handleFocus = () => {
      if (sessionReady) {
        refreshBalances();
      }
    };

    window.addEventListener('walletUpdated', handleWalletUpdateEvent);
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('walletUpdated', handleWalletUpdateEvent);
      window.removeEventListener('focus', handleFocus);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshBalances]);

  return (
    <WalletContext.Provider value={{ walletBalances, loading, refreshBalances, updateBalanceOptimistically }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};