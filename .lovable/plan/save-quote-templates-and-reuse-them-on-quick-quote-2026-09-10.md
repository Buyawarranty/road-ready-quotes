# Save quote templates and reuse them on Quick quote

Traders can save the cover settings they pick for a customer as a named template, then apply that template (or simply reuse their last quote) on the Quick quote page.

## What the trader sees

**On the pricing screens (full cover warranty and dealer-paid/claim handling)**
- A "Save as template" button next to the existing default-plan controls.
- Clicking it asks for a short name (e.g. "Standard 12m £50 excess") and saves the current term, excess, labour rate, parts contribution, claim limit and the customer-facing price.

**On the Quick quote page**
- A "Start from a template" strip at the top listing their saved templates, each showing its name and a plain summary (12 months, £50 excess, £70/hr, £1k claim limit, £299).
- A "Use my last quote" button that fills in the settings from the most recent quote they created.
- Clicking a template fills warranty duration, plan type and price; the trader can still change anything before saving.
- Each template has a small remove option; templates are per trader account, so they appear on any device.
- When no templates exist yet, a short line explains how to create one from a pricing screen.

## Technical notes

**Database** — new table `public.dealer_quote_templates`:
- `id`, `dealer_id` (references `dealers`), `name`, `term_months`, `excess`, `labour`, `parts`, `claim_limit`, `price` (nullable numeric), `plan_type`, `created_at`, `updated_at` (with the standard update trigger).
- Grants: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`, `ALL` to `service_role` (no `anon`).
- RLS enabled; a single policy scoping all actions to rows whose `dealer_id` belongs to the signed-in trader, matching the existing `dealer_quotes` pattern (`dealer_id = public.current_dealer_id()`).

**New code**
- `src/hooks/useDealerQuoteTemplates.ts` — list, create and delete templates for the current dealer, plus a `lastQuote` read of the newest `dealer_quotes` row for the dealer (`vehicle`-independent fields only).
- Reuse `describeDefaults`-style summary text; extend `src/lib/dealerWarrantyDefaults.ts` with a shared formatter that includes price.

**Edited files**
- `src/components/dealer/journey/TraderPricingTable.tsx` — add "Save as template" beside the existing default-plan buttons, using current `term/excess/labour/parts/claim` and `customerFacingPrice`.
- `src/pages/dealer-portal/journey/ClaimHandling.tsx` — same button in its equivalent quick-select block.
- `src/pages/dealer-portal/DealerCreateQuote.tsx` — template strip + "Use my last quote", mapping a template onto `warranty_duration`, `plan_type` and `price`.

Existing "my default plan" behaviour stays as it is; templates sit alongside it.
