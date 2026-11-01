# Architecture rules

- Dealer cancellation navigation reuses the dealer-scoped warranties list via its cancellations tab; status changes remain in the existing admin workflow.

- Customer quote links must use the nested field allowlist in customerQuoteSharing; URLs are readable and must never contain trade prices, margins or customer contact data.
- Full warranty configuration and approved versus proposed add-ons live in fullWarrantyConfiguration; unapproved commercial recommendations cannot enter the charging calculation.
- Pending claim limits stay outside live pricing and customer-adjustable matrices; the calculator rejects unapproved limits to prevent fallback pricing.
- Adjustable customer quotes carry a nested-allowlisted selling-price matrix and customer option labels only; never send dealer pricing rules or margin percentages to the customer page.
- Dealer margin calculations use VAT-inclusive cost divided by one minus the margin fraction; keep selling-price calculations separate from warranty charging.
- Full-cover calculations return net full-warranty amounts; quote display adds VAT once, and journey dealer_price/retail_price carry gross payable totals so checkout charges match the preview.
- Dealer dashboard data must be dealer-scoped and reuse quote, customer/warranty and claim records; never substitute sample figures when data is unavailable.
- Pricing-page product selection stays in place and retains the vehicle and configuration; dealer economics are calculated separately from customer-safe sharing and warranty charging.
- Quick annual warranty choices derive availability from approved full-warranty terms; unsupported durations stay disabled instead of using fallback prices.
- Annual trade products use Panda Protect-scoped dealer_admin_plans pricing_matrix records, fetched through an authenticated dealer-only function; preserve snapshots only when explicitly identified by annual price basis, product ID and pricing version, never import legacy calculator amounts into annual products. Four-year sales require explicit completed approvals. This isolates trade pricing from shared consumer products.
- Dealer product availability is gated by `src/lib/dealerProductAvailability.ts`; a paused product keeps its pages, pricing rules and records, and its journey route redirects to the product that is live instead of being deleted.
- Form validation errors render through `src/components/dealer/DealerFieldError.tsx` so every page shows the same bold red bulleted line under the field; it keeps `!text-destructive` because scoped page CSS overrides plain colour utilities.
- The dealer quote journey starts at pricing: registration entry lives on `Step3Pricing.tsx`, and retired entry URLs (`/quote/vehicle`, `/quote`, `/quotes/create`) redirect there through `DealerQuoteEntry` keeping any `?reg=` value, so no page should link to the vehicle step.
