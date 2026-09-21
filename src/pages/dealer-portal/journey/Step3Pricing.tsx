import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useToast } from '@/hooks/use-toast';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';
import supportPanda from '@/assets/contact-support-panda.png.asset.json';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileText,
  Layers,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

type ViewMode = 'wholesale' | 'retail' | 'customer';

const termOptions = [
  { value: '3', label: '3 months', months: 3, factor: 0.42 },
  { value: '6+1', label: '6 + 1 months', months: 7, factor: 0.68 },
  { value: '12+12', label: '12 + 12 months', months: 12, factor: 1 },
  { value: '24+12', label: '24 + 12 months', months: 24, factor: 1.62 },
  { value: '36+12', label: '36 + 12 months', months: 36, factor: 2.15 },
];

const excessOptions = [
  { value: '0', label: '£0', factor: 1.22 },
  { value: '50', label: '£50', factor: 1 },
  { value: '100', label: '£100', factor: 0.93 },
  { value: '250', label: '£250', factor: 0.86 },
  { value: '500', label: '£500', factor: 0.78 },
];

const labourOptions = [
  { value: '40', label: '£40', factor: 0.9 },
  { value: '70', label: '£70', factor: 1 },
  { value: '100', label: '£100', factor: 1.12 },
  { value: '150', label: '£150', factor: 1.26 },
  { value: '200', label: '£200', factor: 1.4 },
];

const partsOptions = [
  { value: 'age-mileage', label: 'Age & Mileage', factor: 1 },
  { value: 'none', label: 'No contribution', factor: 1.15 },
];

const claimOptions = [
  { value: '750', label: '£750', factor: 0.9 },
  { value: '1000', label: '£1,000', factor: 1 },
  { value: '2000', label: '£2,000', factor: 1.18 },
  { value: '3000', label: '£3,000', factor: 1.32 },
];

const addOns = [
  { key: 'breakdown', label: 'Breakdown assistance', price: 6 },
  { key: 'mot', label: 'MOT protection', price: 4 },
  { key: 'diagnostics', label: 'Diagnostics contribution', price: 5 },
  { key: 'wear', label: 'Wear & tear options', price: 8 },
];

const reassurance = [
  'All mechanical & electrical components',
  'Parts, labour & VAT included',
  'Nationwide repair network',
];

const steps = [
  { n: 1, label: 'Enter Reg Plate', state: 'done' as const },
  { n: 2, label: 'Vehicle Details', state: 'done' as const },
  { n: 3, label: 'Choose Your Plan', state: 'current' as const },
  { n: 4, label: 'Review & Pay', state: 'todo' as const },
];

const BASE_MONTHLY = 118;

const gbp = (n: number) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });

interface OptionRowProps {
  icon: React.ElementType;
  label: string;
  helper: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  badgeValue?: string;
  error?: string;
}

const OptionRow: React.FC<OptionRowProps> = ({ icon: Icon, label, helper, options, value, onChange, badgeValue, error }) => (
  <div className="grid gap-3 border-t border-crm-line py-4 first:border-t-0 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs leading-snug text-muted-foreground">{helper}</p>
      </div>
    </div>
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`relative min-w-[92px] flex-1 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                active
                  ? 'border-crm-orange bg-crm-orange text-white'
                  : 'border-crm-line bg-card text-foreground hover:border-crm-orange/50 hover:bg-muted'
              }`}
            >
              {badgeValue === option.value && !active && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-crm-orange-soft px-2 text-[9px] font-bold uppercase tracking-wide text-crm-orange">
                  Most popular
                </span>
              )}
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
    </div>
  </div>
);

