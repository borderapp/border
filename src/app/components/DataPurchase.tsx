/**
 * DataPurchase — OPay-style data purchase screen
 *
 * Key design decisions:
 * - No manual network selector. Network auto-detected from phone prefix.
 * - Categories are NEVER hardcoded. They are extracted dynamically from the
 *   API response using explicit fields (plan.category / plan.plan_type) first,
 *   then inferred from plan name + validity. New provider categories appear
 *   automatically without any frontend change.
 * - 3-column plan grid with sticky horizontal category tabs.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, History, Phone, Check, Loader2, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createTransactionNotification } from '@/utils/notification-helper';
import TransactionPinModal from './TransactionPinModal';
import { ProviderBadge } from '@/utils/bill-icons';

interface DataPurchaseProps {
  onBack: () => void;
  onSuccess: (receipt: any) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

// Infer category from Strowallet plan name
function inferCategoryFromName(name: string): string {
  const t = name.toLowerCase();
  if (/always.?on|always-on|rollover|nonstop/i.test(t))    return 'Always-On';
  if (/sme/i.test(t))                                       return 'SME';
  if (/corporate|gifting|gift/i.test(t))                    return 'Corporate';
  if (/broadband|router|mifi|modem/i.test(t))               return 'Broadband';
  if (/youtube|social|instagram|whatsapp/i.test(t))         return 'Social';
  if (/night|midnight/i.test(t))                            return 'Night';
  if (/weekend/i.test(t))                                   return 'Weekend';
  if (/60\s*day|90\s*day|2\s*month|3\s*month/i.test(t)) return 'Mega';
  if (/30\s*day|1\s*month|monthly|month/i.test(t))        return 'Monthly';
  if (/14\s*day|2\s*week/i.test(t))                       return 'Weekly';
  if (/7\s*day|week/i.test(t))                             return 'Weekly';
  if (/2\s*day|3\s*day|4\s*day|5\s*day|6\s*day/i.test(t)) return 'Daily';
  if (/1\s*day|24\s*hr|24hr|daily/i.test(t))              return 'Daily';
  return 'Other';
}

// Strowallet service_name per network
const STRO_SERVICE: Record<string, string> = {
  MTN:      'mtn-data',
  Airtel:   'airtel-data',
  Glo:      'glo-data',
  '9mobile':'etisalat-data',
};

// ── Network detection ──────────────────────────────────────────────────────
const PREFIX_MAP: Record<string, 'MTN' | 'Airtel' | 'Glo' | '9mobile'> = {
  '0703':'MTN','0706':'MTN','0803':'MTN','0806':'MTN','0810':'MTN',
  '0813':'MTN','0814':'MTN','0816':'MTN','0903':'MTN','0906':'MTN','0913':'MTN','0916':'MTN',
  '0701':'Airtel','0708':'Airtel','0802':'Airtel','0808':'Airtel','0812':'Airtel',
  '0901':'Airtel','0902':'Airtel','0904':'Airtel','0907':'Airtel','0912':'Airtel',
  '0705':'Glo','0805':'Glo','0807':'Glo','0811':'Glo','0815':'Glo','0905':'Glo','0915':'Glo',
  '0809':'9mobile','0817':'9mobile','0818':'9mobile','0908':'9mobile','0909':'9mobile',
};

const NET: Record<string, { bg: string; fg: string; abbr: string; accent: string }> = {
  MTN:     { bg: '#FFCB05', fg: '#000', abbr: 'MTN', accent: '#f59e0b' },
  Airtel:  { bg: '#CC0000', fg: '#fff', abbr: 'AIR', accent: '#dc2626' },
  Glo:     { bg: '#006633', fg: '#fff', abbr: 'glo', accent: '#16a34a' },
  '9mobile':{ bg: '#00713A', fg: '#fff', abbr: '9mo', accent: '#059669' },
};
const FALLBACK_ACCENT = '#2563eb';

// ── Dynamic category inference ─────────────────────────────────────────────
// Priority order: use explicit API fields first, then infer from text.
// Add new keyword rules here to handle future provider categories without
// touching any other part of the file.
const INFER_RULES: { cat: string; label: string; kw: string[] }[] = [
  { cat: 'hot',       label: 'Hot',         kw: ['hot deal','flash','promo deal'] },
  { cat: 'daily',     label: 'Daily',       kw: ['1 day','2 day','3 day','1day','2day','3day','daily','24hr','24 hour'] },
  { cat: 'weekly',    label: 'Weekly',      kw: ['7 day','7day','14 day','14day','week','weekly'] },
  { cat: 'weekend',   label: 'Weekend',     kw: ['weekend'] },
  { cat: 'monthly',   label: 'Monthly',     kw: ['30 day','30day','monthly','1 month','month'] },
  { cat: 'mega',      label: 'Mega',        kw: ['mega','60 day','90 day','60day','90day','2 month','3 month','bimonthly','quarterly'] },
  { cat: 'sme',       label: 'SME',         kw: ['sme','reseller','wholesale'] },
  { cat: 'corporate', label: 'Corporate',   kw: ['corporate','gifting','gift'] },
  { cat: 'broadband', label: 'Broadband',   kw: ['broadband','router','mifi','modem','fixed','home broadband','office broadband'] },
  { cat: 'always',    label: 'Always-On',   kw: ['always on','always-on','rollover','nonstop'] },
  { cat: 'youtube',   label: 'YouTube',     kw: ['youtube','yt'] },
  { cat: 'social',    label: 'Social',      kw: ['social','whatsapp','instagram','twitter','facebook'] },
  { cat: 'night',     label: 'Night',       kw: ['night','midnight','overnight'] },
  { cat: 'voice',     label: 'Voice+Data',  kw: ['voice','calls','talk'] },
  { cat: 'special',   label: 'Special',     kw: ['special','promo','discount','%','sale'] },
];

function inferCategory(plan: any): { cat: string; label: string } {
  // 1. _category = injected by the edge function when VTUGate returns
  //    a category-keyed object. This is the most reliable source.
  const fromApi = plan._category || plan.category || plan.plan_type || plan.type || plan.group || '';
  if (fromApi) {
    const slug = fromApi.toLowerCase().replace(/\s+/g, '-');
    const rule = INFER_RULES.find(r => slug.includes(r.cat) || r.kw.some(k => slug.includes(k)));
    if (rule) return rule;
    // Unknown explicit category — preserve the provider's label verbatim
    return { cat: slug, label: fromApi };
  }

  // 2. Infer from plan name + validity when no explicit category field
  const txt = `${plan.plan_name || ''} ${plan.validity || ''} ${plan.description || ''}`.toLowerCase();
  for (const rule of INFER_RULES) {
    if (rule.kw.some(k => txt.includes(k))) return rule;
  }
  return { cat: 'other', label: 'Other Plans' };
}

// ── Plan field normalisation ──────────────────────────────────────────────
// VTUGate returns different field names depending on the sub-provider
// (simservers, ringo, vtuplug, demopay, etc). We check every known alias.

// Unique stable key for a plan — used for selection identity
function planKey(plan: any, idx: number): string {
  return plan.plan_code ?? plan.code ?? plan.id ?? plan.plan_id ?? `idx-${idx}`;
}

function getPlanName(plan: any): string {
  return plan.plan_name ?? plan.name ?? plan.title ?? plan.plan ?? plan.bundle ?? plan.description ?? '';
}

function getPrice(plan: any): number {
  return Number(plan.price ?? plan.amount ?? plan.plan_amount ?? plan.cost ?? plan.fee ?? 0);
}

function getOldPrice(plan: any): number {
  return Number(plan.old_price ?? plan.original_price ?? plan.slashed_price ?? plan.crossed_price ?? 0);
}

function getValidity(plan: any): string {
  return plan.validity ?? plan.duration ?? plan.period ?? plan.expiry ?? plan.month ?? plan.days ?? '';
}

function extractDataVol(plan: any): string {
  // Check explicit data-volume fields first
  const explicit = plan.plan_size ?? plan.data_value ?? plan.data ?? plan.size ?? plan.volume ?? plan.allowance ?? plan.mb ?? plan.gb ?? '';
  if (explicit) return String(explicit);
  // Fall back: parse GB/MB/TB from plan name
  const m = getPlanName(plan).match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
  return m ? `${m[1]}${m[2].toUpperCase()}` : '';
}

function extractBenefits(plan: any): string[] {
  const name  = getPlanName(plan).toLowerCase();
  const desc  = (plan.description || plan.benefit || plan.extra || '').toLowerCase();
  const combo = `${name} ${desc}`;
  const bits: string[] = [];
  if (/rollover/i.test(combo))                   bits.push('Rollover Enabled');
  if (/youtube/i.test(combo))                    bits.push('YouTube Included');
  if (/night/i.test(combo))                      bits.push('Night Bonus');
  if (/daily.?alloc|alloc.?daily/i.test(combo))  bits.push('Daily Allocation');
  if (/whatsapp|social|instagram/i.test(combo))  bits.push('Social Bonus');
  if (/unlimited/i.test(combo))                  bits.push('Unlimited Access');
  // Provider-returned bonus fields
  if (plan.night_data)  bits.push(`${plan.night_data} Night`);
  if (plan.bonus)       bits.push(`${plan.bonus} Bonus`);
  return bits.slice(0, 2); // cap at 2 so card stays compact
}

function planBadge(plan: any): { text: string; color: string } | null {
  const name = getPlanName(plan).toLowerCase();
  if (/popular|hot/i.test(name))            return { text: 'Popular',    color: '#f97316' };
  if (/best.?value|recommend/i.test(name))  return { text: 'Best Value', color: '#16a34a' };
  if (/promo|discount|%/i.test(name))       return { text: 'Promo',      color: '#dc2626' };
  if (/rollover|always/i.test(name))        return { text: 'Rollover',   color: '#2563eb' };
  return null;
}

// ── PlanCard ──────────────────────────────────────────────────────────────
function PlanCard({
  plan, idx, selected, accent, onSelect,
}: { plan: any; idx: number; selected: boolean; accent: string; onSelect: () => void }) {
  const vol        = extractDataVol(plan);
  const name       = getPlanName(plan);
  const validity   = getValidity(plan);
  const price      = getPrice(plan);
  const oldPrice   = getOldPrice(plan);
  const benefits   = extractBenefits(plan);
  const badge      = planBadge(plan);
  const discounted = oldPrice > 0 && oldPrice > price;

  // Top label: data volume if parseable, else first 2 words of plan name
  const topLabel = vol || name.split(/\s+/).slice(0, 2).join(' ') || '—';
  // Sub-label: show plan name below volume if it adds context
  const subLabel = vol && name && name !== vol ? name : '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative flex flex-col rounded-2xl p-3 text-left bg-white w-full active:scale-95"
      style={{
        border    : selected ? `2px solid ${accent}` : '1.5px solid #e5e7eb',
        background: selected ? `${accent}10` : '#fff',
        boxShadow : selected ? `0 2px 16px ${accent}30` : '0 1px 3px rgba(0,0,0,0.08)',
        minHeight : 115,
        transition: 'all 0.15s ease',
        cursor    : 'pointer',
      }}
    >
      {/* Checkmark */}
      {selected && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: accent }}>
          <Check className="w-3 h-3 text-white" />
        </span>
      )}

      {/* Badge */}
      {badge && !selected && (
        <span className="absolute top-2 right-2 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none"
          style={{ background: badge.color }}>
          {badge.text}
        </span>
      )}

      {/* ── Data volume (top, largest) ── */}
      <p className="text-[15px] font-extrabold text-gray-900 leading-snug pr-6">
        {topLabel}
      </p>

      {/* ── Plan name if different from volume ── */}
      {subLabel && (
        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight pr-6 truncate">
          {subLabel}
        </p>
      )}

      {/* ── Validity + benefits ── */}
      <div className="flex-1 mt-1 space-y-0.5">
        {validity && (
          <p className="text-[11px] text-gray-500">{validity}</p>
        )}
        {benefits.map((b, i) => (
          <p key={i} className="text-[10px] font-semibold truncate" style={{ color: accent }}>{b}</p>
        ))}
      </div>

      {/* ── Price (bottom) ── */}
      <div className="mt-2 pt-1.5 border-t border-gray-100">
        <p className="text-[13px] font-bold leading-none"
          style={{ color: selected ? accent : '#111827' }}>
          ₦{price.toLocaleString()}
        </p>
        {discounted && (
          <p className="text-[10px] text-gray-400 line-through mt-0.5">
            ₦{oldPrice.toLocaleString()}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function DataPurchase({ onBack, onSuccess }: DataPurchaseProps) {
  const [phone, setPhone]               = useState('');
  const [network, setNetwork]           = useState<string | null>(null);
  const [activeSvcId, setActiveSvcId]   = useState<string | null>(null);
  const [rawPlans, setRawPlans]         = useState<any[]>([]);    // VTUGate plans (shown as "Other Plans")
  const [stroPlans, setStroPlans]       = useState<any[]>([]);    // Strowallet plans (shown first)
  const [stroServiceName, setStroServiceName] = useState<string>('');
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [activeTab, setActiveTab]       = useState('all');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paying, setPaying]             = useState(false);
  const [showPin, setShowPin]           = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const accent = network ? (NET[network]?.accent || FALLBACK_ACCENT) : FALLBACK_ACCENT;
  const netStyle = network ? NET[network] : null;

  // ── API helpers ──────────────────────────────────────────────────────────
  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const h: Record<string, string> = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY };
    if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
    return h;
  };

  const vtu = async (action: string, payload: Record<string, any>) => {
    const headers = await getHeaders();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/vtugate`, {
      method: 'POST', headers, body: JSON.stringify({ action, ...payload }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) throw new Error(d.error || 'Request failed');
    return d;
  };

  // ── Auto-detect network from phone ───────────────────────────────────────
  const lastFetchedNetwork = useRef<string | null>(null);

  useEffect(() => {
    if (phone.length >= 4) {
      const detected = PREFIX_MAP[phone.substring(0, 4)] || null;
      setNetwork(detected);
    } else {
      setNetwork(null);
      setRawPlans([]);
      setStroPlans([]);
      setSelectedPlan(null);
      setActiveTab('all');
      setActiveSvcId(null);
      lastFetchedNetwork.current = null;
    }
  }, [phone]);

  // ── Fetch ALL plans for the detected network (multi service_id) ──────────
  useEffect(() => {
    if (!network || network === lastFetchedNetwork.current) return;
    lastFetchedNetwork.current = network;
    // Wrap in async IIFE — useEffect callbacks cannot be async directly
    ;(async () => {

    setRawPlans([]); setStroPlans([]); setSelectedPlan(null); setLoadingPlans(true); setActiveTab('all');

    const stroServiceId = STRO_SERVICE[network];

    // Get auth headers once — needed for both Strowallet and VTUGate calls
    const authHeaders = await getHeaders();

    // Fetch Strowallet plans + VTUGate plans in parallel
    const stroFetch = stroServiceId
      ? fetch(`${SUPABASE_URL}/functions/v1/strowallet-cards`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ action: 'stro_data_plans', service_name: stroServiceId }),
        })
          .then(async r => {
            const d = await r.json();
            return d;
          })
          .catch(() => null)
      : Promise.resolve(null);

    const vtuFetch = vtu('fetch_network_data_plans', { network_name: network }).catch(e => {
    });

    Promise.all([stroFetch, vtuFetch]).then(([stro, vtuData]) => {
      // Strowallet plans — shown first
      if (stro?.success && stro.variations?.length) {
        const sp = stro.variations.map((v: any) => ({
          plan_name:      v.name,
          plan_code:      v.variation_code,
          price:          parseFloat(v.variation_amount),
          _source:        'strowallet',
          _service_name:  stro.service_name,
          _service_id:    stroServiceId,
          _category:      inferCategoryFromName(v.name),
        }));
        setStroPlans(sp);
        setStroServiceName(stro.service_name || stroServiceId || '');
      }

      // VTUGate plans — shown as "Other Plans"
      if (vtuData) {
        const plans: any[] = vtuData.data?.data_plans ?? [];
        const firstSvcId = plans.find(p => p._service_id)?._service_id ?? null;
        setActiveSvcId(firstSvcId);
        setRawPlans(Array.isArray(plans) ? plans : []);
      }
    }).catch(() => {})
      .finally(() => setLoadingPlans(false));
    })(); // end async IIFE
  }, [network]);

  // ── Build categories dynamically from API data ───────────────────────────
  // This is intentionally data-driven: no categories are hardcoded.
  // When a new provider returns a new category, it shows up automatically.
  const { tabs, grouped } = useMemo(() => {
    const map: Record<string, { label: string; plans: any[] }> = {};

    for (const plan of rawPlans) {
      const { cat, label } = inferCategory(plan);
      if (!map[cat]) map[cat] = { label, plans: [] };
      map[cat].plans.push(plan);
    }

    // Sort tabs: keep 'hot' first, then alphabetical by label, 'other' last
    const sorted = Object.entries(map).sort(([a], [b]) => {
      if (a === 'hot') return -1;
      if (b === 'hot') return 1;
      if (a === 'other') return 1;
      if (b === 'other') return -1;
      return map[a].label.localeCompare(map[b].label);
    });

    const tabs = [
      { cat: 'all', label: 'All' },
      ...sorted.map(([cat, { label }]) => ({ cat, label })),
    ];

    return { tabs, grouped: map };
  }, [rawPlans]);

  // ── Plans for the active tab ─────────────────────────────────────────────
  const visiblePlans = useMemo(() => {
    if (activeTab === 'all') return rawPlans;
    return grouped[activeTab]?.plans ?? [];
  }, [activeTab, rawPlans, grouped]);

  // ── Purchase ─────────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!selectedPlan || phone.length < 11) {
      toast.error('Enter a valid phone number and select a plan');
      return;
    }
    const planCode   = selectedPlan.plan_code || selectedPlan.code || selectedPlan.id;
    const isStrowallet = selectedPlan._source === 'strowallet';
    const serviceId  = selectedPlan._service_id || activeSvcId;

    if (!planCode) { toast.error('Plan code missing — pick another plan'); return; }
    if (!isStrowallet && !serviceId) { toast.error('Service ID missing — please retry'); return; }

    setPaying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      const planPrice = Number(selectedPlan.price || selectedPlan.amount || 0);

      // Route to Strowallet or VTUGate based on plan source
      if (isStrowallet) {
        const headers = await getHeaders();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/strowallet-cards`, {
          method: 'POST', headers,
          body: JSON.stringify({
            action: 'stro_buy_data',
            amount: String(planPrice),
            phone,
            service_name: selectedPlan._service_name || stroServiceName,
            service_id: selectedPlan._service_id,
            variation_code: planCode,
            user_id: user.id,
          }),
        });
        const d = await res.json();
        if (!res.ok || (!d.success && d.success !== undefined)) throw new Error(d.error || 'Strowallet purchase failed');
      } else {
        await vtu('buy_data', { service_id: serviceId, phone_number: phone, amount: planPrice, plan_code: planCode });
      }

      const ref = `VTU-DATA-${Date.now()}`;
      const networkName = network || 'Data';
      const planName = getPlanName(selectedPlan);
      const description = `${networkName} ${planName} — ${phone}`;

      // ── CRITICAL: Deduct balance and record transaction BEFORE showing success ──
      
      // Deduct from wallet
      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('wallets').eq('id', user.id).single();
      
      if (profileErr) {
        throw new Error('Could not fetch wallet balance');
      }

      if (profile?.wallets) {
        const w = { ...profile.wallets };
        const currentBalance = w['NGN'] || 0;
        
        if (currentBalance < planPrice) {
          throw new Error('Insufficient balance');
        }
        
        w['NGN'] = Math.max(0, currentBalance - planPrice);
        
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ wallets: w })
          .eq('id', user.id);
        
        if (updateErr) {
          throw new Error('Failed to update wallet balance');
        }
        
      }

      // Record transaction
      const { error: txErr } = await supabase.from('transactions').insert({
        user_id: user.id, 
        type: 'BILL_PAYMENT', 
        amount: planPrice, 
        currency: 'NGN',
        status: 'completed', 
        description, 
        reference: ref, 
        transaction_reference: ref,
        provider: 'vtugate',
        metadata: { 
          category: 'data', 
          network: networkName, 
          plan: planName,
          phone_number: phone,
        },
      });
      
      if (txErr) {
        // Don't throw - transaction succeeded, just logging failed
      } else {
      }

      // Send notification
      try {
        await createTransactionNotification(user.id, 'sent', planPrice, 'NGN', description, ref);
      } catch (notifErr) {
      }

      // Show success with receipt
      toast.success('Data purchase successful! Balance updated.');
      onSuccess({
        description, 
        amount: planPrice, 
        reference: ref,
        network: networkName, 
        plan: planName,
        phone, 
        status: 'Completed', 
        date: new Date().toLocaleString('en-NG'), 
        category: 'data',
      });
    } catch (e: any) {
      toast.error(e.message || 'Payment failed');
    } finally { setPaying(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#f5f6fa", zIndex: 60 }}>

      {/* ── Header ── */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <span className="text-[17px] font-bold text-gray-900">Buy Data</span>
        </div>
        <button className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: accent }}>
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* ── Body — own scroll context so horizontal sub-scroll works on iOS ── */}
      <div style={{ flex: 1, overflowY: "scroll", WebkitOverflowScrolling: "touch", paddingBottom: 160 }}>

        {/* Phone number section */}
        <div className="bg-white mx-4 mt-4 rounded-2xl border border-gray-200 flex items-center px-4 py-3 gap-3 shadow-sm">
          {/* Network indicator — brand badge */}
          {netStyle ? (
            <div className="shrink-0">
              <ProviderBadge name={network!} size={40} />
              {netStyle.abbr}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-gray-400" />
            </div>
          )}

          <div className="w-px h-6 bg-gray-200 shrink-0" />

          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').substring(0, 11))}
            placeholder="Enter phone number"
            className="flex-1 text-[15px] font-medium text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />

          <div className="flex items-center gap-2 shrink-0">
            {phone.length > 0 && (
              <button onClick={() => setPhone('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
            <button className="text-gray-400">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Network detected label */}
        {network && (
          <p className="mx-5 mt-2 text-xs text-gray-400">
            Detected: <span className="font-bold" style={{ color: accent }}>{network}</span>
          </p>
        )}

        {/* ── Empty state ── */}
        {!network && !loadingPlans && (
          <div className="flex flex-col items-center justify-center pt-24 pb-16 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
              <Phone className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-600 font-semibold text-base">Enter a phone number</p>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              The network will be detected automatically and plans will load instantly.
            </p>
          </div>
        )}

        {/* ── Loading ── */}
        {loadingPlans && (
          <div className="flex flex-col items-center justify-center pt-24">
            <Loader2 className="w-9 h-9 animate-spin mb-4" style={{ color: accent }} />
            <p className="text-sm text-gray-400 font-medium">Loading data plans…</p>
          </div>
        )}

        {/* ── Plans area ── */}
        {network && !loadingPlans && (stroPlans.length > 0 || rawPlans.length > 0) && (
          <>
            {/* Section heading */}
            <div className="px-4 pt-5 pb-2 flex items-center justify-between">
              <span className="text-[15px] font-bold text-gray-900">Data Plans</span>
              <span className="text-xs text-gray-400">{stroPlans.length + rawPlans.length} plans available</span>
            </div>

            {/* ── Unified Kanban — Strowallet + VTUGate columns side by side ── */}
            {(() => {
              // Build all columns: Strowallet first, then VTUGate
              const allColumns: { key: string; cat: string; plans: any[]; source: 'stro' | 'vtu' }[] = [];

              // Strowallet columns
              const stroGrouped = new Map<string, any[]>();
              for (const p of stroPlans) {
                const cat = p._category || 'Other';
                if (!stroGrouped.has(cat)) stroGrouped.set(cat, []);
                stroGrouped.get(cat)!.push(p);
              }
              stroGrouped.forEach((plans, cat) => allColumns.push({ key: `stro-${cat}`, cat, plans, source: 'stro' }));

              // VTUGate columns
              const vtuGrouped = new Map<string, any[]>();
              for (const p of rawPlans) {
                const { label } = inferCategory(p);
                if (!vtuGrouped.has(label)) vtuGrouped.set(label, []);
                vtuGrouped.get(label)!.push(p);
              }
              vtuGrouped.forEach((plans, cat) => allColumns.push({ key: `vtu-${cat}`, cat, plans, source: 'vtu' }));

              if (allColumns.length === 0) return null;

              return (
                <div style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', whiteSpace: 'nowrap', padding: '8px 16px 24px' }}>
                  {allColumns.map(({ key, cat, plans }) => (
                    <div key={key} style={{ display: 'inline-block', verticalAlign: 'top', width: 140, marginRight: 12, whiteSpace: 'normal' }}>
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg mb-2" style={{ background: accent + '18' }}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                        <span className="text-[11px] font-bold uppercase tracking-wide truncate" style={{ color: accent, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</span>
                        <span className="text-[10px] text-gray-400" style={{ marginLeft: 'auto', flexShrink: 0 }}>{plans.length}</span>
                      </div>
                      <div>
                        {plans.map((plan, i) => {
                          const k = planKey(plan, i);
                          return (
                            <div key={`${key}-${i}`} style={{ marginBottom: 8 }}>
                              <PlanCard
                                plan={plan}
                                idx={i}
                                selected={!!(selectedPlan && planKey(selectedPlan, -1) === k)}
                                accent={accent}
                                onSelect={() => setSelectedPlan(prev => prev && planKey(prev, -1) === k ? null : plan)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* ── Bottom action bar — flex footer, always within the fixed screen ── */}
      {selectedPlan && (
        <div className="bg-white border-t border-gray-100 px-4 pt-4"
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
          <div className="max-w-md mx-auto space-y-3">
            {/* Summary */}
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 font-medium">Selected Plan</p>
                <p className="text-[14px] font-bold text-gray-900 truncate mt-0.5">
                  {extractDataVol(selectedPlan) || getPlanName(selectedPlan)}
                </p>
                {getValidity(selectedPlan) && (
                  <p className="text-xs text-gray-400 mt-0.5">{getValidity(selectedPlan)}</p>
                )}
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-xs text-gray-400 font-medium">Amount</p>
                <p className="text-[22px] font-extrabold mt-0.5" style={{ color: accent }}>
                  ₦{getPrice(selectedPlan).toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={() => { if (phone.length >= 11 && selectedPlan) setShowPin(true); }}
              disabled={paying || phone.length < 11}
              className="w-full py-4 rounded-2xl text-white text-base font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
              style={{ background: paying ? '#9ca3af' : accent }}
            >
              {paying
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
                : 'Continue'}
            </button>

            {phone.length < 11 && (
              <p className="text-center text-xs text-amber-500">
                Enter an 11-digit phone number to continue
              </p>
            )}
          </div>
        </div>
      )}
      {/* PIN modal at root level so its overlay doesn't block the action bar */}
      {selectedPlan && (
        <TransactionPinModal
          isOpen={showPin}
          onCancel={() => setShowPin(false)}
          onSuccess={() => { setShowPin(false); handlePay(); }}
          amount={getPrice(selectedPlan)}
          currency="NGN"
          description={`${network || ''} ${getPlanName(selectedPlan)} — ${phone}`}
        />
      )}
    </div>
  );
}