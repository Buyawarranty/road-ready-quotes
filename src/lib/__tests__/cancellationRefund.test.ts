import { describe, it, expect } from 'vitest';
import { suggestedRefund, coverMonths, isExcludedFromCancellationStats } from '../cancellationRefund';

describe('cancellation refund rules', () => {
  it('full refund within 14 days', () => {
    expect(suggestedRefund(599, '2026-01-01', '2026-01-15')).toBe(599);
  });
  it('after 14 days: unused pro-rata less 14% and £60', () => {
    // half of a 12-month £1000 cover unused → 500 * 0.86 - 60 = 370
    const start = new Date('2026-01-01T00:00:00Z');
    const cancel = new Date(start.getTime() + 182.6875 * 86400000);
    const r = suggestedRefund(1000, start, cancel, 12); expect(r).toBeGreaterThan(365); expect(r).toBeLessThan(375);
  });
  it('never negative', () => {
    expect(suggestedRefund(100, '2026-01-01', '2026-12-01')).toBe(0);
  });
  it('reads cover length', () => {
    expect(coverMonths('24months')).toBe(24);
    expect(coverMonths('3 years')).toBe(36);
    expect(coverMonths(null)).toBe(12);
  });
  it('excludes test and £0–£10 orders', () => {
    expect(isExcludedFromCancellationStats({ final_amount: 10 })).toBe(true);
    expect(isExcludedFromCancellationStats({ final_amount: 11 })).toBe(false);
    expect(isExcludedFromCancellationStats({ final_amount: 500, is_test_cancellation: true })).toBe(true);
  });
});
