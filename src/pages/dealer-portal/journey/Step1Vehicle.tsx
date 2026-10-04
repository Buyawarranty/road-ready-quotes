import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDealerJourney, type DealerJourneyPlan, type DealerJourneyVehicle } from '@/contexts/DealerJourneyContext';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';
import { useDealerQuoteTemplates, describeTemplate, type DealerQuoteTemplate } from '@/hooks/useDealerQuoteTemplates';
import { buildSavedPlanQuote } from '@/lib/savedPlanCheckout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  ArrowRight,
  Bookmark,
  Trash2,
  Check,
  CheckCircle2,
  Headphones,
  Loader2,
  Shield,
} from 'lucide-react';

const gbp = (n: number) => `£${n.toFixed(2)}`;

type WarrantyPlanKey = 'dealer-paid' | 'fully-covered';
type LookupState = 'default' | 'loading' | 'success' | 'not-found' | 'error';
type SaveState = 'idle' | 'saving' | 'saved';

const warrantyPlans = [
  {
    key: 'dealer-paid' as const,
    name: 'Manage My Claims',
    subtitle: 'Only £1 a month',
    description: 'Manage My Claims only · We handle the claim, you pay the repair bill',
    price: '£1/m',
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
    name: 'Comprehensive Warranty',
    subtitle: 'From £69',
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

const buildPlan = (selectedPlan: WarrantyPlanKey, termMonths: number): DealerJourneyPlan => {
  if (selectedPlan === 'fully-covered') {
    return {
      plan_type: 'gold',
      duration_months: termMonths,
      retail_price: 141.6,
      dealer_price: 141.6,
      term_months: termMonths,
      selected_options: { warranty_type: 'fully-covered', label: 'Fully Covered Warranty' },
    };
  }

  return {
    plan_type: 'basic',
    duration_months: termMonths,
    retail_price: 1,
    dealer_price: 1,
    term_months: termMonths,
    selected_options: { warranty_type: 'dealer-paid', label: 'Manage My Claims' },
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
  const [selectedTerm] = useState(12);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const { templates: savedPlans, deleteTemplate } = useDealerQuoteTemplates();
  const [activeSaved, setActiveSaved] = useState<DealerQuoteTemplate | null>(null);
  const [selectedSaved, setSelectedSaved] = useState<Set<string>>(new Set());
  const [deletingSaved, setDeletingSaved] = useState(false);

  const toggleSaved = (id: string) => setSelectedSaved((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = savedPlans.length > 0 && selectedSaved.size === savedPlans.length;
  const toggleSelectAll = () => setSelectedSaved(allSelected ? new Set() : new Set(savedPlans.map((t) => t.id)));
  const deleteSelected = async () => {
    if (selectedSaved.size === 0) return;
    setDeletingSaved(true);
    try {
      await Promise.all([...selectedSaved].map((id) => deleteTemplate(id)));
      setSelectedSaved(new Set());
      if (activeSaved && selectedSaved.has(activeSaved.id)) setActiveSaved(null);
    } finally {
      setDeletingSaved(false);
    }
  };

  const vehicleDetailsComplete = Boolean(isValidReg(reg) && mileage.trim() && lookupState === 'success');
  const canContinue = Boolean(vehicleDetailsComplete && selectedPlan);
  const activeVehicle = useMemo(() => buildVehicle(reg, mileage), [reg, mileage]);
  const activePlan = useMemo(() => buildPlan(selectedPlan, selectedTerm), [selectedPlan, selectedTerm]);

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

  const handlePlanSelect = (planKey: WarrantyPlanKey) => {
    setValidation((current) => ({ ...current, plan: '' }));
    setSelectedPlan(planKey);
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setVehicle(activeVehicle);
    setPlan(activePlan);
    void save({ silent: true, overrideVehicle: activeVehicle, overridePlan: activePlan });
    navigate(selectedPlan === 'dealer-paid' ? '/dealer-portal/quote/claim-handling' : '/dealer-portal/quote/pricing');
  };

  const savedQuote = useMemo(() => {
    if (!activeSaved) return null;
    try { return buildSavedPlanQuote(activeSaved); } catch { return null; }
  }, [activeSaved]);

  const openSavedPlan = (t: DealerQuoteTemplate) => {
    if (!validate()) return;
    try { buildSavedPlanQuote(t); } catch (e: any) {
      toast({ title: 'Saved plan unavailable', description: e?.message, variant: 'destructive' });
      return;
    }
    setActiveSaved(t);
  };

  const applySavedPlan = (edit: boolean) => {
    if (!activeSaved || !savedQuote) return;
    const plan = savedQuote.plan as unknown as DealerJourneyPlan;
    setVehicle(activeVehicle);
    setPlan(plan);
    void save({ silent: true, overrideVehicle: activeVehicle, overridePlan: plan });
    setActiveSaved(null);
    if (edit) navigate(savedQuote.isClaims ? '/dealer-portal/quote/claim-handling' : '/dealer-portal/quote/pricing');
    else navigate('/dealer-portal/quote/customer');
  };

  return (
    <DealerLayout>
      <div className="mx-auto grid max-w-[1100px] items-start gap-4">
       <div className="space-y-4">
        <Card className="crm-panel-shadow border-crm-line">
          <CardContent className="p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">Vehicle details</h1>
              </div>
              <span className="inline-flex min-h-6 items-center text-xs font-semibold text-muted-foreground" aria-live="polite">
                {saveState === 'saving' && <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-crm-orange" /> Saving...</>}
                {saveState === 'saved' && <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-crm-green" /> Saved</>}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
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
              <div>
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
                {validation.mileage && <p className="mt-1 text-[11px] font-semibold text-crm-red">{validation.mileage}</p>}
              </div>
            </div>
          </CardContent>
        </Card>


        <Card className={`crm-panel-shadow border-crm-line transition-opacity ${vehicleDetailsComplete ? 'opacity-100' : 'opacity-70'}`}>
          <CardContent className="p-4">
            <h2 className="mb-3 text-base font-bold">Choose your warranty</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {warrantyPlans.map((plan) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.key;
                return (
                  <div key={plan.key} className="min-w-0">
                    <Button
                      type="button"
                      onClick={() => handlePlanSelect(plan.key)}
                      disabled={!vehicleDetailsComplete}
                      variant="outline"
                      className={`h-auto min-h-16 w-full justify-start gap-2 whitespace-normal rounded-md px-3 py-3 text-left ${isSelected ? 'border-crm-navy bg-crm-navy text-white hover:bg-crm-navy/90 hover:text-white' : 'border-crm-line bg-card'}`}
                      aria-pressed={isSelected}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 flex-1 text-sm font-bold leading-snug">{plan.name}</span>
                      {isSelected && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-crm-green">
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} aria-hidden="true" />
                        </span>
                      )}
                    </Button>
                    <p className={`mt-1.5 text-xs font-semibold ${isSelected ? 'text-crm-navy' : 'text-crm-navy'}`}>{plan.subtitle}</p>
                    <details className="mt-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer py-1">Cover details</summary>
                      <p className="mt-2 leading-relaxed">{plan.description}</p>
                      <ul className="mt-2 space-y-2">
                        {plan.benefits.map((benefit) => <li key={benefit} className="flex items-start gap-2 leading-relaxed"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-crm-green" />{benefit}</li>)}
                      </ul>
                    </details>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
              className="mt-3 h-12 w-full gap-2 bg-crm-orange text-base font-bold text-primary-foreground hover:bg-crm-orange/90"
            >
              Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            {validation.plan && <p className="mt-2 text-[11px] font-semibold text-crm-red">{validation.plan}</p>}


          </CardContent>
        </Card>

        <Card className={`crm-panel-shadow border-crm-line transition-opacity ${vehicleDetailsComplete ? 'opacity-100' : 'opacity-70'}`}>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-crm-orange" />
              <h2 className="text-base font-bold">Use a saved plan</h2>
              {savedPlans.length > 0 && (
                <div className="ml-auto flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 accent-[#FE670A]"
                      aria-label="Select all saved plans"
                    />
                    Select all
                  </label>
                  {selectedSaved.size > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingSaved}
                      onClick={deleteSelected}
                      className="h-7 gap-1.5 border-crm-red/40 px-2 text-xs text-crm-red hover:bg-crm-red/10 hover:text-crm-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingSaved ? 'Deleting…' : `Delete (${selectedSaved.size})`}
                    </Button>
                  )}
                </div>
              )}
            </div>
            {savedPlans.length === 0 ? (
              <p className="text-xs text-muted-foreground">No saved plans yet. Set up a warranty on the pricing page and tap "Save &amp; name this plan" to reuse it here.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {savedPlans.map((t) => {
                  const isClaims = t.plan_type === 'basic' || t.plan_type === 'dealer-paid';
                  const checked = selectedSaved.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className={`flex min-w-0 items-center gap-2 rounded-md border bg-card px-3 py-2.5 transition-colors ${checked ? 'border-crm-orange bg-crm-orange-soft/40' : 'border-crm-line'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSaved(t.id)}
                        className="h-4 w-4 shrink-0 accent-[#FE670A]"
                        aria-label={`Select ${t.name}`}
                      />
                      <button
                        type="button"
                        disabled={!vehicleDetailsComplete}
                        onClick={() => openSavedPlan(t)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-crm-orange-soft text-crm-orange">{isClaims ? <Headphones className="h-4 w-4" /> : <Shield className="h-4 w-4" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{t.name}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{isClaims ? 'Manage My Claims' : 'Comprehensive'} · {describeTemplate(t)}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
       </div>
      </div>

      <Dialog open={Boolean(activeSaved)} onOpenChange={(open) => !open && setActiveSaved(null)}>
        <DialogContent className="max-w-md">
          {activeSaved && savedQuote && (
            <>
              <DialogHeader>
                <DialogTitle>{activeSaved.name}</DialogTitle>
                <DialogDescription>{activeVehicle.reg} · {activeVehicle.make} {activeVehicle.model} · {activeVehicle.year} · {Number(mileage).toLocaleString('en-GB')} miles</DialogDescription>
              </DialogHeader>
              <dl className="space-y-1.5 text-sm">
                {savedQuote.rows.map((r) => (
                  <div key={r.label} className="flex justify-between gap-3"><dt className="text-muted-foreground">{r.label}</dt><dd className="text-right font-semibold">{r.value}</dd></div>
                ))}
              </dl>
              <div className="space-y-1.5 border-t border-crm-line pt-3 text-sm">
                <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">{savedQuote.monthly ? 'SERVICE FEE' : 'YOUR TRADE PRICE'}</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Price (ex VAT)</span><span className="font-semibold">{gbp(savedQuote.totals.net)}{savedQuote.monthly ? ' a month' : ''}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT (20%)</span><span className="font-semibold">{gbp(savedQuote.totals.vat)}</span></div>
                <div className="flex justify-between border-t border-crm-line pt-1.5 text-base"><span className="font-bold">{savedQuote.monthly ? 'Total a month' : 'Full price to pay'}</span><span className="font-black">{gbp(savedQuote.totals.total)}</span></div>
                {savedQuote.customerTotals && (
                  <div className="flex justify-between pt-1 text-xs"><span className="text-muted-foreground">Customer selling price (inc VAT)</span><span className="font-semibold">{gbp(savedQuote.customerTotals.total)}</span></div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => applySavedPlan(true)}>Edit plan</Button>
                <Button onClick={() => applySavedPlan(false)}>Continue to checkout <ArrowRight className="h-4 w-4" /></Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DealerLayout>
  );
};

export default Step1Vehicle;