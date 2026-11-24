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

export function isEditableDealerQuote(status: string | null | undefined, paidAt?: string | null): boolean {
  return !paidAt && EDITABLE_DEALER_QUOTE_STATUSES.includes(String(status || '').toLowerCase());
}

/** Only resume internal dealer pages, preserving fresh-sale/payment query parameters. */
export function dealerLoginTarget(redirect: string | null, registration?: string | null): string {
  const origin = 'https://pandaprotect.co.uk';
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//') || /[\\\r\n]/.test(redirect)) return '/dealer-portal/dashboard';
  try {
    const target = new URL(redirect, origin);
    const path = target.pathname.replace(/\/$/, '');
    if (target.origin !== origin || !path.startsWith('/dealer-portal/') || path === '/dealer-portal/login' || path === '/dealer-portal/signup') return '/dealer-portal/dashboard';
    if (registration && !target.searchParams.has('reg')) target.searchParams.set('reg', registration);
    return target.pathname + target.search + target.hash;
  } catch {
    return '/dealer-portal/dashboard';
  }
}