const Step3Pricing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dealer, loading } = useDealerAuth();
  const { vehicle, setPlan, reset } = useDealerJourney();
  const { toast } = useToast();
  const { save, saving } = useDealerQuoteSave(3);

  const [view, setView] = useState<ViewMode>('wholesale');
  const [term, setTerm] = useState('12+12');
  const [excess, setExcess] = useState('50');
  const [labour, setLabour] = useState('70');
  const [parts, setParts] = useState('age-mileage');
  const [claim, setClaim] = useState('1000');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [addOnsOpen, setAddOnsOpen] = useState(false);
  const [customerViewOpen, setCustomerViewOpen] = useState(false);
  const [priceState, setPriceState] = useState<'idle' | 'updating'>('idle');
  const [error, setError] = useState('');

  const termOption = termOptions.find((o) => o.value === term)!;
  const excessOption = excessOptions.find((o) => o.value === excess)!;
  const labourOption = labourOptions.find((o) => o.value === labour)!;
  const partsOption = partsOptions.find((o) => o.value === parts)!;
  const claimOption = claimOptions.find((o) => o.value === claim)!;

  const pricing = useMemo(() => {
    const addOnTotal = selectedAddOns.reduce(
      (sum, key) => sum + (addOns.find((a) => a.key === key)?.price ?? 0),
      0,
    );
    const monthly =
      BASE_MONTHLY * excessOption.factor * labourOption.factor * partsOption.factor * claimOption.factor +
      addOnTotal;
    const wholesale = +monthly.toFixed(2);
    const total = +(wholesale * 12).toFixed(2);
    return {
      wholesale,
      total,
      recommended: +(wholesale * 1.5).toFixed(2),
      myPrice: +(wholesale * 1.687).toFixed(2),
    };
  }, [excessOption, labourOption, partsOption, claimOption, selectedAddOns]);

  useEffect(() => {
    setPriceState('updating');
    const timer = window.setTimeout(() => setPriceState('idle'), 450);
    return () => window.clearTimeout(timer);
  }, [pricing.wholesale, term]);

  if (!loading && !dealer) {
    return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const displayPrice =
    view === 'wholesale' ? pricing.wholesale : view === 'retail' ? pricing.recommended : pricing.myPrice;
  const displayLabel =
    view === 'wholesale' ? 'Your wholesale price' : view === 'retail' ? 'Retail selling price' : 'Price shown to customer';

  const toggleAddOn = (key: string) =>
    setSelectedAddOns((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );

  const buildPlan = () => {
    const months = (termOption.months === 7 ? 12 : termOption.months) as 3 | 12 | 24 | 36;
    return {
      plan_type: 'gold' as const,
      duration_months: months,
      retail_price: pricing.recommended,
      dealer_price: pricing.wholesale,
      term_months: months,
      selected_options: {
        warranty_type: 'fully-covered',
        label: 'Fully Covered Warranty',
        term: termOption.label,
        excess: Number(excess),
        labour: Number(labour),
        parts: partsOption.label,
        claim: Number(claim),
        add_ons: selectedAddOns,
        monthly_equiv: pricing.wholesale,
        ex_vat_total: pricing.total,
      },
    };
  };

  const validate = () => {
    if (!vehicle?.reg) {
      setError('Select a vehicle before continuing.');
      return false;
    }
    if (!claim) {
      setError('Choose a claim limit to continue.');
      return false;
    }
    setError('');
    return true;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    const plan = buildPlan();
    setPlan(plan as never);
    await save({ silent: true, overridePlan: plan });
    navigate('/dealer-portal/quote/customer');
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    const plan = buildPlan();
    setPlan(plan as never);
    const id = await save({ overridePlan: plan });
    if (id) {
      toast({ title: 'Draft saved' });
      reset();
      navigate('/dealer-portal/quotes');
    }
  };

  const summaryRows = [
    { label: 'Warranty type', value: 'Full Cover' },
    { label: 'Term', value: termOption.label },
    { label: 'Excess', value: excessOption.label },
    { label: 'Labour rate', value: `${labourOption.label}/hr` },
    { label: 'Claim limit', value: claimOption.label },
    { label: 'Parts', value: partsOption.label },
  ];

  return (
    <DealerLayout>
      <div className="mx-auto max-w-[1500px] space-y-3">
        {/* Header banner */}
        <Card className="crm-panel-shadow overflow-hidden border-crm-line bg-card">
          <CardContent className="relative p-5 sm:p-6">
            <div className="max-w-2xl">
              <p className="mb-1 text-[11px] font-bold tracking-[0.16em] text-crm-orange">FULL WARRANTY COVER</p>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">We handle everything</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Tailor the cover to suit your customer. We pay the claims and manage the entire repair experience.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {reassurance.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Check className="h-3.5 w-3.5 text-crm-orange" /> {item}
                  </span>
                ))}
              </div>
            </div>
            <img
              src={supportPanda.url}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-4 hidden h-[110px] w-auto object-contain opacity-90 xl:block"
            />
          </CardContent>
        </Card>

        {/* Stepper */}
        <Card className="crm-panel-shadow border-crm-line bg-card">
          <CardContent className="p-4">
            <ol className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {steps.map((step) => (
                <li key={step.n} className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      step.state === 'done'
                        ? 'bg-crm-green-soft text-green-700'
                        : step.state === 'current'
                          ? 'bg-crm-orange text-white'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.state === 'done' ? <CheckCircle2 className="h-4 w-4" /> : step.n}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      step.state === 'todo' ? 'text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Vehicle strip */}
        <Card className="crm-panel-shadow border-crm-line bg-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex overflow-hidden rounded-md border border-crm-line text-sm font-bold">
                <span className="bg-blue-700 px-1.5 py-1 text-[10px] font-bold text-white">GB</span>
                <span className="bg-yellow-400 px-3 py-1 tracking-wide text-black">{vehicle?.reg || 'B11CSD'}</span>
              </span>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {[vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'AUDI Q5'}
                </span>{' '}
                · {vehicle?.year || '2018'} · {vehicle?.fuel_type || 'Diesel'} ·{' '}
                {Number(vehicle?.mileage || 101782).toLocaleString('en-GB')} miles
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dealer-portal/quote/vehicle')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-crm-orange hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit vehicle
            </button>
          </CardContent>
        </Card>

        {/* Main layout */}
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-3">
            <Card className="crm-panel-shadow border-crm-line bg-card">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-crm-orange-soft text-crm-orange">
                      <Settings className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold">Configure warranty plan</h2>
                      <p className="text-xs text-muted-foreground">
                        Adjust the options below to create the right cover for your customer.
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex rounded-md border border-crm-line p-0.5">
                    {(
                      [
                        { key: 'wholesale', label: 'Wholesale' },
                        { key: 'retail', label: 'Retail' },
                        { key: 'customer', label: 'Customer view' },
                      ] as { key: ViewMode; label: string }[]
                    ).map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setView(option.key)}
                        className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                          view === option.key
                            ? 'bg-crm-orange text-white'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <OptionRow
                    icon={Calendar}
                    label="Term"
                    helper="How long would you like the cover to last?"
                    options={termOptions}
                    value={term}
                    onChange={setTerm}
                    badgeValue="12+12"
                  />
                  <OptionRow
                    icon={Layers}
                    label="Excess"
                    helper="Select the customer excess per claim."
                    options={excessOptions}
                    value={excess}
                    onChange={setExcess}
                  />
                  <OptionRow
                    icon={Wrench}
                    label="Labour rate (per hour)"
                    helper="Set the labour rate for repairs."
                    options={labourOptions}
                    value={labour}
                    onChange={setLabour}
                  />
                  <OptionRow
                    icon={Settings}
                    label="Parts"
                    helper="Choose how parts are covered."
                    options={partsOptions}
                    value={parts}
                    onChange={setParts}
                  />
                  <OptionRow
                    icon={Coins}
                    label="Claim limit"
                    helper="Set the maximum claim limit."
                    options={claimOptions}
                    value={claim}
                    onChange={setClaim}
                    error={error && !error.includes('vehicle') ? error : undefined}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="crm-panel-shadow border-crm-line bg-card">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        Optional add-ons <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Boost the cover with extra protection.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddOnsOpen((open) => !open)}
                    className="text-xs font-semibold text-crm-orange hover:underline"
                  >
                    {addOnsOpen ? 'Hide options' : 'Show options'}
                  </button>
                </div>
                {addOnsOpen && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {addOns.map((addOn) => {
                      const active = selectedAddOns.includes(addOn.key);
                      return (
                        <button
                          key={addOn.key}
                          type="button"
                          onClick={() => toggleAddOn(addOn.key)}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                            active
                              ? 'border-crm-orange bg-crm-orange-soft text-foreground'
                              : 'border-crm-line bg-card hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded border ${
                                active ? 'border-crm-orange bg-crm-orange text-white' : 'border-crm-line'
                              }`}
                            >
                              {active && <Check className="h-3 w-3" />}
                            </span>
                            {addOn.label}
                          </span>
                          <span className="text-muted-foreground">+£{addOn.price}/m</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="xl:sticky xl:top-[88px] xl:self-start">
            <Card className="crm-panel-shadow border-crm-line bg-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-crm-orange-soft text-crm-orange">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold">Quote summary</h2>
                    <p className="text-xs text-muted-foreground">Your selected warranty configuration.</p>
                  </div>
                </div>

                <dl className="mt-3 space-y-1.5">
                  {summaryRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="font-semibold text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 rounded-md border border-crm-line bg-muted/40 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-crm-orange">{displayLabel}</p>
                  <p className="mt-0.5 text-2xl font-bold leading-none">
                    {gbp(displayPrice)} <span className="text-sm font-semibold text-muted-foreground">/ month</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ex VAT (Total {gbp(pricing.total)} ex VAT over 12 months)
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                    {priceState === 'updating' ? 'Updating price…' : 'Updated'}
                  </p>
                </div>

                <div className="mt-3 rounded-md border border-crm-line p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> Price shown in customer view
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-crm-navy p-2 text-center text-white">
                      <p className="text-[10px] opacity-80">Recommended</p>
                      <p className="text-sm font-bold">{gbp(pricing.recommended)} / month</p>
                    </div>
                    <div className="rounded-md border border-crm-line p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">My price</p>
                      <p className="text-sm font-bold">{gbp(pricing.myPrice)} / month</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-2 w-full border-crm-line text-xs font-semibold"
                    onClick={() => setCustomerViewOpen(true)}
                  >
                    Show customer view
                  </Button>
                </div>

                {error && <p className="mt-3 text-xs font-medium text-destructive">{error}</p>}

                <div className="mt-3 space-y-2">
                  <Button
                    className="w-full bg-crm-orange text-white hover:bg-crm-orange/90"
                    onClick={handleContinue}
                    disabled={saving}
                  >
                    Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-crm-orange text-crm-orange hover:bg-crm-orange-soft"
                    onClick={handleSaveDraft}
                    disabled={saving}
                  >
                    Save draft & exit
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => navigate('/dealer-portal/quote/vehicle')}
                  >
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={customerViewOpen} onOpenChange={setCustomerViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customer view preview</DialogTitle>
            <DialogDescription>How this quote could be presented to your customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-crm-line p-3">
              <p className="text-sm font-semibold">
                {[vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'AUDI Q5'} ·{' '}
                {vehicle?.reg || 'B11CSD'}
              </p>
              <p className="text-xs text-muted-foreground">
                {vehicle?.year || '2018'} · {vehicle?.fuel_type || 'Diesel'} ·{' '}
                {Number(vehicle?.mileage || 101782).toLocaleString('en-GB')} miles
              </p>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Warranty</dt>
                <dd className="font-semibold">Full Cover</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Term</dt>
                <dd className="font-semibold">{termOption.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Excess</dt>
                <dd className="font-semibold">{excessOption.label}</dd>
              </div>
              <div className="flex justify-between border-t border-crm-line pt-2">
                <dt className="text-muted-foreground">Monthly price</dt>
                <dd className="text-lg font-bold">{gbp(pricing.recommended)}</dd>
              </div>
            </dl>
            <ul className="space-y-1.5 rounded-md bg-muted/50 p-3 text-xs">
              {reassurance.map((item) => (
                <li key={item} className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-crm-orange" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </DealerLayout>
  );
};

export default Step3Pricing;
