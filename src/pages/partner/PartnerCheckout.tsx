import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { pandaLogoUrl } from '@/lib/pandaLogo';
import { partnerTotal, type PartnerTerm } from '@/lib/partnerCheckout';
import { Check, Loader2, Lock, ShieldCheck, Zap } from 'lucide-react';

interface Info { partner: { name: string; mode: string }; dealer: { name: string }; terms: PartnerTerm[]; cover: { claim: number; boost_claim: number | null; excess: number; labour: number } }
const gbp = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0 })}`;
const years = (m: number) => `${m / 12} ${m === 12 ? 'year' : 'years'}`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const PartnerCheckout: React.FC = () => {
  const [params] = useSearchParams();
  const partner = params.get('p') || '';
  const dealer = params.get('d') || '';
  const [info, setInfo] = useState<Info | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reg, setReg] = useState((params.get('reg') || '').toUpperCase());
  const [vehicle, setVehicle] = useState<{ make?: string; model?: string; year?: string } | null>(null);
  const [mileage, setMileage] = useState('');
  const [looking, setLooking] = useState(false);
  const [months, setMonths] = useState<number>(36);
  const [boost, setBoost] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address_line1: '', town: '', postcode: '' });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [testDone, setTestDone] = useState(false);

  useEffect(() => {
    supabase.functions.invoke('partner-checkout', { body: { partner, dealer } }).then(({ data, error }) => {
      if (error || data?.error) setLoadError(data?.error || 'This warranty link is not active right now.');
      else setInfo(data);
    });
  }, [partner, dealer]);

  const lookup = async () => {
    const cleaned = reg.replace(/\s+/g, '').toUpperCase();
    if (cleaned.length < 2) return setError('Please enter the vehicle registration.');
    setLooking(true); setError('');
    const { data } = await supabase.functions.invoke('dvla-vehicle-lookup', { body: { registrationNumber: cleaned } });
    setLooking(false);
    const year = data?.yearOfManufacture ? String(data.yearOfManufacture) : undefined;
    if (year && new Date().getFullYear() - Number(year) > 15) { setVehicle(null); return setError('Protection is designed for vehicles up to 15 years old and 150,000 miles.'); }
    setVehicle({ make: data?.make, model: data?.model, year });
    if (data?.lastMotMileage != null && !mileage) setMileage(String(data.lastMotMileage));
  };

  const term = useMemo(() => info?.terms.find((t) => t.months === months), [info, months]);
  const total = partnerTotal(term, boost);
  const miles = Number(mileage.replace(/[^0-9]/g, ''));

  const pay = async () => {
    setError('');
    if (!vehicle) return setError('Please find the vehicle first.');
    if (!miles || miles > 150000) return setError('Please enter the mileage. Protection is designed for vehicles up to 150,000 miles.');
    if (!form.name.trim() || !EMAIL_RE.test(form.email) || form.phone.replace(/\D/g, '').length < 10 || !form.address_line1.trim() || !form.town.trim() || form.postcode.trim().length < 5) return setError('Please fill in all your details.');
    if (!agree) return setError('Please confirm you have read the terms and conditions.');
    setPaying(true);
    const { data, error } = await supabase.functions.invoke('partner-checkout', {
      body: { action: 'checkout', partner, dealer, months, boost, reference: params.get('ref') || undefined, vehicle: { reg: reg.replace(/\s+/g, ''), make: vehicle.make, model: vehicle.model, year: vehicle.year, mileage: miles }, customer: form },
    });
    setPaying(false);
    if (error || data?.error) return setError(data?.error || 'Payment could not be started. Please try again.');
    if (data.test) return setTestDone(true);
    window.location.href = data.checkout_url;
  };

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div className="space-y-1.5">
      <Label htmlFor={`pc-${key}`}>{label}</Label>
      <Input id={`pc-${key}`} type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Panda Protect warranty checkout</title><meta name="robots" content="noindex" /></Helmet>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <img src={pandaLogoUrl} alt="Panda Protect" className="h-9 w-auto" />
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Secure checkout</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {loadError && <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm font-medium text-destructive">{loadError}</p>}
        {!info && !loadError && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
        {info && testDone && (
          <div className="rounded-xl border border-border p-6 text-center">
            <Check className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-2 text-xl font-bold">Test checkout complete</h1>
            <p className="mt-1 text-sm text-muted-foreground">This partner link is in test mode, so no payment was taken and no warranty was created. A test update was sent to {info.partner.name}.</p>
          </div>
        )}
        {info && !testDone && (<>
          <div>
            <h1 className="text-2xl font-bold">Panda Protect Platinum Warranty</h1>
            <p className="text-sm text-muted-foreground">Offered by {info.dealer.name}. You pay Panda Protect directly.</p>
            {info.partner.mode === 'test' && <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold">TEST MODE · no payment will be taken</p>}
            {info.partner.mode === 'live_test' && <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold">LIVE TEST · no payment will be taken and no warranty is created</p>}
          </div>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <h2 className="text-base font-semibold md:text-lg">1. Your vehicle</h2>
            <div className="flex gap-2">
              <Input aria-label="Registration" value={reg} onChange={(e) => { setReg(e.target.value.toUpperCase()); setVehicle(null); }} placeholder="ENTER REG" className="font-bold uppercase tracking-wider" />
              <Button type="button" onClick={lookup} disabled={looking} variant="secondary">{looking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}</Button>
            </div>
            {vehicle && <p className="flex items-center gap-1.5 text-sm"><Check className="h-4 w-4 text-primary" /> {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || reg}</p>}
            <div className="space-y-1.5"><Label htmlFor="pc-miles">Current mileage</Label><Input id="pc-miles" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="e.g. 45000" /></div>
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <h2 className="text-base font-semibold md:text-lg">2. Choose your cover</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {info.terms.map((t) => (
                <button key={t.months} type="button" onClick={() => setMonths(t.months)} className={`rounded-lg border-2 p-3 text-left transition ${months === t.months ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <span className="block text-sm font-semibold">{years(t.months)}</span>
                  <span className="block text-lg font-bold">{gbp(t.price)}</span>
                </button>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Up to {gbp(info.cover.claim)} per eligible claim · {gbp(info.cover.excess)} excess · {gbp(info.cover.labour)}/hour labour</p>
            {term?.boost_price != null && info.cover.boost_claim && (
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                <Checkbox checked={boost} onCheckedChange={(v) => setBoost(v === true)} />
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm">Boost claims to {gbp(info.cover.boost_claim)} for {gbp(term.boost_price)}</span>
              </label>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <h2 className="text-base font-semibold md:text-lg">3. Your details</h2>
            {field('name', 'Full name')}
            <div className="grid gap-3 sm:grid-cols-2">{field('email', 'Email', 'email')}{field('phone', 'Mobile number', 'tel')}</div>
            {field('address_line1', 'Address')}
            <div className="grid grid-cols-2 gap-3">{field('town', 'Town')}{field('postcode', 'Postcode')}</div>
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
              <span>I have read the <a href="/what-is-covered/" target="_blank" rel="noopener" className="font-semibold underline">cover details</a> and <a href="/terms/" target="_blank" rel="noopener" className="font-semibold underline">terms and conditions</a>.</span>
            </label>
            {error && <p role="alert" className="text-sm font-bold text-destructive">{error}</p>}
            <Button type="button" className="h-12 w-full text-base font-bold" onClick={pay} disabled={paying}>
              {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Pay {gbp(total)} securely</>}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Full refund within 14 days. Questions? Call 0330 229 6547, Monday to Saturday 9am to 6pm.</p>
          </section>
        </>)}
      </main>
    </div>
  );
};
export default PartnerCheckout;
