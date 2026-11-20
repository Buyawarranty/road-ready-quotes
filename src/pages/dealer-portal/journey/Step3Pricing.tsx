import BogofBanner, { loadBogofEligibility, loadBogofSettings } from '@/components/dealer/offer/BogofBanner';
import React, { useEffect, useRef, useState } from 'react';
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
import { Check, ArrowRight, Eye, Pencil, ShieldCheck, Wrench, FileText, Save, MessageCircle, Mail, Printer, Link2, Loader2, Coins, Infinity, Car, Zap, ChevronDown, Share2, TrendingUp, Gauge, Download, Gift } from 'lucide-react';
import platinumPlanDoc from '@/assets/panda-protect-platinum-warranty-plan.pdf.asset.json';
import termsDoc from '@/assets/panda-protect-terms-and-conditions.pdf.asset.json';
import PricingCoverageOverview from '@/components/dealer/journey/PricingCoverageOverview';
import { pandaLogoUrl } from '@/lib/pandaLogo';
import pricingCar from '@/assets/panda-pricing-suv.png.asset.json';
import './pricing-design.css';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
const gbp = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: Number.isInteger(n) ? 0 : 2 });
const normaliseReg = (value: string) => value.replace(/\s+/g, '').toUpperCase();

/** Warranty lengths a dealer can quote (months), the one pre-selected, and the one flagged as most popular. */
const TERM_CHOICES = [12, 24, 36, 48];
const DEFAULT_TERM = 36;
const POPULAR_TERM = 36;


