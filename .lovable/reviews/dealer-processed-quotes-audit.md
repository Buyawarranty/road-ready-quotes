# Processed dealer quotes

## Rule
Once a sale is processed, it should show its existing warranty—not “Resume quote”, an unfinished step or another payment request. Genuine unfinished quotes should remain resumable. Existing paid, sent, refunded and closed records must stay unchanged.

## Reported record
The screenshot quote is already `paid`, has a payment timestamp and an active linked warranty. Its stored step is 3. The list used the step for its label and always displayed Resume quote, even though its click handler already redirected paid quotes to warranties. Global caching could also keep the earlier draft visible for ten minutes.

## Places checked by reading their code
| Place | Follows the rule? | Treatment |
| --- | --- | --- |
| Dealer Quotes list (`DealerQuotesList.tsx`) | Previously no: unconditional Resume/delete controls and step-only completion display | Shared payment-aware Completed label, View warranty filtered to the registration, no settled-delete control; refresh on arrival/focus overrides global stale caching. |
| Dealer Home and its data (`DealerDashboard.tsx`, `useDealerDashboard.ts`) | Previously partial: a historic paid draft counted as needing attention and was labelled draft | Include paid timestamp, share progress classification, link processed recent quotes to warranties, refresh on arrival/focus. Historical “Quote created” activity remains historically accurate and links to the corrected list. |
| Dealer Analytics (`DealerAnalytics.tsx`) | Previously no: all non-won/non-lost quotes counted uncompleted, including paid/invoiced | Only genuinely editable unpaid quotes count uncompleted; include paid timestamp and refresh. |
| Dealer Warranties (`DealerWarrantiesList.tsx`) | Cover/payment split correct, but quote-link search was ignored | Honour initial search parameter and refresh on arrival/focus so View warranty reaches the matching existing registration. |
| Journey session storage (`DealerJourneyContext.tsx`) | Yes: explicit new entry resets, back/resume preserves drafts | Unchanged. Storage is advisory; checkout now checks current quote status again on the server. |
| Pricing/customer/claim-handling journey (`Step3Pricing.tsx`, `Step2Customer.tsx`, `ClaimHandling.tsx`) | Use common draft-save helper; no direct settled mutation | Existing behavior preserved. Paused claim-handling route remains paused. |
| Draft saving and Save & exit (`useDealerQuoteSave.ts`, `DealerJourneyLayout.tsx`) | Yes: update requires editable status and null paid timestamp; a settled row stays untouched | Unchanged. Separate draft creation cannot overwrite the settled quote. |
| Legacy quote creation/templates (`DealerCreateQuote.tsx`, `useDealerQuoteTemplates.ts`) | Yes: creation is new-row only; template/last-plan reuse does not reuse a quote ID | Unchanged. |
| Dealer card/invoice/free checkout (`dealer-create-checkout`) | Previously no: incoming quote ID lacked processed-state check | Check dealer-owned quote status/payment timestamp before a customer write, offer reservation or new checkout session; return 409 for processed/missing quotes. Existing sale deduplication also read and retained. |
| Customer pay link (`CustomerQuotePage.tsx`, `customer-create-checkout`) | Previously no: endpoint read status but never used it to stop repeat charge | Same server processed-quote guard before Stripe creation, and customer screen reads the explanatory response rather than a generic invoke error. |
| Dealer quote email (`dealer-quote-email`) | Previously no: could send a new quotation for an already issued sale | Use same status/payment guard; no emails sent in verification. Existing email pricing/branding unchanged. |
| Dealer card return/background (`dealer-confirm-payment`, `dealer-stripe-webhook`, `_shared/dealerCardPayment`) | Correct signed/Stripe-read completion and shared sale synchronization | Inherits the database retry-preservation fix; no changes to Stripe keys, settings, permissions or signature behavior. |
| Partner checkout/return (`partner-checkout`, `partner-confirm-payment`) | Partner live checkout blocks existing paid customer; shared finalizer for issued cover, no dealer quote ID on partner checkout | Unchanged, inherits shared database completion. Test/live-test modes unchanged. |
| Invoice settlement (`dealer-confirm-invoice-payment`) | Uses authorised settlement and shared synchronization | Unchanged; new database guard allows invoice-to-paid transition only, not repeated settled rewrites. |
| Free approval/manual test completion (`dealer-intro-free-decision`, `test-complete-purchase`) | Both call common synchronization on first issuance, with existing approved/test restrictions | Unchanged, inherits guarded future completion. No free warranty or test sale initiated. |
| Shared fulfilment (`_shared/dealerSaleFulfilment.ts`) | Uses `complete_dealer_sale` for quote/warranty completion | Unchanged, inherits database guard. |
| Live/source `complete_dealer_sale` database function | Previously rewrote paid quote updated_at/status on every retry | New completions set step 5; paid/sent/refunded/closed quotes are not rewritten, invoices can legitimately become paid; existing warranty quote cannot be attached to a different customer. No data backfill. |
| Staff usage counts (`dealer-signup-activity`, `dealer-portal-usage`) | Counts all quote history/usage, not unfinished quotes | Correct; unchanged. |
| Dealer API quote reads/creation (`dealer-api-v1`) | Reads stored history, creates separate new rows, no resume/update operation | Unchanged. |

