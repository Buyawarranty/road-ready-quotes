export interface DealerPortalUsage {
  dealer_id: string;
  last_sign_in_at: string | null;
  quote_count: number;
  warranty_count: number;
  last_activity_at: string | null;
}

export type PortalStage = 'signed_up' | 'link_sent' | 'logged_in' | 'first_quote' | 'first_warranty';

export const PORTAL_STAGE_LABEL: Record<PortalStage, string> = {
  signed_up: 'Signed up',
  link_sent: 'Link sent',
  logged_in: 'Login created',
  first_quote: 'First quote',
  first_warranty: 'First warranty sold',
};

export const ACTIVE_DAYS = 30;
export const READY_DAYS = 14;
const DAY = 86400000;

export function portalStage(dealerId: string | null | undefined, usage?: DealerPortalUsage | null): PortalStage {
  if (!dealerId) return 'signed_up';
  if (!usage) return 'link_sent';
  if (usage.warranty_count > 0) return 'first_warranty';
  if (usage.quote_count > 0) return 'first_quote';
  if (usage.last_sign_in_at) return 'logged_in';
  return 'link_sent';
}

const age = (iso: string | null, now: number) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isFinite(t) ? now - t : Infinity;
};

/** Active on portal = sign-in, quote update or warranty update in the last 30 days. */
export const isActiveOnPortal = (usage?: DealerPortalUsage | null, now = Date.now()) =>
  !!usage && age(usage.last_activity_at, now) <= ACTIVE_DAYS * DAY;

/** Ready for follow-up = signed in within 14 days but has not sold a warranty yet. */
export const isReadyForFollowUp = (usage?: DealerPortalUsage | null, now = Date.now()) =>
  !!usage && usage.warranty_count === 0 && age(usage.last_sign_in_at, now) <= READY_DAYS * DAY;

/** Newest sign-in among ready dealers; the bar reappears only when this is newer than the dismissal. */
export const newestReadySignIn = (list: (DealerPortalUsage | undefined)[], now = Date.now()) =>
  list.filter(u => isReadyForFollowUp(u, now)).reduce<string | null>((max, u) =>
    (!max || new Date(u!.last_sign_in_at!).getTime() > new Date(max).getTime() ? u!.last_sign_in_at : max), null);

export const shouldShowFollowUpBar = (newest: string | null, dismissedAt: string | null) =>
  !!newest && (!dismissedAt || new Date(newest).getTime() > new Date(dismissedAt).getTime());
