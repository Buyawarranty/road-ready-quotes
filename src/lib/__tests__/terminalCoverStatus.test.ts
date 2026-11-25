import { describe, expect, it } from 'vitest';
import { isTerminalCoverStatus } from '../../../supabase/functions/_shared/terminalCoverStatus';

describe('terminal cover activation guard', () => {
  it('blocks the cancelled FP14UBL warranty from activation or active-cover receipts', () => {
    expect(isTerminalCoverStatus('Cancelled')).toBe(true);
    expect(isTerminalCoverStatus(' cancelled ')).toBe(true);
  });
  it('keeps refunds and expiry terminal', () => {
    expect(isTerminalCoverStatus('Refunded')).toBe(true);
    expect(isTerminalCoverStatus('expired')).toBe(true);
  });
  it('allows separate active or scheduled replacement cover', () => {
    expect(isTerminalCoverStatus('Active')).toBe(false);
    expect(isTerminalCoverStatus('scheduled')).toBe(false);
  });
});