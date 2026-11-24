import type { DealerJourneyState, DealerJourneyVehicle } from '@/contexts/DealerJourneyContext';

export const DEALER_NEW_QUOTE_URL = '/dealer-portal/quote/pricing?new=1';
export const EDITABLE_DEALER_QUOTE_STATUSES = ['draft', 'pending', 'quoted', 'awaiting_panda'];

export const emptyDealerJourney = (): DealerJourneyState => ({
  quoteId: null, vehicle: null, customer: null, plan: null, discount_pct: 0,
});

export function isNewDealerQuote(pathname: string, search: string): boolean {
  return pathname.replace(/\/$/, '') === '/dealer-portal/quote/pricing'
    && new URLSearchParams(search).get('new') === '1';
}

export function dealerJourneyWithVehicle(state: DealerJourneyState, vehicle: DealerJourneyVehicle): DealerJourneyState {
  const plate = (reg: string) => reg.replace(/\s+/g, '').toUpperCase();
  if (state.vehicle && plate(state.vehicle.reg) !== plate(vehicle.reg)) {
    return { ...state, vehicle, quoteId: null, customer: null, plan: null };
  }
  return { ...state, vehicle };
}

export function isEditableDealerQuote(status: string | null | undefined): boolean {
  return EDITABLE_DEALER_QUOTE_STATUSES.includes(String(status || '').toLowerCase());
}