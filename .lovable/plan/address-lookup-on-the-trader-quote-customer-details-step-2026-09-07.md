# Address lookup on the trader quote "Customer details" step

## What the trader will see

On `/dealer-portal/quote/customer` (step 2), when "Add details now" is selected:

1. A **find address box** appears above the address fields — the trader starts typing a postcode or address and matching addresses drop down (same lookup used on the main site checkout).
2. Tapping a result **auto-fills** address line 1, address line 2, town and postcode.
3. All address fields **stay editable** after auto-fill, and if the lookup is unavailable a friendly "couldn't retrieve the address — enter it manually" message appears without blocking the form.
4. Typing a valid UK postcode format shows a green tick even when the lookup is down.

No changes to the "Send details later" flow or to step 4.

## How it works

- Reuse the existing `AddressAutocomplete` component (`src/components/ui/address-autocomplete.tsx`), which already calls the `getaddress-lookup` edge function (getaddress.io autocomplete + full-address fetch) — the same API the checkout address lookup uses.
- In `src/pages/dealer-portal/journey/Step2Customer.tsx`, render `AddressAutocomplete` above the address fields in the "Add details now" panel; `onAddressSelect` fills `address_line1`, `address_line2`, `town`, `postcode` in the existing form state.
- Style it to match the dealer journey inputs (white background, gray borders, orange focus ring) via the existing `className` prop.
- Validation rules are unchanged: the fields it fills are the same ones already required on submit.

## Technical notes

- No new edge functions, no database changes, no new secrets — `getaddress-lookup` and `GETADDRESS_API_KEY` already exist.
- Only file touched: `src/pages/dealer-portal/journey/Step2Customer.tsx`.
