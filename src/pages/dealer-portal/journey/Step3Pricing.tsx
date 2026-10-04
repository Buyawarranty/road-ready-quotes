import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import CoverTypeSwitch from '@/components/dealer/journey/CoverTypeSwitch';

import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useToast } from '@/hooks/use-toast';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';
import { useDealerQuoteTemplates, type DealerQuoteTemplate } from '@/hooks/useDealerQuoteTemplates';
import SaveQuoteTemplateButton from '@/components/dealer/journey/SaveQuoteTemplateButton';
import WarrantyOptionRow from '@/components/dealer/journey/WarrantyOptionRow';
import { warrantyTerms, warrantyExcess, warrantyLabour, warrantyParts, warrantyClaims, pendingWarrantyClaims, liveWarrantyAddOns, calculateFullWarranty, warrantyPriceWithVat } from '@/lib/fullWarrantyConfiguration';
import { buildCustomerQuoteUrl, customerQuoteMessage, type CustomerQuotePayload } from '@/lib/customerQuoteSharing';
import { marginSellingPrice } from '@/lib/customerSellingPrice';
import { dealerQuoteEconomics } from '@/lib/dealerQuoteEconomics';
import { ArrowRight, Calendar, Check, ChevronDown, ClipboardList, Coins, Copy, Eye, Headphones, Layers, Link2, Mail, MessageCircle, Pencil, Printer, Plus, Settings, ShieldCheck, Wrench, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const gbp = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
const included = ['Comprehensive mechanical & electrical cover', 'UK claims support'];

const Step3Pricing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dealer, loading } = useDealerAuth();
  const { vehicle, plan: savedPlan, setPlan, reset } = useDealerJourney();
  const { toast } = useToast();
  const { save, saving } = useDealerQuoteSave(3);
  const { templates, reload, deleteTemplate } = useDealerQuoteTemplates();
  const old = savedPlan?.selected_options || {};
  const initialTerm = warrantyTerms.find(t => t.months === savedPlan?.duration_months)?.value || '12';
  const [term, setTerm] = useState(initialTerm);
  const [excess, setExcess] = useState(String(old.excess ?? 50));
  const [labour, setLabour] = useState(warrantyLabour.some(o => o.value === String(old.labour)) ? String(old.labour) : '70');
  const [parts, setParts] = useState(old.parts_key || (String(old.parts).includes('100%') || old.parts === 'No contribution' ? 'none' : 'age-mileage'));
  const [claim, setClaim] = useState(warrantyClaims.some(o => o.value === String(old.claim)) ? String(old.claim) : '1000');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(Array.isArray(old.add_ons) ? old.add_ons.filter((key: string) => liveWarrantyAddOns.some(a => a.key === key)) : []);
  const [priceMode, setPriceMode] = useState<'recommended' | 'custom' | 'margin'>(old.customer_price_mode || 'recommended');
  const [customPrice, setCustomPrice] = useState(String(old.customer_price ?? ''));
  const [margin, setMargin] = useState(String(old.customer_margin ?? 20));
  const [quoteMode, setQuoteMode] = useState<'fixed' | 'adjustable'>('fixed');
  const [coverType, setCoverType] = useState<'comprehensive' | 'manage-my-claims'>('comprehensive');
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [savedPlansOpen, setSavedPlansOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState('');
  const managed = coverType === 'manage-my-claims';
  const [paylink, setPaylink] = useState<string | null>(null);
  const [paylinkBusy, setPaylinkBusy] = useState(false);
  const termOption = warrantyTerms.find(o => o.value === term) ?? warrantyTerms[2];
  const partsOption = warrantyParts.find(o => o.value === parts) ?? warrantyParts[0];
  const pricing = useMemo(() => calculateFullWarranty(excess, labour, parts, claim, selectedAddOns), [excess, labour, parts, claim, selectedAddOns]);
  const chosenPrice = priceMode === 'recommended' ? pricing.recommended : priceMode === 'margin' ? marginSellingPrice(pricing.wholesale * 1.2, Number(margin)) / 1.2 : Number(customPrice);
  const dealerTotals = warrantyPriceWithVat(pricing.wholesale);
  const customerTotals = warrantyPriceWithVat(chosenPrice);
  const validPrice = managed || (Number.isFinite(chosenPrice) && chosenPrice > 0);
  const economics = dealerQuoteEconomics(pricing.wholesale, chosenPrice);
  const managedFeeExVat = termOption.months * 1;
  const managedFeeVat = +(managedFeeExVat * 0.2).toFixed(2);
  const managedFeeTotal = +(managedFeeExVat + managedFeeVat).toFixed(2);
  const summary = [
    { label: 'Warranty term', value: termOption.label },
    { label: 'Customer excess', value: gbp(Number(excess)) },
    { label: 'Labour rate', value: `${gbp(Number(labour))}/hr` },
    { label: 'Parts contribution', value: partsOption.label },
    { label: 'Claim limit per repair', value: gbp(Number(claim)) },
  ];
  const customerPayload: CustomerQuotePayload = {
    vehicle, coverTitle: managed ? 'Manage My Claims' : 'Comprehensive Warranty', coverSubtitle: 'Warranty quotation', price: managed ? managedFeeTotal : customerTotals.total, priceSuffix: managed ? `for ${termOption.label} including VAT (£1 a month)` : '', specs: summary,
    included: managed ? ['Panda Protect manages the claims process', 'Your dealership funds approved repairs', 'UK claims support'] : [...included, ...liveWarrantyAddOns.filter(a => selectedAddOns.includes(a.key)).map(a => a.label)], dealerName: dealer?.company_name,
  };
  if (!managed && quoteMode === 'adjustable' && validPrice) {
    const ratio = customerTotals.total / pricing.wholesale;
    const options = [warrantyExcess, warrantyLabour, warrantyParts, warrantyClaims];
    const prices: number[] = [];
    for (const e of warrantyExcess) for (const l of warrantyLabour) for (const p of warrantyParts) for (const c of warrantyClaims) {
      prices.push(+(calculateFullWarranty(e.value, l.value, p.value, c.value, []).wholesale * ratio).toFixed(2));
    }
    customerPayload.adjustable = {
      groups: options.map((opts, i) => ({ label: summary[i + 1].label, options: opts.map(o => ({ value: o.value, label: o.label })) })),
      selected: [excess, labour, parts, claim], prices,
      extras: liveWarrantyAddOns.map(a => ({ key: a.key, label: a.label, price: +(a.price * ratio).toFixed(2) })),
      selectedExtras: selectedAddOns, baseIncluded: included,
    };
  }
  const getCustomerUrl = () => new URL(buildCustomerQuoteUrl(customerPayload), window.location.origin).href;
  const share = (action: 'view' | 'print' | 'email' | 'whatsapp') => {
    if (!vehicle?.reg || !validPrice) { setError('Enter a valid customer price and select a vehicle first.'); return; }
    const url = getCustomerUrl();
    if (action === 'view' || action === 'print') {
      const target = new URL(url);
      if (action === 'print') target.searchParams.set('print', '1');
      window.open(target.href, '_blank', 'noopener,noreferrer');
      return;
    }
    const message = customerQuoteMessage(customerPayload, url);
    if (action === 'email') window.location.href = `mailto:?subject=${encodeURIComponent(`Warranty quote — ${vehicle.reg}`)}&body=${encodeURIComponent(message)}`;
    else window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };
  const openPaylink = async () => {
    if (!vehicle?.reg || !validPrice) { setError('Enter a valid customer price and select a vehicle first.'); return; }
    setError('');
    setPaylinkBusy(true);
    const plan = buildPlan();
    setPlan(plan);
    const id = await save({ overridePlan: plan, silent: true });
    setPaylinkBusy(false);
    if (!id) { setError('Your quote could not be saved, so no payment link was created. Please try again.'); return; }
    setPaylink(getCustomerUrl().replace('/customer-quote/#', `/customer-quote/?pay=${id}#`));
  };
  const buildPlan = () => managed ? ({
    plan_type: 'basic' as const, duration_months: termOption.months, term_months: termOption.months,
    dealer_price: managedFeeTotal, retail_price: managedFeeTotal,
    selected_options: { warranty_type: 'dealer-paid', label: 'Manage My Claims', term: termOption.label, excess: Number(excess), labour: Number(labour), parts: partsOption.label, claim: Number(claim), add_ons: [], monthly_fee: 1, fee_total: managedFeeTotal, repairs_funded_by: 'dealer' },
  }) : ({
    plan_type: 'gold' as const, duration_months: termOption.months, term_months: termOption.months,
    retail_price: customerTotals.total, dealer_price: dealerTotals.total,
    selected_options: { warranty_type: 'fully-covered', label: 'Comprehensive Warranty', term: termOption.label,
      excess: Number(excess), labour: Number(labour), parts: partsOption.label, parts_key: parts, claim: Number(claim),
      add_ons: selectedAddOns, price_basis: 'full-warranty', ex_vat_total: pricing.total, vat_total: dealerTotals.vat,
      customer_price: chosenPrice, customer_price_mode: priceMode, customer_margin: Number(margin),
    },
  });
  const persist = async (exit: boolean) => {
    if (!vehicle?.reg || !validPrice) { setError('Select a vehicle and enter a valid customer selling price.'); return; }
    setError('');
    const plan = buildPlan();
    setPlan(plan);
    const id = await save({ overridePlan: plan });
    if (!id) { setError('Your quote could not be saved. Please try again.'); return; }
    if (exit) { reset(); navigate('/dealer-portal/quotes'); }
    else navigate('/dealer-portal/quote/customer');
  };
  const applyTemplate = (t: DealerQuoteTemplate) => {
    const match = warrantyTerms.find(o => o.months === t.term_months);
    if (!match || !warrantyExcess.some(o => o.value === String(t.excess)) || !warrantyLabour.some(o => o.value === String(t.labour)) || !warrantyClaims.some(o => o.value === String(t.claim_limit))) {
      toast({ title: 'This saved plan uses options not currently available', variant: 'destructive' }); return;
    }
    setTerm(match.value); setExcess(String(t.excess)); setLabour(String(t.labour)); setClaim(String(t.claim_limit));
    setParts(t.parts === 'none' ? 'none' : 'age-mileage');
    if (t.price && t.price > 0) { setCustomPrice(String(t.price)); setPriceMode('custom'); }
    setSelectedAddOns([]);
  };
  if (!loading && !dealer) return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <DealerLayout>
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-crm-line bg-card px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="w-36 shrink-0"><div className="vehicle-reg-plate vehicle-reg-plate--list"><span className="vehicle-reg-plate__country">GB<span>UK</span></span><span className="vehicle-reg-plate__text">{vehicle?.reg || 'ENTER REG'}</span></div></div>
          <div><p className="text-sm font-semibold">{[vehicle?.make, vehicle?.model].filter(Boolean).join(' ')}</p><p className="text-xs text-muted-foreground">{[vehicle?.year, vehicle?.fuel_type, vehicle?.mileage ? `${Number(vehicle.mileage).toLocaleString('en-GB')} miles` : null].filter(Boolean).join(' · ')}</p></div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/dealer-portal/quote/vehicle')}><Pencil /> Edit vehicle</Button>
      </div>
      <h1 className="sr-only">Warranty configuration</h1>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <CoverTypeSwitch active={coverType} onChange={setCoverType} />
          {managed && <section className="rounded-lg border border-crm-orange/30 bg-crm-orange-soft p-4"><h2 className="text-sm font-bold">How it works</h2><ol className="mt-3 grid gap-3 sm:grid-cols-2">{['Customer contacts Panda Protect', 'Panda Protect assesses and manages the claim', 'Repair is authorised', 'Your dealership funds the approved repair'].map((item, i) => <li key={item} className="flex items-start gap-2 text-xs"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-crm-orange text-primary-foreground">{i + 1}</span>{item}</li>)}</ol></section>}
          <Card className="border-crm-line"><CardContent className="p-4">
            <h2 className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="h-5 w-5 text-crm-orange" /> {managed ? 'Configure Managed Claims' : 'Configure warranty'}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{managed ? 'You provide the warranty and fund approved repairs. Panda Protect manages the claims process for you.' : 'Choose the cover options for this customer.'}</p>
            <div className="mt-3"><WarrantyOptionRow icon={Calendar} label="Warranty term" helper="Length of cover." options={warrantyTerms} value={term} onChange={setTerm} /><WarrantyOptionRow icon={Layers} label="Customer excess" helper="Customer contribution per approved claim." options={warrantyExcess} value={excess} onChange={setExcess} /><WarrantyOptionRow icon={Wrench} label="Labour rate" helper="Hourly repair rate, including VAT." options={warrantyLabour} value={labour} onChange={setLabour} /><WarrantyOptionRow icon={Settings} label="Parts contribution" helper="Replacement-parts contribution." options={warrantyParts} value={parts} onChange={setParts} /><WarrantyOptionRow icon={Coins} label="Claim limit per repair" helper="Maximum approved repair amount." options={[...warrantyClaims, ...pendingWarrantyClaims]} value={claim} onChange={setClaim} /></div>
            {!managed && <div className="mt-3 border-t border-crm-line pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" size="sm" onClick={() => setSavedPlansOpen(v => !v)} aria-expanded={savedPlansOpen}>My saved plans <ChevronDown className={savedPlansOpen ? "rotate-180" : ""} /></Button><SaveQuoteTemplateButton onSaved={reload} getSelection={() => ({ term: termOption.months, excess: Number(excess), labour: Number(labour), parts, claim: Number(claim), plan_type: 'gold', price: chosenPrice })} className="inline-flex items-center gap-1.5 rounded-md border border-crm-line px-3 py-2 text-xs font-semibold" /></div>{savedPlansOpen && <div className="mt-2 flex flex-wrap gap-2">{templates.filter(t => t.plan_type === 'gold').map(t => <div key={t.id} className="inline-flex rounded-md border border-crm-line"><Button size="sm" variant="ghost" onClick={() => applyTemplate(t)}>{t.name}</Button><Button size="icon" variant="ghost" className="h-9 w-8" aria-label={`Delete ${t.name}`} onClick={() => deleteTemplate(t.id).catch(() => toast({ title: 'Could not delete saved plan', variant: 'destructive' }))}><X /></Button></div>)}</div>}</div>}
          </CardContent></Card>
          {!managed && <section className="rounded-lg border border-crm-line bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-crm-orange" /> Optional extras</h2><p className="mt-1 text-xs text-muted-foreground">Add extra benefits to the warranty.</p></div><span className="text-xs font-semibold">{selectedAddOns.length} selected · +{gbp(liveWarrantyAddOns.filter(a => selectedAddOns.includes(a.key)).reduce((sum,a) => sum+a.price,0))}</span></div>
            <div className="mt-3 divide-y divide-crm-line">{liveWarrantyAddOns.filter(a => extrasOpen || a.key === 'rental' || selectedAddOns.includes(a.key)).map(a => <label key={a.key} className="flex cursor-pointer items-start gap-3 py-3 text-xs"><Checkbox className="!h-4 !w-4 mt-0.5 shrink-0 data-[state=checked]:border-crm-green data-[state=checked]:bg-crm-green data-[state=checked]:text-primary-foreground" checked={selectedAddOns.includes(a.key)} onCheckedChange={checked => setSelectedAddOns(current => checked === true ? [...new Set([...current, a.key])] : current.filter(k => k !== a.key))} /><span className="min-w-0 flex-1"><span className="font-semibold">{a.label}</span><span className="mt-1 block text-muted-foreground">{a.description}</span></span><span className="shrink-0">+{gbp(a.price)}</span></label>)}</div>
            <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={() => setExtrasOpen(v => !v)} aria-expanded={extrasOpen}>{extrasOpen ? 'View fewer extras' : 'View more extras'} <ChevronDown className={extrasOpen ? 'rotate-180' : ''} /></Button>
            <p className="mt-1 text-[11px] text-muted-foreground">Full warranty prices excluding VAT · subject to eligibility and policy terms.</p>
          </section>}
        </div>
        <aside className="xl:sticky xl:top-24"><Card className="border-crm-line"><CardContent className="p-4">
          <h2 className="flex items-center gap-2 text-base font-bold"><ClipboardList className="h-4 w-4 text-crm-orange" /> Quote summary</h2>
          <dl className="mt-4 space-y-2">{summary.map(row => <div key={row.label} className="flex justify-between gap-3 text-xs"><dt className="text-muted-foreground">{row.label}</dt><dd className="max-w-[55%] text-right font-semibold">{row.value}</dd></div>)}</dl>
          {!managed && selectedAddOns.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Add-ons: {liveWarrantyAddOns.filter(a => selectedAddOns.includes(a.key)).map(a => a.label).join(', ')}</p>}
          {managed ? <div className="mt-4 space-y-3 border-t border-crm-line pt-4">
            <p className="text-xs font-semibold">Panda Protect service fee</p><p className="text-2xl font-bold">{gbp(managedFeeExVat)} <span className="text-xs font-normal text-muted-foreground">plus VAT · £1 a month × {termOption.months} months</span></p><p className="text-xs text-muted-foreground">VAT (20%) {gbp(managedFeeVat)} · Total {gbp(managedFeeTotal)} for {termOption.label}</p>
            <div className="border-t border-crm-line pt-3"><p className="text-xs font-bold">Your repair responsibility</p><p className="mt-1 text-xs text-muted-foreground">Your dealership funds approved repairs.</p></div>
          </div> : <>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-crm-line pt-4 text-xs"><span className="text-muted-foreground">Your cost (ex. VAT)</span><strong className="text-base">{gbp(pricing.wholesale)}</strong></div>
          <div className="mt-3 flex items-center justify-between gap-3"><label htmlFor="customer-selling-price" className="text-xs text-muted-foreground">Customer selling price (ex. VAT)</label><Input id="customer-selling-price" aria-label="Customer selling price excluding VAT" className="h-9 w-28 shrink-0 text-right" type="number" min="0.01" step="0.01" value={priceMode === 'custom' ? customPrice : validPrice ? chosenPrice : ''} onChange={e => { setPriceMode('custom'); setCustomPrice(e.target.value); }} /></div>
          {validPrice && <><div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-crm-green-soft p-3 text-crm-green"><div><p className="text-xs">Your profit</p><p className="mt-1 text-2xl font-bold">{gbp(economics.profit)}</p></div><div className="text-right"><p className="text-xs">Margin</p><p className="mt-1 text-lg font-bold">{economics.margin.toFixed(0)}%</p></div></div><dl className="mt-3 space-y-3 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">VAT (20%)</dt><dd>{gbp(customerTotals.vat)}</dd></div><div className="flex justify-between gap-3 font-bold"><dt>Total customer price (inc. VAT)</dt><dd>{gbp(customerTotals.total)}</dd></div></dl></>}
          <p className="mt-2 text-[11px] text-muted-foreground">Full warranty price · One payment</p>
          <Button variant="ghost" size="sm" className="mt-2 h-7 px-0 text-xs" onClick={() => setAdvancedOpen(v => !v)} aria-expanded={advancedOpen}>Price & quote options <ChevronDown className={advancedOpen ? 'rotate-180' : ''} /></Button>
          {advancedOpen && <div className="mt-2 space-y-3"><div className="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onClick={() => setPriceMode('recommended')}>Recommended</Button><Button variant="outline" size="sm" onClick={() => setPriceMode('margin')}>Set margin %</Button></div>{priceMode === 'margin' && <div><label htmlFor="profit-margin" className="text-xs">Profit margin (%)</label><Input id="profit-margin" type="number" min="0" max="99.99" step="0.1" value={margin} onChange={e => setMargin(e.target.value)} /></div>}<fieldset><legend className="text-xs font-semibold">Quote format</legend><div className="mt-2 grid grid-cols-2 gap-2">{(['fixed', 'adjustable'] as const).map(mode => <Button key={mode} variant="outline" size="sm" aria-pressed={quoteMode === mode} className={quoteMode === mode ? 'border-crm-orange bg-crm-orange-soft' : ''} onClick={() => setQuoteMode(mode)}>{mode === 'fixed' ? 'Fixed quote' : 'Adjustable quote'}</Button>)}</div></fieldset></div>}
          </>}
          {!managed && <><h3 className="mt-4 border-t border-crm-line pt-3 text-xs font-bold">Quote actions</h3>
          <div className="mt-3 grid grid-cols-2 gap-1.5"><Button variant="outline" className="px-2 text-xs" onClick={() => share('view')}><Eye /> Customer View</Button><Button variant="outline" className="px-2 text-xs" onClick={openPaylink} disabled={paylinkBusy || managed}><Link2 /> {paylinkBusy ? 'Creating…' : 'Payment Link'}</Button></div>
          <div className="mt-2 grid grid-cols-3 gap-1.5"><Button size="sm" variant="outline" className="px-2 text-xs" onClick={() => share('print')}><Printer /> Print</Button><Button size="sm" variant="outline" className="px-2 text-xs" onClick={() => share('email')}><Mail /> Email</Button><Button size="sm" variant="outline" className="px-2 text-xs" onClick={() => share('whatsapp')}><MessageCircle /> WhatsApp</Button></div></>}
          {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
          <div className="mt-4 space-y-2"><Button className="w-full" disabled={saving || !validPrice} onClick={() => persist(false)}>{saving ? 'Saving…' : 'Continue'}<ArrowRight /></Button><Button variant="outline" className="w-full border-crm-orange" disabled={saving || !validPrice} onClick={() => persist(true)}>Save draft</Button></div>
        </CardContent></Card></aside>
      </div>
    </div>
    <Dialog open={!!paylink} onOpenChange={open => !open && setPaylink(null)}>
      <DialogContent className="!left-1/2 !top-1/2 !translate-x-[-50%] !translate-y-[-50%] w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Customer payment link</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Send this link to your customer. They'll see their quote and can pay {validPrice ? gbp(customerTotals.total) : ''} securely by card.</p>
        <a href={paylink || undefined} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-md border border-crm-line bg-muted/50 p-3 text-sm font-semibold text-primary">Open customer quote <ArrowRight className="h-4 w-4 shrink-0" /></a>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(paylink || ''); toast({ title: 'Payment link copied' }); }}><Copy /> Copy</Button>
          <Button variant="outline" size="sm" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(`Your Panda Protect warranty — ${vehicle?.reg}`)}&body=${encodeURIComponent(`Hi,\n\nHere is your warranty quote and secure payment link for ${[vehicle?.make, vehicle?.model].filter(Boolean).join(' ')} (${vehicle?.reg}):\n\n${paylink}\n\nTotal to pay: ${gbp(customerTotals.total)} including VAT.\n\nThanks,\n${dealer?.company_name || ''}`)}`; }}><Mail /> Email</Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Your Panda Protect warranty quote for ${vehicle?.reg} — pay securely here: ${paylink}`)}`, '_blank', 'noopener,noreferrer')}><MessageCircle /> WhatsApp</Button>
        </div>
      </DialogContent>
    </Dialog>
  </DealerLayout>;
};
export default Step3Pricing;
