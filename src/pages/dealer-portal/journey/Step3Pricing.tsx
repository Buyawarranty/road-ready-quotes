import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import { ArrowRight, Calendar, Check, ClipboardList, Coins, Eye, Headphones, Layers, Mail, MessageCircle, Pencil, Printer, Settings, ShieldCheck, Wrench, X } from 'lucide-react';

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
  const [error, setError] = useState('');
  const termOption = warrantyTerms.find(o => o.value === term) ?? warrantyTerms[2];
  const partsOption = warrantyParts.find(o => o.value === parts) ?? warrantyParts[0];
  const pricing = useMemo(() => calculateFullWarranty(excess, labour, parts, claim, selectedAddOns), [excess, labour, parts, claim, selectedAddOns]);
  const chosenPrice = priceMode === 'recommended' ? pricing.recommended : priceMode === 'margin' ? marginSellingPrice(pricing.wholesale * 1.2, Number(margin)) / 1.2 : Number(customPrice || pricing.myPrice);
  const dealerTotals = warrantyPriceWithVat(pricing.wholesale);
  const customerTotals = warrantyPriceWithVat(chosenPrice);
  const validPrice = Number.isFinite(chosenPrice) && chosenPrice > 0;
  const summary = [
    { label: 'Warranty term', value: termOption.label },
    { label: 'Customer excess', value: gbp(Number(excess)) },
    { label: 'Maximum labour rate', value: `${gbp(Number(labour))}/hr` },
    { label: 'Parts & labour', value: partsOption.label },
    { label: 'Claim limit per repair', value: gbp(Number(claim)) },
  ];
  const customerPayload: CustomerQuotePayload = {
    vehicle, coverTitle: 'Full Warranty Cover', coverSubtitle: 'Warranty quotation', price: customerTotals.total, priceSuffix: '', specs: summary,
    included: [...included, ...liveWarrantyAddOns.filter(a => selectedAddOns.includes(a.key)).map(a => a.label)], dealerName: dealer?.company_name,
  };
  if (quoteMode === 'adjustable' && validPrice) {
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
  const buildPlan = () => ({
    plan_type: 'gold' as const, duration_months: termOption.months, term_months: termOption.months,
    retail_price: customerTotals.total, dealer_price: dealerTotals.total,
    selected_options: { warranty_type: 'fully-covered', label: 'Full Warranty Cover', term: termOption.label,
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
      <div><p className="text-[11px] font-bold text-crm-orange">FULL WARRANTY COVER</p><h1 className="mt-1 text-2xl font-bold">Configure your comprehensive warranty</h1><p className="mt-1 text-sm text-muted-foreground">Choose the cover options for your customer.</p></div>
      <ol className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Quote progress">
        {['Enter Reg Plate', 'Vehicle Details', 'Choose Your Plan', 'Review & Pay'].map((label, i) => <li key={label} className="flex items-center gap-2 text-xs font-semibold"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${i < 2 ? 'bg-crm-green text-primary-foreground' : i === 2 ? 'bg-crm-orange text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i < 2 ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>{label}</li>)}
      </ol>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-crm-line bg-crm-blue-soft p-4"><h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Check className="h-4 w-4 text-crm-green" /> Included as standard</h2><div className="grid gap-3 sm:grid-cols-2">{included.map((item, i) => <div key={item} className="flex items-start gap-2">{i === 0 ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <Headphones className="h-5 w-5 shrink-0" />}<p className="text-xs font-semibold">{item}</p></div>)}</div></section>
          <Card className="border-crm-line"><CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><Settings className="h-4 w-4 text-crm-orange" /> Configure your warranty</h2><div className="flex gap-1"><Button variant="outline" size="sm" className="border-crm-orange bg-crm-orange text-primary-foreground hover:bg-crm-orange/90 hover:text-primary-foreground">Dealer</Button><Button variant="outline" size="sm" onClick={() => share('view')}>Preview quote <Eye /></Button></div></div>
            <div className="mt-3"><WarrantyOptionRow icon={Calendar} label="Warranty term" helper="Length of cover." options={warrantyTerms} value={term} onChange={setTerm} /><WarrantyOptionRow icon={Layers} label="Customer excess" helper="Customer contribution per approved claim." options={warrantyExcess} value={excess} onChange={setExcess} /><WarrantyOptionRow icon={Wrench} label="Maximum labour rate" helper="Hourly repair rate, including VAT." options={warrantyLabour} value={labour} onChange={setLabour} /><WarrantyOptionRow icon={Settings} label="Parts & labour" helper="Replacement-parts contribution." options={warrantyParts} value={parts} onChange={setParts} /><p className="mb-3 text-xs leading-relaxed text-muted-foreground">{parts === 'age-mileage' ? 'Parts replacement includes a customer contribution based on vehicle age and mileage, as set out in the policy.' : 'Approved parts and labour are covered without an age or mileage contribution, subject to your selected limits and policy terms.'}</p><WarrantyOptionRow icon={Coins} label="Claim limit per repair" helper="Maximum approved repair amount." options={[...warrantyClaims, ...pendingWarrantyClaims]} value={claim} onChange={setClaim} /></div>
            <div className="mt-3 border-t border-crm-line pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">My saved plans</h3><SaveQuoteTemplateButton onSaved={reload} getSelection={() => ({ term: termOption.months, excess: Number(excess), labour: Number(labour), parts, claim: Number(claim), plan_type: 'gold', price: chosenPrice })} className="inline-flex items-center gap-1.5 rounded-md border border-crm-line px-3 py-2 text-xs font-semibold" /></div><div className="mt-2 flex flex-wrap gap-2">{templates.filter(t => t.plan_type === 'gold').map(t => <div key={t.id} className="inline-flex rounded-md border border-crm-line"><Button size="sm" variant="ghost" onClick={() => applyTemplate(t)}>{t.name}</Button><Button size="icon" variant="ghost" className="h-9 w-8" aria-label={`Delete ${t.name}`} onClick={() => deleteTemplate(t.id).catch(() => toast({ title: 'Could not delete saved plan', variant: 'destructive' }))}><X /></Button></div>)}</div></div>
          </CardContent></Card>
          <section className="rounded-lg border border-crm-line bg-card p-4"><h2 className="text-sm font-bold">Optional add-ons</h2><p className="mt-1 text-xs text-muted-foreground">Full warranty add-on prices excluding VAT · subject to policy terms and vehicle eligibility.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{liveWarrantyAddOns.map(a => <label key={a.key} className="flex cursor-pointer items-start gap-2 rounded-md border border-crm-line p-3 text-xs"><Checkbox className="mt-0.5 shrink-0" checked={selectedAddOns.includes(a.key)} onCheckedChange={checked => setSelectedAddOns(current => checked === true ? [...new Set([...current, a.key])] : current.filter(k => k !== a.key))} /><span className="min-w-0 flex-1"><span className="font-semibold">{a.label}</span><span className="mt-1 block text-[11px] text-muted-foreground">{a.description}</span></span><span className="shrink-0">+{gbp(a.price)} + VAT</span></label>)}</div></section>
        </div>
        <aside className="xl:sticky xl:top-24"><Card className="border-crm-line"><CardContent className="p-4">
          <h2 className="flex items-center gap-2 text-base font-bold"><ClipboardList className="h-4 w-4 text-crm-orange" /> Quote summary</h2>
          <dl className="mt-4 space-y-2">{summary.map(row => <div key={row.label} className="flex justify-between gap-3 text-xs"><dt className="text-muted-foreground">{row.label}</dt><dd className="max-w-[55%] text-right font-semibold">{row.value}</dd></div>)}</dl>
          {selectedAddOns.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Add-ons: {liveWarrantyAddOns.filter(a => selectedAddOns.includes(a.key)).map(a => a.label).join(', ')}</p>}
          <div className="mt-4 border-y border-crm-line py-3"><p className="text-xs text-muted-foreground">Your dealer cost, excluding VAT</p><p className="mt-1 text-2xl font-bold">{gbp(pricing.wholesale)}</p><p className="mt-1 text-xs text-muted-foreground">+{gbp(dealerTotals.vat)} VAT · Total {gbp(dealerTotals.total)}</p></div>
          <fieldset className="mt-4"><legend className="text-xs font-semibold">Customer selling price</legend><div className="mt-2 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setPriceMode('recommended')} aria-pressed={priceMode === 'recommended'} className={`h-auto flex-col whitespace-normal p-3 ${priceMode === 'recommended' ? 'bg-crm-navy text-primary-foreground hover:bg-crm-navy hover:text-primary-foreground' : ''}`}><span className="text-xs">Recommended</span><span className="text-sm font-bold">{gbp(pricing.recommended)} + VAT</span></Button><Button variant="outline" onClick={() => setPriceMode('custom')} aria-pressed={priceMode === 'custom'} className={`h-auto flex-col whitespace-normal p-3 ${priceMode === 'custom' ? 'bg-crm-navy text-primary-foreground hover:bg-crm-navy hover:text-primary-foreground' : ''}`}><span className="text-xs">My price</span><span className="text-sm font-bold">{gbp(Number(customPrice || pricing.myPrice))} + VAT</span></Button></div>{priceMode === 'custom' && <div className="mt-3"><label htmlFor="customer-selling-price" className="text-xs text-muted-foreground">Full customer selling price excluding VAT</label><Input id="customer-selling-price" type="number" min="0.01" step="0.01" value={customPrice || pricing.myPrice} onChange={e => setCustomPrice(e.target.value)} /></div>}<Button variant="outline" className="mt-2 w-full" aria-pressed={priceMode === 'margin'} onClick={() => setPriceMode('margin')}>Profit margin %</Button>{priceMode === 'margin' && <div className="mt-3"><label htmlFor="profit-margin" className="text-xs text-muted-foreground">Profit margin on selling price (%)</label><Input id="profit-margin" type="number" min="0" max="99.99" step="0.1" value={margin} onChange={e => setMargin(e.target.value)} /><p className="mt-2 text-sm font-semibold">Selling price: {validPrice ? gbp(chosenPrice) : 'Enter 0–99.99%'} + VAT</p></div>}<p className="mt-2 text-[11px] text-muted-foreground">Full warranty price, paid once. VAT is added below.</p></fieldset>
          {validPrice && <dl className="mt-3 space-y-2 border-t border-crm-line pt-3 text-xs"><div className="flex justify-between"><dt>Warranty price</dt><dd>{gbp(customerTotals.net)}</dd></div><div className="flex justify-between"><dt>VAT (20%)</dt><dd>{gbp(customerTotals.vat)}</dd></div><div className="flex justify-between font-bold"><dt>Final customer price</dt><dd>{gbp(customerTotals.total)}</dd></div></dl>}
          <fieldset className="mt-4"><legend className="text-xs font-semibold">Quote format</legend><div className="mt-2 grid grid-cols-2 gap-2">{(['fixed', 'adjustable'] as const).map(mode => <Button key={mode} variant="outline" aria-pressed={quoteMode === mode} className={`whitespace-normal h-auto py-2 text-xs ${quoteMode === mode ? 'bg-crm-navy text-primary-foreground hover:bg-crm-navy hover:text-primary-foreground' : ''}`} onClick={() => setQuoteMode(mode)}>{mode === 'fixed' ? 'Fixed quote' : 'Adjustable quote'}</Button>)}</div></fieldset>
          <Button variant="outline" className="mt-3 w-full" onClick={() => share('view')}><Eye /> Preview quote</Button>
          <div className="mt-2 grid grid-cols-3 gap-1.5"><Button size="sm" variant="outline" className="px-2 text-xs" onClick={() => share('print')}><Printer /> Print</Button><Button size="sm" variant="outline" className="px-2 text-xs" onClick={() => share('email')}><Mail /> Email</Button><Button size="sm" variant="outline" className="px-2 text-xs" onClick={() => share('whatsapp')}><MessageCircle /> WhatsApp</Button></div>
          {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
          <div className="mt-4 space-y-2"><Button className="w-full" disabled={saving || !validPrice} onClick={() => persist(false)}>{saving ? 'Saving…' : 'Continue'}<ArrowRight /></Button><Button variant="outline" className="w-full border-crm-orange" disabled={saving || !validPrice} onClick={() => persist(true)}>Save draft & exit</Button></div>
        </CardContent></Card></aside>
      </div>
    </div>
  </DealerLayout>;
};
export default Step3Pricing;
