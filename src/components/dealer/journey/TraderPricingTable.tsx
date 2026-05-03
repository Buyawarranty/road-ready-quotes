import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import { calcTraderPrice } from '@/lib/traderPricing';
import {
  CLAIM_OPTIONS, EXCESS_OPTIONS, LABOUR_OPTIONS, PARTS_OPTIONS, TERM_OPTIONS,
  TraderClaim, TraderExcess, TraderLabour, TraderParts, TraderTerm, formatClaim,
} from '@/lib/traderPricingDefaults';
import { useTraderPricingConfig } from '@/hooks/useTraderPricingConfig';

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

const TraderPricingTable: React.FC<Props> = ({ onContinue, onBack }) => {
  const { data: config, isLoading } = useTraderPricingConfig();
  const [term, setTerm] = useState<TraderTerm>(12);
  const [excess, setExcess] = useState<TraderExcess>(75);
  const [labour, setLabour] = useState<TraderLabour>(70);
  const [parts, setParts] = useState<TraderParts>('age_mileage');
  const [claim, setClaim] = useState<TraderClaim>(1000);
  const [dealerView, setDealerView] = useState<boolean>(true);

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

  const Row = <T extends string | number>({
    label, options, value, onChange, format,
  }: {
    label: string;
    options: readonly T[];
    value: T;
    onChange: (v: T) => void;
    format?: (v: T) => string;
  }) => (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={String(o)}
              type="button"
              onClick={() => onChange(o)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                active
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
              }`}
            >
              {format ? format(o) : String(o)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="border-orange-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-orange-600 font-semibold">Trader plan</p>
              <CardTitle className="text-2xl text-gray-900 flex items-center gap-2">
                Gold <Check className="h-5 w-5 text-orange-500" />
              </CardTitle>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{term}-month cover</p>
              <p className="text-3xl font-bold text-gray-900">£{result.gross.toFixed(2)}</p>
              <p className="text-xs text-gray-500">£{result.exVat.toFixed(2)} ex VAT · £{result.monthlyEquivalent.toFixed(2)}/mo equiv.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Row label="Warranty term" options={TERM_OPTIONS} value={term} onChange={(v) => setTerm(v as TraderTerm)} format={(v) => `${v} months`} />
          <Row label="Repair excess" options={EXCESS_OPTIONS} value={excess} onChange={(v) => setExcess(v as TraderExcess)} format={(v) => `£${v}`} />
          <Row label="Labour rate" options={LABOUR_OPTIONS} value={labour} onChange={(v) => setLabour(v as TraderLabour)} format={(v) => `£${v}/hr`} />
          <Row label="Claim limit" options={CLAIM_OPTIONS} value={claim} onChange={(v) => setClaim(v as TraderClaim)} format={(v) => formatClaim(Number(v))} />
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-semibold">Parts contribution</p>
            <div className="flex flex-wrap gap-2">
              {PARTS_OPTIONS.map((o) => {
                const active = parts === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setParts(o.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      active
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700">Price breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {result.breakdown.map((b) => (
            <div key={b.label} className="flex justify-between text-gray-600">
              <span>{b.label}</span>
              <span className="font-mono">{b.value}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t mt-2 text-gray-900 font-semibold">
            <span>Ex VAT</span><span>£{result.exVat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>VAT @ 20%</span><span>£{result.vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-1 border-t mt-1">
            <span>Total (inc VAT)</span><span>£{result.gross.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        {onBack && <Button variant="outline" onClick={onBack}>Back</Button>}
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white"
          onClick={() =>
            onContinue({
              term, excess, labour, parts, claim,
              exVat: result.exVat, gross: result.gross, vat: result.vat,
              monthlyEquivalent: result.monthlyEquivalent,
            })
          }
        >
          Continue to checkout
        </Button>
      </div>
    </div>
  );
};

export default TraderPricingTable;
