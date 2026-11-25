# Buy one, get one free checkout repair

## Requested rule
- Each of the first three qualifying paid purchases earns one free warranty: pay one/get one, repeated three times.
- Three free warranties maximum per dealer, up to 36 months each.
- Free cover is £0, active immediately, and earns neither another free entitlement nor credit toward the six-paid invoicing threshold.
- Existing paid warranties and the saved Super Admin offer switch remain unchanged.

## Causes repaired
1. The server and shared helper previously required three paid purchases before releasing the first free cover. They now release one entitlement after each qualifying paid purchase.
2. The previous free path attempted to claim a slot using a customer not yet saved in the required pending state. The replacement service-only transaction creates the pending customer, reserves the slot, activates cover, completes the quote/warranty, and creates its customer-safe portal policy together. Failure rolls everything back.
3. £0 activation no longer requires a Stripe secret or card session.
4. Checkout sends its expected free state and blocks on unreadable eligibility. A stale preview returns a clear conflict instead of silently starting a paid charge.
5. Offer settings and eligibility refresh on focus; saved switch changes are confirmed from the returned stored row. Admin sales distinguish free cover from positive-amount paid purchases and exclude unpaid checkout previews from paid revenue. Invoice guidance matches the six-paid threshold.
6. Free confirmation verifies the saved, dealer-owned, active, verified £0 BOGOF customer rather than trusting its URL. It waits for dealer-profile loading and refreshes the related warranty/quote lists.

## Verification
- Production rollback-only transaction passed all three paid/free cycles, 36-month issuance, fourth-free cap, failed issuance rollback, repeat-click protection, settled-customer preservation, one warranty and one customer-safe policy per free customer, completed quotes, and service-only privileges.
- All fixture rows were removed automatically; a read-only follow-up returned zero remaining regression dealers.
- No existing `BOGOF FREE` paid customer lacked a redemption record.
- 65 Vitest regressions and two existing Bun trade-terms checks passed.
- Ten isolated browser flows passed: desktop/393px/320px £0 activation to persisted confirmation, stale eligibility, failed issuance, unreadable benefits, URL-only false success prevention, admin paid/free filters, confirmed offer-switch saving, and delayed dealer-profile arrival plus confirmation reload.
- The checkout edge function was deployed successfully. Its submitted source SHA-256 was `5704c74793a4c390785a4acccf839bcb141db81fa3de90a772c12c016afea199`.
- The deployed function rejected an invalid caller with HTTP 401; latest preview compilation reported success.
- Saved global offer remains enabled and invoice threshold remains six paid warranties / 30 days.

## Limits and next verification
- Browser fixtures are isolated: they send no database or payment requests and no emails. The production regression rolls back every fixture and sends no emails.
- No real dealer payment, free warranty, password change, offer-switch change or email was initiated.
- Frontend publication and the affected dealer's actual signed-in free checkout remain necessary. Externally managed authentication prevents an automated real account session in this sandbox.
- Existing Supabase security findings predate these migrations and were not introduced by this repair; address them separately rather than altering access rules during checkout recovery.

## No-payment follow-up, 25 November 2026

Rule: an earned free warranty activates at £0 without a new Stripe checkout, card entry or invoice. It produces the dealer warranty and customer-safe portal policy, completes the quote, and attempts both confirmation emails. Existing settled records, offer settings and access permissions remain unchanged.

