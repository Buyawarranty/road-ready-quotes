import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useToast } from '@/hooks/use-toast';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Coins,
  Headphones,
  Info,
  Layers,
  Pencil,
  Plus,
  Settings,
  Wrench,
} from 'lucide-react';

const termOptions = [
  { value: '3', label: '3 months', months: 3 },
  { value: '6', label: '6 months', months: 6 },
  { value: '12', label: '12 months', months: 12 },
  { value: '24', label: '24 months', months: 24 },
  { value: '36', label: '36 months', months: 36 },
];

const excessOptions = [
  { value: '0', label: '£0' },
  { value: '50', label: '£50' },
  { value: '100', label: '£100' },
  { value: '250', label: '£250' },
  { value: '500', label: '£500' },
];

const labourOptions = [
  { value: '40', label: '£40/hr' },
  { value: '70', label: '£70/hr' },
  { value: '100', label: '£100/hr' },
  { value: '150', label: '£150/hr' },
  { value: '200', label: '£200/hr' },
];

const partsOptions = [
  { value: 'age-mileage', label: 'Age & Mileage' },
  { value: 'none', label: 'No contribution' },
];

const claimOptions = [
  { value: '750', label: '£750' },
  { value: '1000', label: '£1,000' },
  { value: '2000', label: '£2,000' },
  { value: '3000', label: '£3,000' },
];

const addOns = [
  { key: 'air-con', label: 'Air-conditioning', price: 0.2 },
  { key: 'turbo', label: 'Turbocharger', price: 0.2 },
  { key: 'diagnostics', label: 'Diagnostic cover', price: 0.3 },
  { key: 'breakdown', label: 'Breakdown recovery', price: 0.5 },
];

const BASE_FEE = 1.2;

const steps = [
  { n: 1, label: 'Enter Reg Plate', state: 'done' as const },
  { n: 2, label: 'Vehicle Details', state: 'done' as const },
  { n: 3, label: 'Choose Your Plan', state: 'current' as const },
  { n: 4, label: 'Review & Pay', state: 'todo' as const },
];

const howItWorks = [
  'Customer makes a claim',
  'Panda Protect manages the claim',
  'Your dealership funds the approved repair',
];

const claimFlow = [
  'Customer contacts Panda Protect',
  'We assess and manage the claim',
  'Repair is authorised',
  'Your dealership funds the approved repair',
];

const included = [
  'Claims managed by Panda Protect',
  'UK claims support',
  'Simple dealer process',
  'Customer support included',
];

const gbp = (n: number) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });

