/**
 * Juicyway SDK Loader Hook
 *
 * Dynamically loads the Juicyway SDK and detects the correct global object
 * Handles iframe issues, retry logic, and comprehensive debugging
 */

import { useState, useEffect } from 'react';

const SDK_URL = 'https://checkout.juicyway.com/pay.js';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface UseJuicywaySDKResult {
  sdkLoaded: boolean;
  sdkError: string | null;
  sdkObject: any | null;
  reload: () => void;
}

export function useJuicywaySDK(debug = true): UseJuicywaySDKResult {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [sdkObject, setSdkObject] = useState<any | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const log = (..._args: any[]) => { /* logging removed */ };

  const logError = (..._args: any[]) => { /* logging removed */ };

  // Detect if running in iframe
  const isInIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  // Find Juicyway global object dynamically
  const findJuicywayGlobal = (): any | null => {
    log('🔍 Searching for Juicyway global object...');

    // PRIORITY: Check for actual Juicyway SDK global objects FIRST
    const priorityNames = ['PayWithJuice', 'PayWithJuiceHosted'];

    for (const name of priorityNames) {
      if ((window as any)[name]) {
        log(`✅ Found Juicyway SDK: window.${name}`);
        log('Object type:', typeof (window as any)[name]);

        // Return an object with both methods if available
        const sdkWrapper: any = {};
        if ((window as any)['PayWithJuice']) {
          sdkWrapper.PayWithJuice = (window as any)['PayWithJuice'];
        }
        if ((window as any)['PayWithJuiceHosted']) {
          sdkWrapper.PayWithJuiceHosted = (window as any)['PayWithJuiceHosted'];
        }

        log('Available SDK methods:', Object.keys(sdkWrapper));
        return sdkWrapper;
      }
    }

    // Fallback: Search for any juice-related keys
    const allKeys = Object.keys(window);
    const juicyKeys = allKeys.filter(k =>
      k.toLowerCase().includes('juicy') ||
      k.toLowerCase().includes('juice') ||
      k.toLowerCase().includes('paywith')
    );

    log('Found keys containing "juicy/juice/paywith":', juicyKeys);

    // Other possible names (legacy support)
    const fallbackNames = [
      'JuicywayPay',
      'Juicyway',
      'JuicywayCheckout',
      'JuicywaySDK',
      'JuicyPay',
      'Juice',
      'JuiceWay',
      ...juicyKeys
    ];

    for (const name of fallbackNames) {
      if ((window as any)[name]) {
        log(`✅ Found global object: window.${name}`);
        log('Object type:', typeof (window as any)[name]);
        return (window as any)[name];
      }
    }

    // If nothing found, log all window keys for debugging
    log('❌ No Juicyway global found. All window keys:', allKeys);

    return null;
  };

  // Check script loading status
  const checkScriptExists = (): HTMLScriptElement | null => {
    const scripts = document.querySelectorAll('script');
    for (let script of Array.from(scripts)) {
      if (script.src === SDK_URL) {
        return script;
      }
    }
    return null;
  };

  // Load SDK with retry logic
  const loadSDK = (attempt = 1): Promise<void> => {
    return new Promise((resolve, reject) => {
      log(`📡 Loading SDK (attempt ${attempt}/${MAX_RETRIES})...`);

      // Check if already exists
      const existingScript = checkScriptExists();
      if (existingScript) {
        log('ℹ️ Script already exists in DOM');

        // Wait for it to load
        const checkExisting = setInterval(() => {
          const globalObj = findJuicywayGlobal();
          if (globalObj) {
            clearInterval(checkExisting);
            setSdkObject(globalObj);
            setSdkLoaded(true);
            log('✅ SDK loaded from existing script');
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkExisting);
          if (!sdkLoaded) {
            logError('⏱️ Timeout waiting for existing script');
            reject(new Error('Timeout waiting for SDK from existing script'));
          }
        }, 5000);

        return;
      }

      // Create new script
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.crossOrigin = 'anonymous';
      script.async = true;

      let resolved = false;

      script.onload = () => {
        log('📥 Script onload fired');

        // Wait a bit for the SDK to initialize
        setTimeout(() => {
          const globalObj = findJuicywayGlobal();

          if (globalObj) {
            setSdkObject(globalObj);
            setSdkLoaded(true);
            log('✅ SDK loaded successfully');
            resolved = true;
            resolve();
          } else {
            logError('❌ Script loaded but no global object found');

            if (attempt < MAX_RETRIES) {
              log(`🔄 Retrying in ${RETRY_DELAY}ms...`);
              setTimeout(() => {
                loadSDK(attempt + 1).then(resolve).catch(reject);
              }, RETRY_DELAY);
            } else {
              setSdkError('SDK script loaded but global object not found');
              reject(new Error('SDK loaded but API not available'));
            }
          }
        }, 200);
      };

      script.onerror = (error) => {
        logError('❌ Script failed to load:', error);

        if (attempt < MAX_RETRIES) {
          log(`🔄 Retrying in ${RETRY_DELAY}ms...`);
          setTimeout(() => {
            loadSDK(attempt + 1).then(resolve).catch(reject);
          }, RETRY_DELAY);
        } else {
          setSdkError(`Failed to load SDK after ${MAX_RETRIES} attempts`);
          reject(new Error('Failed to load SDK script'));
        }
      };

      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          logError('⏱️ SDK load timeout');
          script.remove();

          if (attempt < MAX_RETRIES) {
            log(`🔄 Retrying in ${RETRY_DELAY}ms...`);
            setTimeout(() => {
              loadSDK(attempt + 1).then(resolve).catch(reject);
            }, RETRY_DELAY);
          } else {
            setSdkError('SDK load timeout');
            reject(new Error('SDK load timeout'));
          }
        }
      }, 10000);

      log('📤 Appending script to document head');
      document.head.appendChild(script);
    });
  };

  // Load SDK on mount
  useEffect(() => {
    log('🚀 Initializing Juicyway SDK loader');

    // Check iframe status
    if (isInIframe()) {
      log('⚠️ Running inside iframe - SDK may have restrictions');
    }

    // Check if already loaded
    const existingGlobal = findJuicywayGlobal();
    if (existingGlobal) {
      log('✅ SDK already loaded');
      setSdkObject(existingGlobal);
      setSdkLoaded(true);
      return;
    }

    // Load SDK
    loadSDK(1).catch(error => {
      logError('💥 Failed to load SDK:', error);
    });

    // Cleanup
    return () => {
      log('🧹 Cleanup');
    };
  }, [retryCount]);

  const reload = () => {
    log('🔄 Manual reload triggered');
    setSdkLoaded(false);
    setSdkError(null);
    setSdkObject(null);
    setRetryCount(prev => prev + 1);
  };

  return {
    sdkLoaded,
    sdkError,
    sdkObject,
    reload
  };
}
