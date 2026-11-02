import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import DealerFieldError from '@/components/dealer/DealerFieldError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDealerJourney, type DealerJourneyPlan } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';
import { useDealerAnnualPricing } from '@/hooks/useDealerAnnualPricing';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { annualProductActive, boostForTerm, isAnnualQuoteSnapshot, potentialProfit, sellingPriceOptions, stepSellingPrice, validSellingPrice } from '@/lib/dealerAnnualPricing';
import { buildCustomerQuoteUrl, customerQuoteMessage, type CustomerQuotePayload } from '@/lib/customerQuoteSharing';
import { Check, ArrowRight, Eye, Store, Pencil, ShieldCheck, Wrench, FileText, Save, MessageCircle, Mail, Printer, Link2, Loader2, Coins, Infinity, Car, Zap, ChevronDown, Share2, TrendingUp, Gauge, Download } from 'lucide-react';
import platinumPlanDoc from '@/assets/panda-protect-platinum-warranty-plan.pdf.asset.json';
import termsDoc from '@/assets/panda-protect-terms-and-conditions.pdf.asset.json';
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
  const [mileageInput, setMileageInput] = useState(vehicle?.mileage != null ? String(vehicle.mileage) : '');
  const commitMileage = (raw: string) => {
    const n = Number(raw.replace(/[^0-9]/g, ''));
    if (vehicle && raw.trim() !== '' && Number.isFinite(n)) setVehicle({ ...vehicle, mileage: n } as any);
  };
  const stepMileage = (delta: number) => {
    const current = Number(mileageInput.replace(/[^0-9]/g, '')) || Number(vehicle?.mileage) || 0;
    const next = Math.max(0, current + delta);
    setMileageInput(String(next));
    commitMileage(String(next));
  };

  const lookupVehicle = async (rawReg: string) => {
    const cleaned = normaliseReg(rawReg);
    if (!/^[A-Z0-9]{2,8}$/.test(cleaned)) { setLookup('error'); setLookupMsg('Enter a valid UK registration.'); return; }
    setLookup('loading'); setLookupMsg('');
    try {
      const { data, error: lookupError } = await supabase.functions.invoke('dvla-vehicle-lookup', { body: { registrationNumber: cleaned } });
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
      setVehicle({ reg: cleaned, make: data.make, model: data.model, year: data.yearOfManufacture ? String(data.yearOfManufacture) : undefined, fuel_type: data.fuelType, ...(data.lastMotMileage != null ? { mileage: Number(data.lastMotMileage) } : {}) } as any);
      if (data.lastMotMileage != null) setMileageInput(String(data.lastMotMileage));
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
  // Saved quotes store totals including any boost; the page works with base warranty prices.
  const savedOpts = (savedPlan?.selected_options || {}) as Record<string, any>;
  const savedBoostCost = savedOpts.boost === true ? Number(savedOpts.boost_dealer_price || 0) : 0;
  const savedBoostRetail = savedOpts.boost === true ? Number(savedOpts.boost_retail_price || 0) : 0;
  const [prices, setPrices] = useState<Record<string, number>>(() => isAnnualQuoteSnapshot(savedPlan?.selected_options) ? ({ ...(savedPlan?.selected_options?.selling_prices || {}), ...(savedPlan ? { [savedPlan.duration_months]: savedPlan.retail_price - savedBoostRetail } : {}) }) : {});
  const [boost, setBoost] = useState<boolean>(savedOpts.boost === true);
  const [exact, setExact] = useState(false);
  const [exactValue, setExactValue] = useState('');
  const [error, setError] = useState('');
  const [paylink, setPaylink] = useState('');
  const [details, setDetails] = useState(false);
  const [emailQuote, setEmailQuote] = useState<string | null>(null);
  const [email, setEmail] = useState(customer?.email || '');
  const [emailBusy, setEmailBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const boostCfg = config?.boost?.active ? config.boost : null;
  const boostOn = Boolean(boost && boostCfg);
  const selectedBoost = boostOn && boostCfg && term ? boostForTerm(boostCfg, term) : null;
  const boostLead = boostCfg?.terms?.length ? boostCfg.terms.reduce((a, b) => (b.dealer_price < a.dealer_price ? b : a)) : boostCfg;
  const boostCost = selectedBoost ? selectedBoost.dealer_price : 0;
  const boostRetail = selectedBoost ? selectedBoost.retail_price : 0;
  const historical = Boolean(savedPlan && isAnnualQuoteSnapshot(savedPlan.selected_options) && term === savedPlan.duration_months);
  const product = config?.terms.find(p => p.months === term);
  const baseCost = historical && savedPlan ? savedPlan.dealer_price - savedBoostCost : product?.dealer_price || 0;
  const baseRetail = term ? prices[term] ?? product?.retail_price ?? 0 : 0;
  const cost = baseCost + boostCost;
  const retail = baseRetail + boostRetail;
  const baseClaim = Number(config?.cover.claim ?? (savedOpts.boost === true ? undefined : savedOpts.claim) ?? 3000);
  const baseCover = historical && savedPlan?.selected_options ? {
    excess: Number(savedPlan.selected_options.excess ?? config?.cover.excess ?? 0),
    labour: Number(savedPlan.selected_options.labour ?? config?.cover.labour ?? 100),
    claim: baseClaim,
    parts: savedPlan.selected_options.parts_key || config?.cover.parts || 'age-mileage',
  } : config?.cover;
  const cover = baseCover ? { ...baseCover, claim: boostOn && boostCfg ? boostCfg.claim_limit : baseCover.claim } : baseCover;
  const valid = Boolean(product && annualProductActive(product) && validSellingPrice(baseRetail, product) && vehicle?.reg);
  const trade = view === 'trade';
  const termLabel = term ? `${term / 12} ${term === 12 ? 'year' : 'years'}` : '';
  const summary = [{ label: 'Warranty term', value: termLabel }, { label: 'Customer excess', value: gbp(cover?.excess || 0) }, { label: 'Labour rate', value: `${gbp(cover?.labour || 0)}/hour` }, { label: 'Per eligible claim', value: gbp(cover?.claim || 0) }];
  const payload: CustomerQuotePayload = { vehicle, coverTitle: 'Comprehensive Warranty', price: retail, specs: summary, dealerName: dealer?.company_name, included: ['Mechanical & electrical cover', 'UK claims support', ...(boostOn ? ['£5,000 claim limit boost'] : [])], coverSubtitle: quoteId ? `Quote ${quoteId.slice(0, 8).toUpperCase()}` : 'Warranty quotation' };
    const buildPlan = (): DealerJourneyPlan => ({ plan_type: 'gold', duration_months: term || 0, term_months: term || 0, dealer_price: cost, retail_price: retail,
    selected_options: { ...(historical ? savedPlan?.selected_options : {}), warranty_type: 'fully-covered', label: 'Comprehensive Warranty', term: termLabel, ...cover, parts_key: cover?.parts, claim: cover?.claim, add_ons: historical ? savedPlan?.selected_options?.add_ons || [] : [], price_basis: 'annual-product', product_id: historical ? savedPlan?.selected_options?.product_id : config?.product_id, pricing_version: historical ? savedPlan?.selected_options?.pricing_version : config?.version, customer_price: retail / 1.2, customer_price_mode: 'custom', selling_prices: prices, boost: boostOn, boost_dealer_price: boostCost, boost_retail_price: boostRetail } });
  const persist = async (next = false) => {
    if (!valid) { setError('Choose an available warranty and a valid customer selling price.'); return null; }
    setError(''); const plan = buildPlan(); setPlan(plan);
    const id = await save({ overridePlan: plan, silent: true });
    if (!id) { setError('Your quote could not be saved. Please try again.'); return null; }
    if (next) { sessionStorage.setItem('dealer_confetti_light', '1'); navigate('/dealer-portal/quote/customer'); }
    else toast({ title: `Draft saved for ${vehicle?.reg}` });
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
  /** Opens the customer-safe quote in its own tab so the trade view never shares a screen with it. */
  const openCustomerTab = async () => {
    if (opening) return;
    if (!valid) { setError('Choose a warranty length and a valid customer selling price before opening the customer view.'); return; }
    setOpening(true);
    // The tab must open inside the click itself, or the browser blocks it; it is pointed at the quote once saved.
    const tab = window.open('about:blank', '_blank');
    const id = await persist();
    if (!id) { tab?.close(); setOpening(false); return; }
    const safePayload = { ...payload, coverSubtitle: `Quote ${id.slice(0, 8).toUpperCase()}` };
    const url = new URL(buildCustomerQuoteUrl(safePayload), window.location.origin);
    url.searchParams.set('pay', id);
    if (tab) tab.location.href = url.href;
    else setError('Your browser blocked the new tab. Allow pop-ups for this site and try again.');
    setOpening(false);
  };
  if (!loading && !dealer) return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <DealerLayout><div className="mx-auto max-w-[1240px] space-y-3 pb-6 text-crm-navy [&_h1]:!text-2xl [&_h1]:!leading-8 [&_h1]:!text-crm-navy [&_h2]:!text-lg [&_h2]:!leading-6 [&_h2]:!text-crm-navy [&_h3]:!text-sm [&_h3]:!leading-5 [&_h3]:!text-crm-navy [&_h1]:!m-0 [&_h2]:!m-0 [&_h3]:!m-0">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="font-bold">Choose your warranty</h1><p className="mt-1 text-sm leading-5 text-muted-foreground">{vehicle?.reg ? 'Confirm mileage and select your cover.' : 'Enter the registration to see the vehicle and confirm mileage.'}</p></div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Quote view">
        <Button variant="outline" aria-pressed={trade} aria-label="Trade View" onClick={() => setView('trade')} className={`h-10 gap-2 px-4 font-bold ${trade ? '!border-crm-orange !bg-crm-orange-soft !text-crm-orange' : '!border-crm-line !bg-card !text-crm-navy'}`}><Store />TV</Button>
        <Button variant="outline" aria-label="Open Customer View in a new tab" title="Opens the customer quote in a new tab" disabled={opening} onClick={() => { void openCustomerTab(); }} className={`h-10 gap-2 px-4 font-bold !border-crm-orange !bg-crm-orange-soft !text-crm-orange`}>{opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye />}CV</Button>
      </div>
    </header>
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-crm-line bg-card px-4 py-3" aria-label="Vehicle">
      {!vehicle?.reg || editingReg ? (
        <form className="flex w-full flex-wrap items-center gap-3" onSubmit={event => { event.preventDefault(); void lookupVehicle(regInput); }} noValidate>
          <div className="vehicle-reg-plate vehicle-reg-plate--quote w-44 shrink-0 sm:w-56">
            <span className="vehicle-reg-plate__country" aria-hidden="true">GB<span>UK</span></span>
            <input value={regInput} onChange={event => { setRegInput(normaliseReg(event.target.value).slice(0, 8)); if (lookupMsg) setLookupMsg(''); }} placeholder="ENTER REG" aria-label="Vehicle registration" maxLength={8} autoFocus className="vehicle-reg-plate__input" onFocus={event => event.currentTarget.select()} onMouseUp={event => event.preventDefault()} />
          </div>
          <Button type="submit" disabled={lookup === 'loading' || !regInput.trim()} className="h-11 gap-2 px-5 font-bold !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90">{lookup === 'loading' ? <><Loader2 className="h-4 w-4 animate-spin" />Looking up vehicle…</> : <>Get prices<ArrowRight className="h-4 w-4" /></>}</Button>
          {editingReg && vehicle?.reg && <Button type="button" variant="link" className="h-auto p-0 text-xs font-semibold" onClick={() => { setEditingReg(false); setLookupMsg(''); }}>Cancel — keep {vehicle.reg}</Button>}
          {lookupMsg && <div className="w-full"><DealerFieldError>{lookupMsg}</DealerFieldError></div>}
        </form>
      ) : (
        <>
          <div className="w-40 shrink-0"><div className="vehicle-reg-plate vehicle-reg-plate--list"><span className="vehicle-reg-plate__country">GB<span>UK</span></span><span className="vehicle-reg-plate__text">{vehicle?.reg}</span></div></div>
          <div className="min-w-0 flex-1"><p className="text-lg font-extrabold leading-6">{[vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'Vehicle'}</p><p className="text-sm text-muted-foreground">{[vehicle?.year, vehicle?.fuel_type].filter(Boolean).join(' · ')}</p></div>
          <Button variant="outline" className="h-10 !border-crm-line !bg-card font-bold !text-crm-navy" onClick={() => { setRegInput(vehicle?.reg || ''); setEditingReg(true); }}><Pencil />Change vehicle</Button>
        </>
      )}
    </section>
    {vehicle?.reg && (() => { const n = Number(mileageInput.replace(/[^0-9]/g, '')); const confirmed = mileageInput !== '' && Number(vehicle?.mileage) === n; return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-crm-line bg-muted/60 px-4 py-3" aria-label="Current mileage">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-crm-line bg-card"><Gauge className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="text-base font-extrabold leading-5">Current mileage</p><p className="text-xs text-muted-foreground">Update in steps of 100 or type the figure.</p></div>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Reduce mileage by 100 miles" onClick={() => stepMileage(-100)} className="flex h-10 w-10 items-center justify-center rounded-md border border-crm-line bg-card text-lg font-bold hover:border-crm-orange">&minus;</button>
        <input inputMode="numeric" aria-label="Current mileage" value={mileageInput ? n.toLocaleString('en-GB') : ''} placeholder="Enter mileage"
          onChange={(e) => setMileageInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))} onBlur={(e) => commitMileage(e.target.value)}
          className="h-10 w-32 rounded-md border border-crm-line bg-card px-3 text-center text-base font-bold text-crm-navy focus:border-crm-orange focus:outline-none" />
        <button type="button" aria-label="Increase mileage by 100 miles" onClick={() => stepMileage(100)} className="flex h-10 w-10 items-center justify-center rounded-md border border-crm-line bg-card text-lg font-bold hover:border-crm-orange">+</button>
        <span className="ml-1 text-sm font-semibold text-muted-foreground">miles</span>
      </div>
      {confirmed ? <span className="flex h-10 items-center gap-1.5 rounded-md border border-crm-green bg-crm-green-soft px-3 text-sm font-bold text-crm-green-deep"><Check className="h-4 w-4" />Mileage confirmed</span>
        : <Button variant="outline" className="h-10 !border-crm-orange !bg-card font-bold !text-crm-orange" onClick={() => commitMileage(mileageInput)}>Confirm mileage</Button>}
    </section>); })()}
    {(pricingLoading || loading) && <p role="status">Loading warranty prices…</p>}
    {pricingError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm font-bold text-destructive"><span className="flex items-start gap-1.5"><span aria-hidden="true">&bull;</span><span>Warranty prices are unavailable.</span></span><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>}
    <section aria-label="Warranty length">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Warranty duration">
        {[12, 24, 36].map(months => {
          const p = config?.terms.find(item => item.months === months); const available = p && annualProductActive(p);
          const cardBoost = boostOn && boostCfg ? boostForTerm(boostCfg, months) : null;
          const baseCardCost = isAnnualQuoteSnapshot(savedPlan?.selected_options) && savedPlan?.duration_months === months ? savedPlan.dealer_price - savedBoostCost : p?.dealer_price;
          const baseCardRetail = prices[months] ?? p?.retail_price;
          const cardCost = baseCardCost != null ? baseCardCost + (cardBoost?.dealer_price || 0) : undefined;
          const cardRetail = baseCardRetail != null ? baseCardRetail + (cardBoost?.retail_price || 0) : undefined;
          const shown = trade ? cardCost : cardRetail;
          const selected = term === months;
          return <button type="button" role="radio" aria-checked={selected} key={months} disabled={!available} onClick={() => { setTerm(months); setError(''); }} className={`relative flex flex-col rounded-xl border-2 p-4 text-left text-crm-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange disabled:opacity-60 ${selected ? 'border-crm-orange bg-crm-orange-soft' : 'border-crm-line bg-card hover:border-crm-navy/30'}`}>
            <span className="flex items-start justify-between gap-2">
              <strong className="text-xl font-black leading-6">{months / 12} Year Warranty</strong>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-crm-orange bg-card' : 'border-muted-foreground/40 bg-card'}`}>{selected && <span className="h-3 w-3 rounded-full bg-crm-orange" />}</span>
            </span>
            <span className="mt-2 text-3xl font-black leading-9">{shown != null ? gbp(shown) : '—'}</span>
            <span className="text-sm text-muted-foreground">{trade ? `Dealer cost: ${cardCost != null ? gbp(cardCost) : '—'}` : 'per vehicle, inc. VAT'}</span>
            {trade && cardRetail != null && cardCost != null && <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-crm-green/25 bg-crm-green-soft px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-crm-green-deep"><TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Profit {gbp(Math.round(potentialProfit(cardRetail, cardCost)))}</span>}
            {!available && <span className="mt-2 text-xs">Unavailable</span>}
          </button>;
        })}
      </div>
    </section>
    {cover && <section className="grid grid-cols-2 gap-3 px-1 py-1 lg:grid-cols-4" aria-label="Included warranty benefits">
      {[{ icon: ShieldCheck, title: gbp(cover.claim), text: 'per eligible claim' }, { icon: Infinity, title: 'Unlimited', text: 'claims' }, { icon: Car, title: 'Up to the value', text: 'of the vehicle' }, { icon: Wrench, title: `${gbp(cover.labour)}/hour`, text: 'labour' }].map(b => <div key={b.text} className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"><b.icon className="h-5 w-5" /></span><p className="text-sm leading-5"><strong className="block text-base">{b.title}</strong><span className="text-muted-foreground">{b.text}</span></p></div>)}
    </section>}
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${boostOn ? 'border-crm-orange bg-crm-orange-soft' : 'border-crm-orange/40 bg-crm-orange-soft/60'} ${boostCfg ? '' : 'cursor-not-allowed opacity-60'}`} aria-label="£5,000 claim limit boost">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card"><Zap className="h-5 w-5 text-crm-orange" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold leading-5">£5,000 Claim Limit Boost</span>
        <span className="block text-sm leading-5 text-muted-foreground">{boostOn ? 'Added. Each eligible claim is now covered up to £5,000.' : `Increase the per-claim limit from ${gbp(baseClaim)} to £5,000.`}</span>
      </span>
      {boostCfg && <span className="hidden whitespace-nowrap text-sm font-bold sm:inline">{term ? `Only ${gbp(trade ? (boostForTerm(boostCfg, term)?.dealer_price ?? 0) : (boostForTerm(boostCfg, term)?.retail_price ?? 0))}` : `From only ${gbp(trade ? (boostLead?.dealer_price ?? 0) : (boostLead?.retail_price ?? 0))}`}</span>}
      <Switch disabled={!boostCfg} checked={boostOn} onCheckedChange={v => { setBoost(v); setError(''); }} aria-label="Add £5,000 claim limit boost" />
    </label>
    <Collapsible className="rounded-xl border border-crm-line bg-card">
      <CollapsibleTrigger className="group flex w-full items-center gap-3 p-3 text-left font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><FileText className="h-5 w-5" /></span><span className="flex-1 text-base">What's covered?</span><ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden px-4 pb-4 text-sm text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"><p className="font-bold text-crm-navy">Parts and labour covered</p>
        <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">{['Engine internals', 'Gearbox (manual and automatic)', 'Turbo and supercharger', 'Electrical systems and ECUs', 'Steering', 'Cooling system', 'Clutch system', 'Fuel system', 'Air conditioning', 'Braking system (ABS, servo, callipers)', 'Heating and ventilation', 'Suspension', 'Drive system', 'Safety systems'].map(i => <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-crm-green-deep" />{i}</li>)}</ul>
        <p className="mt-4 font-bold text-crm-navy">What the warranty is designed for</p>
        <p className="mt-1">Mechanical and electrical failures. It is not designed for pre-existing faults, routine servicing, tyres, brake pads and wear items, accident damage, trader-owned vehicles, or hire and reward use (taxis, rentals, couriers).</p>
        <p className="mt-4 font-bold text-crm-navy">Download the documents</p>
        <p className="mt-1">The latest versions, in full, so you can check every detail before you sell.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <a href={platinumPlanDoc.url} download="Panda-Protect-Platinum-Warranty-Plan.pdf" className="flex items-center gap-3 rounded-xl border border-crm-orange/30 bg-crm-orange-soft px-4 py-3 transition-colors hover:border-crm-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crm-orange"><Check className="h-4 w-4 text-white" /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold text-crm-navy">Platinum Warranty Cover (PDF)</strong><span className="block text-xs text-muted-foreground">50 pages &middot; what we cover</span></span>
            <Download className="h-4 w-4 shrink-0 text-crm-navy" />
          </a>
          <a href={termsDoc.url} download="Panda-Protect-Terms-and-Conditions.pdf" className="flex items-center gap-3 rounded-xl border border-crm-green/30 bg-crm-green-soft px-4 py-3 transition-colors hover:border-crm-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-green">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crm-green"><Check className="h-4 w-4 text-white" /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold text-crm-navy">Terms &amp; Conditions (PDF)</strong><span className="block text-xs text-muted-foreground">29 pages &middot; full terms and exclusions</span></span>
            <Download className="h-4 w-4 shrink-0 text-crm-navy" />
          </a>
        </div>
        <a href="/terms/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold text-crm-navy underline">Read the terms online</a></CollapsibleContent>
    </Collapsible>
    <section className="grid gap-3 pt-2" aria-label="Quote summary">
      <div className="flex flex-wrap items-center gap-3">
      {trade ? <div className="flex shrink-0 items-stretch gap-3 rounded-[10px] border border-crm-line bg-card px-3 py-2">
        <span aria-hidden className="w-1 shrink-0 rounded-full bg-crm-orange" />
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-crm-navy">Profit</p>
          <strong className="block text-3xl font-black leading-9 text-crm-gold">{term ? gbp(Math.round(potentialProfit(retail, cost))) : '—'}</strong>
          {term && <button type="button" className="mt-0.5 text-xs font-semibold text-crm-navy underline" onClick={() => { setExactValue(String(baseRetail)); setExact(true); }}>Change price</button>}
        </div>
      </div> : <div className="flex shrink-0 items-center rounded-[10px] border border-crm-line bg-card px-3 py-2"><p className="text-xs text-muted-foreground">Customer price<strong className="block text-3xl font-extrabold text-crm-navy">{term ? gbp(retail) : '—'}</strong>inc. VAT</p></div>}
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        {trade && <Button variant="outline" className="h-12 !border-crm-line !bg-card font-bold !text-crm-navy" disabled={saving || !valid} onClick={() => persist()}><Save />Save draft</Button>}
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className={`h-12 !border-crm-line !bg-card font-bold !text-crm-navy ${trade ? '' : ''}`} disabled={saving || !valid}><Share2 />Share quote</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => share('whatsapp')}><MessageCircle />WhatsApp</DropdownMenuItem><DropdownMenuItem onClick={() => share('email')}><Mail />Email</DropdownMenuItem><DropdownMenuItem onClick={() => share('print')}><Printer />Print</DropdownMenuItem>{trade && <DropdownMenuItem onClick={() => share('pay')}><Link2 />Customer payment link</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
      </div></div>
      <div className="grid gap-2">
        {trade && <Button className="h-14 w-full px-6 text-lg font-extrabold animate-breathing !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90 sm:w-auto" disabled={saving || !valid} onClick={() => persist(true)}>Continue to customer details<ArrowRight /></Button>}
        {trade && <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground"><ShieldCheck className="h-4 w-4 text-crm-green" />Secure checkout · No payment taken yet · You can edit everything on the next step</p>}
      </div>
    </section>
    {error && <DealerFieldError>{error}</DealerFieldError>}
    {!vehicle?.reg ? <p className="text-xs font-bold text-crm-orange">Enter the vehicle registration above to save or continue.</p> : <p className="text-xs text-muted-foreground">Including VAT. Subject to vehicle eligibility and policy terms.</p>}
  </div>
  <Dialog open={exact} onOpenChange={setExact}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[380px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Customer selling price</DialogTitle></DialogHeader>{(() => { const opts = sellingPriceOptions(product, Number(exactValue) || 0); const lo = opts[0] ?? 0; const hi = opts[opts.length - 1] ?? lo; const cur = Number(exactValue); const step = (d: number) => { if (!product) return; setExactValue(String(stepSellingPrice(cur, d > 0 ? 1 : -1, product))); }; return <div className="space-y-3"><div className="flex items-center justify-between gap-3"><Button type="button" variant="outline" className="h-14 w-14 text-2xl font-bold" aria-label="Lower price by £100" disabled={cur <= lo} onClick={() => step(-100)}>−</Button><strong className="text-4xl font-black text-crm-navy">{gbp(cur || 0)}</strong><Button type="button" variant="outline" className="h-14 w-14 text-2xl font-bold" aria-label="Raise price by £100" disabled={cur >= hi} onClick={() => step(100)}>+</Button></div><select aria-label="Customer selling price" className="h-12 w-full rounded-md border border-crm-line bg-card px-3 text-base font-semibold text-crm-navy" value={opts.includes(cur) ? String(cur) : ''} onChange={e => setExactValue(e.target.value)}>{!opts.includes(cur) && <option value="">{gbp(cur || 0)}</option>}{opts.map(v => <option key={v} value={v}>{gbp(v)}</option>)}</select></div>; })()}<p className="text-xs text-muted-foreground">Warranty price including VAT{boostOn ? `, plus ${gbp(boostRetail)} for the claim limit boost` : ""}. Minimum {gbp(product?.min_price || 0)}{product?.max_price != null ? `, maximum ${gbp(product.max_price)}` : ''}.</p><Button disabled={!product || !validSellingPrice(Number(exactValue), product)} onClick={() => { if (term) setPrices(p => ({ ...p, [term]: Math.round(Number(exactValue) * 100) / 100 })); setExact(false); }}>Apply price</Button></DialogContent></Dialog>
  <Dialog open={!!emailQuote} onOpenChange={open => !open && setEmailQuote(null)}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[380px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Email customer quote</DialogTitle></DialogHeader><Input type="email" aria-label="Customer email address" placeholder="Customer email address" value={email} onChange={e => setEmail(e.target.value)} /><Button disabled={emailBusy || !email.includes('@')} onClick={async () => { setEmailBusy(true); const { data, error: sendError } = await supabase.functions.invoke('dealer-quote-email', { body: { quote_id: emailQuote, email } }); setEmailBusy(false); if (sendError || !data?.sent) { toast({ title: data?.error || 'Email could not be sent. Please try again.', variant: 'destructive' }); return; } setEmailQuote(null); toast({ title: 'Customer quote emailed' }); }}>{emailBusy ? 'Sending…' : 'Send quote'}</Button></DialogContent></Dialog>
  <Dialog open={details} onOpenChange={setDetails}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[480px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Warranty cover details</DialogTitle></DialogHeader><dl className="space-y-3">{summary.map(s => <div key={s.label} className="flex justify-between"><dt>{s.label}</dt><dd className="font-bold">{s.value}</dd></div>)}</dl><p className="text-sm text-muted-foreground">Mechanical and electrical cover is subject to vehicle eligibility, servicing requirements and policy terms. Refer to the full terms for covered components, contributions and exclusions.</p><a href="/terms/" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline">Full cover details &amp; exclusions</a></DialogContent></Dialog>
  <Dialog open={!!paylink} onOpenChange={open => !open && setPaylink('')}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[480px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Customer payment link</DialogTitle></DialogHeader><a href={paylink} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline">Open customer quote</a><Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(paylink); toast({ title: 'Payment link copied' }); }}>Copy link</Button><p className="text-sm text-muted-foreground">Your customer pays securely by card. Warranty documents follow confirmation by your dealer.</p></DialogContent></Dialog>
  </DealerLayout>;
};
export default Step3Pricing;
