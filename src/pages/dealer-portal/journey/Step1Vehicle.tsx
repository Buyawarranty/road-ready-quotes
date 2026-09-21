import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDealerJourney, type DealerJourneyPlan, type DealerJourneyVehicle } from '@/contexts/DealerJourneyContext';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';
import {
  ArrowRight,
  BarChart3,
  Car,
  Check,
  CheckCircle2,
  Headphones,
  Loader2,
  Search,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';

type WarrantyPlanKey = 'dealer-paid' | 'fully-covered';
type LookupState = 'default' | 'loading' | 'success' | 'not-found' | 'error';
type SaveState = 'idle' | 'saving' | 'saved';


const reassurance = [
  { label: 'Quick & simple', icon: Sparkles },
  { label: 'Dealer-focused', icon: Shield },
  { label: 'UK support', icon: Headphones },
  { label: 'Trusted by dealers', icon: Users },
];

const progressSteps = [
  { n: 1, label: 'Enter Reg Plate' },
  { n: 2, label: 'Vehicle Details' },
  { n: 3, label: 'Choose Your Plan' },
  { n: 4, label: 'Review & Pay' },
];

const comparisonRows = [
  { label: 'What it is', dealerPaid: 'Claim management only', fullyCovered: 'A comprehensive warranty' },
  { label: 'Who handles the claim', dealerPaid: 'We manage the claim for your customer', fullyCovered: 'We manage the claim for your customer' },
  { label: 'Who pays for repairs', dealerPaid: 'You pay the repair bill', fullyCovered: 'We pay the repair bill' },
  { label: 'Repair costs', dealerPaid: 'Funded by dealership', fullyCovered: 'Covered under the warranty' },
  { label: 'Dealer support', dealerPaid: 'Included', fullyCovered: 'Included' },
  {
    label: 'Best suited for',
    dealerPaid: 'Dealers wanting lower warranty costs while funding repairs themselves',
    fullyCovered: 'Dealers wanting repair costs transferred to Panda Protect',
  },
];

const warrantyPlans = [
  {
    key: 'dealer-paid' as const,
    name: 'Dealer-Paid Warranty',
    description: 'Claim management only · We handle the claim, you pay the repair bill',
    price: '£1.20/m',
    icon: Headphones,
    badge: null,
    benefits: [
      'We manage every claim for your customer',
      'You keep control of repair costs',
      'Keeps your customers on the road',
      'Full support from our UK team',
    ],
  },
  {
    key: 'fully-covered' as const,
    name: 'Fully Covered Warranty',
    description: 'A comprehensive warranty · We handle claims and pay for repairs',
    price: '£141.60/m',
    icon: Shield,
    badge: 'POPULAR',
    benefits: [
      'Comprehensive cover for your customer',
      'We handle the claim and pay the repair bill',
      'National repair network',
      'Hassle-free for you and your customer',
    ],
  },
];

const normaliseReg = (value: string) => value.replace(/\s+/g, '').toUpperCase();
const isValidReg = (value: string) => /^[A-Z0-9]{4,8}$/.test(normaliseReg(value));

const buildVehicle = (reg: string, mileage: string): DealerJourneyVehicle => ({
  reg: normaliseReg(reg),
  make: 'AUDI',
  model: 'Q5',
  year: '2018',
  fuel_type: 'Diesel',
  transmission: undefined,
  mileage: mileage.trim(),
});

const buildPlan = (selectedPlan: WarrantyPlanKey): DealerJourneyPlan => {
  if (selectedPlan === 'fully-covered') {
    return {
      plan_type: 'gold',
      duration_months: 12,
      retail_price: 141.6,
      dealer_price: 141.6,
      term_months: 12,
      selected_options: { warranty_type: 'fully-covered', label: 'Fully Covered Warranty' },
    };
  }

  return {
    plan_type: 'basic',
    duration_months: 12,
    retail_price: 1.2,
    dealer_price: 1.2,
    term_months: 12,
    selected_options: { warranty_type: 'dealer-paid', label: 'Dealer-Paid Warranty' },
  };
};

const Step1Vehicle: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { vehicle, setVehicle, setPlan } = useDealerJourney();
  const { save } = useDealerQuoteSave(2);

  const initialReg = searchParams.get('reg') || vehicle?.reg || 'B11CSD';
  const [reg, setReg] = useState(normaliseReg(initialReg));
  const [mileage, setMileage] = useState(vehicle?.mileage || '101782');
  const [lookupState, setLookupState] = useState<LookupState>(initialReg ? 'success' : 'default');
  const regInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<WarrantyPlanKey>('fully-covered');
  const [compareOpen, setCompareOpen] = useState(false);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const vehicleDetailsComplete = Boolean(isValidReg(reg) && mileage.trim() && lookupState === 'success');
  const canContinue = Boolean(vehicleDetailsComplete && selectedPlan);
  const activeVehicle = useMemo(() => buildVehicle(reg, mileage), [reg, mileage]);
  const activePlan = useMemo(() => buildPlan(selectedPlan), [selectedPlan]);

  useEffect(() => {
    if (!normaliseReg(reg)) {
      setLookupState('default');
      return;
    }

    if (normaliseReg(reg).length >= 4) {
      const timer = window.setTimeout(() => {
        setLookupState('loading');
        window.setTimeout(() => {
          const cleaned = normaliseReg(reg);
          if (cleaned === 'ERROR') {
            setLookupState('error');
          } else if (cleaned.includes('ZZZ') || cleaned === 'NOTFOUND') {
            setLookupState('not-found');
          } else {
            setLookupState('success');
          }
        }, 550);
      }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [reg]);

  useEffect(() => {
    if (!canContinue) return;

    setSaveState('saving');
    const timer = window.setTimeout(() => {
      setVehicle(activeVehicle);
      setPlan(activePlan);
      save({ silent: true, overrideVehicle: activeVehicle, overridePlan: activePlan }).finally(() => setSaveState('saved'));
    }, 900);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlan, activeVehicle, canContinue]);

  const handleRegChange = (value: string) => {
    const next = normaliseReg(value).slice(0, 8);
    setReg(next);
    setValidation((current) => ({ ...current, reg: '' }));
  };

  const editVehicle = () => {
    setLookupState('default');
    regInputRef.current?.focus();
    regInputRef.current?.select();
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!isValidReg(reg)) errors.reg = 'Enter a valid UK vehicle registration.';
    if (!mileage.trim()) errors.mileage = "Enter the vehicle's current mileage.";
    if (!selectedPlan) errors.plan = 'Choose a warranty plan to continue.';
    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setVehicle(activeVehicle);
    setPlan(activePlan);
    await save({ silent: true, overrideVehicle: activeVehicle, overridePlan: activePlan });
    navigate(selectedPlan === 'dealer-paid' ? '/dealer-portal/quote/claim-handling' : '/dealer-portal/quote/pricing');
  };

  const choosePlanFromCompare = (plan: WarrantyPlanKey) => {
    setSelectedPlan(plan);
    setValidation((current) => ({ ...current, plan: '' }));
    setCompareOpen(false);
  };

  return (
    <DealerLayout>
      <div className="mx-auto max-w-[1500px] space-y-3">
        <Card className="crm-panel-shadow overflow-hidden border-crm-line bg-card">
          <CardContent className="p-0">
            <div className="grid min-h-[188px] lg:grid-cols-[minmax(0,1fr)_430px]">
              <div className="p-5 sm:p-7">
                <p className="mb-1 text-[11px] font-bold tracking-[0.16em] text-crm-orange">NEW QUOTE</p>
                <h1 className="text-2xl font-bold leading-tight sm:text-4xl">Build your warranty</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Get a quote in minutes. Enter the vehicle details below and choose the right cover for your customer.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {reassurance.map((item) => {
                    const Icon = item.icon;
                    return (
                      <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-crm-line bg-card px-3 py-1.5 text-[11px] font-bold text-foreground">
                        <Icon className="h-3.5 w-3.5 text-crm-orange" /> {item.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="crm-panel-shadow border-crm-line">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-2 sm:items-center">
              {progressSteps.map((step, index) => {
                const complete = step.n === 1;
                const current = step.n === 2;
                return (
                  <React.Fragment key={step.n}>
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center sm:flex-row sm:text-left">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? 'bg-crm-green text-primary-foreground' : current ? 'bg-crm-orange text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {complete ? <Check className="h-4 w-4" /> : step.n}
                      </span>
                      <span className={`text-[10px] font-bold leading-tight sm:text-xs ${complete ? 'text-crm-green' : current ? 'text-crm-orange' : 'text-muted-foreground'}`}>{step.label}</span>
                    </div>
                    {index < progressSteps.length - 1 && <span className={`mt-4 hidden h-1 flex-1 rounded-full sm:block ${index === 0 ? 'bg-crm-green' : 'bg-muted'}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-md border border-crm-line bg-card p-3 text-xs font-semibold text-muted-foreground crm-panel-shadow">
          <span className="inline-flex items-center gap-2">
            {saveState === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-crm-orange" /> : <CheckCircle2 className="h-3.5 w-3.5 text-crm-green" />}
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Ready'}
          </span>
        </div>

        <Card className="crm-panel-shadow border-crm-line">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-crm-orange-soft text-crm-orange">
                <Car className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold">Vehicle details</h2>
                <p className="text-xs text-muted-foreground">Enter the vehicle registration and mileage to find the best warranty options.</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.55fr)]">
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-[0.12em] text-muted-foreground">VEHICLE REGISTRATION</label>
                  <div className="flex h-12 overflow-hidden rounded-md border-2 border-crm-amber bg-crm-amber-soft">
                    <span className="flex w-11 shrink-0 items-center justify-center bg-crm-blue text-[11px] font-black text-primary-foreground">GB</span>
                    <input
                      ref={regInputRef}
                      value={reg}
                      onChange={(event) => handleRegChange(event.target.value)}
                      placeholder="ENTER REG"
                      aria-label="Vehicle registration"
                      className="min-w-0 flex-1 bg-transparent px-3 text-center text-xl font-black uppercase tracking-widest text-foreground outline-none placeholder:text-foreground/35"
                    />
                    <span className="flex w-11 shrink-0 items-center justify-center text-foreground"><Search className="h-4 w-4" /></span>
                  </div>
                  {validation.reg && <p className="mt-1 text-[11px] font-semibold text-crm-red">{validation.reg}</p>}
                  {lookupState === 'success' && <p className="mt-1 text-xs font-semibold text-muted-foreground">AUDI Q5 · 2018 · Diesel</p>}
                  {lookupState === 'default' && <p className="mt-1 text-xs text-muted-foreground">Enter a registration to identify the vehicle.</p>}
                  {lookupState === 'loading' && <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-crm-blue"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking up vehicle...</p>}
                  {lookupState === 'not-found' && (
                    <div className="mt-2 rounded-md border border-crm-amber/40 bg-crm-amber-soft p-3 text-xs">
                      <p className="font-bold text-foreground">We couldn't find that vehicle.</p>
                      <p className="text-muted-foreground">Check the registration and try again.</p>
                      <div className="mt-2"><Button type="button" size="sm" variant="outline" onClick={() => setLookupState('default')}>Try again</Button></div>
                    </div>
                  )}
                  {lookupState === 'error' && (
                    <div className="mt-2 rounded-md border border-crm-red/40 bg-crm-red-soft p-3 text-xs">
                      <p className="font-bold text-foreground">Vehicle lookup is temporarily unavailable.</p>
                      <p className="text-muted-foreground">Please try again in a moment.</p>
                      <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => setLookupState('default')}>Try again</Button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-[0.12em] text-muted-foreground">MILEAGE</label>
                  <div className="relative">
                    <Input value={mileage} onChange={(event) => { setMileage(event.target.value.replace(/\D/g, '')); setValidation((current) => ({ ...current, mileage: '' })); }} className="h-12 border-crm-line bg-background pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">miles</span>
                  </div>
                  {validation.mileage && <p className="mt-1 text-[11px] font-semibold text-crm-red">{validation.mileage}</p>}
                </div>
              </div>

              {lookupState === 'success' && (
                <div className="rounded-md border border-crm-line bg-card p-3">
                  <div className="flex items-center gap-4">
                    <div className="flex shrink-0 flex-col items-center gap-1.5">
                      <span className="inline-flex overflow-hidden rounded-md border-2 border-black text-sm font-bold shadow-sm">
                        <span className="flex items-center bg-crm-blue px-1.5 py-1 text-[10px] font-bold text-primary-foreground">GB</span>
                        <span className="bg-yellow-400 px-3 py-1 tracking-widest text-black">{normaliseReg(reg)}</span>
                      </span>
                      <Button variant="link" size="sm" className="h-auto px-0 text-xs font-bold text-crm-orange" onClick={editVehicle}>Edit vehicle <ArrowRight className="h-3.5 w-3.5" /></Button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black">AUDI Q5</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">2018 · Diesel · {Number(mileage || 0).toLocaleString('en-GB')} miles</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`crm-panel-shadow border-crm-line transition-opacity ${vehicleDetailsComplete ? 'opacity-100' : 'opacity-70'}`}>
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-crm-orange-soft text-crm-orange"><Shield className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-base font-bold">Choose your warranty plan</h2>
                  <p className="text-xs text-muted-foreground">
                    {vehicleDetailsComplete ? 'Vehicle details confirmed. Select the cover that best suits your customer.' : 'Enter the registration and mileage above, then choose a warranty option.'}
                  </p>
                </div>
              </div>
              <Button variant="link" size="sm" className="h-auto justify-start px-0 text-xs font-bold text-crm-orange" onClick={() => setCompareOpen(true)} disabled={!vehicleDetailsComplete}>
                <BarChart3 className="h-3.5 w-3.5" /> Compare plans <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {!vehicleDetailsComplete && (
              <div className="mb-3 rounded-md border border-dashed border-crm-line bg-muted/40 p-4 text-sm font-semibold text-muted-foreground">
                Complete the vehicle details to unlock Dealer-Paid and Fully Covered options.
              </div>
            )}

            <div className="mx-auto grid max-w-4xl gap-3 lg:grid-cols-2">
              {warrantyPlans.map((plan) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.key;
                return (
                  <Button
                    key={plan.key}
                    type="button"
                    onClick={() => { setSelectedPlan(plan.key); setValidation((current) => ({ ...current, plan: '' })); }}
                    disabled={!vehicleDetailsComplete}
                    variant="ghost"
                    className={`group h-auto justify-start rounded-md border p-4 text-left transition-all disabled:pointer-events-none disabled:opacity-60 ${isSelected ? 'border-crm-orange bg-crm-orange-soft shadow-sm' : 'border-crm-line bg-card hover:border-crm-orange'}`}
                    aria-pressed={isSelected}
                  >
                    <span className="w-full">
                    <span className="flex items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-card text-crm-orange' : 'bg-crm-blue-soft text-crm-blue'}`}><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-black">
                          {plan.name}
                          {plan.badge && <span className="rounded-full bg-crm-orange-soft px-2 py-0.5 text-[9px] font-black tracking-[0.12em] text-crm-orange">{plan.badge}</span>}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{plan.description}</span>
                      </span>
                      <span className="text-right text-base font-black leading-none">{plan.price}<span className="block text-[10px] font-semibold text-muted-foreground">from</span></span>
                    </span>
                    <span className="mt-3 grid gap-1.5 text-[11px] text-muted-foreground">
                      {plan.benefits.map((benefit) => <span key={benefit} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-crm-orange" /> {benefit}</span>)}
                    </span>
                    <span className={`mt-3 flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-bold ${plan.key === 'dealer-paid' ? 'bg-crm-navy text-primary-foreground' : 'bg-crm-orange text-primary-foreground'}`}>
                      {plan.key === 'dealer-paid' ? 'Manage my warranty' : 'Choose Full Cover'}
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    </span>
                    </span>
                  </Button>
                );
              })}
            </div>
            {validation.plan && <p className="mt-2 text-[11px] font-semibold text-crm-red">{validation.plan}</p>}


            <div className="mt-4 flex flex-col-reverse gap-2 border-t border-crm-line pt-4 sm:justify-end">
              <Button className="w-full sm:w-auto" disabled={!canContinue} onClick={handleContinue}>Continue <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl border-crm-line p-0">
          <DialogHeader className="border-b border-crm-line p-5 pb-4">
            <DialogTitle>Compare plans</DialogTitle>
            <DialogDescription>Dealer-Paid Warranty versus Fully Covered Warranty.</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto px-5 py-2">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr>
                  <th className="w-[28%] py-3" />
                  <th className="rounded-t-md bg-crm-navy px-3 py-2.5 text-center text-[11px] font-black uppercase tracking-wide text-primary-foreground">Dealer-Paid Warranty</th>
                  <th className="rounded-t-md bg-crm-orange px-3 py-2.5 text-center text-[11px] font-black uppercase tracking-wide text-primary-foreground">Fully Covered Warranty</th>
                </tr>
              </thead>
              <tbody>{comparisonRows.map((row) => (
                <tr key={row.label} className="border-t border-crm-line">
                  <td className="py-3 pr-3 align-top font-bold text-foreground">{row.label}</td>
                  <td className="bg-crm-blue-soft/40 px-3 py-3 align-top font-medium text-foreground">{row.dealerPaid}</td>
                  <td className="bg-crm-orange-soft/60 px-3 py-3 align-top font-medium text-foreground">{row.fullyCovered}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <DialogFooter className="gap-2 border-t border-crm-line p-5 sm:justify-center">
            <Button className="bg-crm-navy text-primary-foreground hover:bg-crm-navy-soft" onClick={() => choosePlanFromCompare('dealer-paid')}>Manage my warranty</Button>
            <Button className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90" onClick={() => choosePlanFromCompare('fully-covered')}>Choose Full Cover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DealerLayout>
  );
};

export default Step1Vehicle;