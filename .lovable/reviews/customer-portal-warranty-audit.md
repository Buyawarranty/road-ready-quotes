# Customer portal warranty repair

## Rule
A confirmed Panda Protect warranty must appear under the purchaser's sign-in email, with its own registration, reference, cover dates and customer-safe documents. A temporary read failure must not be presented as an empty account. Dealer trade charges must not appear in the customer portal.

## Confirmed incident
The screenshot's authenticated account has an Active, payment-verified Panda dealer sale and an existing dealer warranty, but had no `customer_policies` row. The missing portal row was created with the existing reference, authoritative dealer warranty dates and login ID. Its payment amount is null. The existing customer, dealer warranty and quote were compared before/after and stayed byte-for-byte unchanged.

The one other eligible issued warranty with the same missing-record defect was also repaired through the same insert-only helper. Both repairs preserve settled customer/warranty/quote rows and exclude dealer charges. No other eligible active/issued warranties are missing a portal row in the checked data.

## Places inspected in this request
| Place | Source read | Finding and treatment |
| --- | --- | --- |
| Customer sign-in and account | `CustomerDashboard.tsx`, `customer-login/index.ts` | Silent failed queries/empty state, stale post-login lookup and diagnostic controls. Replaced with bounded ownership lookups, merged vehicle results, explicit recovery, preserved selection and readable controls. Successful customer authentication recovers missing dealer policies using the authenticated email. |
| View as customer | `CustomerDashboard.tsx` | Retains RLS and target-customer matching; staff login ID is excluded from the lookup and realtime email now uses the viewed customer. |
| Customer vehicle/details/documents | `CustomerDashboard.tsx` | Hydration is bounded; dealer trade amounts are hidden and both PDFs use the same official Panda sources as the warranty email. |
| Dealer card return | `dealer-confirm-payment`, `_shared/dealerCardPayment` | Uses shared completion. Previously created dealer warranty only. Shared completion now additionally ensures a missing customer portal record. |
| Background dealer Stripe completion | `dealer-stripe-webhook` | Server retrieves and verifies Stripe before shared completion; inherits the portal repair. |
| Partner paid checkout and return | `partner-checkout`, `partner-confirm-payment` | Live payment uses the same verified completion; inherits repair. Test/live-test examples intentionally do not issue active cover and remain unchanged. |
| Dealer invoice issuance/settlement | `dealer-create-checkout`, `dealer-confirm-invoice-payment` | Both use shared completion; valid active invoice cover gets a portal row without presenting the dealer invoice as a customer payment. |
| Immediate free cover and approval | `dealer-create-checkout`, `dealer-intro-free-decision` | Active free cover uses shared completion; pending/rejected cover does not qualify. Offer settings are unchanged. |
| Test dealer completion | `test-complete-purchase` | Test-dealer restrictions unchanged; initial issuance uses shared completion. Database trigger also catches warranty creation. |
| Automatic/dealer-sent access email | `dealer-warranty-email`, `dealer-send-customer-warranty`, `_shared/customerPortalLogin` | Login creation alone previously did not ensure warranty data. Both now pass sale ID to the insert-only portal helper. Existing passwords remain unchanged. |
| Dealer database completion | Live `complete_dealer_sale`, source migration | Previously inserted `dealer_warranties` only. New warranty/customer-detail triggers ensure missing portal rows; existing completion function remains unchanged. |
| Customer/policy insert and linking triggers | Live trigger functions read | Existing user-by-email and PDF population hooks work on the new row; no existing RLS or settings were changed. New creation helper is service-only, checks Panda ownership, active/issued state and valid contact details, and inserts only if absent. |
| Public card/Bumper automatic fulfilment | `stripe-webhook`, `process-bumper-success`, `handle-successful-payment` | Card and Bumper converge on a policy-writing function; its new-row insert previously ignored its error. Error handling is corrected rather than reporting successful fulfilment with missing portal details. |
| Staff manual entry and external payment | `ManualOrderEntry`, `confirm-external-payment` | Both explicitly insert/update portal policy and check write errors. Existing behaviour unchanged. |
| Manual Bumper and batch editing | `manual-bumper-completion`, `BatchPolicyQueue` | Work from an existing policy; batch edits mirror customer details. Not a new-warranty issuing path; unchanged. |
| Scheduled activation | `process-scheduled-w2000` | Reads/activates existing policy records, so it does not create this missing-record problem. Unchanged. |

## Verification boundaries
Production checks confirm the reported warranty exists, its reference/start/expiry/login match, trade amount is excluded and settled rows were preserved. Existing RLS was exercised under the reported customer's authenticated identity and permits both the warranty and linked customer/vehicle reads without new grants. Fifty-seven focused regression checks cover ownership lookups, multiple vehicles, failed reads, view-as, fail-closed trade amount display and shared completion. Nine isolated 320px/393px/1191px browser scenarios verify populated/empty/error warranty views, recovery and official document opening without overflow or page errors. Retained warranties are scoped to the same identity; a different sign-in or view-as target clears the previous account's view.

Signed-in customer/dealer sessions cannot be minted for this user-managed Supabase project; a real customer sign-in and real payment are not verified by isolated browser checks. No payment, password reset or email was initiated by this repair. Eleven affected edge functions were deployed; frontend changes require publication.

The migration introduced no new linter warnings. Existing security warnings predate this request and were not changed.