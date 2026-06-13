
## Goal

Rewrite every public marketing/landing route currently selling **retail** car warranties (BuyAWarranty, "60p a day", consumer family copy) into **trade dealership** warranty pages under the **Panda Protect** brand. URLs stay the same. Admin, sales tooling, checkout backend, customer dashboard, and edge functions are untouched.

## Scope — pages to rewrite in place

**Core**
- `/` and `/home` — Index page → Panda Protect trade home
- `/faq/` and `/faq/traders/` — Trade FAQ (merge content)
- `/what-is-covered/` — Trade warranty cover (mechanical/electrical, labour rates, claim limits as sold to dealers)
- `/claims/` and `/make-a-claim/` — Dealer claims handling flow
- `/cancel-warranty` — Trade-policy cancellation (dealer-initiated)
- `/warranty-transfer/` — Inter-dealer / dealer→retail customer transfer
- `/contact-us/` — Trade contact: hello@pandaprotect.co.uk, dealer support phone
- `/complaints/` — Trade complaints procedure
- `/discount-promo-offers/` — Dealer-tier / volume offers (or hide)
- `/warranty-plan/` — Trade plan overview

**Vehicle landings**
- `/van-warranty/` — Van stock warranties for dealers
- `/ev-warranty/` — EV trade warranty for forecourts
- `/motorbike-repair-warranty-uk-warranties/`, `/motorcycle-warranty/` — Motorbike dealer warranties
- `/car-extended-warranty/` — Extended cover dealers can offer
- `/used-car-warranty-uk/`, `/buy-a-used-car-warranty-reliable-warranties/` — Forecourt used-car cover

**Brand landings under `/warranty-types/`**
- `/warranty-types/` index + all 20+ `/warranty-types/:brand/` pages — rewrite hero/intro/CTA to dealer-focused; keep brand-specific cover detail but reframe ("offer your [Brand] stock with…").

## Out of scope (will NOT change in this pass)

- Checkout funnel: `/checkout/payment`, `/cart`, `/quote/:token`, `/widget`
- Customer dashboard, admin, dealer admin, dealer portal internal pages
- Edge functions, database schema, Stripe products, pricing logic
- Brand assets (logos, images) — text/copy only
- Email templates, SMS, sales script
- `/thewarrantyhub/*` (already rebranded)

## Approach

1. **Shared trade copy module** — create `src/content/trade-copy.ts` with:
   - Brand: `Panda Protect`, support email `hello@pandaprotect.co.uk`, dealer phone `0330 229 5040`
   - Standard trade value props (margin protection, FCA-aligned, fast claims, white-label, no comeback costs)
   - Standard CTAs all pointing to `/dealer-portal/signup` (primary) and `/dealer-portal/coming-soon` (secondary)
   - Trust badges / dealer-focused copy blocks
2. **Per-page rewrite** — for each route listed above:
   - Swap hero headline/subheadline to trade angle
   - Replace retail CTAs (Get Quote, Buy Now, "From 60p a day") with dealer signup CTA
   - Remove consumer trust signals (Trustpilot reviews from end customers stay — they're brand asset)
   - Update `<Helmet>` / `SEOHead` title + description + canonical to trade keywords
   - Update JSON-LD `Product`/`Service` schema → `Service` audience=Dealer
   - Swap header/footer to `DealerPublicHeader` / dealer footer (same pattern as `/thewarrantyhub`)
3. **Sitewide head** — update `index.html` `<title>`, meta description, and Organization JSON-LD to Panda Protect trade.
4. **Internal links** — sweep public pages and rewrite hard-coded retail CTAs (`/cart`, `/quote/...`, `Get Quote` buttons) to `/dealer-portal/signup`.

## Things you should know before I start

- **Conversion risk**: any live Google Ads or organic traffic landing on these URLs is currently retail-intent. Rewriting in place will tank retail conversions immediately. Confirm that's acceptable.
- **Checkout still exists**: `/cart`, `/checkout/payment`, `/quote/:token` will continue to work for any links already in the wild (emails, old quotes). I won't break them — just won't link to them from public pages anymore.
- **Brand pages**: 20+ `/warranty-types/:brand/` pages share a template. I'll rewrite the template + per-brand copy strings; if some brands need bespoke trade angles, flag them.
- **No image regeneration** — I'll use existing assets. Hero imagery is currently consumer-feel; we can swap later.
- **SEO loss**: existing rankings on "car warranty" consumer terms will drop. New trade-focused titles will need time to rank.

## Execution

Given size (~30 files, many large), I'll batch in 4 PRs of edits:
1. Shared trade copy module + index.html sitewide head + home (`/`, `/home`)
2. Vehicle landings (van, EV, motorbike, used car, car extended) + warranty-types index/template
3. Brand pages (`/warranty-types/:brand`)
4. Support pages (faq, what-is-covered, claims, cancel, transfer, contact, complaints, discounts, warranty-plan)

After each batch I'll pause for you to spot-check before continuing.

## Confirm before I start

1. Go ahead and tank retail SEO/ads on these URLs? (Y/N)
2. All public CTAs route to `/dealer-portal/signup` — correct? (Y/N)
3. Keep existing images for now, swap later? (Y/N)
