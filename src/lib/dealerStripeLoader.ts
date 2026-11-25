import type { Stripe } from '@stripe/stripe-js';

/** Called only after a non-free checkout returns an embedded card session. */
export async function loadDealerCardStripe(key: string): Promise<Stripe | null> {
  if (!key) return null;
  const { loadStripe } = await import('@stripe/stripe-js/pure');
  return loadStripe(key);
}