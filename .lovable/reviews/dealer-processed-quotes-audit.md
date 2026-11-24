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