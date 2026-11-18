import { describe, it, expect } from 'vitest';
import { formatActivityTime, dealerPageLabel } from '../dealerActivityLabel';
describe('dealer activity', () => {
  it('formats like 10:03am 8Aug26 (UK time)', () => {
    expect(formatActivityTime('2026-08-08T09:03:00Z')).toBe('10:03am 8Aug26');
  });
  it('labels pages', () => {
    expect(dealerPageLabel('/dealer-portal/quote/pricing/')).toBe('Quote – pricing');
  });
});
