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