interface OptionRowProps {
  icon: React.ElementType;
  label: string;
  helper: string;
  tooltip?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const OptionRow: React.FC<OptionRowProps> = ({ icon: Icon, label, helper, tooltip, options, value, onChange, error }) => (
  <div className="grid gap-3 border-t border-crm-line py-4 first:border-t-0 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-center">
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {label}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={`About ${label}`} className="text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </p>
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
              className={`min-w-[92px] flex-1 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                active
                  ? 'border-crm-orange bg-crm-orange text-white'
                  : 'border-crm-line bg-card text-foreground hover:border-crm-orange/50 hover:bg-muted'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
    </div>
  </div>
);

const ClaimHandlingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dealer, loading } = useDealerAuth();
  const { vehicle, setPlan, reset } = useDealerJourney();
  const { toast } = useToast();
  const { save, saving } = useDealerQuoteSave(3);

  const [term, setTerm] = useState('12');
  const [excess, setExcess] = useState('50');
  const [labour, setLabour] = useState('70');
  const [parts, setParts] = useState('age-mileage');
  const [claim, setClaim] = useState('1000');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [addOnsOpen, setAddOnsOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [priceState, setPriceState] = useState<'idle' | 'updating'>('idle');
  const [error, setError] = useState('');

  const termOption = termOptions.find((o) => o.value === term)!;
  const excessOption = excessOptions.find((o) => o.value === excess)!;
  const labourOption = labourOptions.find((o) => o.value === labour)!;
  const partsOption = partsOptions.find((o) => o.value === parts)!;
  const claimOption = claimOptions.find((o) => o.value === claim)!;

  const fee = useMemo(() => {
    const extras = selectedAddOns.reduce(
      (sum, key) => sum + (addOns.find((a) => a.key === key)?.price ?? 0),
      0,
    );
    return +(BASE_FEE + extras).toFixed(2);
  }, [selectedAddOns]);

  useEffect(() => {
    setPriceState('updating');
    const timer = window.setTimeout(() => setPriceState('idle'), 400);
    return () => window.clearTimeout(timer);
  }, [fee, term, excess, labour, parts, claim]);

  if (!loading && !dealer) {
    return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const toggleAddOn = (key: string) =>
    setSelectedAddOns((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );

  const buildPlan = () => ({
    plan_type: 'basic' as const,
    duration_months: termOption.months as never,
    retail_price: fee,
    dealer_price: fee,
    term_months: termOption.months as never,
    selected_options: {
      warranty_type: 'dealer-paid',
      label: 'Dealer-Paid Warranty',
      term: termOption.label,
      excess: Number(excess),
      labour: Number(labour),
      parts: partsOption.label,
      claim: Number(claim),
      add_ons: selectedAddOns,
      monthly_fee: fee,
      repairs_funded_by: 'dealer',
    },
  });

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
    await save({ silent: true, overridePlan: plan as never });
    navigate('/dealer-portal/quote/customer');
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    const plan = buildPlan();
    setPlan(plan as never);
    const id = await save({ overridePlan: plan as never });
    if (id) {
      toast({ title: 'Draft saved' });
      reset();
      navigate('/dealer-portal/quotes');
    }
  };

  const vehicleName = [vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'AUDI Q5';

  const summaryRows = [
    { label: 'Warranty', value: 'Dealer-Paid Warranty' },
    { label: 'Vehicle', value: vehicleName },
    { label: 'Term', value: termOption.label },
    { label: 'Customer excess', value: excessOption.label },
    { label: 'Labour rate', value: labourOption.label },
    { label: 'Claim limit', value: claimOption.label },
    { label: 'Parts', value: partsOption.label },
  ];

  return (
    <DealerLayout>
      <div className="mx-auto max-w-[1500px] space-y-3">
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

        {/* Page title */}
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-crm-orange">DEALER-PAID WARRANTY</p>
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">Configure Dealer-Paid Warranty</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We manage the claims process and support your customer. Your dealership funds approved repairs.
          </p>
        </div>

        {/* Vehicle strip */}
        <Card className="crm-panel-shadow border-crm-line bg-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex overflow-hidden rounded-md border border-crm-line text-sm font-bold">
                <span className="bg-blue-700 px-1.5 py-1 text-[10px] font-bold text-white">GB</span>
                <span className="bg-yellow-400 px-3 py-1 tracking-wide text-black">{vehicle?.reg || 'B11CSD'}</span>
              </span>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{vehicleName}</span> · {vehicle?.year || '2018'} ·{' '}
                {vehicle?.fuel_type || 'Diesel'} · {Number(vehicle?.mileage || 101782).toLocaleString('en-GB')} miles
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

        {/* How it works */}
        <div className="rounded-lg border border-crm-orange/30 bg-crm-orange-soft p-4">
          <p className="text-sm font-bold">How Dealer-Paid Warranty works</p>
          <ol className="mt-2 grid gap-2 sm:grid-cols-3">
            {howItWorks.map((item, index) => (
              <li key={item} className="flex items-start gap-2 text-xs font-medium text-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-crm-orange text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Panda Protect handles the administration and customer support, helping you provide a professional warranty
            experience without purchasing fully insured repair cover.
          </p>
        </div>

        {/* Main layout */}
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-3">
            <Card className="crm-panel-shadow border-crm-line bg-card">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-crm-orange-soft text-crm-orange">
                    <Settings className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold">Configure your warranty</h2>
                    <p className="text-xs text-muted-foreground">Set the cover you want to provide to your customer.</p>
                  </div>
                </div>

                <div className="mt-3">
                  <OptionRow
                    icon={Calendar}
                    label="Warranty term"
                    helper="How long would you like the customer to be covered?"
                    options={termOptions}
                    value={term}
                    onChange={setTerm}
                  />
                  <OptionRow
                    icon={Layers}
                    label="Customer excess"
                    helper="The amount the customer contributes towards an approved claim."
                    options={excessOptions}
                    value={excess}
                    onChange={setExcess}
                  />
                  <OptionRow
                    icon={Wrench}
                    label="Labour rate"
                    helper="The maximum hourly labour rate used when assessing an approved repair."
                    tooltip="The labour rate is used when reviewing repair costs during a claim."
                    options={labourOptions}
                    value={labour}
                    onChange={setLabour}
                  />
                  <OptionRow
                    icon={Settings}
                    label="Parts"
                    helper="Choose how replacement parts are assessed."
                    tooltip="Age & Mileage applies a contribution based on the vehicle's age and mileage."
                    options={partsOptions}
                    value={parts}
                    onChange={setParts}
                  />
                  <OptionRow
                    icon={Coins}
                    label="Claim limit"
                    helper="The maximum approved repair amount per claim."
                    options={claimOptions}
                    value={claim}
                    onChange={setClaim}
                    error={error && !error.includes('vehicle') ? error : undefined}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Optional add-ons */}
            <Card className="crm-panel-shadow border-crm-line bg-card">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        Optional add-ons <span className="text-xs font-normal text-muted-foreground">Optional</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Add extra protection to the warranty.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddOnsOpen((open) => !open)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-crm-orange hover:underline"
                  >
                    {addOnsOpen ? 'Hide options' : 'Show options'}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${addOnsOpen ? 'rotate-180' : ''}`} />
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
                          <span className="text-muted-foreground">+{gbp(addOn.price)}/m</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Claims responsibility */}
            <Card className="crm-panel-shadow border-crm-line bg-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Headphones className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">What happens when your customer claims?</p>
                    <p className="text-xs text-muted-foreground">
                      Our UK claims team manages the process and keeps both you and your customer informed.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {claimFlow.map((item, index) => (
                    <React.Fragment key={item}>
                      <span className="rounded-md border border-crm-line bg-muted/40 px-3 py-1.5 text-xs font-medium">
                        {item}
                      </span>
                      {index < claimFlow.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </React.Fragment>
                  ))}
                </div>
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
                    <p className="text-xs text-muted-foreground">Your Dealer-Paid Warranty configuration.</p>
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
                  <p className="text-[11px] font-bold uppercase tracking-wide text-crm-orange">Panda Protect fee</p>
                  <p className="mt-0.5 text-2xl font-bold leading-none">
                    {gbp(fee)} <span className="text-sm font-semibold text-muted-foreground">/ month</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">From</p>
                  <p className="mt-1.5 text-[11px] font-semibold text-foreground">
                    Repair costs are funded by your dealership.
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                    {priceState === 'updating' ? 'Updating…' : 'Updated'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setBreakdownOpen((open) => !open)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-crm-orange hover:underline"
                >
                  View cost breakdown
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${breakdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {breakdownOpen && (
                  <dl className="mt-2 space-y-1.5 rounded-md border border-crm-line p-3 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Panda Protect administration</dt>
                      <dd className="font-semibold">{gbp(fee)} / month</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Claims management</dt>
                      <dd className="font-semibold">Included</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Customer support</dt>
                      <dd className="font-semibold">Included</dd>
                    </div>
                    <div className="flex justify-between border-t border-crm-line pt-1.5">
                      <dt className="text-muted-foreground">Approved repair costs</dt>
                      <dd className="font-semibold">Paid by dealership</dd>
                    </div>
                  </dl>
                )}

                <div className="mt-3 rounded-md bg-muted/40 p-3">
                  <p className="text-[11px] font-semibold text-foreground">Included with Dealer-Paid Warranty</p>
                  <ul className="mt-1.5 space-y-1">
                    {included.map((item) => (
                      <li key={item} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Check className="h-3 w-3 text-crm-orange" /> {item}
                      </li>
                    ))}
                  </ul>
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
    </DealerLayout>
  );
};

export default ClaimHandlingPage;