## Verification
- 107 regression tests passed: 89 focused journey/payment tests and 18 dashboard/customer-sharing tests, including four executions of the real checkout/email handlers with isolated clients. They return 409 before any sale write, Stripe creation or email for processed quotes.
- Eight isolated browser flows verify processed quotes open the registration-filtered existing warranty without hydrating a draft or writing records; the only genuine draft resumes with its own quote ID at 1191px, 393px and 320px. Returning to Quotes after another completion refreshes the cached draft into a completed warranty at 1191px and 393px. No page errors or horizontal overflow.
- A production database regression calls repeat completion for the reported sale and confirms its quote, customer and warranty are byte-for-byte unchanged and the same warranty ID is returned.
- Three changed edge functions deployed. Frontend changes require publication.
- Real signed-in dealer verification is unavailable: this project's externally managed authentication cannot mint a browser session. Isolated checks do not verify the dealer's session. No payment or email was initiated.
- Existing security warnings were not introduced by this change and are separate from this repair.

## FP14UBL follow-up — 25 November 2026

**Rule:** a processed quote opens its existing warranty everywhere; it has no Resume/delete action and does not count as needing attention. Settled records, permissions and settings remain untouched.

### Read-only record check
FP14UBL quote `26548b26-ecc9-4d99-b899-dc888d05d35e` is already `paid`, with payment timestamp `2026-11-24T15:56:51.952564Z`, stored step 3, and an existing linked dealer warranty. Its customer currently has Cancelled cover status and a verified payment; this audit did not change either. Quote completion records issuance history, not current cover validity. FP14UPL is also paid and linked, with step 5.

### Current source versus live site
- Live `DealerQuotesList-Bryp-6s3.js` still contains unconditional Resume/delete actions and a step-only label, without paid-timestamp/progress handling.
- Live `DealerDashboard-_jYYX_DO.js` still counts draft/pending labels alone and lacks the paid-timestamp-aware attention rule.
- Live `DealerAnalytics-C4hTfUZa.js` lacks the corrected unfinished-quote classification and focus refresh.
- Current saved source already fixes all three. Publishing those saved pages is the remaining step; no record correction is appropriate.

### Places re-read in this request
| Place | Current source follows rule? |
| --- | --- |
| Quotes list, delete and resume | Yes: shared status/payment evidence, no settled delete/resume, registration-filtered warranty destination, arrival/focus refresh. Live page is outdated. |
| Dashboard and `useDealerDashboard` | Yes: paid timestamp is fetched; attention counts and recent-quote destinations use shared progress. Historical Quote created events remain history, not tasks. Live page is outdated. |
| Dealer analytics | Yes: shared progress counts genuine unfinished quotes only; arrival/focus refresh. Live page is outdated. |
| Warranties and cancellations | Yes: registration search is honoured, history refreshes, current cover/payment statuses remain separately readable. |
| Journey storage, pricing, customer details, paused claim-handling, Save & exit | Yes: fresh entry resets; resumed journeys preserve their own ID; draft updates require editable status and no paid timestamp. Save & exit is absent from confirmation. |
| Legacy quote creation and saved-template reuse | Yes: new quotes are inserts; templates copy configuration, not settled quote identity. |
| Dealer card/invoice/free checkout | Yes: shared processed-quote guard before writes; card metadata retains quote ID; invoice completion uses common fulfilment; free issuance is atomic. |
| Customer quote screen/payment-link service | Yes: server checks processed quote before payment; customer screen displays the explanatory refusal. Shared cover previews do not themselves issue or reopen cover. |
| Dealer quote email | Yes: shared processed-quote guard before sending. |
| Dealer payment return, embedded checkout and confirmation | Yes: payment verification precedes completion; confirmed sale refreshes related lists; free confirmation checks saved owned cover. |
| Dealer Stripe background webhook | Yes for this rule: Stripe-read verified session feeds the common finalizer, not the saved journey step. |
| Shared card finalizer and sale fulfilment | Yes: verification update is conditional; quote ID reaches guarded `complete_dealer_sale`. |
| Partner checkout and payment return | Yes for this rule: paid customer reuse is refused; partner sales have no dealer quote ID and finish through the same finalizer. |
| Invoice settlement | Yes: already-paid records return unchanged; genuine invoice settlement completes its linked quote. |
| Legacy free approval and manual test completion | Yes for this rule: already-processed requests return without a repeat issuance; first completion uses common fulfilment. |
| Live database `complete_dealer_sale` | Yes: settled quote rows are excluded from updates, cross-customer reuse is rejected, existing warranty rows remain unchanged on repeat completion. |
| Live database `issue_dealer_intro_free` / `review_dealer_intro_free` | Yes for this rule: issuance rejects processed quotes and completes atomically; legacy review returns already-reviewed records without updates. |
| Dealer API quote creation/read | Yes: reads stored history and inserts new quotes; no settled quote resume/update operation. |
| Staff signup activity and portal usage | Yes: count historical usage, not unfinished work; no misleading Resume action. |

### Verification and limits
- 69 focused Vitest tests and four existing Bun dashboard tests passed.
- Five isolated browser flows passed at desktop, 393px and 320px: UBL displays Completed with View warranty and no Resume/delete; its button opens `/dealer-portal/warranties?search=FP14UBL`; only a genuine separate draft resumes and counts as needing attention.
- Browser checks sent no remote database requests and performed no record writes. Current compilation reported success.
- Real signed-in verification is unavailable because the external backend cannot mint a sandbox session. The live site has not been published in this request; the publication control requires an explicit publish action.
- No payments, emails, settled records, cover statuses, permissions, settings or example data changed.