/**
 * StrowalletTestPanel — admin panel to test all Strowallet APIs
 * USD NFC Card + NGN Naira Card + Data Purchase
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ulolufsmjdlramdtstrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

function ResultBox({ result }: { result: any }) {
  if (!result) return null;
  const ok = result?.success !== false;
  return (
    <div className={`mt-3 rounded-xl p-3 text-xs font-mono overflow-auto max-h-64 border ${ok ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
      <pre className="whitespace-pre-wrap break-all">{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}

function useStroApi() {
  const [loading, setLoading] = useState(false);

  const call = async (action: string, payload: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/strowallet-cards`, {
        method: 'POST', headers, body: JSON.stringify({ action, ...payload }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  };

  return { loading, call };
}

// ── USD NFC Card Tests ────────────────────────────────────────────────────────
function USDCardTests() {
  const { loading, call } = useStroApi();
  const [result, setResult] = useState<any>(null);
  const [cardId, setCardId] = useState('');
  const [amount, setAmount] = useState('5');
  const [fundType, setFundType] = useState<'fund' | 'withdraw'>('fund');

  const run = async (action: string, payload = {}) => {
    const r = await call(action, payload);
    setResult(r);
    if (r.success) toast.success(`${action} succeeded`);
    else toast.error(`${action} failed: ${r.error || r.message}`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-700">Card ID (for detail/fund/status tests)</p>
        <Input value={cardId} onChange={e => setCardId(e.target.value)} placeholder="1cebaa9d-d6df-..." />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" disabled={loading} onClick={() => run('fetch_card', { card_id: cardId })}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Fetch Card Details
        </Button>
        <Button variant="outline" disabled={loading} onClick={() => run('card_transactions', { card_id: cardId })}>
          Card Transactions
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-700">Fund / Withdraw Card</p>
        <div className="flex gap-2">
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount USD" />
          <select value={fundType} onChange={e => setFundType(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="fund">Fund</option>
            <option value="withdraw">Withdraw</option>
          </select>
        </div>
        <Button disabled={loading || !cardId} onClick={() => run('fund_withdraw', { card_id: cardId, amount, type: fundType })} className="w-full">
          {fundType === 'fund' ? 'Fund Card' : 'Withdraw from Card'}
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" disabled={loading || !cardId} onClick={() => run('set_status', { card_id: cardId, status: 'frozen' })}>
          Freeze Card
        </Button>
        <Button variant="outline" disabled={loading || !cardId} onClick={() => run('set_status', { card_id: cardId, status: 'active' })}>
          Unfreeze Card
        </Button>
      </div>

      <ResultBox result={result} />
    </div>
  );
}

// ── NGN Naira Card Tests ──────────────────────────────────────────────────────
function NGNCardTests() {
  const { loading, call } = useStroApi();
  const [result, setResult] = useState<any>(null);
  const [cardId, setCardId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [brand, setBrand] = useState('Verve');
  const [provider, setProvider] = useState('black');
  const [newPin, setNewPin] = useState('');

  const run = async (action: string, payload = {}) => {
    const r = await call(action, payload);
    setResult(r);
    if (r.success) toast.success(`${action} succeeded`);
    else toast.error(`${action} failed: ${r.error || r.message}`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-700">Generate Test Card (sandbox)</p>
        <div className="flex gap-2">
          <select value={brand} onChange={e => setBrand(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm">
            <option value="Verve">Verve</option>
            <option value="AfriGo">AfriGo</option>
          </select>
          <Button disabled={loading} onClick={() => run('ngn_generate_test_card', { brand })} className="bg-blue-600">
            Generate Test Card
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-700">Card Operations</p>
        <Input value={cardId} onChange={e => setCardId(e.target.value)} placeholder="NGN card_id" />
        <Input value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="customer_id" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={loading || !cardId} onClick={() => run('ngn_view_card', { card_id: cardId })}>
            View Card
          </Button>
          <Button variant="outline" disabled={loading || !cardId} onClick={() => run('ngn_card_history', { card_id: cardId })}>
            Card History
          </Button>
          <Button variant="outline" disabled={loading || !cardId} onClick={() => run('ngn_set_status', { card_id: cardId, status: 'active' })}>
            Activate
          </Button>
          <Button variant="outline" disabled={loading || !cardId} onClick={() => run('ngn_set_status', { card_id: cardId, status: 'inactive' })}>
            Deactivate
          </Button>
          <Button variant="outline" disabled={loading || !cardId} onClick={() => run('ngn_enable_2fa', { card_id: cardId })}>
            Enable 2FA
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-700">Reset PIN</p>
        <div className="flex gap-2">
          <Input type="password" value={newPin} onChange={e => setNewPin(e.target.value.slice(0,4))} placeholder="New 4-digit PIN" maxLength={4} />
          <select value={provider} onChange={e => setProvider(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="black">black</option>
            <option value="white">white</option>
          </select>
          <Button disabled={loading || !cardId || newPin.length < 4}
            onClick={() => run('ngn_reset_pin', { card_id: cardId, new_pin: newPin, provider })}>
            Reset PIN
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-700">Create Card Customer</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['firstname','First Name'],['lastname','Last Name'],['email','Email'],
            ['phone','Phone (2348...)'],['nin','NIN'],['dob','DOB (YYYY/MM/DD)'],
            ['line1','Address'],['city','City'],['state','State (lg)'],
          ].map(([k,l]) => (
            <div key={k}>
              <Label className="text-[10px] text-gray-500">{l}</Label>
              <Input id={`ngn-${k}`} className="h-8 text-xs mt-0.5" />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <select value={provider} onChange={e => setProvider(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm">
            <option value="black">Provider: black</option>
            <option value="white">Provider: white</option>
          </select>
          <Button disabled={loading} onClick={() => {
            const g = (id: string) => (document.getElementById(`ngn-${id}`) as HTMLInputElement)?.value || '';
            run('ngn_create_customer', {
              firstname: g('firstname'), lastname: g('lastname'), email: g('email'),
              phone: g('phone'), nin: g('nin'), dob: g('dob'),
              name: `border_test_${Date.now()}`,
              line1: g('line1'), city: g('city'), state: g('state'), provider,
            });
          }}>
            Create Customer
          </Button>
        </div>
      </Card>

      <ResultBox result={result} />
    </div>
  );
}

// ── Strowallet Data Tests ─────────────────────────────────────────────────────
function DataTests() {
  const { loading, call } = useStroApi();
  const [result, setResult] = useState<any>(null);
  const [serviceName, setServiceName] = useState('mtn-data');
  const [phone, setPhone] = useState('');
  const [varCode, setVarCode] = useState('');
  const [amount, setAmount] = useState('');

  const run = async (action: string, payload = {}) => {
    const r = await call(action, payload);
    setResult(r);
    if (r.success) toast.success(`${action} succeeded`);
    else toast.error(`${action} failed: ${r.error || r.message}`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-700">Fetch Data Plans</p>
        <div className="flex gap-2">
          <select value={serviceName} onChange={e => setServiceName(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm">
            {['mtn-data','airtel-data','glo-data','etisalat-data','spectranet','smile-direct'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button disabled={loading} onClick={() => run('stro_data_plans', { service_name: serviceName })} className="bg-blue-600">
            Fetch Plans
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-700">Buy Data</p>
        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number (08012345678)" />
        <Input value={varCode} onChange={e => setVarCode(e.target.value)} placeholder="variation_code from plans" />
        <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (NGN)" type="number" />
        <Button disabled={loading || !phone || !varCode || !amount}
          onClick={() => run('stro_buy_data', {
            amount, phone, service_name: serviceName,
            service_id: serviceName, variation_code: varCode,
          })} className="w-full">
          Buy Data
        </Button>
      </Card>

      <ResultBox result={result} />
    </div>
  );
}

// ── KYC / KYB Tests ──────────────────────────────────────────────────────────
function KYCTests() {
  const { loading, call } = useStroApi();
  const [result, setResult] = useState<any>(null);

  // BVN fields
  const [bvnNum, setBvnNum] = useState('');
  const [bvnFirst, setBvnFirst] = useState('');
  const [bvnLast, setBvnLast] = useState('');
  const [bvnDob, setBvnDob] = useState('');
  const [bvnPhone, setBvnPhone] = useState('');
  const [bvnTrx, setBvnTrx] = useState('');
  const [bvnOtp, setBvnOtp] = useState('');
  // NIN fields
  const [ninNum, setNinNum] = useState('');
  const [ninSurname, setNinSurname] = useState('');
  const [ninFirst, setNinFirst] = useState('');
  const [ninDob, setNinDob] = useState('');
  const [ninPhone, setNinPhone] = useState('');
  // CAC fields
  const [cacRc, setCacRc] = useState('');
  const [cacType, setCacType] = useState('RC');
  const [cacEntity, setCacEntity] = useState('RC');
  const [cacName, setCacName] = useState('');
  const [cacSurname, setCacSurname] = useState('');
  const [cacFirst, setCacFirst] = useState('');
  const [cacEmail, setCacEmail] = useState('');
  const [cacPhone, setCacPhone] = useState('');
  const [cacGender, setCacGender] = useState('MALE');
  const [cacCity, setCacCity] = useState('');
  const [cacOccupation, setCacOccupation] = useState('');

  const run = async (action: string, payload = {}) => {
    const r = await call(action, payload);
    setResult(r);
    if (r.success !== false) toast.success(`${action} OK`);
    else toast.error(`${action} failed: ${r.error || r.message}`);
  };

  return (
    <div className="space-y-4">
      {/* Verify BVN */}
      <Card className="p-4 space-y-3">
        <p className="font-bold text-sm text-gray-800">Step 1 — Verify BVN (sends OTP)</p>
        <div className="grid grid-cols-2 gap-2">
          <Input value={bvnNum} onChange={e => setBvnNum(e.target.value)} placeholder="BVN (11 digits)" maxLength={11} />
          <Input value={bvnFirst} onChange={e => setBvnFirst(e.target.value)} placeholder="First Name (CAPS)" />
          <Input value={bvnLast} onChange={e => setBvnLast(e.target.value)} placeholder="Last Name (CAPS)" />
          <Input value={bvnDob} onChange={e => setBvnDob(e.target.value)} placeholder="DOB: DD-MM-YYYY" />
          <Input value={bvnPhone} onChange={e => setBvnPhone(e.target.value)} placeholder="Phone (08012345678)" className="col-span-2" />
        </div>
        <Button disabled={loading} onClick={() => run('kyc_verify_bvn', {
          number: bvnNum, firstName: bvnFirst.toUpperCase(), lastName: bvnLast.toUpperCase(),
          dateOfBirth: bvnDob, phoneNumber: bvnPhone,
        })} className="w-full">Send BVN OTP</Button>
      </Card>

      {/* Confirm BVN OTP */}
      <Card className="p-4 space-y-3">
        <p className="font-bold text-sm text-gray-800">Step 2 — Confirm BVN OTP</p>
        <div className="grid grid-cols-2 gap-2">
          <Input value={bvnTrx} onChange={e => setBvnTrx(e.target.value)} placeholder="trx (from step 1 result)" />
          <Input value={bvnOtp} onChange={e => setBvnOtp(e.target.value)} placeholder="OTP received on phone" />
        </div>
        <Button disabled={loading} onClick={() => run('kyc_confirm_bvn', { trx: bvnTrx, otp: bvnOtp, bvn_number: bvnNum })} className="w-full bg-emerald-600">Confirm OTP</Button>
      </Card>

      {/* Get BVN */}
      <Card className="p-4 space-y-3">
        <p className="font-bold text-sm text-gray-800">Get BVN Details</p>
        <div className="flex gap-2">
          <Input value={bvnNum} onChange={e => setBvnNum(e.target.value)} placeholder="BVN number" className="flex-1" />
          <Button disabled={loading} onClick={() => run('kyc_get_bvn', { number: bvnNum })}>Basic</Button>
          <Button disabled={loading} onClick={() => run('kyc_get_bvn_advance', { number: bvnNum })} className="bg-indigo-600">Advanced</Button>
        </div>
      </Card>

      {/* Verify NIN */}
      <Card className="p-4 space-y-3">
        <p className="font-bold text-sm text-gray-800">Verify NIN</p>
        <div className="grid grid-cols-2 gap-2">
          <Input value={ninNum} onChange={e => setNinNum(e.target.value)} placeholder="NIN (11 digits)" maxLength={11} className="col-span-2" />
          <Input value={ninSurname} onChange={e => setNinSurname(e.target.value)} placeholder="Surname (CAPS)" />
          <Input value={ninFirst} onChange={e => setNinFirst(e.target.value)} placeholder="First Name (CAPS)" />
          <Input value={ninDob} onChange={e => setNinDob(e.target.value)} placeholder="DOB: DD-MM-YYYY" />
          <Input value={ninPhone} onChange={e => setNinPhone(e.target.value)} placeholder="Phone (08012345678)" />
        </div>
        <div className="flex gap-2">
          <Button disabled={loading} onClick={() => run('kyc_verify_nin', {
            number_nin: ninNum, surname: ninSurname.toUpperCase(), firstname: ninFirst.toUpperCase(),
            birthdate: ninDob, telephoneno: ninPhone,
          })} className="flex-1">Verify NIN</Button>
          <Button disabled={loading} onClick={() => run('kyc_get_nin', { number_nin: ninNum })} className="bg-indigo-600">Get NIN Details</Button>
        </div>
      </Card>

      {/* Verify CAC */}
      <Card className="p-4 space-y-3">
        <p className="font-bold text-sm text-gray-800">Verify CAC (Business)</p>
        <div className="grid grid-cols-2 gap-2">
          <Input value={cacRc} onChange={e => setCacRc(e.target.value)} placeholder="RC Number" />
          <select value={cacType} onChange={e => setCacType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="RC">Company Type: RC</option>
            <option value="BN">Company Type: BN</option>
          </select>
          <select value={cacEntity} onChange={e => setCacEntity(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="RC">Entity Type: RC</option>
            <option value="BN">Entity Type: BN</option>
          </select>
          <Input value={cacName} onChange={e => setCacName(e.target.value)} placeholder="Company Name (CAPS)" />
          <Input value={cacSurname} onChange={e => setCacSurname(e.target.value)} placeholder="Director Surname" />
          <Input value={cacFirst} onChange={e => setCacFirst(e.target.value)} placeholder="Director Firstname" />
          <Input value={cacEmail} onChange={e => setCacEmail(e.target.value)} placeholder="Email (on CAC)" />
          <Input value={cacPhone} onChange={e => setCacPhone(e.target.value)} placeholder="Phone (on CAC)" />
          <select value={cacGender} onChange={e => setCacGender(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="MALE">Gender: MALE</option>
            <option value="FEMALE">Gender: FEMALE</option>
          </select>
          <Input value={cacCity} onChange={e => setCacCity(e.target.value)} placeholder="City (from CAC)" />
          <Input value={cacOccupation} onChange={e => setCacOccupation(e.target.value)} placeholder="Occupation (from CAC)" className="col-span-2" />
        </div>
        <div className="flex gap-2">
          <Button disabled={loading} onClick={() => run('kyb_verify_cac', {
            rc_number: cacRc, company_type: cacType, entity_type: cacEntity,
            company_name: cacName.toUpperCase(), surname: cacSurname.toUpperCase(), firstname: cacFirst.toUpperCase(),
            email: cacEmail, phoneNumber: cacPhone, gender: cacGender, city: cacCity, occupation: cacOccupation,
          })} className="flex-1">Verify CAC</Button>
          <Button disabled={loading} onClick={() => run('kyb_get_cac', { rc_number: cacRc, company_type: cacType })} className="bg-indigo-600">Get CAC</Button>
        </div>
      </Card>

      <ResultBox result={result} />
    </div>
  );
}

// ── Link Orphaned Card ────────────────────────────────────────────────────────
function LinkOrphanedCard() {
  const { loading, call } = useStroApi();
  const [result, setResult] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('gizzman21@gmail.com');
  const [cardId, setCardId] = useState('');
  const [holderName, setHolderName] = useState('');
  const [initialBalance, setInitialBalance] = useState('5');

  const handleLink = async () => {
    if (!cardId.trim()) { toast.error('Card ID is required'); return; }
    if (!userEmail.trim()) { toast.error('User email is required'); return; }
    const r = await call('admin_link_card', {
      card_id: cardId.trim(),
      user_email: userEmail.trim(),
      card_holder_name: holderName.trim() || undefined,
      initial_balance: parseFloat(initialBalance) || 5,
      card_type: 'usd_nfc',
      currency: 'USD',
    });
    setResult(r);
    if (r.success) toast.success('Card linked to user successfully!');
    else toast.error(`Failed: ${r.error || r.message}`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border-orange-200 bg-orange-50">
        <p className="font-bold text-orange-800 text-sm">⚠️ Admin Tool — Link Orphaned Card</p>
        <p className="text-xs text-orange-600 mt-1">
          Use this to manually link an existing Strowallet card to a user's profile.
          The card must already exist in Strowallet. This will insert a record into <code>virtual_cards</code>.
        </p>
      </Card>

      <Card className="p-4 space-y-4">
        <div>
          <Label className="text-xs font-semibold text-gray-600">User Email</Label>
          <Input value={userEmail} onChange={e => setUserEmail(e.target.value)}
            placeholder="user@example.com" className="mt-1 h-11" />
          <p className="text-[10px] text-gray-400 mt-0.5">We'll look up the user ID from this email.</p>
        </div>

        <div>
          <Label className="text-xs font-semibold text-gray-600">Strowallet Card ID</Label>
          <Input value={cardId} onChange={e => setCardId(e.target.value)}
            placeholder="e.g. 1cebaa9d-d6df-4abc-..." className="mt-1 h-11 font-mono text-sm" />
          <p className="text-[10px] text-gray-400 mt-0.5">The card_id returned by Strowallet when the card was created.</p>
        </div>

        <div>
          <Label className="text-xs font-semibold text-gray-600">Card Holder Name (optional)</Label>
          <Input value={holderName} onChange={e => setHolderName(e.target.value)}
            placeholder="Will be fetched from Strowallet if blank" className="mt-1 h-11" />
        </div>

        <div>
          <Label className="text-xs font-semibold text-gray-600">Initial Card Balance (USD)</Label>
          <Input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)}
            placeholder="5" className="mt-1 h-11" />
          <p className="text-[10px] text-gray-400 mt-0.5">The spendable balance already on the card (default $5).</p>
        </div>

        <Button onClick={handleLink} disabled={loading || !cardId || !userEmail}
          className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Link Card to User
        </Button>
      </Card>

      <ResultBox result={result} />
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function StrowalletTestPanel() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Strowallet API Test Panel</h1>
        <p className="text-sm text-gray-500 mt-1">Test all Strowallet card and data endpoints. Admin only.</p>
      </div>

      <Tabs defaultValue="usd">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="usd">💳 USD NFC Card</TabsTrigger>
          <TabsTrigger value="ngn">🟩 NGN Card</TabsTrigger>
          <TabsTrigger value="data">📶 Data Purchase</TabsTrigger>
          <TabsTrigger value="kyc">🔐 KYC / KYB</TabsTrigger>
          <TabsTrigger value="link">🔗 Link Card</TabsTrigger>
        </TabsList>
        <TabsContent value="usd" className="mt-4"><USDCardTests /></TabsContent>
        <TabsContent value="ngn" className="mt-4"><NGNCardTests /></TabsContent>
        <TabsContent value="data" className="mt-4"><DataTests /></TabsContent>
        <TabsContent value="kyc" className="mt-4"><KYCTests /></TabsContent>
        <TabsContent value="link" className="mt-4"><LinkOrphanedCard /></TabsContent>
      </Tabs>
    </div>
  );
}
