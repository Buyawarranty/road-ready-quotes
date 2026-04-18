
## Revised Dealer Journey Plan — with Payment Step

User wants the dealer checkout to mirror retail (Stripe payment), not just a quote save.

### Build error fixes (unblock compile)
Cast payloads to `as any` in:
- `src/components/admin/CustomersTab.tsx` (line 1661)
- `src/components/admin/InlineWarrantyUpgrade.tsx` (lines 112, 126)
- `src/components/admin/ReviewsTab.tsx` (line 165)
- `src/hooks/useLeadDistribution.ts` (lines 243, 255)

### Routes (`src/App.tsx`)
Add canonical dealer routes inside `DealerJourneyProvider`:
- `/dealer/quote` → Step1Vehicle
- `/dealer/vehicle-details` → Step1Vehicle (confirm view)
- `/dealer/customer` → Step2Customer
- `/dealer/plans` → Step3Plans (NEW)
- `/dealer/pricing` → Step4Pricing (NEW)
- `/dealer/checkout` → Step5Checkout (NEW, payment)
- `/dealer/confirmation` → Step6Confirmation (NEW)

Keep existing `/dealer-portal/quote/*` routes as redirects.

### New step components

**Step3Plans** — Basic / Gold / Platinum × duration (3/12/24/36 mo). Shows retail crossed out + dealer net (20% off via `calcDealerPrice`). Saves to context.

**Step4Pricing** — Summary (vehicle + customer + plan), price breakdown (Retail / −20% dealer discount / Dealer Net), edit links, CTA → checkout.

**Step5Checkout** — Two payment options (matches existing `Step4Checkout.tsx` pattern already in repo):
1. **Pay now** — Stripe card payment
2. **Add to monthly invoice** — no card, billed later

Calls a NEW dealer-only edge function `dealer-create-checkout` with `{ dealer_id, payment_method, vehicle, customer, plan, discount_pct }`.
- `pay_now` → returns Stripe `checkout_url`, redirects browser
- `invoice` → creates `dealer_quotes` row directly, returns id, navigates to confirmation

**Step6Confirmation** — Success screen with reference number, "Start new quote" button (calls `reset()`).

### New edge function: `dealer-create-checkout`
Isolated from retail Stripe functions. Responsibilities:
- Validate dealer JWT
- Insert `dealer_quotes` row (status: `pending_payment` for card, `invoiced` for invoice)
- For `pay_now`: create Stripe Checkout Session in dealer's currency, success_url → `/dealer/confirmation?id=…&method=pay_now`, store session id on the quote
- For `invoice`: just return the quote id

Requires Stripe secret (already in project per parent secrets sync). Will use `STRIPE_SECRET_KEY`.

### New edge function: `dealer-stripe-webhook` (optional, recommended)
Marks `dealer_quotes.status = 'paid'` and creates `dealer_warranties` row on `checkout.session.completed`. Listens to dealer sessions only (filter via metadata `source=dealer_journey`). Does NOT touch retail webhook.

### Hero update
`src/components/dealer/DealerRegHero.tsx` — point CTA to `/dealer/quote?reg=…`.

### Isolation guarantees
- Zero edits to retail tables, retail edge functions, `pricingMatrix.ts`, `StreamlinedCheckout.tsx`, retail Stripe webhook
- Writes only to existing `dealer_quotes` / `dealer_warranties` (already present)
- New session container `dealerJourney` (already exists)
- New edge functions namespaced `dealer-*`

### Files
**Edit (6):** 4 admin/hook casts + `src/App.tsx` + `src/components/dealer/DealerRegHero.tsx`
**Create (4 frontend):** Step3Plans, Step4Pricing, Step5Checkout, Step6Confirmation under `src/pages/dealer-portal/journey/`
**Create (2 edge functions):** `dealer-create-checkout`, `dealer-stripe-webhook`
**No DB migrations.**

### Out of scope
Touching anything retail.
