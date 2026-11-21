import { describe, expect, it } from 'vitest';
import { assertDealerStripeMode, dealerStripeSecret, dealerStripeSecretName, dealerUsesEmbeddedStripe } from '../../../supabase/functions/_shared/dealerStripeMode';

describe('test dealer Stripe isolation', () => {
  it('routes test dealers to the saved test key', () => {
    expect(dealerStripeSecretName(true)).toBe('STRIPE_TEST_SECRET_KEY');
  });
  it('leaves live dealers on the live key', () => {
    expect(dealerStripeSecretName(false)).toBe('STRIPE_SECRET_KEY');
    expect(dealerStripeSecretName(null)).toBe('STRIPE_SECRET_KEY');
  });
  it('never falls back to live payments when the test key is absent', () => {
    const names: string[] = [];
    expect(() => dealerStripeSecret(true, name => { names.push(name); return undefined; })).toThrow('Test card payments');
    expect(names).toEqual(['STRIPE_TEST_SECRET_KEY']);
  });
  it('rejects a live credential configured for test checkout', () => {
    expect(() => dealerStripeSecret(true, () => 'invalid-configuration')).toThrow('configuration needs updating');
  });
  it('uses hosted test checkout instead of the live embedded card form', () => {
    expect(dealerUsesEmbeddedStripe(true, true)).toBe(false);
    expect(dealerUsesEmbeddedStripe(false, true)).toBe(true);
  });
  it('accepts test payments only for test dealers', () => {
    expect(() => assertDealerStripeMode(true, false)).not.toThrow();
    expect(() => assertDealerStripeMode(false, false)).toThrow('Payment mode');
  });
  it('accepts live payments only for live dealers', () => {
    expect(() => assertDealerStripeMode(false, true)).not.toThrow();
    expect(() => assertDealerStripeMode(true, true)).toThrow('Payment mode');
  });
});