// Shared billing-address shape used to prefill the Worldpay hosted payment page.
// Worldpay's hosted page asks for first/last name, address 1-3, town, region,
// postcode and country — sending these means the payer only types card details.

export interface BillingAddress {
  first_name: string;
  last_name: string;
  address1: string;
  address2: string;
  city: string;
  county: string;
  postal_code: string;
  country_code: string;
}

export const EMPTY_BILLING: BillingAddress = {
  first_name: '',
  last_name: '',
  address1: '',
  address2: '',
  city: '',
  county: '',
  postal_code: '',
  country_code: 'GB',
};

const splitName = (full?: string | null) => {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
};

/** Build a billing address from a dealer profile row. */
export function billingFromDealer(dealer: any | null | undefined): BillingAddress {
  if (!dealer) return { ...EMPTY_BILLING };
  const fallback = splitName(dealer.name);
  return {
    first_name: dealer.first_name || fallback.first,
    last_name: dealer.last_name || fallback.last,
    address1: dealer.address_line1 || '',
    address2: dealer.address_line2 || '',
    city: dealer.city || '',
    county: dealer.county || '',
    postal_code: dealer.postcode || '',
    country_code: dealer.country_code || 'GB',
  };
}

/** Build a billing address from a journey/quote customer, filling gaps from the dealer. */
export function billingFromCustomer(
  customer: any | null | undefined,
  dealer?: any | null,
): BillingAddress {
  const base = billingFromDealer(dealer);
  if (!customer) return base;
  const nm = splitName(customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`);
  return {
    first_name: customer.first_name || nm.first || base.first_name,
    last_name: customer.last_name || nm.last || base.last_name,
    address1: customer.address_line1 || customer.address || base.address1,
    address2: customer.address_line2 || base.address2,
    city: customer.town || customer.city || base.city,
    county: customer.county || base.county,
    postal_code: customer.postcode || base.postal_code,
    country_code: customer.country_code || base.country_code || 'GB',
  };
}

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function billingErrors(b: BillingAddress): Partial<Record<keyof BillingAddress, string>> {
  const errors: Partial<Record<keyof BillingAddress, string>> = {};
  if (!b.address1.trim()) errors.address1 = 'Address line 1 is required';
  if (!b.city.trim()) errors.city = 'Town or city is required';
  if (!b.postal_code.trim()) errors.postal_code = 'Postcode is required';
  else if (b.country_code === 'GB' && !UK_POSTCODE_RE.test(b.postal_code.trim())) {
    errors.postal_code = 'Enter a valid UK postcode';
  }
  if (!b.country_code.trim()) errors.country_code = 'Country is required';
  return errors;
}

export const isBillingComplete = (b: BillingAddress) => Object.keys(billingErrors(b)).length === 0;

/** Map a billing address onto the `dealers` table columns. */
export const billingToDealerColumns = (b: BillingAddress) => ({
  first_name: b.first_name.trim() || null,
  last_name: b.last_name.trim() || null,
  address_line1: b.address1.trim() || null,
  address_line2: b.address2.trim() || null,
  city: b.city.trim() || null,
  county: b.county.trim() || null,
  postcode: b.postal_code.trim().toUpperCase() || null,
  country_code: b.country_code || 'GB',
});

export const COUNTRY_OPTIONS = [
  { code: 'GB', label: 'United Kingdom' },
  { code: 'IE', label: 'Ireland' },
];
