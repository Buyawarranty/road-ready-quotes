# Dealer repeat-warranty verification

## Rule
Dealers must be able to issue another warranty for a different customer, understand any error and recover without disturbing an existing paid sale.

## What has been verified
- The live Panda Protect pricing, checkout and confirmation files contain the previous repeat-sale and recovery fixes.
- Six separate synthetic customers and registrations reached checkout through the actual local dealer pages, each with an independent quote ID. The original synthetic paid quote stayed unchanged.
- Earlier checks covered confirmation retry, rejected replacement registration, settled-quote draft-save protection and phone support at 320px and 393px.
- These are isolated checks: no real dealer was signed in, no payment was taken, no warranty was issued and no email was sent.
- Current compilation reports success. Recent checkout/pricing/confirmation service log searches returned no logs; this does not establish that the weekend attempts succeeded or explain their errors.

## AUTOSTATE account evidence (read-only, 24 November 2026 UTC)
- The dealership is stored as “Autostate car”; its account is active, not a test account, not deleted, with a confirmed login and no ban. Last recorded sign-in: 21 November at 19:58 UTC.
- It accepted trade terms on 21 November at 19:23 UTC. Its one £99 purchase is payment-verified/paid, with active cover from 21 November 2026 to 21 November 2027.
- Three quotes exist: two unfinished drafts have no checkout session; the first quote has a paid timestamp of 21 November at 19:25 UTC but was later saved as draft, step 2, on 22 November at 10:11 UTC. This is evidence of historical paid-quote state corruption, not proof of the precise error seen for every attempt.
- Page activity confirms repeated pricing/customer/checkout visits on 21–23 November. Available service-log searches returned no relevant errors, so the exact weekend error remains unknown.
- No account, password, payment, quote or warranty records were changed; no goodwill warranty or email was issued. The authenticated eligibility RPC is unavailable to the read-only tool.

## Approved remaining repairs and verification
- Both password sign-in and existing-session forwarding now use an internal dealer-only destination and merge registration into existing parameters, retaining fresh-sale and signed payment-return values. Transient account lookup failures keep the session and release the sign-in action.
- Trade-terms reads and acceptance are bounded; failed reads show retry instead of presenting default terms as current. Acceptance requires the server's `accepted: true` and matching displayed version. Failed, stalled or incomplete acceptance responses do not continue checkout.
- Credit-status reads and requests on the dashboard and checkout are bounded and recoverable; a timed-out request is described as unconfirmed, with a recheck action rather than automatic resubmission.
- Quotes, warranties, invoicing and cancellation history now throw read errors, show retries, and avoid misleading empty lists, zero totals or “all paid” messages when reads fail. Warranty/customer reads remain Panda- and dealer-scoped.
- Historic paid quotes are protected even if their status says draft: resume checks the paid timestamp and draft updates require `paid_at IS NULL`. A new independent draft is created instead of overwriting the historic paid quote.
- 93 focused regression checks pass (40 Vitest and 53 Bun checks). Twenty-two isolated browser scenarios cover password/existing-session handoff, preserved session after account read failure, rejected/stalled history reads and retries, terms failure/timeout/incomplete-response recovery, 320px terms layout, dashboard/checkout credit-request failures, and a paid quote historically labelled draft. Relevant screenshots were reviewed; preview compilation is clean.
- Browser checks use synthetic accounts/records and mocked service responses. AUTOSTATE's actual signed-in checkout/payment flow remains unverified because external unmanaged authentication is unavailable.

## Code-read inventory
“Partial” means only the indicated functional sections were read, not the whole screen or every action. No entry below implies a live payment check.

| Place | Coverage | Repeat-sale result |
| --- | --- | --- |
| Dashboard registration and quick actions | Functional code read; isolated new-sale interaction run | Uses fresh-sale entry; passes six-customer checkout check |
| Public registration handoff | Registration helper read; public pages only partially reviewed | Full public handoff remains unverified |
| Dealer sign-in | Source read; password/existing-session and read-failure recovery checked in isolation | Internal destination merges query parameters; transient read failures keep the session |
| Active shared dealer shell | Navigation, support and approval sections read; isolated navigation/support run | New Quote resets state; call/WhatsApp visible on phones |
| Legacy sidebar | Source read | Not evidence for the active shell; no live flow run |
| Quotes: new/resume/history | Source read; history recovery checked in isolation | Read failures show retry; paid timestamp prevents historic draft-labelled paid quote resumption |
| Warranties: new/history | Source read; warranty/invoice/cancellation recovery checked in isolation | Read failures show retry instead of empty/all-paid states |
| Credit-status start/request | Source read; read/request recovery checked in isolation | Bounded requests release action, show unconfirmed result and allow recheck |
| Journey state and draft save | Full helper/provider/save code read; isolated state/save guard run | Different registration detaches prior customer/quote; draft saves exclude settled statuses |
| Pricing, vehicle replacement and options | Functional code read; isolated selection/blocked-replacement run | Fresh-sale fixes pass; separate mileage eligibility enforcement requires review before any change |
| Customer details | Validation/submission code read; isolated six-customer forms run | Distinct empty forms and validation worked; no real customer records written |
| Checkout: card, hosted, embedded, invoice and free | Creation/submission/recovery sections read; entire checkout service read | Card completion callback and bounded requests present; terms acceptance and credit request recovery checked in isolation |
| Trade terms acceptance popup | Full source read; failed/stalled/incomplete acceptance and term-read retry checked in isolation | Current displayed version must be confirmed before continuation; timeouts release action |
| Payment confirmation | Full source read; isolated failure/retry run | Signed check and explicit fresh start present; actual Stripe completion unverified |
| Paused product and cover switch | Availability/switch/route read; paused journey body not read | Paused route redirects to live product; do not call the retained paused journey fully checked |
| Annual pricing service | Service/validation source read | Modern annual request validated; legacy request branch deserves a separate server-pricing review, not a settings change |
| Signed card return and dealer webhook | Dealer handlers and shared finalizer read | Signed ownership/amount checks present; no live webhook or payment run |
| Shared sale completion | Full helper and deployed completion function re-read for this lost-sales report | Customer warranty insert is idempotent; cross-customer quote reuse is rejected and updates require no paid timestamp plus unfinished status (or invoice-to-paid settlement) |
| Other Stripe handlers, invoice settlement, email and vehicle services | Located, not all fully read | Outstanding audit; not checked |
| Dealer auth | Main loading sections and bounded helper read | Bounded profile load present; complete live session chain unverified |
| Database uniqueness | Live definitions read | Customer uniqueness is email plus plate; no dealer-wide one-sale limit found |
| Database completion/eligibility | Live function definitions and relevant migrations read | Credit/free eligibility is separate from ordinary card purchasing; background settled-quote protection requires review |
| All other migrations, triggers and access policies | Not exhaustively read | Outstanding audit; not checked |

