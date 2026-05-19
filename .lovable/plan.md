# Trade Finance Platform — Full Blueprint

Build a "W2000-style" vehicle finance platform on top of the existing `/dealer-portal` and `/dealer-admin` structure. Traders/dealers submit vehicle purchase + finance applications via a branded portal or REST API; internal staff manage everything from a centralised admin dashboard.

## Goals

- One branded portal for dealers to submit and track vehicle finance applications.
- A public REST API mirroring portal capabilities so dealer DMS systems can integrate.
- A centralised internal admin dashboard for underwriting, decisioning, document review, payouts and reporting.
- Reuse current auth (`useDealerAuth`), layouts (`DealerLayout`, `DealerAdminLayout`) and design tokens.

## Phased delivery

### Phase 1 — Foundations (data model + auth scopes)
- New Supabase tables (see Technical section).
- Extend dealer record with: trading name, FCA number, finance limits, commission tier, status.
- Add `application_status` enum + state machine.
- RLS: dealer sees only own applications; admins see all via existing `has_role`.

### Phase 2 — Dealer Portal: Applications
- New section `/dealer-portal/applications` (list + filters: status, date, customer, vehicle).
- Multi-step "New Application" wizard:
  1. Vehicle (DVLA lookup, derivative, mileage, condition, valuation, HPI flag)
  2. Customer (personal, address history 3y, employment, income/expenditure, marital, dependants)
  3. Finance terms (product: HP/PCP/Lease, cash price, deposit, term, balloon/GFV, APR, monthly, commission)
  4. Supporting documents (proof of ID, address, income, bank statements, V5C, invoice) — Supabase Storage
  5. Declarations + e-sign + submit
- Status tracker UI (Submitted → Pre-screen → Underwriting → Approved / Declined / Referred → Documents → Paid out).
- Messaging thread per application (dealer ↔ underwriter).
- Payout view (commission earned, pending, paid).

### Phase 3 — Admin Dashboard
New navigation group "Finance" in `DealerAdminLayout`:
- **Applications queue** — filterable table, SLA timers, assigned underwriter.
- **Application detail** — full file, decisioning panel (Approve / Decline / Refer with reasons), conditions, counter-offer, document checklist with approve/reject per file, audit log.
- **Underwriting rules** — editable matrix (LTV, age, mileage, income multiples, postcode risk).
- **Lenders / Products** — manage panel of lenders, products, rate cards, commission splits.
- **Payouts** — schedule, mark paid, export remittance CSV.
- **Compliance** — FCA affordability checks, vulnerability flags, KYC/AML status (Onfido-ready hook).
- **Reporting** — volume, approval rate, average deal size, dealer leaderboard, commission paid.

### Phase 4 — Public REST API + Webhooks
- Versioned API at `/api/v1/*` via Supabase edge functions.
- Dealer API keys (hashed, scope-limited, rotatable) managed at `/dealer-portal/settings/api`.
- Endpoints:
  - `POST /applications` — create
  - `GET /applications/:id` — status + full record
  - `GET /applications` — list with filters
  - `POST /applications/:id/documents` — upload
  - `POST /applications/:id/messages`
  - `GET /vehicles/lookup?vrm=...`
  - `GET /products` — rate cards
  - `POST /quote` — indicative quote
- Outbound webhooks on status change (signed with HMAC).
- OpenAPI 3 spec served at `/api/v1/openapi.json` + Swagger UI page at `/dealer-portal/api-docs`.

### Phase 5 — Polish & launch
- Email + in-app notifications (status changes, document requests).
- Audit log everywhere.
- Two-factor auth for admin and dealer principals.
- Sandbox environment toggle for API testing.
- SEO marketing pages explaining the platform.

## Technical section

### New Supabase tables (high level)
```text
finance_applications        application core, status, dealer_id, customer snapshot
finance_application_vehicle vehicle details linked 1:1
finance_application_finance product, cash_price, deposit, term, apr, monthly, commission
finance_application_docs    uploaded files (path in storage, type, status)
finance_application_events  audit log + state transitions
finance_application_messages dealer/underwriter thread
finance_lenders             panel of lenders
finance_products            product/rate cards per lender
underwriting_rules          editable rule matrix (jsonb)
dealer_api_keys             hashed key, scopes, last_used_at
api_webhook_endpoints       url, secret, events[]
payouts                     dealer_id, period, amount, status
```
All tables RLS-enabled. Helper `has_role(auth.uid(),'admin')` for staff access. Dealer-scoped tables filter on `dealer_id = current dealer`.

### Edge functions
- `finance-application-submit` (validation, state init, notifications)
- `finance-application-decision` (admin-only, transitions state, fires webhook)
- `dvla-vehicle-lookup` (proxy existing integration)
- `dealer-api-gateway` (validates API key, routes to internal handlers)
- `webhook-dispatcher` (signed HMAC delivery with retries)
- `documents-sign-url` (Supabase Storage signed URLs)

### Storage buckets
- `finance-documents` (private, dealer + admin access via RLS policies on object path `applications/{app_id}/...`)

### Frontend additions
- `src/pages/dealer-portal/applications/` (List, New wizard steps, Detail, Messages, Payouts)
- `src/pages/dealer-portal/settings/ApiKeys.tsx`, `ApiDocs.tsx`
- `src/pages/dealer-admin/finance/` (Queue, Detail, Rules, Lenders, Products, Payouts, Compliance, Reports)
- Reuse `shadcn` Table, Stepper pattern from existing journey, design tokens.

### State machine
```text
draft → submitted → pre_screen → underwriting
                                  ├─ approved → docs_pending → payout_pending → paid → completed
                                  ├─ referred → underwriting
                                  └─ declined (terminal)
any → withdrawn (terminal)
```

### Out of scope (phase 1 plan)
- Actual lender API integrations (Zuto, V12, MotoNovo etc.) — design hooks, do not implement.
- Native mobile app.
- In-platform e-signature provider integration (start with checkbox + IP/timestamp; DocuSign hook later).

## Open assumptions
- Single currency: GBP.
- UK-only (FCA, DVLA, HPI).
- Lovable Cloud (Supabase) continues as backend; no new infra.
- Branding inherits from current dealer portal (orange accent on light surface).

Confirm and I'll start Phase 1 (data model + auth/RLS + admin nav scaffolding).