### Places read or exercised this turn
| Place | Result |
| --- | --- |
| Pricing and offer banners (`Step3Pricing`, `BogofBanner`, shared `dealerIntroOffer`) | Read: the banner is advisory; checkout uses server eligibility, one paid/one free up to three. No payment is initiated here. |
| Customer entry and saved-quote checkout | Read: existing customer/vehicle/terms checks stay in place; free cover uses the same saved customer journey. |
| `Step4Checkout` | Fixed and exercised: sends `intro_free`; £0 cannot fall through to hosted or embedded payment even on an unexpected response. Stripe loader runs only after a non-free embedded session is returned. No Stripe requests in isolated desktop/393/320 checks. |
| `dealer-create-checkout` | Fixed and unit-tested: free issuance returns before payment configuration/session creation and invoice paths. Older clients sending pay_now still get free issuance when server eligibility applies. Test dealers also need no test card key for new free issuance. |
| Earlier unpaid attempt for the same normalized email/plate | Fixed: service checks/expires any previous card session, then the service-only RPC reuses the pending row atomically. No separate soft-delete/restore writes. Complete/unknown/unconfirmed-expiration cases stop safely, with settled records untouched. An existing card attempt may need Stripe verification solely to rule out an earlier charge; no new payment is created. |
| `issue_dealer_intro_free` and `claim_dealer_intro_free` | Read, changed reuse logic, and production rollback regression passed: pending customer, slot, Active/verified £0 cover, quote, warranty and policy commit together. Failed duration after reuse rolls back the original pending row exactly. |
| `dealer_bogof_remaining` and `get_dealer_paylater_eligibility` | Read and regression-tested: one free for each first-three qualifying positive paid amounts, minus used slots; free/cancelled/refunded cover does not earn another entitlement or count toward six-paid credit. |
| `complete_dealer_sale` | Read and exercised by the rollback regression: completes the draft quote, preserves settled rows, creates exactly one warranty. Free issuance clears only unfinished quote payment-session data. |
| `Step5Confirmation` | Read and exercised: checks owned, saved, Active/verified £0 BOGOF cover directly; no Stripe confirmation call. Reload remains successful from persisted cover. Email delivery is described as unconfirmed when it has not completed. |
| Dealer Warranties and Customers, details and receipts | Read and fixed: issued £0 cover is labelled Free/no payment, not a card charge. No pay-invoice action applies to the settled free record. PDF has £0 total/paid/balance and no payment date. |
| Dealer Dashboard/Analytics and quote progress | Read: completed free quotes use the shared processed-quote rule; free paid/verified customers are active cover, not invoices. New confirmation invalidates warranty/quote/dashboard caches. |
| Admin Dealer sales, completed sales, invoices, Pay later and offer switch | Read: free filter includes issued £0 cover, revenue/paid-purchase credit excludes it, invoice lists include only invoice_pending/overdue. Existing settings/permissions unchanged. |
| Automatic `dealer-warranty-email`, customer-safe `dealerWarrantyEmail`, dealer document resend | Read: send dealer and customer warranty details with Panda documents/portal access, no customer trade amounts and no Stripe requirement. Fixed checkout's wait for delivery: five-second bounded result, existing work kept alive by the edge runtime; delayed/failed email cannot hide successful issuance. No real send initiated. |
| Customer Dashboard, `customerPortalPolicies`, `customer-policy-recovery`, `ensure_dealer_customer_portal_policy` and its trigger | Read and regression-tested: Active/verified paid-state £0 cover is accepted, missing customer-safe policy created, existing policy reused, trade payment amount absent, arrival/reload/refresh recover through the verified account email. Real account sign-in remains unverified. |
| Card return/webhook and `finaliseDealerCardPayment` | Read and tests passed: only genuine matching card sessions complete paid transactions. A free row has no session and cannot be overwritten by the old session. Free completion never waits for this webhook. |
| Legacy IntroFreeApprovals, decision handler and review RPC | Read: legacy pending reviews remain separate; new BOGOF activates immediately and creates an approved redemption. No Stripe requirement. No legacy records changed. |
| Partner checkout/API and invoice settlement | Read: separate partner retail checkout is not the dealer BOGOF route; test-mode skips are not free entitlements. Invoice settlement returns already-paid for free cover. No change to those paths. |
| Background work | Read: receipt continuation and missing-policy trigger accept free cover without payment; card webhook is not used by free issuance. No deferred free activation or payment job is required. |

### Verification and limits
- Production rollback-only three-cycle regression passed, including new customer, pending reuse without a card session, service-verified expired-session reuse, exact rollback on failed reuse, old paid-row preservation, three-free cap, quote completion and exactly one dealer warranty/customer-safe policy per free sale.
- Follow-up reads: zero temporary fixture dealers/customers; no real free redemption created; saved offer still enabled and credit threshold still six.
- 89 focused Vitest checks and 23 Bun checks passed before the final customer-label-only edit. Five isolated browser flows passed: desktop/393/320 free activation and persisted reload, unexpected payment-shaped response safely blocked, failed issuance recovery. All had zero Stripe requests, no browser errors and no horizontal overflow.
- `dealer-create-checkout` deployed, source SHA-256 `209abb95d7c48ddb0c13d90e08c421df460199db070c1a0a48641b6948fedca7`; invalid caller rejected with HTTP 401.
- Latest compilation was successful. Frontend changes need publication. Externally managed authentication explicitly refuses a sandbox dealer session; actual dealer/customer sign-in and inbox delivery cannot be claimed verified.
- No real payment, free cover, email, password, settled-record update, offer-switch change or permission change was initiated. Pre-existing security findings remain separate.