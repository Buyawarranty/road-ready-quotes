import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { klaviyoPhoneNumber, splitName, subscribeKlaviyoProfile, trackKlaviyoEvent } from './klaviyo';
import { trackDealerCheckoutKlaviyo, trackDealerSaleKlaviyo } from './klaviyoDealer';

const secrets: Record<string, string | undefined> = {};
const testGlobal = globalThis as typeof globalThis & { Deno?: unknown };
const originalDeno = testGlobal.Deno;
const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

beforeEach(() => {
  secrets.KLAVIYO_PRIVATE_API_KEY = 'test-private-key';
  testGlobal.Deno = { env: { get: (name: string) => secrets[name] } };
  console.warn = () => {};
});

afterEach(() => {
  testGlobal.Deno = originalDeno;
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  delete secrets.KLAVIYO_PRIVATE_API_KEY;
});

const okFetch = () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

/** Minimal stand-in for the Supabase admin client used by klaviyoDealer. */
function fakeAdmin(rows: { customers?: Record<string, unknown> | null; dealers?: Record<string, unknown> | null }) {
  return {
    from(table: 'customers' | 'dealers') {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
      };
      return query;
    },
  };
}

describe('Klaviyo server-side sync (same as Buy A Warranty)', () => {
  it('builds the exact event JSON:API body and authentication headers', () => {
    const fetchMock = okFetch();
    trackKlaviyoEvent({
      metricName: 'Placed Order', email: ' Dealer@Example.com ', phone: '07960 123 456',
      firstName: 'Jane', lastName: 'Smith', value: 349, valueCurrency: 'GBP',
      uniqueId: 'pandaprotect:sale:abc', time: '2026-11-22T00:00:00+00:00',
      properties: { plan_type: 'platinum', vehicle_reg: 'AB12 CDE' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://a.klaviyo.com/api/events');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Klaviyo-API-Key test-private-key',
      revision: '2026-10-15',
      'Content-Type': 'application/vnd.api+json',
    });
    expect(JSON.parse(init.body)).toEqual({
      data: {
        type: 'event',
        attributes: {
          properties: { plan_type: 'platinum', vehicle_reg: 'AB12 CDE' },
          time: '2026-11-22T00:00:00+00:00',
          value: 349,
          value_currency: 'GBP',
          unique_id: 'pandaprotect:sale:abc',
          metric: { data: { type: 'metric', attributes: { name: 'Placed Order' } } },
          profile: { data: { type: 'profile', attributes: {
            email: 'dealer@example.com', phone_number: '+447960123456', first_name: 'Jane', last_name: 'Smith',
          } } },
        },
      },
    });
  });

  it('uses the official bulk-consent schema with a Panda Protect source and optional list', () => {
    const fetchMock = okFetch();
    subscribeKlaviyoProfile({ email: 'dealer@example.com', listId: 'Y6nRLr' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs');
    const body = JSON.parse(init.body);
    expect(body.data.attributes.custom_source).toBe('pandaprotect.co.uk newsletter');
    expect(body.data.attributes.profiles.data[0].attributes.subscriptions.email.marketing.consent).toBe('SUBSCRIBED');
    expect(body.data.relationships).toEqual({ list: { data: { type: 'list', id: 'Y6nRLr' } } });
  });

  it('missing key is a clean no-op', () => {
    delete secrets.KLAVIYO_PRIVATE_API_KEY;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    expect(() => trackKlaviyoEvent({ metricName: 'Started Checkout', email: 'dealer@example.com' })).not.toThrow();
    expect(() => subscribeKlaviyoProfile({ email: 'dealer@example.com' })).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('network failures never throw past the caller', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Klaviyo unavailable'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    expect(() => trackKlaviyoEvent({ metricName: 'Placed Order', email: 'dealer@example.com' })).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalises phones and names', () => {
    expect(klaviyoPhoneNumber('07960 123 456')).toBe('+447960123456');
    expect(klaviyoPhoneNumber('not-a-phone')).toBeUndefined();
    expect(splitName(' Jane  van Smith ')).toEqual({ firstName: 'Jane', lastName: 'van Smith' });
    expect(splitName('')).toEqual({});
  });
});

describe('Panda Protect dealer events', () => {
  const dealer = { id: 'd1', email: 'sales@motors.co.uk', name: 'Sam Trader', phone: '07700900123', company_name: 'Motors Ltd', is_test: false };
  const sale = { id: 'w1', dealer_id: 'd1', registration_plate: 'AB12CDE', plan_type: 'platinum', payment_type: '12', final_amount: 299, is_test: false };

  it('Placed Order goes to the dealer profile, keyed per warranty, without end-customer contact data', async () => {
    const fetchMock = okFetch();
    await trackDealerSaleKlaviyo(fakeAdmin({ customers: { ...sale, email: 'endcustomer@example.com' }, dealers: dealer }), 'w1', 'invoice');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body).data.attributes;
    expect(body.metric.data.attributes.name).toBe('Placed Order');
    expect(body.unique_id).toBe('pandaprotect:sale:w1');
    expect(body.value).toBe(299);
    expect(body.profile.data.attributes.email).toBe('sales@motors.co.uk');
    expect(body.profile.data.attributes.properties.company_name).toBe('Motors Ltd');
    expect(JSON.stringify(body)).not.toContain('endcustomer@example.com');
    expect(body.properties.sale_method).toBe('invoice');
  });

  it('never syncs test sales or test dealers', async () => {
    const fetchMock = okFetch();
    await trackDealerSaleKlaviyo(fakeAdmin({ customers: { ...sale, is_test: true }, dealers: dealer }), 'w1', 'paid');
    await trackDealerSaleKlaviyo(fakeAdmin({ customers: sale, dealers: { ...dealer, is_test: true } }), 'w1', 'paid');
    trackDealerCheckoutKlaviyo({ ...dealer, is_test: true }, { sessionId: 's1', customerId: 'w1', amount: 299 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Started Checkout is keyed per Stripe session', () => {
    const fetchMock = okFetch();
    trackDealerCheckoutKlaviyo(dealer, { sessionId: 'cs_1', customerId: 'w1', amount: 299, planType: 'platinum', coverMonths: 12, vehicleReg: 'AB12CDE' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body).data.attributes;
    expect(body.metric.data.attributes.name).toBe('Started Checkout');
    expect(body.unique_id).toBe('pandaprotect:checkout:cs_1');
    expect(body.profile.data.attributes.first_name).toBe('Sam');
  });

  it('a database failure never throws', async () => {
    okFetch();
    const broken = { from: () => { throw new Error('db down'); } };
    await expect(trackDealerSaleKlaviyo(broken, 'w1', 'paid')).resolves.toBeUndefined();
  });
});
