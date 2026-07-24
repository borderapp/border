/**
 * Bill payment provider icons — brand-colored SVG/div representations
 * for MTN, Airtel, Glo, 9mobile, DSTV, GOtv, Startimes, DISCOs, etc.
 */

import React from 'react';

export interface ProviderIcon {
  bg: string;
  color: string;
  abbr: string;
  label: string;
  emoji?: string;
}

export const PROVIDER_ICONS: Record<string, ProviderIcon> = {
  // ── Mobile Networks ──────────────────────────────────────────────────────
  'MTN':      { bg: '#FFCB05', color: '#000',    abbr: 'MTN',  label: 'MTN',     emoji: '📶' },
  'Airtel':   { bg: '#E40000', color: '#fff',    abbr: 'AIR',  label: 'Airtel',  emoji: '📶' },
  'Glo':      { bg: '#006633', color: '#fff',    abbr: 'glo',  label: 'Glo',     emoji: '📶' },
  '9mobile':  { bg: '#00713A', color: '#fff',    abbr: '9mo',  label: '9mobile', emoji: '📶' },
  'etisalat': { bg: '#00713A', color: '#fff',    abbr: '9mo',  label: '9mobile', emoji: '📶' },

  // ── Cable TV ─────────────────────────────────────────────────────────────
  'Dstv':       { bg: '#003087', color: '#fff', abbr: 'DS',  label: 'DStv',      emoji: '📡' },
  'DSTV':       { bg: '#003087', color: '#fff', abbr: 'DS',  label: 'DStv',      emoji: '📡' },
  'Gotv':       { bg: '#E2001A', color: '#fff', abbr: 'GO',  label: 'GOtv',      emoji: '📺' },
  'GOtv':       { bg: '#E2001A', color: '#fff', abbr: 'GO',  label: 'GOtv',      emoji: '📺' },
  'Startimes':  { bg: '#E87722', color: '#fff', abbr: 'ST',  label: 'StarTimes', emoji: '⭐' },

  // ── Electricity DISCOs ────────────────────────────────────────────────────
  'EKEDC':  { bg: '#005BAA', color: '#fff', abbr: 'EKO',  label: 'Eko DISCO',     emoji: '⚡' },
  'IKEDC':  { bg: '#0072BC', color: '#fff', abbr: 'IKE',  label: 'Ikeja DISCO',   emoji: '⚡' },
  'AEDC':   { bg: '#ED1C24', color: '#fff', abbr: 'ABJ',  label: 'Abuja DISCO',   emoji: '⚡' },
  'EEDC':   { bg: '#7B2D8B', color: '#fff', abbr: 'ENU',  label: 'Enugu DISCO',   emoji: '⚡' },
  'IBEDC':  { bg: '#009A44', color: '#fff', abbr: 'IBD',  label: 'Ibadan DISCO',  emoji: '⚡' },
  'KEDCO':  { bg: '#F37021', color: '#fff', abbr: 'KED',  label: 'Kano DISCO',    emoji: '⚡' },
  'PHED':   { bg: '#231F20', color: '#fff', abbr: 'PHC',  label: 'Port Harcourt', emoji: '⚡' },
  'JED':    { bg: '#005BAA', color: '#fff', abbr: 'JED',  label: 'Jos DISCO',     emoji: '⚡' },
  'BEDC':   { bg: '#006838', color: '#fff', abbr: 'BEN',  label: 'Benin DISCO',   emoji: '⚡' },
  'KAEDCO': { bg: '#8B1A1A', color: '#fff', abbr: 'KAD',  label: 'Kaduna DISCO',  emoji: '⚡' },

  // ── Education ────────────────────────────────────────────────────────────
  'WAEC':   { bg: '#006400', color: '#fff', abbr: 'WAEC', label: 'WAEC',   emoji: '🎓' },
  'NECO':   { bg: '#003580', color: '#fff', abbr: 'NECO', label: 'NECO',   emoji: '🎓' },
  'JAMB':   { bg: '#800000', color: '#fff', abbr: 'JAMB', label: 'JAMB',   emoji: '🎓' },
  'NABTEB': { bg: '#4B0082', color: '#fff', abbr: 'NAB',  label: 'NABTEB', emoji: '🎓' },
};

export function getProviderIcon(name: string): ProviderIcon {
  // Try exact match
  if (PROVIDER_ICONS[name]) return PROVIDER_ICONS[name];
  // Try case-insensitive
  const key = Object.keys(PROVIDER_ICONS).find(k => k.toLowerCase() === name?.toLowerCase());
  if (key) return PROVIDER_ICONS[key];
  // Fallback
  return { bg: '#F3F4F6', color: '#6B7280', abbr: name?.substring(0,3).toUpperCase() || '?', label: name, emoji: '🏢' };
}

/** Render a compact provider badge (circle with abbreviation) */
export function ProviderBadge({ name, size = 40 }: { name: string; size?: number }) {
  const meta = getProviderIcon(name);
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size / 3,
        background: meta.bg, color: meta.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.28, fontWeight: 900, letterSpacing: '-0.5px',
        flexShrink: 0,
      }}
    >
      {meta.abbr}
    </div>
  );
}
