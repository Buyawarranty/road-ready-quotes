import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDealerJourney, type DealerJourneyPlan, type DealerJourneyVehicle } from '@/contexts/DealerJourneyContext';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Headphones,
  Loader2,
  Shield,
} from 'lucide-react';

type WarrantyPlanKey = 'dealer-paid' | 'fully-covered';
type LookupState = 'default' | 'loading' | 'success' | 'not-found' | 'error';
type SaveState = 'idle' | 'saving' | 'saved';


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

const LAST_MOT_MILEAGE = '101782';

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
            setMileage(LAST_MOT_MILEAGE);
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

  const selectedPlanMeta = warrantyPlans.find((plan) => plan.key === selectedPlan);

  return (
    <DealerLayout>
      <div className="mx-auto grid max-w-[1500px] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
       <div className="space-y-4">
        <Card className="crm-panel-shadow border-crm-line">
          <CardContent className="p-5 sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">Vehicle details</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter the vehicle registration and mileage to find the best warranty options.</p>
              </div>
              <span className="inline-flex min-h-6 items-center text-xs font-semibold text-muted-foreground" aria-live="polite">
                {saveState === 'saving' && <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-crm-orange" /> Saving...</>}
                {saveState === 'saved' && <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-crm-green" /> Saved</>}
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
              <div>
                <label className="mb-2 block text-[11px] font-bold tracking-[0.12em] text-muted-foreground">VEHICLE REGISTRATION</label>
                <div className="vehicle-reg-plate vehicle-reg-plate--quote max-w-xl">
                  <span className="vehicle-reg-plate__country"><span>GB</span><span>UK</span></span>
                  <input
                    ref={regInputRef}
                    value={reg}
                    onChange={(event) => handleRegChange(event.target.value)}
                    placeholder="ENTER REG"
                    aria-label="Vehicle registration"
                    className="vehicle-reg-plate__input"
                  />
                </div>
                {validation.reg && <p className="mt-1 text-[11px] font-semibold text-crm-red">{validation.reg}</p>}
                {lookupState === 'success' && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-crm-green">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Vehicle recognised: AUDI Q5 · 2018 · Diesel
                  </p>
                )}
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
              <div className="max-w-xl">
                <div className="mb-2 flex items-center gap-2">
                  <label className="block text-[11px] font-bold tracking-[0.12em] text-muted-foreground">MILEAGE</label>
                  {lookupState === 'success' && (
                    <span className="rounded-full bg-crm-green-soft px-2 py-0.5 text-[9px] font-black tracking-wide text-crm-green">LAST MOT</span>
                  )}
                </div>
                <div className="relative">
                  <Input value={mileage} onChange={(event) => { setMileage(event.target.value.replace(/\D/g, '')); setValidation((current) => ({ ...current, mileage: '' })); }} className={`h-12 border-crm-line pr-14 ${lookupState === 'success' ? 'border-crm-green bg-crm-green-soft' : 'bg-background'}`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">miles</span>
                </div>
                {lookupState === 'success' && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Last MOT mileage — update it if the vehicle has driven further.</p>
                )}
                {validation.mileage && <p className="mt-1 text-[11px] font-semibold text-crm-red">{validation.mileage}</p>}
              </div>
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
    </DealerLayout>
  );
};

export default Step1Vehicle;