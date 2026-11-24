# Shared payment rules
- Dealer issuance creates missing customer-safe portal policies through ensure_dealer_customer_portal_policy; retries, customer login and emailed access reuse it without updating settled sales or exposing trade amounts.
- Choose dealer Stripe credentials from the service-read dealer `is_test` flag, never request flags; missing test configuration must not fall back to live payments.
- Test dealers use hosted checkout to avoid the live publishable key; completion checks Stripe `livemode` against the dealer flag and tags test purchases before fulfilment, preventing test charges from activating live sales.
# Partner guide updates
- Bump PARTNER_GUIDE_VERSION in partnerGuideVersion.ts when the guide changes for partner developers; emails go only through partner-admin send_guide_update and are logged in partner_guide_update_emails, keeping version tracking accurate.
