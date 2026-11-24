# Shared payment rules
- Dealer quote progress/editability is shared in dealerQuoteStatus.ts across lists, dashboard counts, emailed quotes and checkout; paid timestamps override draft labels so stale tabs cannot start another charge on a processed quote.
- complete_dealer_sale advances only unfinished quotes or invoice-to-paid settlement and rejects cross-customer reuse; repeat completion preserves settled quote/customer/warranty rows to prevent historic sales reopening.
- Dealer issuance creates missing customer-safe portal policies through ensure_dealer_customer_portal_policy; retries, customer login and emailed access reuse it without updating settled sales or exposing trade amounts.
- Customer dashboard arrival and refresh run customer-policy-recovery with a verified session email, never request identity overrides; existing policies stay readable on recovery failures, covering signup/restored-session paths without modifying settled records or view-as targets.
- Choose dealer Stripe credentials from the service-read dealer `is_test` flag, never request flags; missing test configuration must not fall back to live payments.
- Test dealers use hosted checkout to avoid the live publishable key; completion checks Stripe `livemode` against the dealer flag and tags test purchases before fulfilment, preventing test charges from activating live sales.
# Partner guide updates
- Bump PARTNER_GUIDE_VERSION in partnerGuideVersion.ts when the guide changes for partner developers; emails go only through partner-admin send_guide_update and are logged in partner_guide_update_emails, keeping version tracking accurate.
