import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Search,
  Check,
  ArrowRight,
  Headphones,
  ShieldCheck,
  ChevronUp,
  Info,
  Eye,
  Star,
} from 'lucide-react';
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

const SUPPORT_STEPS = [
  { n: 1, label: 'Vehicle & Protection' },
  { n: 2, label: 'Customer Details' },
  { n: 3, label: 'Checkout' },
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
  'Handbrake',
  'Suspension',
  'Radio/ Sat-Nav',
  'Emissions',
  'Wear & Tear',
  'Hybrid Battery Cover',
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

type SupportOption = 'claim' | 'warranty';

const TraderPricingTable: React.FC<Props> = ({ onContinue, onBack }) => {
  const { data: config, isLoading } = useTraderPricingConfig();
  const { vehicle, setVehicle } = useDealerJourney();
  const { toast } = useToast();

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
  const [support, setSupport] = useState<SupportOption>('claim');
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

  // -- layout ---------------------------------------------------------------
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      {/* LEFT STEPPER */}
      <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">New Warranty Quote</h2>
          <p className="text-xs text-gray-500 mt-1.5">Create a quote in minutes</p>
        </div>
        <ol className="mt-8 space-y-1">
          {SUPPORT_STEPS.map((s, idx) => {
            const active = idx === 0;
            return (
              <li key={s.n} className="flex items-start gap-3 relative">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      active ? 'bg-orange-500 text-white' : 'bg-white border border-gray-300 text-gray-500'
                    }`}
                  >
                    {s.n}
                  </div>
                  {idx < SUPPORT_STEPS.length - 1 && <div className="w-px h-8 bg-gray-200 my-1" />}
                </div>
                <span
                  className={`text-sm mt-1 ${
                    active ? 'text-gray-900 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Headphones className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-900">Need help?</p>
          </div>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">Our team are here to support you.</p>
          <Button variant="outline" size="sm" className="w-full">Contact Support</Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="space-y-8">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">1. Vehicle &amp; Protection</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Enter the vehicle details and choose how you'd like to be supported.
          </p>
        </div>

        {/* Vehicle Card */}
        <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          {editingVehicle || !vehicle?.make ? (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4 items-end">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2 block">
                  Vehicle registration
                </label>
                <div className="flex items-stretch rounded-md overflow-hidden border-2 border-gray-900 shadow-sm">
                  <div className="bg-blue-700 text-yellow-300 text-xs font-bold flex items-center justify-center px-3">
                    GB
                  </div>
                  <input
                    value={reg}
                    onChange={(e) => handleRegChange(e.target.value)}
                    onBlur={() => reg && performLookup(reg)}
                    placeholder="ENTER REG"
                    maxLength={10}
                    className="bg-yellow-300 flex-1 text-center font-black text-xl sm:text-2xl tracking-widest py-3 text-gray-900 placeholder:text-gray-900/40 outline-none uppercase"
                  />
                  <div className="bg-yellow-300 px-3 flex items-center">
                    {isLookingUp ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-900" />
                    ) : (
                      <Search className="h-5 w-5 text-gray-900/60" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Make, model, year and fuel auto-fill from DVLA.</p>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2 block">
                  Mileage
                </label>
                <div className="relative">
                  <Input
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder={isMotLoading ? 'Fetching from MOT…' : 'e.g. 45000'}
                    className="bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-500 focus-visible:ring-orange-500 pr-10"
                  />
                  {isMotLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1px_1fr] gap-4 md:gap-6 items-start">
              {VehicleImagePlaceholder}
              <div className="space-y-2">
                <div className="text-base font-bold text-gray-900 uppercase">
                  {vehicle?.make} {vehicle?.model}
                </div>
                <div className="text-xs text-gray-600">
                  {vehicle?.year} • {vehicle?.fuel_type || '—'} • {vehicle?.transmission || '—'}
                </div>
                <div className="inline-flex items-stretch rounded-sm overflow-hidden border border-gray-900">
                  <div className="bg-blue-700 text-yellow-300 text-[9px] font-bold flex items-center px-1.5">GB</div>
                  <div className="bg-yellow-300 text-gray-900 font-black tracking-widest text-sm px-2 py-0.5">
                    {vehicle?.reg}
                  </div>
                </div>
                <div className="text-xs text-gray-600">{mileage ? `${Number(mileage).toLocaleString()} miles` : '— miles'}</div>
                <button
                  type="button"
                  onClick={() => setEditingVehicle(true)}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Edit vehicle
                </button>
              </div>
              <div className="hidden md:block w-px bg-gray-100" />
              <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                <dt className="text-gray-500">Mileage</dt>
                <dd className="text-gray-900 font-semibold text-right">
                  {mileage ? `${Number(mileage).toLocaleString()}` : '—'}
                </dd>
                <dt className="text-gray-500">Registration date</dt>
                <dd className="text-gray-900 font-semibold text-right">{vehicle?.year || '—'}</dd>
                <dt className="text-gray-500">Transmission</dt>
                <dd className="text-gray-900 font-semibold text-right">{vehicle?.transmission || '—'}</dd>
                <dt className="text-gray-500">Fuel</dt>
                <dd className="text-gray-900 font-semibold text-right">{vehicle?.fuel_type || '—'}</dd>
              </dl>
            </div>
          )}
        </section>

        {/* Choose Your Support Option */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Choose Your Support Option</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-xl leading-relaxed">
              Choose how you'd like us to support your dealership when a claim arises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Claim Handling */}
            <button
              type="button"
              onClick={() => setSupport('claim')}
              className={`relative text-left bg-white border-2 rounded-xl p-6 transition-all shadow-sm hover:shadow ${
                support === 'claim' ? 'border-orange-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-1 shrink-0 flex items-center justify-center ${
                    support === 'claim' ? 'border-orange-500' : 'border-gray-300'
                  }`}
                >
                  {support === 'claim' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Headphones className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Claim Handling Service</div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded mt-1">
                    Essential
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-extrabold text-gray-900">
                  £{CLAIM_FLAT_GROSS.toFixed(2)}
                  <span className="text-sm font-medium text-gray-500"> / month ({dealerView ? 'wholesale' : 'retail'})</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">We handle the claims on your behalf.</p>
                <p className="text-xs text-gray-600">You pay the claim amount.</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowClaimDetails((v) => !v);
                }}
                className="text-xs text-blue-600 font-semibold mt-3 flex items-center gap-1"
              >
                <ChevronUp className={`h-3 w-3 transition-transform ${showClaimDetails ? '' : 'rotate-180'}`} />
                {showClaimDetails ? 'Hide details' : 'Show details'}
              </button>
              {showClaimDetails && (
                <>
                  <ul className="mt-3 space-y-1.5">
                    {CLAIM_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
                        <Check className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" strokeWidth={3} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 bg-blue-50 border border-blue-100 rounded-md p-3 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-blue-900 leading-snug">
                      You remain responsible for payment of any approved claim costs.
                    </p>
                  </div>
                </>
              )}
            </button>

            {/* Warranty Cover */}
            <button
              type="button"
              onClick={() => setSupport('warranty')}
              className={`relative text-left bg-white border-2 rounded-xl p-6 transition-all shadow-sm hover:shadow ${
                support === 'warranty' ? 'border-orange-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-1 shrink-0 flex items-center justify-center ${
                    support === 'warranty' ? 'border-orange-500' : 'border-gray-300'
                  }`}
                >
                  {support === 'warranty' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Warranty Cover</div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded mt-1">
                    Comprehensive
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-extrabold text-gray-900">
                  £{warrantyResult.gross.toFixed(2)}
                  <span className="text-sm font-medium text-gray-500"> / month ({dealerView ? 'wholesale' : 'retail'})</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">Full warranty cover underwritten</p>
                <p className="text-xs text-gray-600">by Panda Protect.</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWarrantyDetails((v) => !v);
                }}
                className="text-xs text-blue-600 font-semibold mt-3 flex items-center gap-1"
              >
                <ChevronUp className={`h-3 w-3 transition-transform ${showWarrantyDetails ? '' : 'rotate-180'}`} />
                {showWarrantyDetails ? 'Hide details' : 'Show details'}
              </button>
              {showWarrantyDetails && (
                <>
                  <ul className="mt-3 space-y-1.5">
                    {WARRANTY_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
                        <Check className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" strokeWidth={3} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded">
                      <Star className="h-3 w-3 fill-orange-500 text-orange-500" /> Most popular choice
                    </span>
                  </div>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Customize Your Warranty */}
        <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">
                Customize Your Warranty{' '}
                <span className="text-xs font-medium text-gray-500">(Included with Warranty Cover)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Tailor the cover to suit your needs. These options are included in the monthly price.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomize((v) => !v)}
              className="text-xs text-blue-600 font-semibold flex items-center gap-1 shrink-0 mt-1"
            >
              {showCustomize ? 'Hide' : 'Show'}
              <ChevronUp className={`h-3 w-3 transition-transform ${showCustomize ? '' : 'rotate-180'}`} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-500 font-semibold mr-1">View prices as:</span>
            <div className="inline-flex rounded-md overflow-hidden border border-gray-300">
              <button
                type="button"
                onClick={() => setDealerView(true)}
                className={`text-xs font-semibold px-3 py-1.5 ${
                  dealerView ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600'
                }`}
              >
                Wholesale (Trade)
              </button>
              <button
                type="button"
                onClick={() => setDealerView(false)}
                className={`text-xs font-semibold px-3 py-1.5 border-l border-gray-300 ${
                  !dealerView ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600'
                }`}
              >
                Customer (Retail)
              </button>
            </div>
            <Info className="h-3.5 w-3.5 text-gray-400" />
          </div>

          {showCustomize && (
            <div className="mt-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Parts &amp; Labour</p>
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
                  label="Repair reimbursement limit"
                  options={CLAIM_OPTIONS}
                  value={claim}
                  onChange={(v) => setClaim(v as TraderClaim)}
                  format={(v) => formatClaim(Number(v))}
                />
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-3">Optional Add-Ons</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
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
              </div>

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
          )}
        </section>

        {/* Bottom nav bar */}
        <div className="sticky bottom-4 z-30 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-lg">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} className="text-gray-700">
              ← Back
            </Button>
          ) : <span />}
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">
              Total ({dealerView ? 'wholesale' : 'retail'})
            </div>
            <div className="text-xl font-extrabold text-gray-900 leading-tight mt-0.5">
              £{activeMonthlyExVat.toFixed(2)}
              <span className="text-xs text-gray-500 font-medium"> ex VAT / month</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">£{activeGross.toFixed(2)} inc VAT / month</div>
          </div>
          <Button
            className="rounded-md bg-orange-500 hover:bg-orange-600 text-white px-6 h-11"
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
          >
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

    </div>
  );
};

export default TraderPricingTable;
