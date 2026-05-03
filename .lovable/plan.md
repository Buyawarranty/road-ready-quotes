# Trader (Dealer) Pricing — Single Gold Plan, Isolated Engine

Goal: replace the dealer journey's reused retail pricing with a dedicated trader engine that mirrors the uploaded `base_pricing.xlsx`. Only **one product: Gold**. Retail pricing stays untouched.

## Scope

Affects only:
- Dealer portal Step 3 (`/dealer-portal/quote/pricing`)
- Dealer portal Step 4 checkout summary (display-only)
- Dealer admin trader-pricing editor (so ratios can be tuned without code)

Does NOT touch retail pricing logic, retail `plans` table, `pricingMatrix.ts`, retail `PricingTable.tsx`, retail checkout, or admin retail quote tabs.

## Pricing formula (from spreadsheet)

```
ex_vat = base × excess × labour × parts × claim × dealer_pct × term
gross  = ex_vat × 1.20
```

Defaults extracted from xlsx:
- base = 147.50 (Gold)
- excess: £0→1.10, £50→1.00, £75→0.90, £100→0.87, £150→0.83
- labour: £40→0.90, £50→0.95, £70→1.00, £100→1.10, £120→1.20, £200→1.50
- parts: `Age & Mileage`→1.00, `No contribution`→1.20
- claim: £750→0.85, £1k→1.00, £1.25k→1.10, £2k→1.30
- dealer_pct = 0.80
- term: 3m→0.6, 6m→0.8, 12m→1.0, 24m→1.8, 36m→2.6
- VAT = 1.20

All multipliers stored in DB so admins can tune without redeploys.

## New files

**Engine**
- `src/lib/traderPricing.ts` — `calcTraderPrice({term, excess, labour, parts, claim})` → `{exVat, gross, breakdown[]}`.
- `src/lib/traderPricingDefaults.ts` — fallback ratios if DB fetch fails.

**Hook**
- `src/hooks/useTraderPricingConfig.ts` — fetches `trader_pricing_config`, caches via React Query, merges with defaults.

**UI — dealer portal**
- `src/components/dealer/journey/TraderPricingTable.tsx` — single Gold panel with term cards (3/6/12/24/36 mo) and selectors for excess / labour rate / parts contribution / claim limit. Live recalculation. Shows ex-VAT, VAT, gross.

**UI — dealer admin**
- `src/pages/dealer-admin/DealerAdminTraderPricing.tsx` — editable tables for base, excess/labour/parts/claim ratios, term multipliers, dealer pay %, VAT. Save → `trader_pricing_config`. Includes "Reset to defaults".
- Sidebar entry "Trader Pricing" added in `DealerAdminLayout`.

## Files edited (minimal)

- `src/pages/dealer-portal/journey/Step3Pricing.tsx` — render `TraderPricingTable` instead of `DealerPricingTable`. Plan payload stores `retail_price = exVat`, `dealer_price = gross`, plus `term_months` and `selected_options`.
- `src/contexts/DealerJourneyContext.tsx` — extend `DealerJourneyPlan` with `term_months: 3|6|12|24|36` and `selected_options` (optional jsonb). Keep `plan_type` literal `'gold'`.
- `src/pages/dealer-portal/journey/Step4Checkout.tsx` — show breakdown lines from engine (display only).
- `src/App.tsx` — add `/dealer-admin/trader-pricing` route (lazy).

`DealerPricingTable.tsx` left in place but unused (safe rollback).

## Database (one migration)

```sql
create table public.trader_pricing_config (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in
    ('base','excess','labour','parts','claim','term','dealer_pct','vat')),
  option_key text not null,        -- e.g. '50','100','age_mileage','12','default'
  option_label text,
  multiplier numeric not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (category, option_key)
);
alter table public.trader_pricing_config enable row level security;

create policy "Authenticated read trader pricing"
  on public.trader_pricing_config for select to authenticated using (true);

create policy "Admins manage trader pricing"
  on public.trader_pricing_config for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
```

Same migration seeds the rows above (~25 rows).

## Out of scope (explicit)

- No changes to `pricingMatrix.ts`, `PricingTable.tsx`, `StreamlinedCheckout.tsx`, `GetQuoteTab.tsx`, `ConfirmExternalPaymentTab.tsx`, retail `plans` table, or retail flows.
- No Basic/Platinum tiers — single Gold plan only.
- No Stripe/webhook changes — dealer journey saves price to `dealer_quotes` / `dealer_warranties` already.

## Validation

1. `/dealer-portal/quote/pricing`: toggling options reproduces the four xlsx rows exactly (12-month ex-VAT: 95.58 / 155.76 / 106.20 / 88.15).
2. Retail flow `/`: prices unchanged.
3. Admin → Trader Pricing → bump base 147.50 → 160 → dealer Step 3 reflects on refresh; retail unaffected.
