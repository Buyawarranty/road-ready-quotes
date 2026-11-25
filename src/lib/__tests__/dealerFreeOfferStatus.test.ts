import { describe, expect, it } from 'vitest';
import { dealerFreeOfferOpen, dealerFreeOfferStatus } from '../dealerFreeOfferStatus';

const on = { intro_offer_enabled: true };

describe('free warranties left', () => {
  it('shows nothing while the offer is switched off or unknown', () => {
    expect(dealerFreeOfferStatus(null)).toBeNull();
    expect(dealerFreeOfferStatus({ intro_offer_enabled: false, intro_free_remaining: 1 })).toBeNull();
  });
  it('one paid warranty gives one free warranty ready to use', () => {
    const s = dealerFreeOfferStatus({ ...on, paid_count: 1, intro_free_remaining: 1, intro_free_used: 0 })!;
    expect(s.ready).toBe(1);
    expect(s.headline).toBe('1 free warranty ready to use · 0 of 3 used');
  });
  it('a new dealer needs one paid warranty to earn the first free one', () => {
    expect(dealerFreeOfferStatus({ ...on, paid_count: 0, intro_free_remaining: 0, intro_free_used: 0 })!.detail).toContain('Pay for 1 more warranty');
  });
  it('cancelled paid warranties stop counting: one active paid and two free used needs two more', () => {
    const s = dealerFreeOfferStatus({ ...on, paid_count: 1, intro_free_remaining: 0, intro_free_used: 2 })!;
    expect(s.headline).toBe('0 free warranties ready to use · 2 of 3 used');
    expect(s.detail).toContain('Pay for 2 more warranties');
  });
  it('the offer ends after three free warranties', () => {
    expect(dealerFreeOfferStatus({ ...on, paid_count: 6, intro_free_remaining: 0, intro_free_used: 3 })!.detail).toContain('used all 3');
  });
  it('offer messaging stays while a free warranty can still be earned and stops after three are used', () => {
    expect(dealerFreeOfferOpen({ paid_count: 1, intro_free_remaining: 0, intro_free_used: 2 })).toBe(true);
    expect(dealerFreeOfferOpen({ paid_count: 1, intro_free_remaining: 0, intro_free_used: 3 })).toBe(false);
  });
});
