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
import { Check, ArrowRight, Eye, Store, Pencil, ShieldCheck, Wrench, FileText, Save, MessageCircle, Mail, Printer, Link2, Loader2, Coins, Infinity, Car, Zap, ChevronDown, Share2, TrendingUp } from 'lucide-react';
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
        {lookupMsg && <DealerFieldError>{lookupMsg}</DealerFieldError>}
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
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-crm-line bg-card px-3 py-2">
        <div className="w-36 shrink-0"><div className="vehicle-reg-plate vehicle-reg-plate--list"><span className="vehicle-reg-plate__country">GB<span>UK</span></span><span className="vehicle-reg-plate__text">{vehicle?.reg || 'ENTER REG'}</span></div></div>
        <div><p className="text-sm font-bold">{[vehicle?.make, vehicle?.model].filter(Boolean).join(' ')}</p><p className="mt-1 text-xs text-muted-foreground">{[vehicle?.year, vehicle?.fuel_type].filter(Boolean).join(' · ')}</p></div>
        {vehicle?.reg && <div className="flex items-center gap-2 rounded-lg border-2 border-crm-orange/50 bg-crm-orange-soft px-2 py-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-crm-orange">Update mileage</span>
          <span className="flex items-center gap-1">
            <button type="button" aria-label="Reduce mileage by 100 miles" onClick={() => stepMileage(-100)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-crm-line bg-card text-lg font-bold leading-none text-crm-navy hover:border-crm-orange">&minus;</button>
            <input inputMode="numeric" aria-label="Current mileage" value={mileageInput ? Number(mileageInput.replace(/[^0-9]/g, '') || 0).toLocaleString('en-GB') : ''} placeholder="Enter mileage"
              onChange={(e) => setMileageInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))} onBlur={(e) => commitMileage(e.target.value)}
              className="h-8 w-24 rounded-md border border-crm-line bg-card px-2 text-center text-sm font-bold text-crm-navy focus:border-crm-orange focus:outline-none" />
            <button type="button" aria-label="Increase mileage by 100 miles" onClick={() => stepMileage(100)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-crm-line bg-card text-lg font-bold leading-none text-crm-navy hover:border-crm-orange">+</button>
          </span>
          <span className="text-xs font-bold text-crm-navy">miles</span>
        </div>}
        {trade && <Button variant="outline" size="sm" onClick={() => { setRegInput(vehicle?.reg || ''); setEditingReg(true); }}><Pencil />Change vehicle</Button>}
      </div>
    </header>
    <div className="grid max-w-xs grid-cols-2 gap-2" role="group" aria-label="Quote view">
      <Button variant="outline" aria-pressed={trade} aria-label="Trade View" onClick={() => setView('trade')} className={`h-9 justify-start ${trade ? '!border-crm-orange !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90' : '!border-crm-line !bg-card !text-crm-navy'}`}><Store />TV</Button>
      <Button variant="outline" aria-pressed={!trade} aria-label="Customer View" onClick={() => setView('customer')} className={`h-9 justify-start ${!trade ? '!border-crm-orange !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90' : '!border-crm-line !bg-card !text-crm-navy'}`}><Eye />CV</Button>
    </div>
    {(pricingLoading || loading) && <p role="status">Loading warranty prices…</p>}
    {pricingError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm font-bold text-destructive"><span className="flex items-start gap-1.5"><span aria-hidden="true">&bull;</span><span>Warranty prices are unavailable.</span></span><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>}
    <section className="rounded-2xl border border-crm-line bg-card p-4 sm:p-5" aria-label="Warranty length">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-crm-orange">Warranty length</p>
          <h2 className="mt-1 text-xl font-extrabold text-crm-navy sm:text-2xl">How long do you want the cover?</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Parts and labour covered — pick the warranty length.</p>
        </div>
        <button type="button" onClick={() => setDetails(true)} className="shrink-0 text-xs font-semibold text-crm-navy underline">Details</button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Warranty duration">
        {[12, 24, 36].map(months => {
          const p = config?.terms.find(item => item.months === months); const available = p && annualProductActive(p);
          const cardBoost = boostOn && boostCfg ? boostForTerm(boostCfg, months) : null;
          const baseCardCost = isAnnualQuoteSnapshot(savedPlan?.selected_options) && savedPlan?.duration_months === months ? savedPlan.dealer_price - savedBoostCost : p?.dealer_price;
          const baseCardRetail = prices[months] ?? p?.retail_price;
          const cardCost = baseCardCost != null ? baseCardCost + (cardBoost?.dealer_price || 0) : undefined;
          const cardRetail = baseCardRetail != null ? baseCardRetail + (cardBoost?.retail_price || 0) : undefined;
          const shown = trade ? cardCost : cardRetail;
          const selected = term === months;
          return <button type="button" role="radio" aria-checked={selected} key={months} disabled={!available} onClick={() => { setTerm(months); setError(''); }} className={`relative flex flex-col rounded-xl border-2 bg-card p-3.5 pt-4 text-left text-crm-navy transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange disabled:opacity-60 ${selected ? 'border-crm-orange bg-crm-orange-soft' : 'border-crm-line hover:border-crm-navy/30'}`}>
            {months === 24 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-crm-orange px-3 py-0.5 text-xs font-bold text-primary-foreground">Most popular</span>}
            <span className="flex items-start justify-between gap-2">
              <strong className="text-2xl font-extrabold leading-8 sm:text-3xl sm:leading-9">{shown != null ? gbp(shown) : '—'}</strong>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-crm-orange bg-crm-orange' : 'border-muted-foreground/40 bg-card'}`}>{selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}</span>
            </span>
            <span className="mt-1 text-sm font-bold">{months / 12} {months === 12 ? 'Year' : 'Years'} Warranty</span>
            <span className="mt-0.5 text-xs text-muted-foreground">{trade ? 'your cost' : 'per vehicle, inc. VAT'}</span>
            {trade && cardRetail != null && cardCost != null && <span className="mt-1.5 flex items-center gap-1.5 text-xs font-extrabold text-crm-green-deep"><Coins className="h-4 w-4" />Profit: {gbp(potentialProfit(cardRetail, cardCost))}</span>}
            {!available && <span className="mt-2 text-xs">Unavailable</span>}
          </button>;
        })}
      </div>
      <label className={`mt-3 flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors ${boostOn ? 'border-solid border-crm-orange bg-crm-orange-soft' : 'border-dashed border-crm-orange/50 bg-crm-orange-soft/60'} ${boostCfg ? '' : 'cursor-not-allowed opacity-60'}`} aria-label="£5,000 claim limit boost">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crm-orange"><Zap className="h-5 w-5 text-primary-foreground" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold leading-5 text-crm-navy">£5,000 Claim Limit Boost{boostCfg && <span className="ml-2 whitespace-nowrap font-bold text-crm-orange">{term ? `+${gbp(trade ? boostCost : boostRetail)}` : `from ${gbp(trade ? (boostLead?.dealer_price ?? 0) : (boostLead?.retail_price ?? 0))}`}</span>}</span>
          <span className="block text-sm leading-5 text-muted-foreground">{boostOn ? 'Added. Each eligible claim is now covered up to £5,000.' : 'Increase the per-claim limit to £5,000 for extra peace of mind.'}</span>
        </span>
        <Switch disabled={!boostCfg} checked={boostOn} onCheckedChange={v => { setBoost(v); setError(''); }} aria-label="Add £5,000 claim limit boost" />
      </label>
    </section>
    {cover && <section className="grid grid-cols-2 gap-3 rounded-xl border border-crm-line bg-card p-3 lg:grid-cols-4" aria-label="Included warranty benefits">
      {[{ icon: ShieldCheck, title: gbp(cover.claim), text: 'per eligible claim' }, { icon: Infinity, title: 'Unlimited', text: 'claims' }, { icon: Car, title: 'Up to the', text: 'value of the vehicle' }, { icon: Wrench, title: `${gbp(cover.labour)}/hour`, text: 'labour' }].map(b => <div key={b.text} className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><b.icon className="h-5 w-5" /></span><p className="text-sm leading-5"><strong className="block text-base">{b.title}</strong><span className="text-muted-foreground">{b.text}</span></p></div>)}
    </section>}
    <Collapsible className="rounded-xl border border-crm-line bg-card">
      <CollapsibleTrigger className="group flex w-full items-center gap-3 p-3 text-left font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><FileText className="h-5 w-5" /></span><span className="flex-1 text-base">What's covered?</span><ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden px-4 pb-4 text-sm text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"><p className="font-bold text-crm-navy">Parts and labour covered</p>
        <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">{['Engine internals', 'Gearbox (manual and automatic)', 'Turbo and supercharger', 'Electrical systems and ECUs', 'Steering', 'Cooling system', 'Clutch system', 'Fuel system', 'Air conditioning', 'Braking system (ABS, servo, callipers)', 'Heating and ventilation', 'Suspension', 'Drive system', 'Safety systems'].map(i => <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-crm-green-deep" />{i}</li>)}</ul>
        <p className="mt-4 font-bold text-crm-navy">What the warranty is designed for</p>
        <p className="mt-1">Mechanical and electrical failures. It is not designed for pre-existing faults, routine servicing, tyres, brake pads and wear items, accident damage, trader-owned vehicles, or hire and reward use (taxis, rentals, couriers).</p>
        <a href="/terms/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold text-crm-navy underline">Full terms and exclusions</a></CollapsibleContent>
    </Collapsible>
    <section className="grid items-center gap-3 pt-2 md:grid-cols-[auto_minmax(0,1fr)]" aria-label="Quote summary">
      {trade ? <div className="flex items-center justify-end gap-3 rounded-2xl border border-crm-line bg-card p-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crm-green-soft"><TrendingUp className="h-4 w-4 text-crm-green-deep" /></span>
        <div className="min-w-0 text-right">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Your profit</p>
          <strong className="block text-3xl font-black leading-8 text-crm-green sm:text-4xl sm:leading-9">{term ? gbp(potentialProfit(retail, cost)) : '—'}</strong>
          {term && <button type="button" className="mt-0.5 text-xs font-semibold text-crm-navy underline" onClick={() => { setExactValue(String(baseRetail)); setExact(true); }}>Change price</button>}
        </div>
      </div> : <div className="flex items-center justify-end rounded-2xl border border-crm-line bg-card p-3"><p className="text-right text-sm text-muted-foreground">Customer price<strong className="block text-4xl font-extrabold text-crm-navy">{term ? gbp(retail) : '—'}</strong>inc. VAT</p></div>}
      <div className="grid grid-cols-2 gap-3">
        {trade && <Button variant="outline" className="h-10 !border-crm-line !bg-card !text-crm-navy" disabled={saving || !valid} onClick={() => persist()}><Save />Save quote</Button>}
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className={`h-10 !border-crm-line !bg-card !text-crm-navy ${trade ? '' : 'col-span-2'}`} disabled={saving || !valid}><Share2 />Share quote</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => share('whatsapp')}><MessageCircle />WhatsApp</DropdownMenuItem><DropdownMenuItem onClick={() => share('email')}><Mail />Email</DropdownMenuItem><DropdownMenuItem onClick={() => share('print')}><Printer />Print</DropdownMenuItem>{trade && <DropdownMenuItem onClick={() => share('pay')}><Link2 />Customer payment link</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
        {trade && <Button className="col-span-2 h-16 w-full text-lg font-extrabold animate-breathing !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90" disabled={saving || !valid} onClick={() => persist(true)}>Continue to customer details<ArrowRight /></Button>}
      </div>
    </section>
    {error && <DealerFieldError>{error}</DealerFieldError>}
    <p className="text-xs text-muted-foreground">Including VAT. Subject to vehicle eligibility and policy terms.</p>
  </div>
  <Dialog open={exact} onOpenChange={setExact}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[380px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Customer selling price</DialogTitle></DialogHeader>{(() => { const opts = sellingPriceOptions(product, Number(exactValue) || 0); const lo = opts[0] ?? 0; const hi = opts[opts.length - 1] ?? lo; const cur = Number(exactValue); const step = (d: number) => { if (!product) return; setExactValue(String(stepSellingPrice(cur, d > 0 ? 1 : -1, product))); }; return <div className="space-y-3"><div className="flex items-center justify-between gap-3"><Button type="button" variant="outline" className="h-14 w-14 text-2xl font-bold" aria-label="Lower price by £100" disabled={cur <= lo} onClick={() => step(-100)}>−</Button><strong className="text-4xl font-black text-crm-navy">{gbp(cur || 0)}</strong><Button type="button" variant="outline" className="h-14 w-14 text-2xl font-bold" aria-label="Raise price by £100" disabled={cur >= hi} onClick={() => step(100)}>+</Button></div><select aria-label="Customer selling price" className="h-12 w-full rounded-md border border-crm-line bg-card px-3 text-base font-semibold text-crm-navy" value={opts.includes(cur) ? String(cur) : ''} onChange={e => setExactValue(e.target.value)}>{!opts.includes(cur) && <option value="">{gbp(cur || 0)}</option>}{opts.map(v => <option key={v} value={v}>{gbp(v)}</option>)}</select></div>; })()}<p className="text-xs text-muted-foreground">Warranty price including VAT{boostOn ? `, plus ${gbp(boostRetail)} for the claim limit boost` : ""}. Minimum {gbp(product?.min_price || 0)}{product?.max_price != null ? `, maximum ${gbp(product.max_price)}` : ''}.</p><Button disabled={!product || !validSellingPrice(Number(exactValue), product)} onClick={() => { if (term) setPrices(p => ({ ...p, [term]: Math.round(Number(exactValue) * 100) / 100 })); setExact(false); }}>Apply price</Button></DialogContent></Dialog>
  <Dialog open={!!emailQuote} onOpenChange={open => !open && setEmailQuote(null)}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[380px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Email customer quote</DialogTitle></DialogHeader><Input type="email" aria-label="Customer email address" placeholder="Customer email address" value={email} onChange={e => setEmail(e.target.value)} /><Button disabled={emailBusy || !email.includes('@')} onClick={async () => { setEmailBusy(true); const { data, error: sendError } = await supabase.functions.invoke('dealer-quote-email', { body: { quote_id: emailQuote, email } }); setEmailBusy(false); if (sendError || !data?.sent) { toast({ title: data?.error || 'Email could not be sent. Please try again.', variant: 'destructive' }); return; } setEmailQuote(null); toast({ title: 'Customer quote emailed' }); }}>{emailBusy ? 'Sending…' : 'Send quote'}</Button></DialogContent></Dialog>
  <Dialog open={details} onOpenChange={setDetails}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[480px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Warranty cover details</DialogTitle></DialogHeader><dl className="space-y-3">{summary.map(s => <div key={s.label} className="flex justify-between"><dt>{s.label}</dt><dd className="font-bold">{s.value}</dd></div>)}</dl><p className="text-sm text-muted-foreground">Mechanical and electrical cover is subject to vehicle eligibility, servicing requirements and policy terms. Refer to the full terms for covered components, contributions and exclusions.</p><a href="/terms/" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline">Full cover details &amp; exclusions</a></DialogContent></Dialog>
  <Dialog open={!!paylink} onOpenChange={open => !open && setPaylink('')}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[480px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Customer payment link</DialogTitle></DialogHeader><a href={paylink} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline">Open customer quote</a><Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(paylink); toast({ title: 'Payment link copied' }); }}>Copy link</Button><p className="text-sm text-muted-foreground">Your customer pays securely by card. Warranty documents follow confirmation by your dealer.</p></DialogContent></Dialog>
  </DealerLayout>;
};
export default Step3Pricing;
