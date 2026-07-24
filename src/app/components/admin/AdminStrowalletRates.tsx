import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Edit2, Check, X, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';
const MARKUP_PCT = 2; // 2% markup

// Both Strowallet endpoints return NGN per 1 USD.
// ngnPerUsd is the canonical base rate; direction-specific rates are derived from it.
interface RateData {
  from: string;
  to: string;
  ngnPerUsd: number | null;   // raw from Strowallet (always NGN/USD regardless of which direction queried)
  raw: number | null;          // ngnPerUsd (kept for compatibility)
  withMarkup: number | null;   // direction-corrected customer-facing rate
  fetched_at: number | null;
  error?: string;
  rawResponse?: string;
}

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON };
  if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
  return h;
}

// Strowallet always returns NGN per 1 USD — regardless of which direction you query.
// e.g. exchange-rate/NGN/USD/ → 1650 means 1 USD = 1650 NGN
// e.g. exchange-rate/USD/NGN/ → 1650 means 1 USD = 1650 NGN
async function fetchStroRate(from: string, to: string): Promise<RateData> {
  const headers = await getHeaders();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/strowallet-cards`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'get_stro_rate', from, to }),
    });
    const j = await res.json();
    const d = j.data ?? {};
    const candidates = [
      d.rate, d.exchange_rate, d.exchangeRate, d.data?.rate,
      d.data?.exchange_rate, d.result?.rate, d.result,
    ];
    const rawVal = candidates.find(v => v != null && !isNaN(Number(v)));
    const ngnPerUsd = rawVal != null ? Number(rawVal) : null;

    if (!ngnPerUsd || ngnPerUsd <= 0) {
      return { from, to, ngnPerUsd: null, raw: null, withMarkup: null, fetched_at: null, error: d.message || 'No rate in response', rawResponse: JSON.stringify(j, null, 2).slice(0, 400) };
    }

    let withMarkup: number;
    if (from === 'USD' && to === 'NGN') {
      // User sends $1 → gets fewer NGN. e.g. raw=1350, customer gets 1350×0.98=1323 NGN per $1
      withMarkup = ngnPerUsd * (1 - MARKUP_PCT / 100);
    } else {
      // User sends NGN → needs to pay more NGN per $1. e.g. raw=1400, customer pays 1400×1.02=1428 NGN per $1
      withMarkup = ngnPerUsd * (1 + MARKUP_PCT / 100);
    }
    // withMarkup is always expressed as NGN per $1 for both directions

    return { from, to, ngnPerUsd, raw: ngnPerUsd, withMarkup, fetched_at: j.fetched_at ?? Date.now() };
  } catch (e: any) {
    return { from, to, ngnPerUsd: null, raw: null, withMarkup: null, fetched_at: null, error: e.message };
  }
}

// Save rate to DB via juicyway-rates edge function /admin/update-rate endpoint
async function saveRateToDB(from: string, to: string, customRate: number, referenceRate: number) {
  const headers = await getHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-rates/admin/update-rate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ from_currency: from, to_currency: to, custom_rate: customRate, reference_rate: referenceRate, markup_percentage: MARKUP_PCT }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminStrowalletRates() {
  const [rates, setRates]             = useState<RateData[]>([]);
  const [loading, setLoading]         = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [dbRates, setDbRates]         = useState<Record<string, number>>({});

  // Manual override state
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [manualRate, setManualRate]   = useState('');
  const [savingRate, setSavingRate]   = useState(false);

  const PAIRS = [
    { from: 'NGN', to: 'USD', label: 'NGN → USD', desc: 'User sells NGN, gets USD' },
    { from: 'USD', to: 'NGN', label: 'USD → NGN', desc: 'User sells USD, gets NGN' },
  ];

  const refresh = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(PAIRS.map(p => fetchStroRate(p.from, p.to)));
      setRates(results);
      setLastRefresh(new Date());

      // Also fetch current DB rates
      const headers = await getHeaders();
      const dbRes = await fetch(`${SUPABASE_URL}/functions/v1/juicyway-rates/admin/all-rates`, { headers });
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        const map: Record<string, number> = {};
        (dbData.rates || []).forEach((r: any) => { map[`${r.from_currency}_${r.to_currency}`] = r.custom_rate; });
        setDbRates(map);
      }
    } catch (e: any) {
      toast.error('Failed to fetch rates: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  const startEdit = (pair: string, currentRate: number | null) => {
    setEditingPair(pair);
    setManualRate(currentRate ? String(currentRate.toFixed(6)) : '');
  };

  const cancelEdit = () => { setEditingPair(null); setManualRate(''); };

  const saveManualRate = async (from: string, to: string, referenceRate: number | null) => {
    const val = parseFloat(manualRate);
    if (isNaN(val) || val <= 0) { toast.error('Invalid rate'); return; }
    setSavingRate(true);
    try {
      await saveRateToDB(from, to, val, referenceRate || val);
      setDbRates(prev => ({ ...prev, [`${from}_${to}`]: val }));
      toast.success(`${from}/${to} rate saved to DB — users will now see this rate`);
      cancelEdit();
    } catch (e: any) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSavingRate(false);
    }
  };

  const clearManualRate = async (from: string, to: string) => {
    // Reset by setting DB rate to null (we just set it to the live rate)
    const live = rates.find(r => r.from === from && r.to === to);
    if (!live?.withMarkup) { toast.error('No live rate available to restore'); return; }
    setSavingRate(true);
    try {
      await saveRateToDB(from, to, live.withMarkup, live.raw!);
      setDbRates(prev => ({ ...prev, [`${from}_${to}`]: live.withMarkup! }));
      toast.success('Rate restored to live Strowallet rate');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingRate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Strowallet Exchange Rates</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Live NGN ↔ USD rates from Strowallet · {MARKUP_PCT}% markup applied · Overrides saved to DB and served to users
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && <p className="text-xs text-slate-400">Last: {lastRefresh.toLocaleTimeString()}</p>}
          <Button onClick={refresh} disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PAIRS.map(pair => {
          const rate    = rates.find(r => r.from === pair.from && r.to === pair.to);
          const dbKey   = `${pair.from}_${pair.to}`;
          const dbRate  = dbRates[dbKey];
          const isEdit  = editingPair === dbKey;
          const hasOverride = dbRate && rate?.withMarkup && Math.abs(dbRate - rate.withMarkup) > 0.0001;

          return (
            <div key={dbKey} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Card header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                      <ArrowLeftRight className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-base">{pair.label}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{pair.desc}</p>
                    </div>
                  </div>
                  <Badge className={`text-[10px] font-bold border ${loading ? 'bg-yellow-400/20 border-yellow-400/40 text-yellow-300' : rate?.raw ? 'bg-emerald-400/20 border-emerald-400/40 text-emerald-300' : 'bg-red-400/20 border-red-400/40 text-red-300'}`}>
                    {loading ? 'Fetching...' : rate?.raw ? 'Live' : 'Offline'}
                  </Badge>
                </div>
              </div>

              {/* Rate body */}
              <div className="px-5 py-4 space-y-4">
                {loading && !rate ? (
                  <div className="flex items-center gap-2 text-slate-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Fetching from Strowallet…</span>
                  </div>
                ) : rate?.error ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-red-500 bg-red-50 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="text-xs">{rate.error}</span>
                    </div>
                    {rate.rawResponse && (
                      <details className="text-xs">
                        <summary className="text-gray-400 cursor-pointer hover:text-gray-600">Raw API response (debug)</summary>
                        <pre className="mt-1 bg-gray-100 rounded p-2 overflow-auto max-h-32 text-[10px] font-mono text-gray-700">{rate.rawResponse}</pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Strowallet Raw</p>
                      <p className="text-xs text-slate-400 mt-0.5">NGN per $1</p>
                      <p className="text-lg font-black text-slate-800 mt-1">
                        {rate?.ngnPerUsd != null
                          ? rate.ngnPerUsd.toLocaleString('en-NG', { maximumFractionDigits: 2 })
                          : '—'}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">After {MARKUP_PCT}% Markup</p>
                      <p className="text-xs text-blue-400 mt-0.5">NGN per $1</p>
                      <p className="text-lg font-black text-blue-700 mt-1">
                        {rate?.withMarkup != null
                          ? rate.withMarkup.toLocaleString('en-NG', { maximumFractionDigits: 2 })
                          : '—'}
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 ${hasOverride ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${hasOverride ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {hasOverride ? 'MANUAL DB' : 'DB Rate'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">NGN per $1</p>
                      <p className={`text-lg font-black mt-1 ${hasOverride ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {dbRate != null
                          ? Number(dbRate).toLocaleString('en-NG', { maximumFractionDigits: 2 })
                          : '—'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Margin indicator — always in NGN per $1 terms */}
                {rate?.ngnPerUsd && rate?.withMarkup && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    {pair.from === 'USD'
                      ? <TrendingDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      : <TrendingUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                    <span>
                      {pair.from === 'USD'
                        ? <>User gets ₦<strong>{rate.withMarkup.toLocaleString('en-NG', { maximumFractionDigits: 2 })}</strong> per $1 · Margin = ₦<strong>{(rate.ngnPerUsd - rate.withMarkup).toFixed(2)}</strong> per $1</>
                        : <>User pays ₦<strong>{rate.withMarkup.toLocaleString('en-NG', { maximumFractionDigits: 2 })}</strong> per $1 · Margin = ₦<strong>{(rate.withMarkup - rate.ngnPerUsd).toFixed(2)}</strong> per $1</>
                      }
                    </span>
                  </div>
                )}

                {/* Manual override section */}
                {isEdit ? (
                  <div className="border border-blue-200 rounded-xl p-3 bg-blue-50 space-y-3">
                    <p className="text-xs font-bold text-blue-700">Set manual rate for {pair.label}</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.0001"
                        value={manualRate}
                        onChange={e => setManualRate(e.target.value)}
                        placeholder={rate?.withMarkup ? rate.withMarkup.toFixed(4) : '0.0000'}
                        className="h-9 text-sm font-mono"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => saveManualRate(pair.from, pair.to, rate?.raw ?? null)}
                        disabled={savingRate} className="bg-blue-600 hover:bg-blue-700 h-9 px-3">
                        {savingRate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="h-9 px-3">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-blue-500">This rate will be served to users immediately when they do {pair.from} → {pair.to} conversions.</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(dbKey, dbRate ?? rate?.withMarkup ?? null)}
                      className="flex-1 gap-1.5 text-xs"
                    >
                      <Edit2 className="w-3 h-3" />
                      Set Manual Rate
                    </Button>
                    {hasOverride && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => clearManualRate(pair.from, pair.to)}
                        disabled={savingRate}
                        className="flex-1 gap-1.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                      >
                        {savingRate ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Restore Live Rate
                      </Button>
                    )}
                    {!hasOverride && rate?.withMarkup && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSavingRate(true); saveRateToDB(pair.from, pair.to, rate.withMarkup!, rate.raw!).then(() => { setDbRates(p => ({ ...p, [dbKey]: rate.withMarkup! })); toast.success('DB synced with live rate'); }).catch(e => toast.error(e.message)).finally(() => setSavingRate(false)); }}
                        disabled={savingRate}
                        className="flex-1 gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        {savingRate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Sync to DB
                      </Button>
                    )}
                  </div>
                )}

                {hasOverride && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Manual override active — users see <strong className="mx-1">{Number(dbRate).toFixed(4)}</strong>, not live Strowallet rate
                  </div>
                )}

                {rate?.fetched_at && (
                  <p className="text-[10px] text-slate-400 text-right">
                    Fetched {new Date(rate.fetched_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
        <p className="text-sm font-bold text-slate-700">Architecture Note</p>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• <strong>NGN ↔ USD</strong> rates above are sourced from Strowallet and stored in the <code>exchange_rates</code> DB table.</li>
          <li>• <strong>All other currencies</strong> (GBP/NGN, EUR/NGN, USDC/NGN, etc.) continue to use Juicyway FX rates.</li>
          <li>• <strong>{MARKUP_PCT}% markup</strong> is applied to the raw NGN/USD figure: USD→NGN users get ×0.98 NGN per $1; NGN→USD users pay ×1.02 NGN per $1. All rates expressed as NGN per $1.</li>
          <li>• Rates auto-refresh every 30 seconds. Use "Sync to DB" to push live rate to users, or "Set Manual Rate" to override.</li>
        </ul>
      </div>
    </div>
  );
}
