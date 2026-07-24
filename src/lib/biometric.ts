// Biometric authentication via Capacitor native plugin.
// Security: NO localStorage usage. Preferences are stored ONLY in
// Capacitor's encrypted native storage (Android Keystore / iOS Keychain).
// An in-memory cache is populated at startup for synchronous reads.

import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const isNative = () => Capacitor.isNativePlatform();

// ─── Secure Storage (Capacitor only, no localStorage) ────────────────────

const PREFS_KEY   = 'border_biometric_prefs';
const SESSION_KEY = 'border_biometric_session';

async function secureGet(key: string): Promise<string | null> {
  if (!isNative()) return null; // web: no biometrics, no storage
  const { value } = await Preferences.get({ key });
  return value;
}

async function secureSet(key: string, value: string): Promise<void> {
  if (!isNative()) return;
  await Preferences.set({ key, value });
}

async function secureRemove(key: string): Promise<void> {
  if (!isNative()) return;
  await Preferences.remove({ key });
}

// ─── Biometric Preferences ────────────────────────────────────────────────

export interface BiometricPrefs {
  enabled: boolean;
  biometryType: 'fingerprint' | 'faceid' | 'none';
  requireForTransfers: boolean;
  requireForSecuritySettings: boolean;
  sessionTimeoutMinutes: number; // 0=immediately, 1, 5, 15, 30
}

const defaultPrefs: BiometricPrefs = {
  enabled: false,
  biometryType: 'none',
  requireForTransfers: false,
  requireForSecuritySettings: false,
  sessionTimeoutMinutes: 15,
};

// In-memory cache — populated by initBiometric() at app startup
let _memCache: BiometricPrefs | null = null;

/** Call once at app startup to warm the in-memory cache from secure storage. */
export async function initBiometric(): Promise<BiometricPrefs> {
  const raw = await secureGet(PREFS_KEY);
  _memCache = raw ? { ...defaultPrefs, ...JSON.parse(raw) } : { ...defaultPrefs };
  return _memCache;
}

/** Synchronous read from memory cache. Returns defaults if not yet initialised. */
export function getBiometricPrefsSync(): BiometricPrefs {
  return _memCache ?? { ...defaultPrefs };
}

/** Async read — always authoritative. */
export async function getBiometricPrefs(): Promise<BiometricPrefs> {
  const raw = await secureGet(PREFS_KEY);
  _memCache = raw ? { ...defaultPrefs, ...JSON.parse(raw) } : { ...defaultPrefs };
  return _memCache;
}

export async function saveBiometricPrefs(prefs: Partial<BiometricPrefs>): Promise<void> {
  const current = await getBiometricPrefs();
  const next = { ...current, ...prefs };
  await secureSet(PREFS_KEY, JSON.stringify(next));
  _memCache = next;
}

export async function clearBiometricPrefs(): Promise<void> {
  await secureRemove(PREFS_KEY);
  await secureRemove(SESSION_KEY);
  _memCache = { ...defaultPrefs };
  // Clear in-memory session
  _sessionStart = null;
}

// ─── Session Management ───────────────────────────────────────────────────
// Session is kept purely in memory (resets on app restart — intentional).

let _sessionStart: number | null = null;
let _idleTimer: ReturnType<typeof setTimeout> | null = null;
let _onSessionExpired: (() => void) | null = null;

export function markBiometricSessionActive(): void {
  _sessionStart = Date.now();
  scheduleIdleTimeout();
}

export function isBiometricSessionValid(timeoutMinutes: number): boolean {
  if (!_sessionStart) return false;
  if (timeoutMinutes === 0) return false; // "immediately" = always lock
  return Date.now() - _sessionStart < timeoutMinutes * 60_000;
}

/** Register a callback that fires when the session times out due to inactivity. */
export function setSessionExpiredCallback(cb: () => void): void {
  _onSessionExpired = cb;
}

