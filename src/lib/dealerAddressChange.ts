import type { BillingAddress } from '@/lib/dealerBilling';

export type AddressRequest = Pick<BillingAddress, 'address1' | 'address2' | 'city' | 'county' | 'postal_code' | 'country_code'>;

export const toAddressRequest = (b: BillingAddress): AddressRequest => ({
  address1: b.address1.trim(), address2: b.address2.trim(), city: b.city.trim(),
  county: b.county.trim(), postal_code: b.postal_code.trim().toUpperCase(), country_code: b.country_code || 'GB',
});

/** Readable one-line address from a stored request value (JSON) or plain text. */
export function formatAddressValue(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const a = JSON.parse(value) as Partial<AddressRequest>;
    return [a.address1, a.address2, a.city, a.county, a.postal_code, a.country_code].filter(Boolean).join(', ') || '—';
  } catch { return value; }
}
