import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import { annualProductActive, isAnnualQuoteSnapshot, potentialProfit, stepSellingPrice, validSellingPrice } from '@/lib/dealerAnnualPricing';
import { buildCustomerQuoteUrl, customerQuoteMessage, type CustomerQuotePayload } from '@/lib/customerQuoteSharing';
import { ArrowRight, Check, Circle, Eye, Store, Pencil, ShieldCheck, Wrench, FileText, Minus, Plus, RotateCcw, Save, MessageCircle, Mail, Printer, Link2 } from 'lucide-react';
const gbp = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: Number.isInteger(n) ? 0 : 2 });

const Step3Pricing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dealer, loading } = useDealerAuth();
  const { vehicle, customer, plan: savedPlan, setPlan, quoteId } = useDealerJourney();
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
  const adjust = (direction: -1 | 1) => { if (!product || !term) return; setPrices(p => ({ ...p, [term]: stepSellingPrice(retail, direction, product) })); };
  if (savedPlan?.selected_options?.warranty_type === 'dealer-paid') return <Navigate to="/dealer-portal/quote/claim-handling" replace />;
  if (!loading && !dealer) return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <DealerLayout><div className="mx-auto max-w-[1240px] space-y-3 pb-6 text-crm-navy [&_h1]:!text-2xl [&_h1]:!leading-8 [&_h1]:!text-crm-navy [&_h2]:!text-lg [&_h2]:!leading-6 [&_h2]:!text-crm-navy [&_h3]:!text-sm [&_h3]:!leading-5 [&_h3]:!text-crm-navy [&_h1]:!m-0 [&_h2]:!m-0 [&_h3]:!m-0">
    <header className="grid items-center gap-4 min-[1100px]:grid-cols-[1fr_auto]">
      <div><h1 className="font-bold">Choose your warranty</h1><p className="mt-1 text-sm leading-5 text-muted-foreground">Select how many years of cover you want.</p></div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-crm-line bg-card px-3 py-3">
        <div className="w-36 shrink-0"><div className="vehicle-reg-plate vehicle-reg-plate--list"><span className="vehicle-reg-plate__country">GB<span>UK</span></span><span className="vehicle-reg-plate__text">{vehicle?.reg || 'ENTER REG'}</span></div></div>
        <div><p className="text-sm font-bold">{[vehicle?.make, vehicle?.model].filter(Boolean).join(' ')}</p><p className="mt-1 text-xs text-muted-foreground">{[vehicle?.year, vehicle?.fuel_type, vehicle?.mileage != null ? `${Number(vehicle.mileage).toLocaleString('en-GB')} miles` : null].filter(Boolean).join(' · ')}</p></div>
        {trade && <Button variant="outline" size="sm" onClick={() => navigate('/dealer-portal/quote/vehicle')}><Pencil />Change vehicle</Button>}
      </div>
    </header>
    <div className="grid max-w-lg grid-cols-2 gap-3" role="group" aria-label="Quote view">
      <Button variant="outline" aria-pressed={trade} onClick={() => setView('trade')} className={`h-11 justify-start ${trade ? '!border-crm-orange !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90' : '!border-crm-line !bg-card !text-crm-navy'}`}><Store />Trade View</Button>
      <Button variant="outline" aria-pressed={!trade} onClick={() => setView('customer')} className={`h-11 justify-start ${!trade ? '!border-crm-orange !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90' : '!border-crm-line !bg-card !text-crm-navy'}`}><Eye />Customer View</Button>
    </div>
    {(pricingLoading || loading) && <p role="status">Loading warranty prices…</p>}
    {pricingError && <div role="alert" className="flex items-center gap-3 text-destructive">Warranty prices are unavailable.<Button variant="outline" onClick={() => refetch()}>Try again</Button></div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Warranty duration">
      {[12, 24, 36, 48].map(months => {
        const p = config?.terms.find(item => item.months === months); const available = p && annualProductActive(p);
        const cardCost = isAnnualQuoteSnapshot(savedPlan?.selected_options) && savedPlan?.duration_months === months ? savedPlan.dealer_price : p?.dealer_price;
        const cardRetail = prices[months] ?? p?.retail_price;
        return <Button key={months} variant="outline" disabled={!available} aria-pressed={term === months} onClick={() => { setTerm(months); setError(''); }} className={`relative flex h-auto min-h-[208px] gap-0 flex-col items-stretch justify-start whitespace-normal rounded-lg border !bg-card p-4 text-left !text-crm-navy hover:!bg-card hover:!text-crm-navy lg:p-4 ${term === months ? 'border-crm-orange ring-1 ring-crm-orange' : 'border-crm-line'} disabled:opacity-60`}>
          <span className="flex items-center justify-between gap-2 text-lg font-bold">{months / 12} {months === 12 ? 'Year' : 'Years'}{term === months ? <Check className="h-4 w-4 text-crm-green" /> : <Circle className="h-4 w-4 text-muted-foreground" />}</span>
          <span className="mt-1 text-xs font-normal leading-4 text-muted-foreground">Warranty cover</span>
          <strong className="mt-2 text-3xl">{(trade ? cardCost : cardRetail) != null ? gbp((trade ? cardCost : cardRetail) || 0) : '—'}</strong>
          <span className="mt-1 text-xs font-normal leading-4 text-muted-foreground">{trade ? 'Your cost' : 'Customer price'} · inc. VAT</span>
          {trade && cardRetail != null && cardCost != null && <span className="mt-2 border-t border-crm-line pt-2 text-xs font-normal text-crm-green">Potential profit<strong className="mt-1 block text-xl">{gbp(potentialProfit(cardRetail, cardCost))}</strong></span>}
          {!available && <span className="mt-2 text-xs font-normal">{months === 48 ? 'Pending approval' : 'Unavailable'}</span>}
        </Button>;
      })}
    </div>
    {cover && <section className="border-y border-crm-line bg-card px-4 py-3" aria-label="Included warranty benefits">
      <div className="mb-3 flex flex-wrap justify-between gap-2"><h2 className="!text-base !leading-6 font-bold text-crm-navy">Every warranty includes</h2><Button variant="link" size="sm" className="h-auto p-0 text-crm-navy" onClick={() => setDetails(true)}>View full cover details &amp; exclusions<ArrowRight /></Button></div>
      <div className="grid gap-4 sm:grid-cols-3">{[{ icon: ShieldCheck, title: `${gbp(cover.excess)} excess`, text: 'Policy excess on eligible claims.' }, { icon: Wrench, title: `${gbp(cover.labour)}/hour labour`, text: `Covered labour up to ${gbp(cover.labour)} per hour.` }, { icon: FileText, title: `${gbp(cover.claim)} per eligible claim`, text: 'Subject to policy terms.' }].map(b => <div key={b.title} className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><b.icon className="h-5 w-5" /></span><div className="min-w-0"><h3 className="font-bold">{b.title}</h3><p className="mt-1 text-xs leading-4 text-muted-foreground">{b.text}</p></div></div>)}</div>
    </section>}
    {trade && <section className="grid items-center gap-5 border-y border-crm-line bg-card px-5 py-5 min-[1100px]:grid-cols-[1.3fr_1fr_auto]" aria-label="Selling price adjustment">
      <div><h2 className="font-bold">Customer selling price <span className="text-sm font-normal">(Trade View only)</span></h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Adjust the price in £100 increments or enter a custom amount.</p></div>
      <div className="flex items-center justify-center gap-5"><Button variant="secondary" size="icon" className="h-12 w-12 shrink-0" aria-label="Decrease selling price by £100" disabled={!product || stepSellingPrice(retail, -1, product) === retail} onClick={() => adjust(-1)}><Minus className="h-5 w-5" /></Button><div className="min-w-24 text-center"><strong className="block text-3xl leading-9">{term ? gbp(retail) : '—'}</strong><p className="text-xs leading-5 text-muted-foreground">£100 per tap</p></div><Button variant="secondary" size="icon" className="h-12 w-12 shrink-0" aria-label="Increase selling price by £100" disabled={!product || stepSellingPrice(retail, 1, product) === retail} onClick={() => adjust(1)}><Plus className="h-5 w-5" /></Button></div>
      <div className="flex justify-center gap-3 min-[1100px]:border-l min-[1100px]:border-crm-line min-[1100px]:pl-5"><Button variant="secondary" className="h-11" disabled={!product} onClick={() => { setExactValue(String(retail)); setExact(true); }}><Pencil />Enter exact price</Button><Button variant="secondary" className="h-11" disabled={!product || !term} onClick={() => { if (product && term) setPrices(p => ({ ...p, [term]: product.retail_price })); }}><RotateCcw />Reset</Button></div>
    </section>}
    <section className="grid items-center gap-6 border-y border-crm-line bg-card px-5 py-5 min-[1100px]:grid-cols-[1.05fr_1fr]" aria-label="Quote summary">
      <div className="grid grid-cols-3 gap-4 divide-x divide-crm-line [&>div:not(:first-child)]:pl-4">{trade && <div><p className="text-sm leading-5 text-muted-foreground">Your cost<span className="block text-xs">(to Panda Protect)</span></p><strong className="mt-3 block text-3xl leading-9">{term ? gbp(cost) : '—'}</strong></div>}<div><p className="text-sm leading-5 text-muted-foreground">Customer price<span className="block text-xs">(you’ll charge)</span></p><strong className="mt-3 block text-3xl leading-9">{term ? gbp(retail) : '—'}</strong></div>{trade && <div><p className="text-sm leading-5 text-muted-foreground">Your potential profit</p><strong className="mt-3 block text-3xl leading-9 text-crm-green">{term ? gbp(potentialProfit(retail, cost)) : '—'}</strong></div>}</div>
      <div className="min-w-0 space-y-3"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{trade && <Button variant="secondary" size="sm" className="h-10 px-2" disabled={saving || !valid} onClick={() => persist()}><Save />Save quote</Button>}<Button variant="secondary" size="sm" className="h-10 px-2" disabled={saving || !valid} onClick={() => share('whatsapp')}><MessageCircle />WhatsApp</Button><Button variant="secondary" size="sm" className="h-10 px-2" disabled={saving || !valid} onClick={() => share('email')}><Mail />Email</Button><Button variant="secondary" size="sm" className="h-10 px-2" disabled={saving || !valid} onClick={() => share('print')}><Printer />Print</Button></div>{trade && <Button className="h-12 w-full !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90" disabled={saving || !valid} onClick={() => persist(true)}>Continue to customer details<ArrowRight /></Button>}</div>
    </section>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap justify-between gap-3 text-xs text-muted-foreground"><p>Including VAT. Subject to vehicle eligibility and policy terms.</p>{trade && <div className="flex gap-3"><Button variant="link" size="sm" disabled={!valid || saving} onClick={() => share('pay')}><Link2 />Customer payment link</Button><Button variant="link" size="sm" onClick={() => navigate('/dealer-portal/quote/claim-handling')}>Manage My Claim</Button></div>}</div>
  </div>
  <Dialog open={exact} onOpenChange={setExact}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[380px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Customer selling price</DialogTitle></DialogHeader><Input aria-label="Exact customer selling price" type="number" step="0.01" min={product?.min_price} max={product?.max_price ?? undefined} value={exactValue} onChange={e => setExactValue(e.target.value)} /><p className="text-xs text-muted-foreground">Including VAT. Minimum {gbp(product?.min_price || 0)}{product?.max_price != null ? `, maximum ${gbp(product.max_price)}` : ''}.</p><Button disabled={!product || !validSellingPrice(Number(exactValue), product)} onClick={() => { if (term) setPrices(p => ({ ...p, [term]: Math.round(Number(exactValue) * 100) / 100 })); setExact(false); }}>Apply price</Button></DialogContent></Dialog>
  <Dialog open={!!emailQuote} onOpenChange={open => !open && setEmailQuote(null)}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[380px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Email customer quote</DialogTitle></DialogHeader><Input type="email" aria-label="Customer email address" placeholder="Customer email address" value={email} onChange={e => setEmail(e.target.value)} /><Button disabled={emailBusy || !email.includes('@')} onClick={async () => { setEmailBusy(true); const { data, error: sendError } = await supabase.functions.invoke('dealer-quote-email', { body: { quote_id: emailQuote, email } }); setEmailBusy(false); if (sendError || !data?.sent) { toast({ title: data?.error || 'Email could not be sent. Please try again.', variant: 'destructive' }); return; } setEmailQuote(null); toast({ title: 'Customer quote emailed' }); }}>{emailBusy ? 'Sending…' : 'Send quote'}</Button></DialogContent></Dialog>
  <Dialog open={details} onOpenChange={setDetails}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[480px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Warranty cover details</DialogTitle></DialogHeader><dl className="space-y-3">{summary.map(s => <div key={s.label} className="flex justify-between"><dt>{s.label}</dt><dd className="font-bold">{s.value}</dd></div>)}</dl><p className="text-sm text-muted-foreground">Mechanical and electrical cover is subject to vehicle eligibility, servicing requirements and policy terms. Refer to the full terms for covered components, contributions and exclusions.</p><a href="/terms/" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline">Full cover details &amp; exclusions</a></DialogContent></Dialog>
  <Dialog open={!!paylink} onOpenChange={open => !open && setPaylink('')}><DialogContent className="!left-1/2 !top-1/2 !w-[calc(100%-32px)] !max-w-[480px] !-translate-x-1/2 !-translate-y-1/2 rounded-lg !p-6 [&_h2]:!text-lg [&_h2]:!leading-6"><DialogHeader><DialogTitle>Customer payment link</DialogTitle></DialogHeader><a href={paylink} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline">Open customer quote</a><Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(paylink); toast({ title: 'Payment link copied' }); }}>Copy link</Button><p className="text-sm text-muted-foreground">Your customer pays securely by card. Warranty documents follow confirmation by your dealer.</p></DialogContent></Dialog>
  </DealerLayout>;
};
export default Step3Pricing;
