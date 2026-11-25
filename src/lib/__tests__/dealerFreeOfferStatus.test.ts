import { describe, expect, it } from 'vitest';
import { dealerFreeOfferOpen, dealerFreeOfferStatus } from '../dealerFreeOfferStatus';

const on = { intro_offer_enabled: true };

describe('free warranties left', () => {
  it('shows nothing while the offer is switched off or unknown', () => {
    expect(dealerFreeOfferStatus(null)).toBeNull();
    expect(dealerFreeOfferStatus({ intro_offer_enabled: false, intro_free_remaining: 1 })).toBeNull();
  });
  it('one paid warranty gives one free warranty ready to use', () => {
    const s = dealerFreeOfferStatus({ ...on, intro_paid_count: 1, intro_free_remaining: 1, intro_free_used: 0 });
    expect(s?.ready).toBe(1);
    expect(s?.paidToEarnNext).toBe(0);
  });
  it('a new dealer needs one paid warranty to earn the first free one', () => {
    expect(dealerFreeOfferStatus({ ...on, intro_paid_count: 0, intro_free_remaining: 0, intro_free_used: 0 })?.paidToEarnNext).toBe(1);
  });
  it('the next paid warranty earns the third free even after the earlier paid cover was cancelled', () => {
    const s = dealerFreeOfferStatus({ ...on, paid_count: 0, intro_paid_count: 2, intro_free_remaining: 0, intro_free_used: 2 });
    expect(s?.paidToEarnNext).toBe(1);
    expect(s?.used).toBe(2);
  });
  it('ABC motors has one ready after four historical paid purchases and two free redemptions', () => {
    const s = dealerFreeOfferStatus({ ...on, paid_count: 1, intro_paid_count: 4, intro_free_remaining: 1, intro_free_used: 2 });
    expect(s?.ready).toBe(1);
    expect(s?.paidToEarnNext).toBe(0);
    expect(s?.cap).toBe(3);
  });
  it('never substitutes the active-credit count for a missing historical offer count', () => {
    expect(dealerFreeOfferStatus({ ...on, paid_count: 0, intro_free_remaining: 0, intro_free_used: 2 })?.paidToEarnNext).toBe(1);
  });
  it('the offer ends after three free warranties', () => {
    const s = dealerFreeOfferStatus({ ...on, intro_paid_count: 6, intro_free_remaining: 0, intro_free_used: 3 });
    expect(s?.used).toBe(3);
    expect(s?.paidToEarnNext).toBe(0);
  });
  it('offer messaging stays while a free warranty can still be earned and stops after three are used', () => {
    expect(dealerFreeOfferOpen({ paid_count: 1, intro_free_remaining: 0, intro_free_used: 2 })).toBe(true);
    expect(dealerFreeOfferOpen({ paid_count: 1, intro_free_remaining: 0, intro_free_used: 3 })).toBe(false);
  });
});
