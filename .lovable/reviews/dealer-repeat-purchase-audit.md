# Dealer repeat-warranty verification

## Rule
Dealers must be able to issue another warranty for a different customer, understand any error and recover without disturbing an existing paid sale.

## What has been verified
- The live Panda Protect pricing, checkout and confirmation files contain the previous repeat-sale and recovery fixes.
- Six separate synthetic customers and registrations reached checkout through the actual local dealer pages, each with an independent quote ID. The original synthetic paid quote stayed unchanged.
- Earlier checks covered confirmation retry, rejected replacement registration, settled-quote draft-save protection and phone support at 320px and 393px.
- These are isolated checks: no real dealer was signed in, no payment was taken, no warranty was issued and no email was sent.
- Current compilation reports success. Recent checkout/pricing/confirmation service log searches returned no logs; this does not establish that the weekend attempts succeeded or explain their errors.

## Code-read inventory
“Partial” means only the indicated functional sections were read, not the whole screen or every action. No entry below implies a live payment check.

| Place | Coverage | Repeat-sale result |
| --- | --- | --- |
| Dashboard registration and quick actions | Functional code read; isolated new-sale interaction run | Uses fresh-sale entry; passes six-customer checkout check |
| Public registration handoff | Registration helper read; public pages only partially reviewed | Full public handoff remains unverified |
| Dealer sign-in | Redirect/sign-in sections read | Appends another `?reg=` to URLs with existing parameters; can break fresh-sale or payment-return parameters |
| Active shared dealer shell | Navigation, support and approval sections read; isolated navigation/support run | New Quote resets state; call/WhatsApp visible on phones |
| Legacy sidebar | Source read | Not evidence for the active shell; no live flow run |
| Quotes: new/resume/history | Functional sections read | Fresh start and settled-resume guard present; read failures can appear as an empty list |
| Warranties: new/history | Functional sections read; remainder not fully audited | Fresh start present; read failures can appear as an empty list |
| Credit-status start/request | Request and CTA sections read | Fresh start present; request can remain waiting after a stalled/rejected request |
| Journey state and draft save | Full helper/provider/save code read; isolated state/save guard run | Different registration detaches prior customer/quote; draft saves exclude settled statuses |
| Pricing, vehicle replacement and options | Functional code read; isolated selection/blocked-replacement run | Fresh-sale fixes pass; separate mileage eligibility enforcement requires review before any change |
| Customer details | Validation/submission code read; isolated six-customer forms run | Distinct empty forms and validation worked; no real customer records written |
| Checkout: card, hosted, embedded, invoice and free | Creation/submission/recovery sections read; entire checkout service read | Card completion callback and bounded requests present; mandatory terms acceptance and credit request still have unbounded waits |
| Trade terms acceptance popup | Acceptance source read | Stalled request can leave its action loading; preliminary terms check does not cover acceptance |
| Payment confirmation | Full source read; isolated failure/retry run | Signed check and explicit fresh start present; actual Stripe completion unverified |
| Paused product and cover switch | Availability/switch/route read; paused journey body not read | Paused route redirects to live product; do not call the retained paused journey fully checked |
| Annual pricing service | Service/validation source read | Modern annual request validated; legacy request branch deserves a separate server-pricing review, not a settings change |
| Signed card return and dealer webhook | Dealer handlers and shared finalizer read | Signed ownership/amount checks present; no live webhook or payment run |
| Shared sale completion | Full helper read; deployed completion function read | Customer warranty insert is idempotent; quote completion checks dealer ownership but lacks exact sale binding/terminal-status protection |
| Other Stripe handlers, invoice settlement, email and vehicle services | Located, not all fully read | Outstanding audit; not checked |
| Dealer auth | Main loading sections and bounded helper read | Bounded profile load present; complete live session chain unverified |
| Database uniqueness | Live definitions read | Customer uniqueness is email plus plate; no dealer-wide one-sale limit found |
| Database completion/eligibility | Live function definitions and relevant migrations read | Credit/free eligibility is separate from ordinary card purchasing; background settled-quote protection requires review |
| All other migrations, triggers and access policies | Not exhaustively read | Outstanding audit; not checked |

## Next decision
Repair the confirmed reliability gaps in sign-in parameter handling, mandatory terms acceptance, credit-request recovery and quote/warranty read-error messages, then verify the affected account and payment journey. Broader charging, eligibility, background completion and access rules require their own scoped review; leave current settings and settled records untouched.

The dealership identity is still needed. External unmanaged authentication prevents an automated real signed-in payment check. Do not tell the dealer the incident is fully resolved based on isolated checks, and do not issue the promised goodwill warranty or contact them automatically.