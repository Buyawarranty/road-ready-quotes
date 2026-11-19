import { describe, expect, it } from 'vitest';
import { formatDealerCancellationReason, dealerCancellationReasonMatches, showDealerProfileReminder } from '../dealerCancellationReasons';

describe('dealer cancellation reasons', () => {
  it('accepts a selected reason and preserves optional details', () => {
    expect(formatDealerCancellationReason('Sold the vehicle', ' Dealer confirmed ')).toBe('Sold the vehicle: Dealer confirmed');
  });
  it('requires details for another reason', () => {
    expect(formatDealerCancellationReason('Other reason', '')).toBeNull();
    expect(formatDealerCancellationReason('Other reason', 'Duplicate cover')).toBe('Other reason: Duplicate cover');
  });
  it('filters reasons with details without matching unrelated reasons', () => {
    expect(dealerCancellationReasonMatches('Sold the vehicle: Confirmed', 'Sold the vehicle')).toBe(true);
    expect(dealerCancellationReasonMatches('No longer needed', 'Sold the vehicle')).toBe(false);
  });
  it('keeps company-change reminders out of cancellation pages', () => {
    expect(showDealerProfileReminder('dealer-cancellations')).toBe(false);
    expect(showDealerProfileReminder('cancellations')).toBe(false);
    expect(showDealerProfileReminder('dealer-dealers')).toBe(true);
  });
});