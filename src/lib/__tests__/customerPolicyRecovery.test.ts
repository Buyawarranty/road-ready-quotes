import { describe, expect, it, vi } from 'vitest';
import { customerPolicyRecoveryHandler } from '../../../supabase/functions/_shared/customerPolicyRecovery';

const request = (body = {}) => new Request('https://example.test/recovery', {
  method: 'POST', headers: { Authorization: 'Bearer isolated-test-token', 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

describe('customer policy recovery identity', () => {
  it('recovers only the verified account email, ignoring a supplied account or sale override', async () => {
    const recover = vi.fn().mockResolvedValue(undefined);
    const authenticate = vi.fn().mockResolvedValue({ email: 'buyer@example.test', email_confirmed_at: '2026-11-24' });
    const response = await customerPolicyRecoveryHandler({ authenticate, recover })(request({
      email: 'someone-else@example.test', customer_id: 'other-sale', user_id: 'other-account', price: 1,
    }));
    expect(response.status).toBe(200);
    expect(recover).toHaveBeenCalledTimes(1);
    expect(recover).toHaveBeenCalledWith('buyer@example.test');
    expect(await response.json()).toEqual({ success: true });
  });
  it('does not recover any warranty for a signed-out request', async () => {
    const recover = vi.fn();
    const authenticate = vi.fn();
    const response = await customerPolicyRecoveryHandler({ authenticate, recover })(new Request('https://example.test/recovery', { method: 'POST' }));
    expect(response.status).toBe(401);
    expect(authenticate).not.toHaveBeenCalled();
    expect(recover).not.toHaveBeenCalled();
  });
  it('rejects an invalid session before looking up any purchase', async () => {
    const recover = vi.fn();
    const response = await customerPolicyRecoveryHandler({ authenticate: vi.fn().mockResolvedValue(null), recover })(request());
    expect(response.status).toBe(401);
    expect(recover).not.toHaveBeenCalled();
  });
  it('does not grant purchase recovery to an unconfirmed email', async () => {
    const recover = vi.fn();
    const response = await customerPolicyRecoveryHandler({
      authenticate: vi.fn().mockResolvedValue({ email: 'buyer@example.test', email_confirmed_at: null }), recover,
    })(request());
    expect(response.status).toBe(403);
    expect(recover).not.toHaveBeenCalled();
  });
  it('reports an unavailable recovery without claiming it succeeded', async () => {
    const response = await customerPolicyRecoveryHandler({
      authenticate: vi.fn().mockResolvedValue({ email: 'buyer@example.test', email_confirmed_at: '2026-11-24' }),
      recover: vi.fn().mockRejectedValue(new Error('write unavailable')),
    })(request());
    expect(response.status).toBe(503);
    expect((await response.json()).success).toBeUndefined();
  });
});