import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDealerJourney, type DealerJourneyPlan } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';
import { useDealerAnnualPricing } from '@/hooks/useDealerAnnualPricing';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { annualProductActive, isAnnualQuoteSnapshot, potentialProfit, validSellingPrice } from '@/lib/dealerAnnualPricing';
import { buildCustomerQuoteUrl, customerQuoteMessage, type CustomerQuotePayload } from '@/lib/customerQuoteSharing';
import { ArrowRight, Check, Circle, Eye, Store, Pencil, ShieldCheck, Wrench, FileText, Save, MessageCircle, Mail, Printer, Link2, Loader2, Coins, Infinity, Car, Zap, ChevronDown, Share2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
const gbp = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: Number.isInteger(n) ? 0 : 2 });
const normaliseReg = (value: string) => value.replace(/\s+/g, '').toUpperCase();

const Step3Pricing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dealer, loading } = useDealerAuth();
  const { vehicle, customer, plan: savedPlan, setPlan, setVehicle, quoteId } = useDealerJourney();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingReg, setEditingReg] = useState(false);
  const [regInput, setRegInput] = useState('');
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'error'>('idle');
  const [lookupMsg, setLookupMsg] = useState('');

  const lookupVehicle = async (rawReg: string) => {
    const cleaned = normaliseReg(rawReg);
    if (!/^[A-Z0-9]{2,8}$/.test(cleaned)) { setLookup('error'); setLookupMsg('Enter a valid UK registration.'); return; }
    setLookup('loading'); setLookupMsg('');
    try {
      const { data, error: lookupError } = await supabase.functions.invoke('dvla-vehicle-lookup', { body: { registration: cleaned } });
      if (lookupError || !data?.make) {
        // Lookup unavailable or vehicle not found — continue with the reg so the dealer can still quote.
        setVehicle({ reg: cleaned });
        setLookup('idle'); setEditingReg(false);
        return;
      }
      if (data.manufactureDate) {
        const ageYears = (Date.now() - new Date(data.manufactureDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (ageYears > 15) { setLookup('error'); setLookupMsg('Sorry, we only cover vehicles under 150,000 miles and less than 15 years old.'); return; }
      }
      setVehicle({ reg: cleaned, make: data.make, model: data.model, year: data.yearOfManufacture ? String(data.yearOfManufacture) : undefined, fuel_type: data.fuelType });
      setLookup('idle'); setEditingReg(false);
    } catch {
      setVehicle({ reg: cleaned });
      setLookup('idle'); setEditingReg(false);
    }
  };

  useEffect(() => {
    const regParam = searchParams.get('reg');
    if (regParam && normaliseReg(regParam) !== vehicle?.reg) {
      setRegInput(normaliseReg(regParam));
      void lookupVehicle(regParam);
      searchParams.delete('reg');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { data: config, isLoading: pricingLoading, error: pricingError, refetch } = useDealerAnnualPricing(dealer?.id);
  const { save, saving } = useDealerQuoteSave(3);
  const { toast } = useToast();
  const [view, setView] = useState<'trade' | 'customer'>('trade');
  const [term, setTerm] = useState<number | null>(savedPlan?.duration_months || null);
  const [prices, setPrices] = useState<Record<string, number>>(() => isAnnualQuoteSnapshot(savedPlan?.selected_options) ? ({ ...(savedPlan?.selected_options?.selling_prices || {}), ...(savedPlan ? { [savedPlan.duration_months]: savedPlan.retail_price } : {}) }) : {});
  const [exact, setExact] = useState(false);
  const [exactValue, setExactValue] = useState('');
  const [error, setError] = useState('');
  const [paylink, setPaylink] = useState('');
  const [details, setDetails] = useState(false);
  const [emailQuote, setEmailQuote] = useState<string | null>(null);
  const [email, setEmail] = useState(customer?.email || '');
  const [emailBusy, setEmailBusy] = useState(false);
  const historical = Boolean(savedPlan && isAnnualQuoteSnapshot(savedPlan.selected_options) && term === savedPlan.duration_months);
  const product = config?.terms.find(p => p.months === term);
  const cost = historical && savedPlan ? savedPlan.dealer_price : product?.dealer_price || 0;
  const retail = term ? prices[term] ?? product?.retail_price ?? 0 : 0;
  const cover = historical && savedPlan?.selected_options ? {
    excess: Number(savedPlan.selected_options.excess ?? config?.cover.excess ?? 0),
    labour: Number(savedPlan.selected_options.labour ?? config?.cover.labour ?? 100),
    claim: Number(savedPlan.selected_options.claim ?? config?.cover.claim ?? 2000),
    parts: savedPlan.selected_options.parts_key || config?.cover.parts || 'age-mileage',
  } : config?.cover;
  const valid = Boolean(product && annualProductActive(product) && validSellingPrice(retail, product) && vehicle?.reg);
  const trade = view === 'trade';
  const termLabel = term ? `${term / 12} ${term === 12 ? 'year' : 'years'}` : '';
  const summary = [{ label: 'Warranty term', value: termLabel }, { label: 'Customer excess', value: gbp(cover?.excess || 0) }, { label: 'Labour rate', value: `${gbp(cover?.labour || 0)}/hour` }, { label: 'Per eligible claim', value: gbp(cover?.claim || 0) }];
  const payload: CustomerQuotePayload = { vehicle, coverTitle: 'Comprehensive Warranty', price: retail, specs: summary, dealerName: dealer?.company_name, included: ['Mechanical & electrical cover', 'UK claims support'], coverSubtitle: quoteId ? `Quote ${quoteId.slice(0, 8).toUpperCase()}` : 'Warranty quotation' };
    const buildPlan = (): DealerJourneyPlan => ({ plan_type: 'gold', duration_months: term || 0, term_months: term || 0, dealer_price: cost, retail_price: retail,
    selected_options: { ...(historical ? savedPlan?.selected_options : {}), warranty_type: 'fully-covered', label: 'Comprehensive Warranty', term: termLabel, ...cover, parts_key: cover?.parts, claim: cover?.claim, add_ons: historical ? savedPlan?.selected_options?.add_ons || [] : [], price_basis: 'annual-product', product_id: historical ? savedPlan?.selected_options?.product_id : config?.product_id, pricing_version: historical ? savedPlan?.selected_options?.pricing_version : config?.version, customer_price: retail / 1.2, customer_price_mode: 'custom', selling_prices: prices } });
  const persist = async (next = false) => {
    if (!valid) { setError('Choose an available warranty and a valid customer selling price.'); return null; }
    setError(''); const plan = buildPlan(); setPlan(plan);
    const id = await save({ overridePlan: plan, silent: true });
    if (!id) { setError('Your quote could not be saved. Please try again.'); return null; }
    if (next) navigate('/dealer-portal/quote/customer');
    else toast({ title: `Quote saved in Quotes: ${id.slice(0, 8).toUpperCase()}` });
    return id;
  };
  const share = async (action: 'whatsapp' | 'email' | 'print' | 'pay') => {
    const id = await persist(); if (!id) return;
    const safePayload = { ...payload, coverSubtitle: `Quote ${id.slice(0, 8).toUpperCase()}` };
    const url = new URL(buildCustomerQuoteUrl(safePayload), window.location.origin);
    if (action === 'pay') { url.searchParams.set('pay', id); setPaylink(url.href); return; }
    if (action === 'print') { url.searchParams.set('print', '1'); window.open(url.href, '_blank', 'noopener,noreferrer'); return; }
    const message = customerQuoteMessage(safePayload, url.href);
    if (action === 'email') setEmailQuote(id);
    else window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };
  if (!loading && !dealer) return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (!vehicle?.reg || editingReg) return <DealerLayout>
    <div className="mx-auto w-full max-w-md space-y-4 px-1 pb-6 text-crm-navy">
      <div className="text-center">
        <h1 className="text-2xl font-bold leading-8">Get a warranty quote</h1>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">Enter the vehicle registration to see your prices.</p>
      </div>
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); void lookupVehicle(regInput); }} noValidate>
        <div className="vehicle-reg-plate vehicle-reg-plate--quote">
          <span className="vehicle-reg-plate__country" aria-hidden="true">GB<span>UK</span></span>
          <input
            value={regInput}
            onChange={event => { setRegInput(normaliseReg(event.target.value).slice(0, 8)); if (lookupMsg) setLookupMsg(''); }}
            placeholder="ENTER REG"
            aria-label="Vehicle registration"
            maxLength={8}
            autoFocus
            className="vehicle-reg-plate__input"
            onFocus={event => event.currentTarget.select()}
            onMouseUp={event => event.preventDefault()}
          />
        </div>
        {lookupMsg && <p role="alert" className="text-sm font-semibold text-destructive">{lookupMsg}</p>}
        <Button type="submit" disabled={lookup === 'loading' || !regInput.trim()} className="h-14 w-full gap-2 !bg-crm-orange text-base font-bold !text-primary-foreground hover:!bg-crm-orange/90">
          {lookup === 'loading' ? <><Loader2 className="h-5 w-5 animate-spin" />Looking up vehicle…</> : <>Get prices<ArrowRight className="h-5 w-5" /></>}
        </Button>
        {editingReg && vehicle?.reg && <Button type="button" variant="link" className="h-auto w-full p-0 text-xs" onClick={() => { setEditingReg(false); setLookupMsg(''); }}>Cancel — keep {vehicle.reg}</Button>}
      </form>
    </div>
  </DealerLayout>;
  return <DealerLayout><div className="mx-auto max-w-[1240px] space-y-3 pb-6 text-crm-navy [&_h1]:!text-2xl [&_h1]:!leading-8 [&_h1]:!text-crm-navy [&_h2]:!text-lg [&_h2]:!leading-6 [&_h2]:!text-crm-navy [&_h3]:!text-sm [&_h3]:!leading-5 [&_h3]:!text-crm-navy [&_h1]:!m-0 [&_h2]:!m-0 [&_h3]:!m-0">
    <header className="grid items-center gap-4 min-[1100px]:grid-cols-[1fr_auto]">
      <div><h1 className="font-bold">Choose your warranty</h1><p className="mt-1 text-sm leading-5 text-muted-foreground">Select how many years of cover you want.</p></div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-crm-line bg-card px-3 py-3">
        <div className="w-36 shrink-0"><div className="vehicle-reg-plate vehicle-reg-plate--list"><span className="vehicle-reg-plate__country">GB<span>UK</span></span><span className="vehicle-reg-plate__text">{vehicle?.reg || 'ENTER REG'}</span></div></div>
        <div><p className="text-sm font-bold">{[vehicle?.make, vehicle?.model].filter(Boolean).join(' ')}</p><p className="mt-1 text-xs text-muted-foreground">{[vehicle?.year, vehicle?.fuel_type, vehicle?.mileage != null ? `${Number(vehicle.mileage).toLocaleString('en-GB')} miles` : null].filter(Boolean).join(' · ')}</p></div>
        {trade && <Button variant="outline" size="sm" onClick={() => { setRegInput(vehicle?.reg || ''); setEditingReg(true); }}><Pencil />Change vehicle</Button>}
      </div>
    </header>
    <div className="grid max-w-lg grid-cols-2 gap-3" role="group" aria-label="Quote view">
      <Button variant="outline" aria-pressed={trade} onClick={() => setView('trade')} className={`h-11 justify-start ${trade ? '!border-crm-orange !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90' : '!border-crm-line !bg-card !text-crm-navy'}`}><Store />Trade View</Button>
      <Button variant="outline" aria-pressed={!trade} onClick={() => setView('customer')} className={`h-11 justify-start ${!trade ? '!border-crm-orange !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90' : '!border-crm-line !bg-card !text-crm-navy'}`}><Eye />Customer View</Button>
    </div>
    {(pricingLoading || loading) && <p role="status">Loading warranty prices…</p>}
    {pricingError && <div role="alert" className="flex items-center gap-3 text-destructive">Warranty prices are unavailable.<Button variant="outline" onClick={() => refetch()}>Try again</Button></div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Warranty duration">
      {[12, 24, 36].map(months => {
        const p = config?.terms.find(item => item.months === months); const available = p && annualProductActive(p);
        const cardCost = isAnnualQuoteSnapshot(savedPlan?.selected_options) && savedPlan?.duration_months === months ? savedPlan.dealer_price : p?.dealer_price;
        const cardRetail = prices[months] ?? p?.retail_price;
        const shown = trade ? cardCost : cardRetail;
        const selected = term === months;
        return <button type="button" role="radio" aria-checked={selected} key={months} disabled={!available} onClick={() => { setTerm(months); setError(''); }} className={`relative flex flex-col rounded-xl border-2 bg-card p-4 text-left text-crm-navy transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange disabled:opacity-60 ${selected ? 'border-crm-orange bg-crm-orange-soft' : 'border-crm-line hover:border-crm-navy/30'}`}>
          <span className="flex items-start justify-between gap-2"><span className="text-2xl font-extrabold leading-7">{months / 12} {months === 12 ? 'Year' : 'Years'}</span>{selected ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-crm-green text-primary-foreground"><Check className="h-4 w-4" strokeWidth={3} /></span> : <Circle className="h-6 w-6 text-muted-foreground" />}</span>
          <span className="text-sm text-muted-foreground">Warranty cover</span>
          <strong className="mt-2 text-4xl font-extrabold leading-10">{shown != null ? gbp(shown) : '—'}</strong>
          {!trade && <span className="text-xs text-muted-foreground">inc. VAT</span>}
          {trade && cardRetail != null && cardCost != null && <span className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-crm-gold-soft px-3 py-2 text-lg font-extrabold text-crm-gold-deep"><Coins className="h-5 w-5" />Profit: {gbp(potentialProfit(cardRetail, cardCost))}</span>}
          {!available && <span className="mt-2 text-xs">Unavailable</span>}
        </button>;
      })}
    </div>
    {cover && <section className="grid grid-cols-2 gap-4 rounded-xl border border-crm-line bg-card p-4 lg:grid-cols-4" aria-label="Included warranty benefits">
      {[{ icon: ShieldCheck, title: gbp(cover.claim), text: 'per eligible claim' }, { icon: Infinity, title: 'Unlimited', text: 'claims' }, { icon: Car, title: 'Up to the', text: 'value of the vehicle' }, { icon: Wrench, title: `${gbp(cover.labour)}/hour`, text: 'labour' }].map(b => <div key={b.text} className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"><b.icon className="h-5 w-5" /></span><p className="text-sm leading-5"><strong className="block text-base">{b.title}</strong><span className="text-muted-foreground">{b.text}</span></p></div>)}
    </section>}
    <section className="flex items-center gap-3 rounded-xl border border-crm-line bg-card p-4" aria-label="£5,000 claim limit boost">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"><Zap className="h-5 w-5 text-crm-navy" /></span>
      <div className="min-w-0 flex-1"><h2 className="font-bold text-crm-navy">£5,000 Claim Limit Boost</h2><p className="text-xs leading-4 text-muted-foreground">Increase the per-claim limit to £5,000.</p></div>
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Coming soon</span>
      <Switch disabled checked={false} aria-label="Add claim limit boost (not available yet)" />
    </section>
    <Collapsible className="rounded-xl border border-crm-line bg-card">
      <CollapsibleTrigger className="group flex w-full items-center gap-3 p-4 text-left font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange"><FileText className="h-5 w-5" /><span className="flex-1 text-lg">What's covered?</span><ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden px-4 pb-4 text-sm text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">Full cover details are coming soon. <button type="button" className="font-semibold text-crm-navy underline" onClick={() => setDetails(true)}>View current cover summary</button></CollapsibleContent>
    </Collapsible>
    <section className="grid items-stretch gap-4 pt-2 md:grid-cols-[1.2fr_1fr]" aria-label="Quote summary">
      {trade ? <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-crm-gold-soft to-crm-gold/40 p-5">
        <Coins className="h-14 w-14 shrink-0 text-crm-gold-deep" />
        <div className="min-w-0 border-l-2 border-crm-gold/50 pl-4">
          <p className="text-xl font-extrabold tracking-wide text-crm-gold-deep">PROFIT</p>
          <strong className="block text-5xl font-black leading-[3.25rem] text-crm-gold-deep sm:text-6xl sm:leading-[4rem]">{term ? gbp(potentialProfit(retail, cost)) : '—'}</strong>
          {term && <p className="text-xs text-crm-gold-deep">Customer pays {gbp(retail)} · your cost {gbp(cost)} <button type="button" className="font-semibold underline" onClick={() => { setExactValue(String(retail)); setExact(true); }}>Change</button></p>}
        </div>
      </div> : <div className="flex items-center rounded-2xl border border-crm-line bg-card p-5"><p className="text-sm text-muted-foreground">Customer price<strong className="block text-4xl font-extrabold text-crm-navy">{term ? gbp(retail) : '—'}</strong>inc. VAT</p></div>}
      <div className="grid grid-cols-2 gap-3">
        {trade && <Button variant="outline" className="h-12 !border-crm-line !bg-card !text-crm-navy" disabled={saving || !valid} onClick={() => persist()}><Save />Save quote</Button>}
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className={`h-12 !border-crm-line !bg-card !text-crm-navy ${trade ? '' : 'col-span-2'}`} disabled={saving || !valid}><Share2 />Share quote</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => share('whatsapp')}><MessageCircle />WhatsApp</DropdownMenuItem><DropdownMenuItem onClick={() => share('email')}><Mail />Email</DropdownMenuItem><DropdownMenuItem onClick={() => share('print')}><Printer />Print</DropdownMenuItem>{trade && <DropdownMenuItem onClick={() => share('pay')}><Link2 />Customer payment link</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
        {trade && <Button className="col-span-2 h-14 text-base font-bold !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90" disabled={saving || !valid} onClick={() => persist(true)}>Continue to customer details<ArrowRight /></Button>}
      </div>
    </section>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <p className="text-xs text-muted-foreground">Including VAT. Subject to vehicle eligibility and policy terms.</p>
  </div>
  <Dialog open={exact} onOpenChange={setExact}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[380px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Customer selling price</DialogTitle></DialogHeader><Input aria-label="Exact customer selling price" type="number" step="0.01" min={product?.min_price} max={product?.max_price ?? undefined} value={exactValue} onChange={e => setExactValue(e.target.value)} /><p className="text-xs text-muted-foreground">Including VAT. Minimum {gbp(product?.min_price || 0)}{product?.max_price != null ? `, maximum ${gbp(product.max_price)}` : ''}.</p><Button disabled={!product || !validSellingPrice(Number(exactValue), product)} onClick={() => { if (term) setPrices(p => ({ ...p, [term]: Math.round(Number(exactValue) * 100) / 100 })); setExact(false); }}>Apply price</Button></DialogContent></Dialog>
  <Dialog open={!!emailQuote} onOpenChange={open => !open && setEmailQuote(null)}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[380px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Email customer quote</DialogTitle></DialogHeader><Input type="email" aria-label="Customer email address" placeholder="Customer email address" value={email} onChange={e => setEmail(e.target.value)} /><Button disabled={emailBusy || !email.includes('@')} onClick={async () => { setEmailBusy(true); const { data, error: sendError } = await supabase.functions.invoke('dealer-quote-email', { body: { quote_id: emailQuote, email } }); setEmailBusy(false); if (sendError || !data?.sent) { toast({ title: data?.error || 'Email could not be sent. Please try again.', variant: 'destructive' }); return; } setEmailQuote(null); toast({ title: 'Customer quote emailed' }); }}>{emailBusy ? 'Sending…' : 'Send quote'}</Button></DialogContent></Dialog>
  <Dialog open={details} onOpenChange={setDetails}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[480px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Warranty cover details</DialogTitle></DialogHeader><dl className="space-y-3">{summary.map(s => <div key={s.label} className="flex justify-between"><dt>{s.label}</dt><dd className="font-bold">{s.value}</dd></div>)}</dl><p className="text-sm text-muted-foreground">Mechanical and electrical cover is subject to vehicle eligibility, servicing requirements and policy terms. Refer to the full terms for covered components, contributions and exclusions.</p><a href="/terms/" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline">Full cover details &amp; exclusions</a></DialogContent></Dialog>
  <Dialog open={!!paylink} onOpenChange={open => !open && setPaylink('')}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[480px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Customer payment link</DialogTitle></DialogHeader><a href={paylink} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline">Open customer quote</a><Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(paylink); toast({ title: 'Payment link copied' }); }}>Copy link</Button><p className="text-sm text-muted-foreground">Your customer pays securely by card. Warranty documents follow confirmation by your dealer.</p></DialogContent></Dialog>
  </DealerLayout>;
};
export default Step3Pricing;
