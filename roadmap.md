# Roadmap
- [x] Fix customer Postcoder search: retry saved postcodes on focus, discard stale suggestions, and allow complete manual address entry when lookup is unavailable.
- [x] Match final pricing mockup with safe Trade/Customer views, annual price cards, fixed cover and £100 selling-price controls.
- [x] Store requested annual prices in a Panda-only backend product and prepare inactive 48-month product.
- [x] Verify pricing rules and customer privacy: 22 tests pass; isolated desktop/mobile interactions pass and compilation is clean.
- [ ] Verify live signed-in quote, email and Stripe flows; external authentication is unavailable for automated checks.
- [x] Simplify dealer pricing to annual choices, included cover and one price/action while preserving secondary configuration and sharing tools. 31 targeted tests pass and preview compilation is clean; signed-in visual/checkout verification is unavailable with external authentication.
- [ ] Enable four-year quoting after eligibility, contractual cover and commercial approvals are complete; the supplied £400/£1,400 prices are stored but inactive.

- [x] Update the dealer dashboard to the October reference with compact actions, live operational panels and a date-filtered activity chart. Four calculation tests pass; desktop/tablet/mobile layout tested in isolation. Actual dealer data verification is blocked by external authentication.

- [x] Treat existing full-cover prices as full warranty prices, remove monthly-payment labels, and add VAT once to the final payable total.

- [x] Rebuild the dealer portal Home dashboard to the supplied CRM specification and reference.
- [x] Verify dashboard compilation and responsive layout rules. Authenticated visual verification requires the external dealer session.
- [x] Build the New Quote page inside the dealer CRM with the supplied quote journey design and connect every New Quote entry point to it.
- [ ] Build the remaining CRM pages after Home and New Quote are approved.
- [x] Update /dealer-portal/signup UI to match the supplied screenshot style and simplify the register/login choice.
- [x] Replace quote-list photo placeholders with registration plates and vehicle descriptions.
- [x] Match the dashboard registration input to the UK plate style with ENTER REG default wording.
- [x] Redesign /dealer-portal/signup to match the supplied dealer portal register/login reference.
- [x] Optimise large public-page images and improve natural, search-friendly image descriptions.
- [x] Build the dedicated trade-focused Why Choose Us landing page and connect its public navigation.
- [x] Update Full Warranty Cover pricing to the supplied compact layout and add customer-safe print/email/WhatsApp sharing.
- [x] Activate the ten approved full-cover add-ons without icons, replace old options, and verify their monthly charges and customer sharing. All 27 targeted tests pass; dealer visual verification requires an external authenticated session.
- [ ] Preserve selected cover and add-on details on issued warranty records: checkout currently forwards the price but omits selected options; confirm the policy storage fields before enabling issuance with the new protections.
- [x] Set the £5,000 claim limit boost prices the user approved: dealer +£20/£40/£60 and customer +£60/£100/£140 for one/two/three year warranties, stored per warranty length in the plan record. 33 targeted tests pass and preview compilation is clean; signed-in dealer checks remain unavailable with external authentication.
- [ ] Diagnostic inclusion awaits commercial confirmation.
- [x] Set full-cover warranty terms to 3, 6, 12, 24 and 36 months and labour rates to £40, £70, £100 and £150 per hour.
- [x] Add fixed and adjustable customer quotes, custom selling prices and true profit margin, with customer-safe new-tab sharing. Public interaction and privacy tests pass; signed-in dealer checks remain unavailable.

- [x] Update pricing to the supplied compact configuration reference, inline product switch, dealer profit summary and secondary quote tools without changing approved charges. 33 tests pass; isolated desktop/mobile interactions verified. Live dealer and Stripe checks require external authentication.
- [x] Add private staff notes to dealer sign-ups: notes log per signup, pinned notes, author and date, notes count column and CSV export. Admin-only access rules applied.
- [x] Add "View as dealer" mode for admins: button on dealer sign-up detail panel, read-only dealer portal view with exit banner, admin read access rules for dealer quotes/warranties/saved plans.
- [ ] Improve the admin dashboard one page at a time through the whole journey (user to direct each page).
- [x] Pause Manage My Claim: vehicle step quotes Comprehensive Warranty only, claim-handling route redirects there, saved Manage My Claim plans hidden; build kept behind one flag.
- [ ] Build an admin dashboard "Manage My Claim" section with activate/deactivate control (user idea, awaiting go-ahead) to replace the code flag.
- [x] Retire the vehicle-details quote step: registration entry now happens on the pricing page, /dealer-portal/quote/vehicle and other entry URLs redirect there with ?reg= kept, and every New Quote link points at pricing.
- [x] Add the v11 Platinum Warranty Plan and Terms & Conditions PDFs as downloads in the pricing page "What's covered?" accordion, served as CDN assets at reduced file size after a high-resolution legibility check.

- [x] Make Customer View open the customer-safe quote in its own browser tab (quote saved with its payment reference) and add copy-link, WhatsApp and email sharing inside that tab. Customer-view render and copy interaction verified in the browser; signed-in dealer click still needs the external session.

- [x] /auth (managers) must never land on dealer pages; explain /auth vs /admin-dashboard
- [x] Pricing: profit figure gold, smaller profit box beside Save draft / Share quote
- [x] Fix MOT mileage lookup: re-entered DVSA credentials through the secure form and made both MOT lookups ignore stray spaces in the saved settings. Live checks return real vehicle, MOT and mileage data for AB12CDE (Vauxhall Astra, 43,244 miles, MOT valid to 11 Jun 2027).
