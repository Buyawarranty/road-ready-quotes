# Make the Worldpay payment page painless

The screen in the screenshot is Worldpay's own hosted page — we can't restyle its markup, but we can stop it from asking for anything we already hold. When billing details are sent with the payment request, Worldpay renders the page with those fields prefilled, so the payer only types card number, expiry and CVV. The gap today: the dealer profile doesn't store an address at all, so there's nothing to prefill from.

## What changes

1. **Add the missing billing fields to the dealer profile**
   `dealers` currently holds name, company, trading name, email, phone, FCA number — no address. Add: first name / last name (split for Worldpay), address 1, address 2, town/city, county (State/Region), postcode, country (default GB). These map 1:1 to the Worldpay billing form so nothing is left blank.

2. **Collect them at signup and let dealers edit them later**
   - Dealer signup form: add an address block (address 1, address 2, town, county, postcode, country) with light validation on postcode and required address 1 / town / postcode.
   - Dealer account/settings page: same fields, editable at any time so a dealer can correct or update their billing address.
   - Existing dealers with no address on file are prompted once (inline block at checkout) and the answer is saved back to their profile.

3. **Prefill Worldpay from the profile, always overridable**
   At checkout the billing block is prefilled from the dealer profile (or the quote's customer when the customer is the payer). Every field stays editable inline — edits apply to this payment and can optionally be saved back to the profile via a "Save to my profile" checkbox.

4. **Send the billing details with the payment request**
   The Worldpay page is then created with a complete `billingAddress`, so the customer sees a card-only page instead of the empty ten-field form.

5. **Same prefill everywhere Worldpay is used**
   Dealer quote checkout, the admin virtual terminal / pay-by-link panel, and admin invoice payment links all send the same billing payload from the dealer or customer record they already load.

## Technical notes

- Migration on `public.dealers`: add nullable `first_name`, `last_name`, `address_line1`, `address_line2`, `city`, `county`, `postcode`, `country_code` (default `'GB'`). Nullable so existing rows are unaffected; existing RLS/grants unchanged.
- `supabase/functions/worldpay-create-payment-page/index.ts`: accept an optional `billing` object and include it as `billingAddress` (plus customer identifiers) in the `/payment_pages` body — sanitised and length-capped like the existing narrative field, with empty fields omitted so the request never fails validation.
- `src/pages/dealer-portal/DealerSignup.tsx` and the dealer account page: new address fields written to `dealers`.
- `src/hooks/useDealerAuth.tsx`: extend `DealerProfile` with the new columns so checkout can read them.
- `src/pages/dealer-portal/journey/Step4Checkout.tsx`: prefilled, editable billing block sourced from the profile with fallback to the journey customer; optional save-back to profile.
- `src/components/admin/WorldpayPaymentPanel.tsx` and `src/pages/dealer-admin/DealerAdminInvoices.tsx`: pass the same billing shape.
- Worldpay's own page styling (fonts, colours, logo) is configured in the Worldpay dashboard, not via API — a separate job if you want it brand-matched.

## Note on the fully-branded alternative

Worldpay also offers embedded card fields (card number/expiry/CVV rendered inside our own page, still PCI-safe). That removes the redirect and gives us full design control, but it's a different integration and needs enabling on the account. Say the word if you'd prefer that over prefilling the hosted page.
