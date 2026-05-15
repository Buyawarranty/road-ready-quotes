import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronLeft, ChevronRight, Check, Search } from 'lucide-react';
import { calcTraderPrice } from '@/lib/traderPricing';
import {
  CLAIM_OPTIONS, EXCESS_OPTIONS, LABOUR_OPTIONS, PARTS_OPTIONS, TERM_OPTIONS,
  TraderClaim, TraderExcess, TraderLabour, TraderParts, TraderTerm, formatClaim,
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

const COVER_SUMMARY =
  'Braking System, Casings, Clutch, Electrics, ECUs, Engine, Flywheels, Drive Plates, Fuel System, Gearbox, Oil Seals & Gaskets, Steering Column, Suspension, Transmission, Turbocharger (Ref Document for full covered items)';

const ADD_ONS = [
  'Air-Conditioning', 'Handbrake', 'Suspension', 'Radio/ Sat-Nav',
  'Emissions', 'Wear & Tear', 'Hybrid Battery Cover',
];

const termLabel = (t: TraderTerm) =>
  t === 3 ? '3 mths' : t === 6 ? '6+1 mths' : t === 12 ? '12+12 mths' : t === 24 ? '24+12 mths' : '36+12 mths';

const TraderPricingTable: React.FC<Props> = ({ onContinue, onBack }) => {
  const { data: config, isLoading } = useTraderPricingConfig();
  const { vehicle, setVehicle } = useDealerJourney();
  const { toast } = useToast();

  const [reg, setReg] = useState(vehicle?.reg || '');
  const [mileage, setMileage] = useState(vehicle?.mileage || '');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lastLookedUp, setLastLookedUp] = useState<string | null>(null);
  const lookupTimer = useRef<number | null>(null);
  const { motMileage, isLoading: isMotLoading } = useMotMileage(reg);

  useEffect(() => {
    if (motMileage && !mileage) setMileage(String(motMileage));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motMileage]);

  // Pick up reg passed from home/dashboard via ?reg= or localStorage,
  // OR rehydrated from journey context — and always run DVLA lookup if make is missing.
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('reg');
    const fromStorage = localStorage.getItem('dealerPendingReg');
    const initial = fromUrl || fromStorage || vehicle?.reg || reg;
    if (!initial) return;
    const upper = initial.toUpperCase();
    if (!reg) setReg(upper);
    if (fromStorage) localStorage.removeItem('dealerPendingReg');
    // Always lookup if we don't yet have make/model populated for this reg.
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
  const [dealerView, setDealerView] = useState<boolean>(true);
  const [addOns, setAddOns] = useState<Record<string, boolean>>({});

  const effectiveConfig = useMemo(() => {
    if (!config) return config;
    return dealerView ? config : { ...config, dealer_pct: 1 };
  }, [config, dealerView]);

  const result = useMemo(
    () => calcTraderPrice({ term, excess, labour, parts, claim, config: effectiveConfig }),
    [term, excess, labour, parts, claim, effectiveConfig],
  );

  const allTermPrices = useMemo(
    () =>
      TERM_OPTIONS.map((t) => ({
        term: t,
        gross: calcTraderPrice({ term: t, excess, labour, parts, claim, config: effectiveConfig }).gross,
      })),
    [excess, labour, parts, claim, effectiveConfig],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  // -- small atoms ----------------------------------------------------------
  const SegBtn = <T extends string | number>({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
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
    label, options, value, onChange, format,
  }: {
    label: string;
    options: readonly T[];
    value: T;
    onChange: (v: T) => void;
    format?: (v: T) => string;
  }) => (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2 text-center">{label}</p>
      <div className="flex">
        {options.map((o) => (
          <SegBtn key={String(o)} active={value === o} onClick={() => onChange(o)}>
            {format ? format(o) : String(o)}
          </SegBtn>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* VEHICLE DETAILS */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold mb-3">Vehicle Details</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 space-y-5">
          {/* Reg input */}
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

          {/* Auto-filled details */}
          <dl className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-2 text-sm border-t border-gray-100 pt-4">
            {[
              ['Manufacturer', vehicle?.make],
              ['Model', vehicle?.model],
              ['Year', vehicle?.year],
              ['Fuel', vehicle?.fuel_type],
              ['Transmission', vehicle?.transmission],
            ].map(([k, v]) => (
              <div key={k as string} className="flex flex-col border-b border-dashed border-gray-200 py-1">
                <dt className="text-gray-500 uppercase tracking-wide text-[10px] font-semibold">{k}</dt>
                <dd className="text-gray-900 font-semibold truncate">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* PRODUCT SELECTION */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Product Selection</h2>
          {/* Retail / Dealer toggle */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold ${!dealerView ? 'text-gray-900' : 'text-gray-400'}`}>Retail</span>
            <button
              type="button"
              role="switch"
              aria-checked={dealerView}
              onClick={() => setDealerView((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dealerView ? 'bg-orange-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${dealerView ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-xs font-semibold ${dealerView ? 'text-gray-900' : 'text-gray-400'}`}>Dealer</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Gold banner */}
          <div className="bg-yellow-300 px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 whitespace-nowrap">
              GOLD <span className="font-bold">(£{result.gross.toFixed(2)})</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-800/90 leading-snug">{COVER_SUMMARY}</p>
          </div>

          <div className="p-5 sm:p-6 space-y-7">
            {/* Term tiles */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-3">
                What terms would you like? <span className="ml-2 text-gray-400 normal-case font-normal tracking-normal">Promo: extra months for free</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {allTermPrices.map(({ term: t, gross }) => {
                  const active = term === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTerm(t)}
                      className={`px-3 py-3 rounded-lg text-center border-2 transition-all ${
                        active
                          ? 'bg-yellow-300 border-yellow-400 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="text-lg font-bold text-gray-900">£{gross.toFixed(2)}</div>
                      <div className="text-[11px] text-gray-600 mt-0.5">{termLabel(t)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tailored items - 4 columns */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-3">Your tailored items</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
                <SegGroup
                  label="Excess"
                  options={EXCESS_OPTIONS}
                  value={excess}
                  onChange={(v) => setExcess(v as TraderExcess)}
                  format={(v) => `£${v}`}
                />
                <SegGroup
                  label="Labour rates"
                  options={LABOUR_OPTIONS}
                  value={labour}
                  onChange={(v) => setLabour(v as TraderLabour)}
                  format={(v) => `£${v}`}
                />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2 text-center">Parts &amp; Labour</p>
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
            </div>

            {/* Optional add-ons */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-3">Optional add-ons</p>
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
          </div>
        </div>
      </section>

      {/* Total + nav bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:justify-between">
        {onBack ? (
          <Button
            variant="outline"
            onClick={onBack}
            className="rounded-full bg-gray-900 text-white hover:bg-gray-800 hover:text-white border-gray-900 px-5"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        ) : <span />}

        <div className="text-center sm:text-right order-first sm:order-none">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">£{result.gross.toFixed(2)}</div>
          <div className="text-[11px] text-gray-500">£{result.exVat.toFixed(2)} ex VAT · VAT @ 20% £{result.vat.toFixed(2)}</div>
        </div>

        <Button
          className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-6"
          onClick={() =>
            onContinue({
              term, excess, labour, parts, claim,
              exVat: result.exVat, gross: result.gross, vat: result.vat,
              monthlyEquivalent: result.monthlyEquivalent,
            })
          }
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default TraderPricingTable;
