/** Dealer-facing count of the buy-one-get-one-free offer, built only from the server's eligibility figures. */
export const FREE_OFFER_CAP = 3;

export type FreeOfferFigures = { intro_offer_enabled?: boolean; intro_free_remaining?: number; intro_free_used?: number; paid_count?: number };

export type FreeOfferStatus = { ready: number; used: number; cap: number; headline: string; detail: string };

/** Returns null while the offer is off or the figures are missing, so a page never invents a count. */
export function dealerFreeOfferStatus(e: FreeOfferFigures | null | undefined): FreeOfferStatus | null {
  if (!e || !e.intro_offer_enabled) return null;
  const ready = Math.max(0, Math.min(FREE_OFFER_CAP, Number(e.intro_free_remaining ?? 0)));
  const used = Math.max(0, Math.min(FREE_OFFER_CAP, Number(e.intro_free_used ?? 0)));
  const paid = Math.max(0, Number(e.paid_count ?? 0));
  const headline = `${ready} free ${ready === 1 ? 'warranty' : 'warranties'} ready to use · ${used} of ${FREE_OFFER_CAP} used`;
  if (ready > 0) return { ready, used, cap: FREE_OFFER_CAP, headline, detail: 'Your next warranty is free — it is applied automatically at checkout.' };
  if (used >= FREE_OFFER_CAP) return { ready, used, cap: FREE_OFFER_CAP, headline, detail: `You have used all ${FREE_OFFER_CAP} free warranties from this offer.` };
  // Each free warranty needs its own paid warranty that is still active; cancelled or refunded ones stop counting.
  const needed = Math.max(1, used + 1 - Math.min(FREE_OFFER_CAP, paid));
  return { ready, used, cap: FREE_OFFER_CAP, headline, detail: `Pay for ${needed} more ${needed === 1 ? 'warranty' : 'warranties'} and the next one is free. Cancelled or refunded warranties do not count towards the offer.` };
}
