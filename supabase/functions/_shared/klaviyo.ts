// Server-side Klaviyo sync, matching the Buy A Warranty implementation.
// Nothing is sent until the KLAVIYO_PRIVATE_API_KEY secret is set, and a
// Klaviyo failure never reaches the calling function (fire-and-forget).
const KLAVIYO_BASE_URL = 'https://a.klaviyo.com';
const KLAVIYO_REVISION = '2026-10-15';
const DEFAULT_SOURCE = 'pandaprotect.co.uk';

type JsonProperties = Record<string, unknown>;

export interface KlaviyoEventInput {
  metricName: 'Started Checkout' | 'Placed Order' | 'Subscribed to Newsletter' | 'Submitted Trade Application';
  email: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  value?: number | null;
  valueCurrency?: string;
  properties?: JsonProperties;
  profileProperties?: JsonProperties;
  uniqueId?: string;
  time?: string;
}

export interface KlaviyoSubscriptionInput {
  email: string;
  listId?: string;
  customSource?: string;
}

const cleanText = (value?: string | null) => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Klaviyo requires E.164. Convert the UK formats collected by the site. */
export function klaviyoPhoneNumber(value?: string | null): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const compact = raw.replace(/[\s()-]/g, '');
  let normalized = compact;
  if (/^0\d{10}$/.test(compact)) normalized = `+44${compact.slice(1)}`;
  else if (/^44\d{10}$/.test(compact)) normalized = `+${compact}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : undefined;
}

/** Split "Jane Smith" into first/last for Klaviyo profiles. */
export function splitName(full?: string | null): { firstName?: string; lastName?: string } {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  return { firstName: parts[0], lastName: parts.length > 1 ? parts.slice(1).join(' ') : undefined };
}

function queueRequest(path: string, apiKey: string, body: unknown, label: string) {
  const request = (async () => {
    try {
      const response = await fetch(`${KLAVIYO_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Klaviyo-API-Key ${apiKey}`,
          revision: KLAVIYO_REVISION,
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
        },
        body: JSON.stringify(body),
      });
      // Always consume the response body in the Edge runtime.
      await response.text();
      if (!response.ok) console.warn(`[Klaviyo] ${label} returned HTTP ${response.status}`);
    } catch (error) {
      console.warn(`[Klaviyo] ${label} failed (non-blocking)`, error instanceof Error ? error.message : String(error));
    }
  })();

  try {
    const runtime = (globalThis as typeof globalThis & {
      EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
    }).EdgeRuntime;
    if (runtime?.waitUntil) runtime.waitUntil(request);
  } catch (error) {
    console.warn('[Klaviyo] Could not register background work', error instanceof Error ? error.message : String(error));
  }
}

/** Fire-and-forget: this function never waits for Klaviyo and never throws to its caller. */
export function trackKlaviyoEvent(input: KlaviyoEventInput): void {
  try {
    const apiKey = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
    if (!apiKey) {
      console.warn(`[Klaviyo] ${input.metricName} skipped: KLAVIYO_PRIVATE_API_KEY is not configured`);
      return;
    }
    const email = input.email.trim().toLowerCase();
    if (!validEmail(email)) {
      console.warn(`[Klaviyo] ${input.metricName} skipped: a valid email is required`);
      return;
    }

    const profileAttributes: Record<string, unknown> = { email };
    const phone = klaviyoPhoneNumber(input.phone);
    const firstName = cleanText(input.firstName);
    const lastName = cleanText(input.lastName);
    if (phone) profileAttributes.phone_number = phone;
    if (firstName) profileAttributes.first_name = firstName;
    if (lastName) profileAttributes.last_name = lastName;
    if (input.profileProperties && Object.keys(input.profileProperties).length) {
      profileAttributes.properties = input.profileProperties;
    }

    const attributes: Record<string, unknown> = {
      properties: input.properties || {},
      time: input.time || new Date().toISOString(),
      metric: { data: { type: 'metric', attributes: { name: input.metricName } } },
      profile: { data: { type: 'profile', attributes: profileAttributes } },
    };
    if (typeof input.value === 'number' && Number.isFinite(input.value)) {
      attributes.value = input.value;
      if (input.valueCurrency) attributes.value_currency = input.valueCurrency;
    }
    if (cleanText(input.uniqueId)) attributes.unique_id = cleanText(input.uniqueId);

    queueRequest('/api/events', apiKey, { data: { type: 'event', attributes } }, input.metricName);
  } catch (error) {
    console.warn('[Klaviyo] Event setup failed (non-blocking)', error instanceof Error ? error.message : String(error));
  }
}

/** Record email marketing consent. Only call this when the person opted in. */
export function subscribeKlaviyoProfile(input: KlaviyoSubscriptionInput): void {
  try {
    const apiKey = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
    if (!apiKey) {
      console.warn('[Klaviyo] Marketing consent skipped: KLAVIYO_PRIVATE_API_KEY is not configured');
      return;
    }
    const email = input.email.trim().toLowerCase();
    if (!validEmail(email)) {
      console.warn('[Klaviyo] Marketing consent skipped: a valid email is required');
      return;
    }

    const attributes: Record<string, unknown> = {
      custom_source: cleanText(input.customSource) || `${DEFAULT_SOURCE} newsletter`,
      profiles: {
        data: [{
          type: 'profile',
          attributes: {
            email,
            subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } },
          },
        }],
      },
    };
    const resource: Record<string, unknown> = { type: 'profile-subscription-bulk-create-job', attributes };
    const listId = cleanText(input.listId);
    if (listId) resource.relationships = { list: { data: { type: 'list', id: listId } } };

    queueRequest('/api/profile-subscription-bulk-create-jobs', apiKey, { data: resource }, 'Marketing consent');
  } catch (error) {
    console.warn('[Klaviyo] Consent setup failed (non-blocking)', error instanceof Error ? error.message : String(error));
  }
}
