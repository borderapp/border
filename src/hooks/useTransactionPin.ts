/**
 * useTransactionPin
 * Manages Transaction PIN lifecycle: create, verify, change, check existence.
 * PIN is stored as SHA-256 hash in Supabase auth user_metadata.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useTransactionPin() {
  const [hasPin, setHasPin]     = useState<boolean | null>(null); // null = loading
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    checkPin();
  }, []);

  const checkPin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setHasPin(!!user?.user_metadata?.transaction_pin_hash);
  };

  const createPin = async (newPin: string, confirmPin: string): Promise<boolean> => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) throw new Error('PIN must be exactly 4 digits');
      if (newPin !== confirmPin) throw new Error('PINs do not match');

      const hash = await sha256(newPin);
      const { error: updateErr } = await supabase.auth.updateUser({
        data: { transaction_pin_hash: hash },
      });
      if (updateErr) throw updateErr;

      setHasPin(true);
      setSuccess('Transaction PIN created successfully');
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to create PIN');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const changePin = async (currentPin: string, newPin: string, confirmPin: string): Promise<boolean> => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const storedHash = user?.user_metadata?.transaction_pin_hash;
      if (!storedHash) throw new Error('No PIN found. Please create one first.');

      // Verify current PIN
      const currentHash = await sha256(currentPin);
      if (currentHash !== storedHash) throw new Error('Current PIN is incorrect');

      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) throw new Error('New PIN must be exactly 4 digits');
      if (newPin !== confirmPin) throw new Error('New PINs do not match');
      if (newPin === currentPin) throw new Error('New PIN must be different from current PIN');

      const newHash = await sha256(newPin);
      const { error: updateErr } = await supabase.auth.updateUser({
        data: { transaction_pin_hash: newHash },
      });
      if (updateErr) throw updateErr;

      setSuccess('Transaction PIN changed successfully');
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to change PIN');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    const storedHash = user?.user_metadata?.transaction_pin_hash;
    if (!storedHash) return false;
    const enteredHash = await sha256(pin);
    return enteredHash === storedHash;
  };

  return { hasPin, loading, error, success, createPin, changePin, verifyPin, checkPin, setError, setSuccess };
}
