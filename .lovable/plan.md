# Make the Worldpay payment page painless

The screen in the screenshot is Worldpay's own hosted page — we can't restyle its markup, but we can stop it from asking for anything the customer/dealer has already given us. When billing details are sent with the payment request, Worldpay renders the page with those fields prefilled (and the collapsed "Billing address" panel already satisfied), so in most cases the customer only types card number, expiry and CVV.

## What changes

1. **Prefill billing details on every Worldpay request**
   Send first name, last name, address lines, town, postcode and country (GB) plus email/phone along with the amount, so the hosted page opens with the billing address already filled and collapsed.

2. **Source the data automatically per flow**
   - Dealer quote checkout: use the customer captured in Step 2 (name, address 1, address 2, town, postcode), falling back to the dealer's own account details when the customer address is blank.
   - Admin virtual terminal / pay-by-link panel: pass through whatever customer record is in context; where a panel currently has no address, add the option to pass one in.
   - Admin invoice payment links: prefill from the dealer's registered billing details.

3. **Only ask for what's missing**
   If a required billing field (address 1, town, postcode) is empty before we call Worldpay, show a small inline "Confirm billing address" block in our own UI — same styling as the rest of the dealer forms, with postcode-style validation — instead of letting Worldpay's bare form ask for it. Once complete, the hosted page has nothing left to collect.

4. **Tidy our side of the handoff**
   - Clear payment summary (plan, reg, amount inc VAT) shown above the "Continue to Worldpay" action so the hosted page is the last step, not a surprise.
   - Keep the existing success/cancel return URLs and the pending-status polling untouched.

## Technical notes

- `supabase/functions/worldpay-create-payment-page/index.ts`: accept an optional `billing` object (`first_name`, `last_name`, `address1`, `address2`, `city`, `postal_code`, `country_code`) and include it as `billingAddress` (plus `customer`/`shopper` identifiers) in the `/payment_pages` request body. Values are sanitised and length-capped like the existing narrative field; missing fields are simply omitted so the request never fails validation.
- `src/pages/dealer-portal/journey/Step4Checkout.tsx`: build `billing` from `DealerJourneyContext.customer`, falling back to `useDealerAuth().dealer`, and gate submission on the three required fields with an inline confirm block.
- `src/components/admin/WorldpayPaymentPanel.tsx` and `src/pages/dealer-admin/DealerAdminInvoices.tsx`: pass the same `billing` shape from the records they already load.
- Worldpay's hosted page styling itself (fonts, colours, logo) is configured in the Worldpay dashboard, not via API — worth doing separately if you want it brand-matched.

## Note on the "hidden" alternative

Worldpay also offers an embedded card-fields component (card number/expiry/CVV rendered inside our page, PCI-safe). That would remove the redirect entirely and let us control the whole design, but it's a different integration and needs the card-payments API enabling on the account. Say the word if you'd rather go that route than prefilling the hosted page.