## Remaining verification
### Lost-sales recheck — 24 November, 18:48 UTC
- User clarified that the abandoned AUTOSTATE attempts lost multiple sales; this is a checkout incident, distinct from a customer's missing portal warranty.
- Fresh read-only counts confirm 18 recorded weekend checkout page visits, three saved quotes, two unfinished quotes and one verified paid customer sale. Visit counts are not unique customer counts and cannot establish the number or value of lost sales.
- Downloaded live `DealerLogin-BzBLB32W.js` lacks the prepared bounded account-loading/session-preservation messages. Live `DealerQuotesList-Bryp-6s3.js` lacks `paid_at`, View warranty and read-error retry controls. Current source includes those protections. Live `Step4Checkout-D-y1STqu.js` includes trade-terms recovery, trade-benefit recheck and bounded checkout messages; live `Step5Confirmation-9MmndfN5.js` includes payment recheck.
- Publication is still needed for the outstanding frontend repairs. No new charging or permission changes were made, and no settled records, accounts, payments, messages or goodwill warranties were altered.
- No real dealer session/payment was run; exact failed-attempt errors remain unavailable. Do not describe the lost-sales incident as fully resolved until the dealer's signed-in purchase flow is verified after publication.

#### Fresh code-read coverage for the lost-sales report
- Read current `DealerJourneyContext`, `dealerJourneyState`, `useDealerQuoteSave`, `useDealerAuth` and `DealerLogin`: explicit new-entry reset, separate registration/customer/quote state, settled draft-write guards, bounded session/account checks and retry recovery are present.
- Read current dashboard/new-entry navigation in the active shell, legacy sidebar and App entry redirects: new actions use the fresh URL directly or redirect there. Read Quotes new/resume/delete/history and Warranties new/history sections: genuine drafts resume, processed quotes open warranty records, and failed reads have retry controls. Other list actions were not audited.
- Read pricing lookup/new-entry/persist sections, annual pricing hook/service, customer submission, checkout terms/benefits/create/submit sections, TradeTermsDialog and DealerCreditStatus: errors release actions or provide recovery; current-version terms confirmation is required; an invoice restriction does not disable ordinary card purchasing. Background MOT enrichment is best-effort and does not gate quoting. Commercial eligibility/price rules were not changed.
- Read all of dealer-create-checkout and the dealer/customer-paylink quote guards: no dealer-wide one-sale cap; pending reuse checks both normalized email and registration plus ownership; settled quote checkout is rejected before charging. Free/invoice/card branches retain their existing offer/settings rules.
- Read dealer-confirm-payment, dealer-stripe-webhook, partner-confirm-payment, dealer-confirm-invoice-payment, dealer-intro-free-decision, dealerCardPayment, dealerSaleFulfilment and deployed complete_dealer_sale: shared completion is idempotent and existing paid records are not rewritten by repeat completion. Confirmation UI offers payment recheck and an explicit new quote. No handler was invoked to initiate/settle a real transaction.
- Re-ran 22 Vitest and 69 Bun checks for processed checkout, bounded requests, terms loading, card/sale completion, duplicate matching, customer validation, journey/login targets, auth loading and progress. All pass when using their correct runners. Latest preview compilation reports build OK. No further application-code changes were needed for these already-prepared repeat-sale protections; publication and actual signed-in verification remain outstanding.

The approved reliability gaps are repaired and checked in isolation. Verify AUTOSTATE's actual account and payment journey before promising incident resolution. Broader charging, eligibility, background completion and access rules require their own scoped review; leave current settings and settled records untouched.

AUTOSTATE is identified. External unmanaged authentication prevents an automated real signed-in payment check. Do not tell the dealer the incident is fully resolved based on isolated checks, and do not issue the promised goodwill warranty or contact them automatically.