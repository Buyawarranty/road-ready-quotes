import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Search,
  Check,
  ArrowRight,
  ArrowLeft,
  Headphones,
  ShieldCheck,
  Sparkles,
  Info,
  Eye,
  Star,
} from 'lucide-react';
import CarProgressBar from './CarProgressBar';
import { calcTraderPrice } from '@/lib/traderPricing';
import {
  CLAIM_OPTIONS,
  EXCESS_OPTIONS,
  LABOUR_OPTIONS,
  PARTS_OPTIONS,
  TERM_OPTIONS,
  TraderClaim,
  TraderExcess,
  TraderLabour,
  TraderParts,
  TraderTerm,
  formatClaim,
} from '@/lib/traderPricingDefaults';
import { useTraderPricingConfig } from '@/hooks/useTraderPricingConfig';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMotMileage } from '@/hooks/useMotMileage';

export interface TraderSelection {
  term: TraderTerm;
  excess: TraderExcess;
  labour: TraderLabour;
  parts: TraderParts;
  claim: TraderClaim;
  exVat: number;
  gross: number;
  vat: number;
  monthlyEquivalent: number;
}

interface Props {
  onContinue: (sel: TraderSelection) => void;
  onBack?: () => void;
}

const JOURNEY_STEPS = [
  { n: 1, label: 'Enter Reg Plate' },
  { n: 2, label: 'Receive Quote' },
  { n: 3, label: 'Choose Your Plan' },
  { n: 4, label: 'Review & Pay' },
];

const CLAIM_FEATURES = [
  'We handle claims from start to finish',
  'Expert support & guidance',
  'Faster turnaround for your customers',
  'Perfect for pay-as-you-go repair cover',
];

const WARRANTY_FEATURES = [
  'All mechanical & electrical components',
  'Parts, labour & VAT included',
  'Nationwide repair network',
  '24/7 claims assistance',
  'No excess payments',
];

const ADD_ONS = [
  'Air-Conditioning',
  'Turbocharger',
  'Diagnostic Cover',
  'Breakdown Recovery',
  'Vehicle Hire',
  'European Cover',
  'EV Battery Cover',
  'Hybrid Battery Cover',
  'Emissions',
  'Suspension',
  'Handbrake',
  'Radio / Sat-Nav',
];

const termLabel = (t: TraderTerm) =>
  t === 3
    ? '3 months'
    : t === 6
    ? '6+1 months'
    : t === 12
    ? '12+12 months'
    : t === 24
    ? '24+12 months'
    : '36+12 months';

type SupportOption = 'claim' | 'warranty' | null;

