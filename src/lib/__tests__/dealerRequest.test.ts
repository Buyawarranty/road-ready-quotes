import { describe, expect, it } from 'vitest';
import { dealerRequest } from '../dealerRequest';

describe('dealer request recovery', () => {
  it('returns the successful response unchanged', async () => {
    expect(await dealerRequest(async () => ({ confirmed: true }), 'Timed out', 20)).toEqual({ confirmed: true });
  });
  it('releases a stalled request and aborts it without retrying', async () => {
    let attempts = 0;
    let signal: AbortSignal | undefined;
    await expect(dealerRequest(s => { attempts++; signal = s; return new Promise(() => {}); }, 'Check payment before retrying', 5)).rejects.toThrow('Check payment before retrying');
    expect(signal?.aborted).toBe(true);
    expect(attempts).toBe(1);
  });
  it('preserves an immediate request error', async () => {
    await expect(dealerRequest(async () => { throw new Error('Network unavailable'); }, 'Timed out', 20)).rejects.toThrow('Network unavailable');
  });
});