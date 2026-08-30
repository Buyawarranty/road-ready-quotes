# On-brand embedded Worldpay checkout

Replace the redirect to Worldpay's hosted payment page with card fields rendered inside our own UI. Card number, expiry and CVV still live in Worldpay-hosted iframes (required for PCI SAQ-A), but every label, button, error and loading state is ours.

## What I verified against Worldpay's current docs

- Web SDK script: `https://try.access.worldpay.com/access-checkout/v2/checkout.js` (sandbox) / `https://access.worldpay.com/...` (live), initialised with `Worldpay.checkout.init({ id, form, fields, styles })` and `checkout.generateSessionState(cb)`.
- The SDK returns short-lived `session` references (valid one minute, single use).
- Card Payments API v7 authorizes with `paymentInstrument.type = "card/checkout"` plus `tokenHref` and `cvcHref` — not the hosted-page `card/front` instrument.
- 3DS is a separate Worldpay 3DS API; `authentication.threeDS` results are attached to the authorization. 3DS is not permitted on `channel: "moto"` transactions.

## Two things I need from you before building

1. **Access Checkout ID.** The Web SDK needs your `AccessCheckoutIdentity` (a UUID from the Worldpay dashboard). It is a public, client-side value, so it can be a config constant, but it is not something we already hold. You said not to introduce new secret names — flag: this one new value is unavoidable.
2. **Is your account enabled for the Card Payments API (verified tokens + direct authorization)?** Hosted payment pages and direct authorization are separately provisioned. If direct auth is not enabled on the merchant entity, the embedded flow returns 403 and nothing I build will work until Worldpay switches it on.

## Scope decision on 3DS

- **Admin virtual terminal (GetQuoteTab):** agent-taken card over the phone → `channel: "moto"`, no 3DS required. This is the clean first delivery and I can complete it fully.
- **Customer-facing / pay-by-link (ecom):** requires the full 3DS device-data + challenge flow (a second Worldpay product with its own endpoints and an iframe challenge). I recommend keeping the existing hosted page as the customer-facing path for now and doing 3DS as a follow-up, rather than shipping an ecom card form that will fail or lose liability shift on challenged cards.

Tell me if you want 3DS in this pass anyway and I will scope it in.

## What gets built (phase 1, MOTO)

1. `src/components/payments/WorldpayCardForm.tsx` — loads the SDK script once, renders three empty divs the SDK mounts into, styled with our existing card/input/button tokens; live validity classes drive our own border and error states; submit button disabled until valid; our spinner and error alerts.
2. `supabase/functions/worldpay-create-payment/index.ts` — new function, existing hosted-page function untouched:
   - takes `session` (+ optional cvc session), `amount_pence`, `description`, `sales_lead_id`, `customer_id`, `customer_email`, `customer_phone`, optional billing;
   - exchanges the card session for a verified token, then POSTs the authorization with `paymentInstrument: { type: "card/checkout", tokenHref, cvcHref }`, `channel: "moto"`, `merchant.entity` from `WORLDPAY_ENTITY`, narrative and value as today;
   - writes and updates a `worldpay_transactions` row with the same shape and statuses the webhook and reporting already expect (no schema change);
   - reuses the same secrets: `WORLDPAY_USERNAME`, `WORLDPAY_PASSWORD`, `WORLDPAY_ENTITY`, `WORLDPAY_ENVIRONMENT`, plus the admin/sales role check pattern.
3. `src/components/admin/WorldpayPaymentPanel.tsx` — Virtual terminal tab renders the new inline form instead of an iframe to the hosted page; Pay-by-link tab keeps calling the existing hosted-page function unchanged.
4. `GetQuoteTab.tsx` — the "Coming soon" placeholder is replaced with the live panel, matching the Stripe/Bumper/Payment Assist card styling in the same collapsible section.

Stripe, Bumper, `Step4Checkout.tsx`, `worldpay-create-payment-page` and `worldpay_transactions` are all left as they are.

## Before going live

Everything targets sandbox (`WORLDPAY_ENVIRONMENT=sandbox`, `try.access.worldpay.com`). To flip to live: set the live environment value, swap in the live Access Checkout ID, confirm the live merchant entity is enabled for direct authorization and MOTO, re-test with a real low-value card, and confirm settlement appears in the Worldpay dashboard.
