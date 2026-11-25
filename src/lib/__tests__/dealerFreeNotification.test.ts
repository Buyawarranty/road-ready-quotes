import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForDealerFreeNotification } from '../../../supabase/functions/_shared/dealerFreeNotification';

afterEach(() => vi.useRealTimers());
describe('free-warranty receipt does not hold up issued cover', () => {
  it('reports a completed receipt as sent', async () => {
    expect(await waitForDealerFreeNotification(Promise.resolve({ sent: true }))).toEqual({ sent: true });
  });
  it('reports failed delivery without rejecting the issued warranty', async () => {
    expect(await waitForDealerFreeNotification(Promise.reject(new Error('Email unavailable')))).toMatchObject({ sent: false });
  });
  it('returns after the deadline while keeping the receipt work alive', async () => {
    vi.useFakeTimers();
    let finish: ((result: { sent: boolean }) => void) | undefined;
    const delivery = new Promise<{ sent: boolean }>(resolve => { finish = resolve; });
    const keepAlive = vi.fn();
    const result = waitForDealerFreeNotification(delivery, keepAlive, 5000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await result).toMatchObject({ sent: false });
    expect(keepAlive).toHaveBeenCalledOnce();
    finish?.({ sent: true });
    expect(await keepAlive.mock.calls[0][0]).toEqual({ sent: true });
  });
});