const TraderPricingTable: React.FC<Props> = ({ onContinue, onBack }) => {
  const { data: config, isLoading } = useTraderPricingConfig();
  const { vehicle, setVehicle } = useDealerJourney();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [reg, setReg] = useState(vehicle?.reg || '');
  const [mileage, setMileage] = useState(vehicle?.mileage || '');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lastLookedUp, setLastLookedUp] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState(!vehicle?.make);
  const lookupTimer = useRef<number | null>(null);
  const { motMileage, isLoading: isMotLoading } = useMotMileage(reg);

  useEffect(() => {
    if (motMileage && !mileage) setMileage(String(motMileage));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motMileage]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('reg');
    const fromStorage = localStorage.getItem('dealerPendingReg');
    const initial = fromUrl || fromStorage || vehicle?.reg || reg;
    if (!initial) return;
    const upper = initial.toUpperCase();
    if (!reg) setReg(upper);
    if (fromStorage) localStorage.removeItem('dealerPendingReg');
    if (!vehicle?.make || vehicle?.reg?.toUpperCase() !== upper.replace(/\s+/g, '')) {
      performLookup(upper);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performLookup = async (regToLookup: string) => {
    const cleaned = regToLookup.replace(/\s+/g, '').toUpperCase();
    if (!cleaned || cleaned.length < 4 || cleaned === lastLookedUp) return;
    setLastLookedUp(cleaned);
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('dvla-vehicle-lookup', {
        body: { registrationNumber: cleaned, skipAgeCheck: true },
      });
      if (error) throw error;
      if (!data || (!data.make && !data.found)) {
        toast({ title: 'Vehicle not found', description: 'Please check the registration and try again.' });
        return;
      }
      setVehicle({
        reg: cleaned,
        make: data.make || '',
        model: data.model || '',
        year: data.yearOfManufacture ? String(data.yearOfManufacture) : '',
        fuel_type: data.fuelType || '',
        transmission: data.transmission || '',
        mileage: mileage || '',
      });
      setEditingVehicle(false);
    } catch (err) {
      console.error('DVLA lookup failed:', err);
      toast({ title: 'Lookup failed', description: 'Please try again or continue manually.', variant: 'destructive' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleRegChange = (value: string) => {
    const upper = value.toUpperCase();
    setReg(upper);
    if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    const cleaned = upper.replace(/\s+/g, '');
    if (cleaned.length >= 5 && cleaned.length <= 8) {
      lookupTimer.current = window.setTimeout(() => performLookup(upper), 600);
    }
  };

  useEffect(() => {
    if (vehicle?.reg && mileage !== vehicle.mileage) {
      setVehicle({ ...vehicle, mileage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mileage]);

  const [term, setTerm] = useState<TraderTerm>(12);
  const [excess, setExcess] = useState<TraderExcess>(50);
  const [labour, setLabour] = useState<TraderLabour>(70);
  const [parts, setParts] = useState<TraderParts>('age_mileage');
  const [claim, setClaim] = useState<TraderClaim>(1000);
  const [dealerView, setDealerView] = useState<boolean>(true); // true = Wholesale (Trade)
  const [support, setSupport] = useState<SupportOption>(null);
  const [addOns, setAddOns] = useState<Record<string, boolean>>({});
  const [showClaimDetails, setShowClaimDetails] = useState(false);
  const [showWarrantyDetails, setShowWarrantyDetails] = useState(false);
  const [showCustomize, setShowCustomize] = useState(true);

  const effectiveConfig = useMemo(() => {
    if (!config) return config;
    return dealerView ? config : { ...config, dealer_pct: 1 };
  }, [config, dealerView]);

  const warrantyResult = useMemo(
    () => calcTraderPrice({ term, excess, labour, parts, claim, config: effectiveConfig }),
    [term, excess, labour, parts, claim, effectiveConfig],
  );

  // Claim handling = flat low-cost service. Symbolic price in this layout.
  const CLAIM_FLAT_GROSS = 1.20;
  const CLAIM_FLAT_EXVAT = 1.0;
  const CLAIM_FLAT_VAT = 0.2;

  const activeGross = support === 'warranty' ? warrantyResult.gross : CLAIM_FLAT_GROSS;
  const activeExVat = support === 'warranty' ? warrantyResult.exVat : CLAIM_FLAT_EXVAT;
  const activeVat = support === 'warranty' ? warrantyResult.vat : CLAIM_FLAT_VAT;
  const activeMonthly = activeGross; // displayed as monthly
  const activeMonthlyExVat = activeExVat;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  // -- atoms ----------------------------------------------------------------
  const SegBtn = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-sm font-semibold border transition-colors first:rounded-l-md last:rounded-r-md -ml-px first:ml-0 ${
        active
          ? 'bg-yellow-300 text-gray-900 border-yellow-400 z-10 relative'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );

  const SegGroup = <T extends string | number>({
    label,
    options,
    value,
    onChange,
    format,
  }: {
    label: string;
    options: readonly T[];
    value: T;
    onChange: (v: T) => void;
    format?: (v: T) => string;
  }) => (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">{label}</p>
      <div className="flex">
        {options.map((o) => (
          <SegBtn key={String(o)} active={value === o} onClick={() => onChange(o)}>
            {format ? format(o) : String(o)}
          </SegBtn>
        ))}
      </div>
    </div>
  );

  const VehicleImagePlaceholder = (
    <div className="w-28 h-20 rounded-md bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-semibold shrink-0">
      VEHICLE
    </div>
  );

  // -- shared atoms --------------------------------------------------------
  const TypeSelector = (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setSupport('claim');
            if (vehicle?.reg) {
              navigate('/dealer-portal/quote/claim-handling');
            } else {
              toast({ title: 'Enter a registration first', description: 'Add the vehicle reg to continue.' });
            }
          }}
          className={`group flex items-center justify-between gap-3 px-4 py-4 rounded-xl border-2 transition-all text-left ${
            support === 'claim' ? 'border-orange-500 bg-orange-50/60' : 'border-gray-200 hover:border-orange-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-gray-900">Claim Handling</div>
              <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5">You set the terms · Dealer pays payouts</div>
            </div>
          </div>
          <span className="text-sm sm:text-base font-extrabold text-gray-900 whitespace-nowrap">£{CLAIM_FLAT_GROSS.toFixed(2)}/m</span>
        </button>
        <button
          type="button"
          onClick={() => setSupport('warranty')}
          className={`group flex items-center justify-between gap-3 px-4 py-4 rounded-xl border-2 transition-all text-left ${
            support === 'warranty' ? 'border-orange-500 bg-orange-50/60' : 'border-gray-200 hover:border-orange-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold text-gray-900">Warranty Cover</span>
                <span className="text-[9px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Popular</span>
              </div>
              <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Full cover · We handle claims & payouts</div>
            </div>
          </div>
          <span className="text-sm sm:text-base font-extrabold text-gray-900 whitespace-nowrap">£{warrantyResult.gross.toFixed(2)}/m</span>
        </button>
      </div>
    </section>
  );

  // -- layout ---------------------------------------------------------------
  // Initial view: just the type selector
  if (support !== 'warranty') {
    return (
      <div className="max-w-3xl mx-auto pb-12">
        <div className="bg-white border border-gray-200 rounded-xl px-4 sm:px-6 pb-3 mb-4 shadow-sm">
          <CarProgressBar steps={JOURNEY_STEPS} currentStep={3} />
        </div>
        <div className="mb-4 text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
            Build your warranty
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Choose which type of warranty you'd like to offer your customer.
          </p>
        </div>
        {TypeSelector}
        <p className="text-xs text-gray-400 text-center mt-4">
          Pick an option above to continue.
        </p>
      </div>
    );
  }

  // Expanded view (warranty cover): claim-handling-style layout
  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Progress bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 sm:px-6 pb-3 mb-4 shadow-sm">
        <CarProgressBar steps={JOURNEY_STEPS} currentStep={3} />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={() => setSupport(null)}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Change warranty type
        </button>
        <div className="text-xs uppercase tracking-wider text-blue-700 font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          Warranty Cover
        </div>
      </div>

      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5 sm:p-7 mb-5 shadow-md">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex w-12 h-12 rounded-xl bg-white/20 items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Full warranty cover — we handle everything
            </h1>
            <p className="text-sm text-white/90 mt-1 max-w-2xl leading-relaxed">
              Tailor the excess, labour rate, claim limit and add-ons to suit your customer.
              <strong className="font-bold"> We pay the claim payouts</strong> and manage the entire repair experience.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-semibold text-white/95">
              {WARRANTY_FEATURES.slice(0, 3).map((f) => (
                <span key={f} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {f}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vehicle banner */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm">
        {editingVehicle || !vehicle?.make ? (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4 items-end">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2 block">
                Vehicle registration
              </label>
              <div className="flex items-stretch rounded-md overflow-hidden border-2 border-gray-900 shadow-sm">
                <div className="bg-blue-700 text-yellow-300 text-xs font-bold flex items-center justify-center px-3">GB</div>
                <input
                  value={reg}
                  onChange={(e) => handleRegChange(e.target.value)}
                  onBlur={() => reg && performLookup(reg)}
                  placeholder="ENTER REG"
                  maxLength={10}
                  className="bg-yellow-300 flex-1 text-center font-black text-xl sm:text-2xl tracking-widest py-3 text-gray-900 placeholder:text-gray-900/40 outline-none uppercase"
                />
                <div className="bg-yellow-300 px-3 flex items-center">
                  {isLookingUp ? <Loader2 className="h-5 w-5 animate-spin text-gray-900" /> : <Search className="h-5 w-5 text-gray-900/60" />}
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2 block">Mileage</label>
              <div className="relative">
                <Input
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder={isMotLoading ? 'Fetching from MOT…' : 'e.g. 45000'}
                  className="bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-500 focus-visible:ring-orange-500 pr-10"
                />
                {isMotLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="inline-flex items-stretch rounded-sm overflow-hidden border border-gray-900 shrink-0">
                <div className="bg-blue-700 text-yellow-300 text-[9px] font-bold flex items-center px-1.5">GB</div>
                <div className="bg-yellow-300 text-gray-900 font-black tracking-widest text-sm px-2 py-0.5">{vehicle?.reg}</div>
              </div>
              <div className="truncate text-sm">
                <span className="font-bold text-gray-900 uppercase">{vehicle?.make} {vehicle?.model}</span>
                <span className="text-gray-500"> · {vehicle?.year || '—'} · {vehicle?.fuel_type || '—'} · {mileage ? `${Number(mileage).toLocaleString()} mi` : '—'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingVehicle(true)}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Edit vehicle
            </button>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* MAIN COLUMN */}
        <div className="space-y-5">
          {/* Customize Your Warranty */}
          <section className="bg-white border-2 border-orange-200 rounded-2xl p-5 sm:p-6 ring-1 ring-orange-100/60 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" /> Customize your warranty
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Tailor each option — all included in the monthly price.</p>
              </div>
              <div className="inline-flex rounded-lg overflow-hidden border border-gray-300">
                <button
                  type="button"
                  onClick={() => setDealerView(true)}
                  className={`text-xs font-bold px-3 py-2 ${dealerView ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}`}
                >
                  Wholesale
                </button>
                <button
                  type="button"
                  onClick={() => setDealerView(false)}
                  className={`text-xs font-bold px-3 py-2 border-l border-gray-300 ${!dealerView ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}`}
                >
                  Retail
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <SegGroup
                label="Excess"
                options={EXCESS_OPTIONS}
                value={excess}
                onChange={(v) => setExcess(v as TraderExcess)}
                format={(v) => `£${v}`}
              />
              <SegGroup
                label="Labour rates (per hour)"
                options={LABOUR_OPTIONS}
                value={labour}
                onChange={(v) => setLabour(v as TraderLabour)}
                format={(v) => `£${v}`}
              />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Parts</p>
                <div className="flex">
                  {PARTS_OPTIONS.map((o) => {
                    const active = parts === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => setParts(o.key)}
                        className={`flex-1 px-3 py-2 text-sm font-semibold border transition-colors first:rounded-l-md last:rounded-r-md -ml-px first:ml-0 ${
                          active
                            ? 'bg-yellow-300 text-gray-900 border-yellow-400 z-10 relative'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <SegGroup
                label="Claim limit"
                options={CLAIM_OPTIONS}
                value={claim}
                onChange={(v) => setClaim(v as TraderClaim)}
                format={(v) => formatClaim(Number(v))}
              />

              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Term</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {TERM_OPTIONS.map((t) => {
                    const active = term === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTerm(t)}
                        className={`px-3 py-2 rounded-lg text-center border-2 transition-all text-xs font-semibold ${
                          active ? 'bg-yellow-300 border-yellow-400' : 'bg-white border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        {termLabel(t)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Optional Add-ons */}
          <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight mb-1">Optional add-ons</h2>
            <p className="text-xs text-gray-500 mb-4">Boost the cover with extra protection.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
              {ADD_ONS.map((name) => {
                const checked = !!addOns[name];
                return (
                  <label key={name} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none">
                    <span
                      onClick={() => setAddOns((prev) => ({ ...prev, [name]: !checked }))}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        checked ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-400'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        {/* SIDEBAR — Summary */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-orange-600 mb-2">Summary</div>
            <h3 className="text-base font-extrabold text-gray-900 mb-3">Warranty Cover</h3>

            <dl className="text-xs space-y-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Term</dt>
                <dd className="font-bold text-gray-900">{termLabel(term)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Excess</dt>
                <dd className="font-bold text-gray-900">£{excess}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Labour rate</dt>
                <dd className="font-bold text-gray-900">£{labour}/hr</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Claim limit</dt>
                <dd className="font-bold text-gray-900">{formatClaim(claim)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Parts</dt>
                <dd className="font-bold text-gray-900">{PARTS_OPTIONS.find((p) => p.key === parts)?.label}</dd>
              </div>
            </dl>

            <div className="border-t border-gray-200 my-4" />

            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-500">
                {dealerView ? 'Wholesale' : 'Retail'}
              </span>
              <span className="text-2xl font-extrabold text-gray-900">£{activeMonthlyExVat.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              ex VAT / month · £{activeGross.toFixed(2)} inc VAT
            </p>

            <Button
              onClick={() =>
                onContinue({
                  term,
                  excess,
                  labour,
                  parts,
                  claim,
                  exVat: activeExVat,
                  gross: activeGross,
                  vat: activeVat,
                  monthlyEquivalent: activeGross,
                })
              }
              className="w-full mt-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white h-11 font-bold"
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full mt-2 text-xs text-gray-500 hover:text-gray-700 font-semibold py-1"
              >
                ← Back
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TraderPricingTable;
