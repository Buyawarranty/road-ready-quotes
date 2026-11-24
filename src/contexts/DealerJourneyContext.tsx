import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { dealerJourneyWithVehicle, emptyDealerJourney, isNewDealerQuote } from '@/lib/dealerJourneyState';

export interface DealerJourneyVehicle {
  reg: string;
  make?: string;
  model?: string;
  year?: string;
  mileage?: string;
  fuel_type?: string;
  transmission?: string;
}

export interface DealerJourneyCustomer {
  name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  town: string;
  postcode: string;
}

export interface DealerJourneyPlan {
  plan_type: 'basic' | 'gold' | 'platinum';
  duration_months: number;
  retail_price: number; // before discount
  dealer_price: number; // after discount
  term_months?: number;
  selected_options?: Record<string, any>;
}

export interface DealerJourneyState {
  quoteId: string | null;
  vehicle: DealerJourneyVehicle | null;
  customer: DealerJourneyCustomer | null;
  plan: DealerJourneyPlan | null;
  discount_pct: number;
}

interface DealerJourneyContextValue extends DealerJourneyState {
  setQuoteId: (id: string | null) => void;
  setVehicle: (v: DealerJourneyVehicle) => void;
  setCustomer: (c: DealerJourneyCustomer) => void;
  setPlan: (p: DealerJourneyPlan) => void;
  setDiscountPct: (n: number) => void;
  hydrate: (s: Partial<DealerJourneyState>) => void;
  reset: () => void;
}

const STORAGE_KEY = 'dealerJourney';

const defaultState = emptyDealerJourney();

const DealerJourneyContext = createContext<DealerJourneyContextValue | null>(null);

export const DealerJourneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const freshEntry = isNewDealerQuote(location.pathname, location.search);
  const [entryKey, setEntryKey] = useState(location.key);
  const [state, setState] = useState<DealerJourneyState>(() => {
    if (freshEntry) return emptyDealerJourney();
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
    } catch {
      return defaultState;
    }
  });

  // React may retain this provider between quote routes. Reset before children
  // initialise their form state, once per explicit new-warranty navigation.
  if (freshEntry && entryKey !== location.key) {
    setEntryKey(location.key);
    setState(emptyDealerJourney());
  }

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value: DealerJourneyContextValue = {
    ...state,
    setQuoteId: (quoteId) => setState((s) => ({ ...s, quoteId })),
    setVehicle: (vehicle) => setState((s) => dealerJourneyWithVehicle(s, vehicle)),
    setCustomer: (customer) => setState((s) => ({ ...s, customer })),
    setPlan: (plan) => setState((s) => ({ ...s, plan })),
    setDiscountPct: (discount_pct) => setState((s) => ({ ...s, discount_pct })),
    hydrate: (partial) => setState((s) => ({ ...s, ...partial })),
    reset: () => {
      sessionStorage.removeItem(STORAGE_KEY);
      setState(defaultState);
    },
  };

  return <DealerJourneyContext.Provider value={value}>{children}</DealerJourneyContext.Provider>;
};

export const useDealerJourney = () => {
  const ctx = useContext(DealerJourneyContext);
  if (!ctx) throw new Error('useDealerJourney must be used within DealerJourneyProvider');
  return ctx;
};

// Pricing engine — base retail prices by plan + duration (months)
// Mirrors retail rough card; final dealer price = base * (1 - discount_pct/100)
export const DEALER_BASE_PRICES: Record<DealerJourneyPlan['plan_type'], Record<number, number>> = {
  basic: { 3: 89, 12: 299, 24: 549, 36: 779 },
  gold: { 3: 119, 12: 399, 24: 729, 36: 1029 },
  platinum: { 3: 159, 12: 529, 24: 969, 36: 1369 },
};

export const DEALER_PLAN_LABELS: Record<DealerJourneyPlan['plan_type'], string> = {
  basic: 'Basic',
  gold: 'Platinum',
  platinum: 'Platinum',
};

export function calcDealerPrice(plan: DealerJourneyPlan['plan_type'], months: number, discountPct: number) {
  const retail = DEALER_BASE_PRICES[plan]?.[months] ?? 0;
  const dealer = +(retail * (1 - discountPct / 100)).toFixed(2);
  return { retail, dealer };
}