const Step3Pricing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dealer, loading, loadError, retry } = useDealerAuth();
  const { vehicle, customer, plan: savedPlan, setPlan, setVehicle, quoteId } = useDealerJourney();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingReg, setEditingReg] = useState(false);
  const [regInput, setRegInput] = useState('');
  const regRef = useRef<HTMLInputElement>(null);
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'error'>('idle');
  // The buy-one-get-one line only appears while Super Admin has the offer switched on
  // and this dealer is still eligible (earning free warranties or with free ones left).
  const [offerOn, setOfferOn] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      const s = await loadBogofSettings();
      const eligible = await loadBogofEligibility(dealer?.id);
      if (live) setOfferOn(!!s?.enabled && eligible);
    })();
    return () => { live = false; };
  }, [dealer?.id]);
  const [lookupMsg, setLookupMsg] = useState('');
  const [mileageInput, setMileageInput] = useState(vehicle?.mileage != null ? String(vehicle.mileage) : '');
  const [mileageConfirmed, setMileageConfirmed] = useState(false);
  const commitMileage = (raw: string) => {
    const n = Number(raw.replace(/[^0-9]/g, ''));
    if (vehicle && raw.trim() !== '' && Number.isFinite(n)) { setVehicle({ ...vehicle, mileage: n } as any); setMileageConfirmed(true); }
  };
  const stepMileage = (delta: number) => {
    const current = Number(mileageInput.replace(/[^0-9]/g, '')) || Number(vehicle?.mileage) || 0;
    const next = Math.max(0, current + delta);
    setMileageInput(String(next));
    setMileageConfirmed(false);
  };

  // Keep the mileage box filled from the vehicle (restored quotes load after first render).
  useEffect(() => {
    if (mileageInput === '' && vehicle?.mileage != null) setMileageInput(String(vehicle.mileage));
  }, [vehicle?.mileage]);
  // Vehicle known but no mileage saved: fetch the last MOT mileage once.
  const motFetchedFor = useRef<string | null>(null);
  const vehicleRef = useRef(vehicle); vehicleRef.current = vehicle;
  useEffect(() => {
    const reg = vehicle?.reg;
    if (!reg || vehicle?.mileage != null || motFetchedFor.current === reg) return;
    motFetchedFor.current = reg;
    supabase.functions.invoke('dvla-vehicle-lookup', { body: { registrationNumber: normaliseReg(reg) } }).then(({ data }) => {
      if (data?.lastMotMileage != null) {
        const v: any = vehicleRef.current; if (v && v.reg === reg && v.mileage == null) setVehicle({ ...v, mileage: Number(data.lastMotMileage) });
        setMileageInput((m) => m || String(data.lastMotMileage));
      }
    }).catch(() => {});
  }, [vehicle?.reg, vehicle?.mileage]);

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
        if (ageYears > 15) { setLookup('error'); setLookupMsg('This vehicle is over 15 years old. Protection is for vehicles up to 150,000 miles and 15 years old.'); return; }
      }
      setVehicle({ reg: cleaned, make: data.make, model: data.model, year: data.yearOfManufacture ? String(data.yearOfManufacture) : undefined, fuel_type: data.fuelType, ...(data.lastMotMileage != null ? { mileage: Number(data.lastMotMileage) } : {}) } as any);
      if (data.lastMotMileage != null) setMileageInput(String(data.lastMotMileage));
      setMileageConfirmed(false);
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
  const [term, setTerm] = useState<number | null>(savedPlan?.duration_months || DEFAULT_TERM);
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
  const trade = true;
  /** Dealer and customer figures for one term, boost included — shared by the reg row and the cards. */
  const termPrices = (months: number) => {
    const p = config?.terms.find(item => item.months === months);
    if (!p) return null;
    const cardBoost = boostOn && boostCfg ? boostForTerm(boostCfg, months) : null;
    const baseCost = isAnnualQuoteSnapshot(savedPlan?.selected_options) && savedPlan?.duration_months === months ? savedPlan.dealer_price - savedBoostCost : p.dealer_price;
    const baseRetail = prices[months] ?? p.retail_price;
    return {
      cost: baseCost != null ? baseCost + (cardBoost?.dealer_price || 0) : undefined,
      retail: baseRetail != null ? baseRetail + (cardBoost?.retail_price || 0) : undefined,
    };
  };
  const fromShown = (() => {
    const shown = (config?.terms || []).filter(annualProductActive)
      .map(p => { const v = termPrices(p.months); return v ? (trade ? v.cost : v.retail) : undefined; })
      .filter((v): v is number => typeof v === 'number');
    return shown.length ? Math.min(...shown) : null;
  })();
  const rowPrice = term && product ? (trade ? cost : retail) : fromShown;
  const rowLabel = term && product ? `${term / 12} ${term === 12 ? 'year' : 'years'}` : 'From';

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
    const message = customerQuoteMessage(safePayload, url.href, { hidePrice: true });
    if (action === 'email') setEmailQuote(id);
    else window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };
  /** Opens the customer-safe quote in its own tab so the trade view never shares a screen with it. */
  const openCustomerTab = async () => {
    if (opening) return;
    if (!valid) { setError('Choose a warranty length and a valid customer selling price before opening the customer view.'); return; }
    setOpening(true);
    // Mobile browsers block new tabs from buttons — open the customer view in this tab instead.
    const isMobile = window.matchMedia('(max-width: 768px)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    // The tab must open inside the click itself, or the browser blocks it; it is pointed at the quote once saved.
    const tab = isMobile ? null : window.open('about:blank', '_blank');
    const id = await persist();
    if (!id) { tab?.close(); setOpening(false); return; }
    const safePayload = { ...payload, coverSubtitle: `Quote ${id.slice(0, 8).toUpperCase()}` };
    const url = new URL(buildCustomerQuoteUrl(safePayload), window.location.origin);
    // Flags go before the hash so the quote data stays a clean hash fragment.
    url.search = '?view=cv';
    if (isMobile) { window.location.href = url.href; return; }
    let opened = false;
    if (tab) {
      try { tab.location.href = url.href; opened = true; }
      catch { try { tab.close(); } catch { /* ignore */ } }
    }
    // Some mobile browsers block or drop the new tab — fall back to opening the customer view in this tab.
    if (!opened) window.location.href = url.href;
    setOpening(false);
  };
  if (loadError) return <div className="flex min-h-screen items-center justify-center bg-background p-6"><div className="max-w-sm space-y-4 text-center"><p className="text-foreground">{loadError}</p><Button onClick={retry}>Try again</Button><Button variant="outline" onClick={() => window.location.reload()}>Reload page</Button></div></div>;
  if (!loading && !dealer) return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <DealerLayout><div className="pricing-page mx-auto max-w-[1240px] space-y-3 pb-6 text-crm-navy [&_h1]:!text-2xl [&_h1]:!leading-8 [&_h1]:!text-crm-navy [&_h2]:!text-lg [&_h2]:!leading-6 [&_h2]:!text-crm-navy [&_h3]:!text-sm [&_h3]:!leading-5 [&_h3]:!text-crm-navy [&_h1]:!m-0 [&_h2]:!m-0 [&_h3]:!m-0">
    <header className="pricing-heading">
      <img src={pricingCar.url} alt="" aria-hidden="true" className="pricing-hero-car" />
      <div className="pricing-heading-copy">
        <div className="flex items-center justify-center gap-3 sm:justify-start"><img src={pandaLogoUrl} alt="Panda Protect" className="h-7 w-auto" /><span className="border-l border-crm-line pl-3 text-[10px] font-bold uppercase text-muted-foreground">Trade warranty solutions</span></div>
        <h1>MORE PROFIT. LESS HASSLE.<span>ACTIVATE A WARRANTY IN 60 SECONDS.</span></h1>
        <p className="text-sm text-muted-foreground">{vehicle?.reg ? 'Confirm mileage and select your cover.' : 'Enter the vehicle registration to start activating your warranty.'}</p>
        <ul className="mt-3 grid max-w-lg grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-bold sm:grid-cols-3">{['Fixed trade prices', 'Full cover', 'Parts and labour', 'Quick activation', 'Simple claims', 'Fast payouts'].map(text => <li key={text} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-crm-green" />{text}</li>)}</ul>
        {offerOn && <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold"><Gift className="h-4 w-4 text-crm-orange" />Buy one warranty, get the next one free — up to 3 years' cover.</p>}
      </div>
    </header>
    <BogofBanner dealerId={dealer?.id} />
    <section className="pricing-vehicle flex flex-col items-center gap-3 rounded-lg border border-crm-line bg-card p-3 sm:flex-row sm:flex-wrap sm:gap-3 sm:p-4" aria-label="Vehicle">
      {!vehicle?.reg || editingReg ? (
        <form className="col-span-3 flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-3" onSubmit={event => { event.preventDefault(); if (!regInput.trim()) { regRef.current?.focus(); return; } void lookupVehicle(regInput); }} noValidate>
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:gap-3">
            <div className="min-w-0 sm:w-44 sm:shrink-0"><div className="vehicle-reg-plate vehicle-reg-plate--quote vehicle-reg-plate--slim vehicle-reg-plate--entry">
              <span className="vehicle-reg-plate__country" aria-hidden="true">GB<span>UK</span></span>
              <input ref={regRef} value={regInput} onChange={event => { setRegInput(normaliseReg(event.target.value).slice(0, 8)); if (lookupMsg) setLookupMsg(''); }} placeholder="ENTER REG" aria-label="Vehicle registration" maxLength={8} autoFocus className="vehicle-reg-plate__input" onFocus={event => event.currentTarget.select()} onMouseUp={event => event.preventDefault()} />
            </div></div>
            <Button type="submit" disabled={lookup === 'loading'} className={`h-11 shrink-0 gap-1.5 px-2 text-sm font-bold !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90 sm:px-5 sm:text-base ${!vehicle?.reg ? 'reg-cta-pulse' : ''}`}>{lookup === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Looking up vehicle" /> : <>CONTINUE<ArrowRight className="hidden h-4 w-4 sm:block" /></>}</Button>
          </div>
          {editingReg && vehicle?.reg && <Button type="button" variant="link" className="h-auto p-0 text-xs font-semibold" onClick={() => { setEditingReg(false); setLookupMsg(''); }}>Cancel — keep {vehicle.reg}</Button>}
          {lookupMsg && (/15 years/.test(lookupMsg) ? <p role="alert" className="w-full rounded-md border-2 border-crm-pink bg-crm-pink-soft px-3 py-2 text-sm font-bold text-crm-pink">⚠ {lookupMsg}</p> : <div className="w-full"><DealerFieldError>{lookupMsg}</DealerFieldError></div>)}
        </form>

      ) : (
        <>
          <div className="flex w-full items-center justify-center gap-2 sm:contents">
            <div className="w-32 shrink-0 sm:order-1"><div className="vehicle-reg-plate vehicle-reg-plate--list vehicle-reg-plate--slim"><span className="vehicle-reg-plate__country">GB<span>UK</span></span><span className="vehicle-reg-plate__text">{vehicle?.reg}</span></div></div>
            {rowPrice != null && <span className="shrink-0 text-right leading-4 sm:order-3"><span className="block text-[0.62rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">{rowLabel}</span><span className="block text-base font-black text-crm-navy">{gbp(rowPrice)}</span></span>}
            <Button variant="outline" aria-label="Change vehicle" title="Change vehicle" className="h-11 w-11 shrink-0 px-0 !border-crm-line !bg-card font-bold !text-crm-navy sm:order-4" onClick={() => { setRegInput(vehicle?.reg || ''); setEditingReg(true); }}><Pencil /></Button>
          </div>
          <div className="w-full min-w-0 text-center sm:order-2 sm:w-auto sm:flex-1 sm:text-left"><p className="break-words text-base font-extrabold leading-5">{[vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'Vehicle'}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{[vehicle?.year, vehicle?.fuel_type].filter(Boolean).join(' · ')}</p></div>

        </>
      )}
    {vehicle?.reg && !editingReg && (() => { const n = Number(mileageInput.replace(/[^0-9]/g, '')); const confirmed = mileageConfirmed && mileageInput !== '' && Number(vehicle?.mileage) === n; return (
    <>
    <section className="flex w-full min-w-0 flex-col items-center justify-center gap-2 border-t border-crm-line pt-3 sm:ml-auto sm:w-auto sm:flex-row sm:gap-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0" aria-label="Current mileage">
      <div className="min-w-0 text-center sm:text-left"><p className="text-xs font-extrabold leading-5">Current mileage</p><p className="text-[10px] leading-4 text-muted-foreground" title="Adjust in steps of 1,000 or type the current mileage, then select Confirm mileage.">From the last MOT</p></div>
      <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-1.5" title="Adjust in steps of 1,000 or type the current mileage, then select Confirm mileage.">
        <Button variant="outline" type="button" aria-label="Reduce mileage by 1,000 miles" onClick={() => stepMileage(-1000)} className="h-9 w-9 shrink-0 border-crm-orange/50 bg-card p-0 text-lg font-bold text-crm-orange hover:border-crm-orange">&minus;</Button>
        <input inputMode="numeric" aria-label="Current mileage" value={mileageInput ? n.toLocaleString('en-GB') : ''} placeholder="Enter mileage"
          onChange={(e) => { setMileageInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 7)); setMileageConfirmed(false); }} onBlur={(e) => commitMileage(e.target.value)}
          className="h-9 w-24 min-w-0 rounded-md border border-crm-line bg-card px-2 text-center text-base font-bold text-crm-navy focus:border-crm-orange focus:outline-none" />
        <Button variant="outline" type="button" aria-label="Increase mileage by 1,000 miles" onClick={() => stepMileage(1000)} className="h-9 w-9 shrink-0 border-crm-orange/50 bg-card p-0 text-lg font-bold text-crm-orange hover:border-crm-orange">+</Button>
      </div>
      {confirmed ? <span className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-crm-green bg-crm-green-soft px-2 text-xs font-bold text-crm-green-deep"><Check className="h-4 w-4" />Mileage confirmed</span>
        : <Button className="h-8 w-full shrink-0 justify-center !bg-crm-orange text-xs font-bold !text-primary-foreground hover:!bg-crm-orange/90" onClick={() => commitMileage(mileageInput)}>Confirm mileage</Button>}
      </div>

    </section>
    {n > 150000 && <p role="alert" className="col-span-3 w-full rounded-md border-2 border-crm-pink bg-crm-pink-soft px-3 py-2 text-sm font-bold text-crm-pink">⚠ This vehicle is over 150,000 miles. Protection is for vehicles up to 150,000 miles and 15 years old.</p>}
    </>); })()}
    </section>
    {(pricingLoading || loading) && <p role="status">Loading warranty prices…</p>}
    {pricingError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm font-bold text-destructive"><span className="flex items-start gap-1.5"><span aria-hidden="true">&bull;</span><span>Warranty prices are unavailable.</span></span><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>}
    <section aria-label="Warranty length">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Warranty duration">
        {TERM_CHOICES.map(months => {
          const p = config?.terms.find(item => item.months === months); const available = p && annualProductActive(p); const popular = months === POPULAR_TERM;

          const card = termPrices(months); const cardCost = card?.cost; const cardRetail = card?.retail;

          const shown = trade ? cardCost : cardRetail;
          const selected = term === months;
          return <div role="radio" aria-checked={selected} aria-disabled={!available} tabIndex={available ? 0 : -1} key={months} onClick={() => { if (available) { setTerm(months); setError(''); } }} onKeyDown={event => { if (event.target === event.currentTarget && available && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setTerm(months); setError(''); } }} className={`pricing-term relative flex flex-col rounded-xl border-2 p-4 text-left text-crm-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange ${!available ? 'opacity-60' : 'cursor-pointer'} ${selected ? 'border-crm-orange bg-crm-orange-soft' : 'border-crm-line bg-card hover:border-crm-navy/30'}`}>
            <span className={`pricing-popular rounded-full bg-crm-green-deep px-2 py-0.5 text-[8px] font-black uppercase text-primary-foreground ${popular ? '' : 'invisible'}`}>Most popular</span>
            <span className="flex items-start justify-between gap-2">
              <strong className="pricing-term-title text-xl font-black leading-6">{months / 12} Year Warranty</strong>

              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-crm-orange bg-card' : 'border-muted-foreground/40 bg-card'}`}>{selected && <span className="h-3 w-3 rounded-full bg-crm-orange" />}</span>
            </span>
            <span className="pricing-term-price mt-2 text-3xl font-black leading-9">{shown != null ? gbp(shown) : '—'}</span>
            <span className="pricing-retail text-sm text-muted-foreground">{trade ? `${prices[months] != null ? 'Your selling price' : 'Recommended retail price'} ${cardRetail != null ? gbp(cardRetail) : '—'} inc. VAT` : 'per vehicle, inc. VAT'}</span>
            {trade && available && cardRetail != null && <Button type="button" variant="link" className="h-auto w-fit justify-start px-0 py-1 text-xs font-semibold text-crm-navy underline" onClick={event => { event.stopPropagation(); setTerm(months); setExactValue(String(cardRetail - (boostOn ? boostForTerm(boostCfg, months)?.retail_price || 0 : 0))); setExact(true); }}>Change price</Button>}
            {trade && cardRetail != null && cardCost != null && <span className="pricing-profit mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-crm-green/25 bg-crm-green-soft px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-crm-green-deep"><TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />You earn approx. {gbp(Math.round(potentialProfit(cardRetail, cardCost)))} profit</span>}
            {!available && <span className="mt-2 text-xs">Unavailable</span>}
          </div>;
        })}
      </div>
    </section>
    {cover && <section className="pricing-benefits grid grid-cols-2 gap-3 px-1 py-1 lg:grid-cols-4" aria-label="Included warranty benefits">
      {[{ icon: ShieldCheck, title: gbp(cover.claim), text: 'per eligible claim' }, { icon: Infinity, title: 'Unlimited', text: 'claims' }, { icon: Car, title: 'Up to the value', text: 'of the vehicle' }, { icon: Wrench, title: `${gbp(cover.labour)}/hour`, text: 'labour' }].map(b => <div key={b.text} className="flex min-w-0 flex-col items-center gap-2 py-2 text-center sm:flex-row sm:gap-3 sm:text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"><b.icon className="h-5 w-5" /></span><p className="text-sm leading-5"><strong className="block text-base">{b.title}</strong><span className="text-muted-foreground">{b.text}</span></p></div>)}
    </section>}
    <div className={`pricing-boost flex flex-wrap items-center gap-3 rounded-xl border-2 bg-crm-green-soft p-4 text-crm-navy transition-all ${boostOn ? 'border-crm-green-deep' : 'border-crm-green/35'} ${boostCfg ? '' : 'opacity-60'}`} aria-label="£5,000 claim limit boost">
      <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${boostOn ? 'border-crm-green-deep bg-crm-green-deep' : 'border-crm-green/50 bg-card'}`}>{boostOn && <Check className="h-4 w-4 text-primary-foreground" />}</span>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card"><Zap className="h-5 w-5 text-crm-gold-deep" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold leading-5">£5,000 Claim Limit Boost</span>
        <span className={`block text-sm leading-5 ${boostOn ? 'text-crm-green-deep' : 'text-muted-foreground'}`}>{boostOn ? 'Added. Each eligible claim is now covered up to £5,000.' : `Increase the per-claim limit from ${gbp(baseClaim)} to £5,000.`}</span>
      </span>
      {boostCfg && (() => { const boostPrice = term ? (boostForTerm(boostCfg, term)?.[trade ? 'dealer_price' : 'retail_price'] ?? 0) : (boostLead?.[trade ? 'dealer_price' : 'retail_price'] ?? 0); return (
      <span className="flex w-full shrink-0 flex-wrap items-center justify-center gap-3 sm:w-auto">
        <span className="whitespace-nowrap text-sm font-bold text-crm-green-deep">{term ? `Only ${gbp(boostPrice)}` : `From only ${gbp(boostPrice)}`}</span>
        <Button type="button" onClick={() => { setBoost(!boostOn); setError(''); }} aria-pressed={boostOn} aria-label="Add £5,000 claim limit boost"
          className={`inline-flex h-12 items-center gap-1.5 rounded-lg px-5 text-base font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 ${boostOn ? 'bg-crm-green-deep text-primary-foreground hover:bg-crm-green-deep/90 focus-visible:ring-crm-green-deep' : 'bg-crm-green text-primary-foreground hover:bg-crm-green/90 focus-visible:ring-crm-green'}`}>
          {boostOn ? <><Check className="h-4 w-4" />Added</> : 'Add boost'}
        </Button>
      </span>); })()}
    </div>
    <PricingCoverageOverview />
    <section className="grid gap-3 pt-2" aria-label="Quote summary">
      <div className="pricing-summary-row">
      {trade ? <div className="pricing-summary-box w-full overflow-hidden border border-crm-line bg-card" aria-label="Price summary">
        <div className="pricing-summary-values divide-x divide-crm-line">
          <div className="px-4 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">You pay</p>
            <strong className="mt-1 block text-2xl font-black leading-8 text-crm-navy sm:text-3xl">{term ? gbp(cost) : '—'}</strong>
            <p className="text-xs text-muted-foreground">Trade price inc. VAT</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{term && prices[term] != null ? 'Customer pays' : 'Recommended price'}</p>
            <strong className="mt-1 block text-2xl font-black leading-8 text-crm-navy sm:text-3xl">{term ? gbp(retail) : '—'}</strong>
            <p className="text-xs text-muted-foreground">{term && prices[term] != null ? 'Your selling price' : 'Recommended retail'} inc. VAT</p>
          </div>
          <div className="pricing-summary-profit">
            <p className="text-xs font-bold uppercase text-muted-foreground">Your approx. profit</p>
            <strong className="mt-1 block font-black text-crm-gold-deep">{term ? gbp(Math.round(potentialProfit(retail, cost))) : '—'}</strong>
            <p className="text-muted-foreground">{term && prices[term] != null ? 'Based on your selling price' : 'Based on recommended retail'}</p>
          </div>
        </div>
      </div> : <div className="flex shrink-0 items-center rounded-[10px] border border-crm-line bg-card px-3 py-2"><p className="text-xs text-muted-foreground">Customer price<strong className="block text-3xl font-extrabold text-crm-navy">{term ? gbp(retail) : '—'}</strong>inc. VAT</p></div>}
      <div className="pricing-actions grid w-full min-w-0 gap-2">
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Quote actions">
        {trade && <Button variant="outline" className="h-12 min-w-0 gap-1.5 whitespace-normal px-2 text-xs leading-tight sm:px-3 sm:text-sm !border-crm-line !bg-card font-bold !text-crm-navy" disabled={saving || !valid} onClick={() => persist()}><Save />Save draft</Button>}
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-12 min-w-0 gap-1.5 whitespace-normal px-2 text-xs leading-tight sm:px-3 sm:text-sm !border-crm-line !bg-card font-bold !text-crm-navy" disabled={saving || !valid}><Share2 />Share</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => share('email')}><Mail />Email</DropdownMenuItem><DropdownMenuItem onClick={() => share('print')}><Printer />Print</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        <Button variant="outline" type="button" title="Opens a new tab with the cover described — no prices shown" disabled={opening} onClick={() => { void openCustomerTab(); }} className="h-12 min-w-0 gap-1.5 whitespace-normal px-2 text-xs leading-tight sm:px-3 sm:text-sm !border-crm-line !bg-card font-bold !text-crm-navy">{opening ? <Loader2 className="animate-spin" /> : <Eye />}Customer view</Button>
      </div>
        {trade && <Button className="min-h-12 h-auto min-w-0 whitespace-normal px-3 py-3 text-sm font-extrabold !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90 lg:px-5 lg:text-base" disabled={saving} onClick={() => { if (!vehicle?.reg) { setEditingReg(false); regRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); regRef.current?.focus(); return; } void persist(true); }}>Continue to customer details<ArrowRight /></Button>}
      </div></div>
      {trade && <p className="text-center text-xs leading-5 font-semibold text-muted-foreground"><ShieldCheck className="mr-1.5 inline-block h-4 w-4 align-text-bottom text-crm-green" />Secure checkout · No payment taken yet · You can edit everything on the next step</p>}
    </section>
    {error && <DealerFieldError>{error}</DealerFieldError>}
    {!vehicle?.reg ? null : <p className="text-center text-xs leading-5 text-muted-foreground">Including VAT. Subject to vehicle eligibility and policy terms.</p>}
  </div>
  <Dialog open={exact} onOpenChange={setExact}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[380px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Customer selling price</DialogTitle></DialogHeader>{(() => { const opts = sellingPriceOptions(product, Number(exactValue) || 0); const lo = opts[0] ?? 0; const hi = opts[opts.length - 1] ?? lo; const cur = Number(exactValue); const step = (d: number) => { if (!product) return; setExactValue(String(stepSellingPrice(cur, d > 0 ? 1 : -1, product))); }; return <div className="space-y-3"><div className="flex items-center justify-between gap-3"><Button type="button" variant="outline" className="h-14 w-14 text-2xl font-bold" aria-label="Lower price by £100" disabled={cur <= lo} onClick={() => step(-100)}>−</Button><strong className="text-4xl font-black text-crm-navy">{gbp(cur || 0)}</strong><Button type="button" variant="outline" className="h-14 w-14 text-2xl font-bold" aria-label="Raise price by £100" disabled={cur >= hi} onClick={() => step(100)}>+</Button></div><select aria-label="Customer selling price" className="h-12 w-full rounded-md border border-crm-line bg-card px-3 text-base font-semibold text-crm-navy" value={opts.includes(cur) ? String(cur) : ''} onChange={e => setExactValue(e.target.value)}>{!opts.includes(cur) && <option value="">{gbp(cur || 0)}</option>}{opts.map(v => <option key={v} value={v}>{gbp(v)}</option>)}</select></div>; })()}<p className="text-xs text-muted-foreground">Warranty price including VAT{boostOn ? `, plus ${gbp(boostRetail)} for the claim limit boost` : ""}. Minimum {gbp(product?.min_price || 0)}{product?.max_price != null ? `, maximum ${gbp(product.max_price)}` : ''}.</p><Button disabled={!product || !validSellingPrice(Number(exactValue), product)} onClick={() => { if (term) setPrices(p => ({ ...p, [term]: Math.round(Number(exactValue) * 100) / 100 })); setExact(false); }}>Apply price</Button></DialogContent></Dialog>
  <Dialog open={!!emailQuote} onOpenChange={open => !open && setEmailQuote(null)}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[380px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Email customer quote</DialogTitle></DialogHeader><Input type="email" aria-label="Customer email address" placeholder="Customer email address" value={email} onChange={e => setEmail(e.target.value)} /><Button disabled={emailBusy || !email.includes('@')} onClick={async () => { setEmailBusy(true); const { data, error: sendError } = await supabase.functions.invoke('dealer-quote-email', { body: { quote_id: emailQuote, email } }); setEmailBusy(false); if (sendError || !data?.sent) { toast({ title: data?.error || 'Email could not be sent. Please try again.', variant: 'destructive' }); return; } setEmailQuote(null); toast({ title: 'Customer quote emailed' }); }}>{emailBusy ? 'Sending…' : 'Send quote'}</Button></DialogContent></Dialog>
  <Dialog open={details} onOpenChange={setDetails}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[480px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Warranty cover details</DialogTitle></DialogHeader><dl className="space-y-3">{summary.map(s => <div key={s.label} className="flex justify-between"><dt>{s.label}</dt><dd className="font-bold">{s.value}</dd></div>)}</dl><p className="text-sm text-muted-foreground">Mechanical and electrical cover is subject to vehicle eligibility, servicing requirements and policy terms. Refer to the full terms for covered components, contributions and exclusions.</p><a href="/terms/" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline">Full cover details &amp; exclusions</a></DialogContent></Dialog>
  <Dialog open={!!paylink} onOpenChange={open => !open && setPaylink('')}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[480px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Customer payment link</DialogTitle></DialogHeader><a href={paylink} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline">Open customer quote</a><Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(paylink); toast({ title: 'Payment link copied' }); }}>Copy link</Button><p className="text-sm text-muted-foreground">Your customer pays securely by card. Warranty documents follow confirmation by your dealer.</p></DialogContent></Dialog>
  </DealerLayout>;
};
export default Step3Pricing;
