# Purchased warranty account access

## Rule
A confirmed purchased warranty must appear for the customer using the purchase email after account creation, sign-in, reload and refresh. Trade costs remain private, and settled sales, payments, emails and account passwords remain unchanged.

## Account evidence
Read-only checks found Ammara’s active FP14UBL warranty, reference PP-2611-402020, already linked to the customer account created on 24 November. The account is confirmed; the policy matches both login ID and email, is not deleted, contains no dealer payment amount and runs from 24 November 2026 to 24 November 2027. Existing customer SELECT policies permit both the policy and its vehicle details for that identity. There are other Ammara accounts; the exact sign-in email is awaiting confirmation.

The published CustomerDashboard-D7HwOPq8.js still contains the retired “No Policies Found” diagnostics, unlike the corrected preview. Publication is needed; a downloaded source check does not establish actual signed-in behaviour.

## Code audit
| Place | Read/check result |
| --- | --- |
| Customer dashboard arrival, reload and Refresh warranties | Previously only read existing policies: missing-record recovery was bypassed after signup, restored sessions and refresh. Shared loader now calls authenticated recovery first. Existing policies remain visible if recovery is unavailable; failed recovery cannot falsely report an empty account. |
| Customer dashboard login | customer-login authenticates before existing purchase recovery. No payment or password changes are made by recovery. |
| Account creation and confirmation | Auth signup can enter the dashboard directly, bypassing customer-login. Dashboard arrival now covers this path without changing signup settings. |
| Staff-created customer accounts | create-customer-account authenticates staff before account creation; existing policies remain readable by email even without a login ID. Dashboard arrival now covers recovery after account creation. Existing credential/note behaviour is outside this repair and is unchanged. |
| Multiple warranties and email/login matching | loadCustomerPortalPolicies merges both identity lookups with exact escaped email matching and existing RLS; vehicle reads use an explicit safe field list and dealer charges are suppressed. |
| View as customer | Uses only the target customer ID/email and never the staff account ID; the new recovery is deliberately skipped. |
| Dealer card return, Stripe webhook and partner card return | dealer-confirm-payment, dealer-stripe-webhook and partner-confirm-payment use finaliseDealerCardPayment; dealerCardPayment validates Stripe-read payment/mode/ownership/amount and delegates to syncDealerSale. |
| Direct consumer payment fulfilment | handle-successful-payment inserts customer_policies and asserts policy-write success rather than claiming completion after a failed insert. Existing policies are read by email/login ownership; this is separate from dealer fulfilment and was not changed. |
| Dealer invoice and introductory cover | dealer-confirm-invoice-payment and dealer-intro-free-decision delegate to syncDealerSale. dealer-create-checkout invoice/free branches also delegate there. Existing approval and pricing rules are unchanged. |
| Fulfilment and repeated completion | syncDealerSale calls complete_dealer_sale and ensureDealerCustomerPortalPolicy. Existing policies return unchanged, and paid quote/warranty rows are protected on repeat completion. |
| Automatic and dealer-sent warranty emails | dealer-warranty-email and dealer-send-customer-warranty use ensureCustomerPortalLogin, which first ensures a customer-safe policy. Email documents and portal links already exist. No email is sent by this repair. |
| Database triggers and policy creation | Read deployed complete_dealer_sale, ensure_dealer_customer_portal_policy, create_missing_dealer_customer_portal_policy, link_policy_to_user and link_policy_to_user_by_email, plus actual trigger definitions. Missing-policy creation requires eligible Panda dealer cover, valid customer email, matching dealer warranty and issued dates/reference; existing records return unchanged. |
| Customer permissions | Read existing customers/customer_policies/dealer warranties/customer policies. No permissions or grants changed. Recovery checks a real session and confirmed email, ignores request identity overrides and returns no personal details. |

## Verification boundaries
31 focused recovery/privacy/fulfilment/card tests passed. Twelve isolated browser scenarios passed at 1191, 393 and 320 pixels: existing warranty, missing-policy recovery on arrival/reload, empty account and failed-read refresh. Reviewed desktop and phone screenshots; reference, vehicle and dates rendered, documents opened, controls stayed within the viewport, and no page errors occurred. The deployed recovery service rejected a signed-out caller with 401. Preview compilation reports build OK. Final read-only checks confirm exactly one matching policy with authenticated read grants and no trade amount.

Real signed-in customer verification is unavailable: this externally managed Supabase project cannot provide a browser session. No payment, password change, email, test account or settled-record update was initiated. Isolated tests are not a substitute for Ammara signing in after publication.