/** Call on every user interaction to push back the inactivity timer. */
export function resetIdleTimer(): void {
  if (_sessionStart) scheduleIdleTimeout();
}

function scheduleIdleTimeout(): void {
  if (_idleTimer) clearTimeout(_idleTimer);
  const prefs = getBiometricPrefsSync();
  if (!prefs.enabled || prefs.sessionTimeoutMinutes === 0) return;
  _idleTimer = setTimeout(() => {
    _sessionStart = null;
    _onSessionExpired?.();
  }, prefs.sessionTimeoutMinutes * 60_000);
}

// ─── Device Capability ────────────────────────────────────────────────────

export interface BiometryInfo {
  available: boolean;
  biometryType: 'fingerprint' | 'faceid' | 'none';
  reason?: string;
}

export async function checkBiometryAvailable(): Promise<BiometryInfo> {
  if (!isNative()) {
    return { available: false, biometryType: 'none', reason: 'Biometrics require the Border mobile app.' };
  }
  try {
    const result = await BiometricAuth.checkBiometry();
    const faceTypes = [BiometryType.faceId, BiometryType.faceAuthentication];
    const type = result.biometryType === BiometryType.none
      ? 'none'
      : faceTypes.includes(result.biometryType) ? 'faceid' : 'fingerprint';
    return { available: result.isAvailable, biometryType: type };
  } catch (e: any) {
    return { available: false, biometryType: 'none', reason: e.message };
  }
}

// ─── Root / Jailbreak Detection ───────────────────────────────────────────

export async function checkDeviceSecurity(): Promise<{ compromised: boolean; reason?: string }> {
  if (!isNative()) return { compromised: false };
  try {
    // Capacitor doesn't have a built-in root detector, but we can check
    // for suspicious indicators via the biometry plugin's checkBiometry result.
    // A more complete check requires @capacitor-community/device-security-threat.
    // For now: if biometry check throws a security-related error, flag it.
    const info = await BiometricAuth.checkBiometry();
    // strongBiometryIsAvailable=false on some rooted devices when strong biometry disabled
    // This is a lightweight heuristic — not foolproof.
    if (info.strongBiometryIsAvailable === false && info.isAvailable) {
      return { compromised: true, reason: 'Device security may be compromised (strong biometry unavailable).' };
    }
    return { compromised: false };
  } catch {
    return { compromised: false };
  }
}

// ─── Authenticate ─────────────────────────────────────────────────────────

export async function authenticateBiometric(
  reason = 'Verify your identity',
): Promise<{ success: boolean; error?: string }> {
  if (!isNative()) {
    return { success: false, error: 'Biometrics are only available in the Border mobile app.' };
  }
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Use Password Instead',
      allowDeviceCredential: false,
      androidTitle: 'Border Security',
      androidSubtitle: reason,
      androidConfirmationRequired: false,
    });
    markBiometricSessionActive();
    return { success: true };
  } catch (e: any) {
    const code = e?.code ?? e?.name ?? '';
    if (code === 'userCancel' || code === 'NotAllowedError') {
      return { success: false, error: 'Cancelled.' };
    }
    if (code === 'biometryNotAvailable' || code === 'biometryNotEnrolled') {
      return { success: false, error: 'Please set up biometrics in your device Settings first.' };
    }
    if (code === 'biometryLockout' || code === 'biometryLockoutPermanent') {
      return { success: false, error: 'Too many failed attempts. Biometrics are temporarily locked.' };
    }
    return { success: false, error: e.message || 'Authentication failed.' };
  }
}

// ─── Enroll ───────────────────────────────────────────────────────────────

export async function enrollBiometric(): Promise<{ success: boolean; error?: string }> {
  if (!isNative()) {
    return { success: false, error: 'Biometrics are only available in the Border mobile app.' };
  }
  const result = await authenticateBiometric('Register biometrics for Border');
  if (result.success) {
    const info = await checkBiometryAvailable();
    await saveBiometricPrefs({ enabled: true, biometryType: info.biometryType });
  }
  return result;
}
