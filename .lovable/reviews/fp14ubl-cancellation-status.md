# FP14UBL cancellation status

## Rule
A cancelled warranty must show Cancelled wherever its cover is displayed, without changing payment history or cancelling a separate replacement for the same registration.

## Confirmed records
- PP-2611-402020: customer Cancelled; its stale portal policy and dealer warranty were Active. Both copies are now cancelled.
- PP-2611-402022: separate FP14UBL replacement remains Active.
- PP-2611-402021 / FP14UPL remains Active.
- Original customer/payment/quote and replacement records were checked before/after the repair and preserved. Only the reported policy and dealer-warranty status copies were corrected; no bulk historical reconciliation.

## Places checked by reading code
| Place | Finding and action |
| --- | --- |
| CustomerDashboard and customerPortalPolicies | Portal read used only the policy copy and rendered cancelled as INACTIVE. Reads now include the exact customer's status, terminal cover wins over stale active copies, and both selector and details show Cancelled. |
| DealerWarrantiesList | Reads own dealer's Panda customers and labels cancellations correctly; unchanged. |
| DealerAdminSales, CancellationsTab, CustomersTab, ArchiveCustomerDialog, CancelWarrantyDialog | Cancellation paths update the customer or linked policy. The new customer trigger makes every customer-status transition synchronize its exact portal/dealer copies atomically; existing notes, archive behavior and permissions are unchanged. |
| review_dealer_cancellation | Saved only the customer cancellation. The new trigger covers the approved-request workflow without changing authorization or fees. Pending requests remain pending until reviewed. |
| complete_dealer_sale and dealerSaleFulfilment | Repeated completion preserves an existing dealer warranty; new rows take the customer's status. New row/status guards prevent terminal copies being overwritten. |
| ensure_dealer_customer_portal_policy, customerPortalPolicy and customer-policy-recovery | Existing creation guards reject terminal sales and never repair their stale copies. Kept creation/recovery read-safe; cancellation propagation is now a separate trigger. |
| dealerCardPayment, dealer-confirm-payment, dealer-stripe-webhook, partner-confirm-payment | Verified-payment retries preserved rows but could report cover as newly confirmed; unfinished cancellations could be reactivated. Terminal retries now stop, updates restrict live statuses, and a race is rechecked before completion. No payments were initiated. |
| dealer-confirm-invoice-payment | Could replace cancelled/scheduled cover with Active. Terminal invoices now stop and settlement preserves existing cover status; conditional updates handle concurrent changes. |
| dealer-warranty-email and dealer-send-customer-warranty | Could send active-cover confirmations for cancelled rows. Both now read/guard status before login creation or email sending. Active template previews exclude terminal rows. |
| send-welcome-email, send-welcome-email-manual | Could send a new activation email for a cancelled Panda policy; now check saved policy/customer status before account changes or sending. Other brand behavior is unchanged. |
| process-scheduled-w2000 and send-to-warranties-2000 | Could process or activate cancelled scheduled records. Scheduled processing selects live/unarchived cover, conditional updates avoid cancellation races, and Panda activation rejects saved terminal cover. |
| partner-api-v1 and partnerWarrantySummary | API reads the exact customer's saved status, not a stale policy copy; unchanged. Partner success uses shared card completion and therefore inherits the terminal guard. |
| useDealerDashboard, DealerAnalytics and dealerSales | Read customer status; dashboard cover totals and revenue helpers already exclude cancelled/refunded records. Quotes retain completed payment history and link to warranties rather than reopening paid quotes. |
| Customer/dealer database status guards | New service-only trigger functions synchronize terminal states by customer_id and prevent stale portal/dealer activation writes. No access permissions, settings, brand rules or offer entitlements changed. |

## Verification
- Live database read-back: reported cover cancelled in all three copies; both separate active covers and payments preserved.
- Rollback-only database regression: stale activation blocked, future cancellation synchronized, replacement initially active, creation recovery rejects cancelled cover, service-only execution preserved. All temporary updates rolled back.
- 60 focused Vitest checks and five existing Deno email tests passed.
- Isolated populated customer screen: selecting the cancelled cover, switching to its active replacement, reload and switching back passed at 320px, 393px and 1191px with no page errors or horizontal overflow. Screenshots show the exact reference and CANCELLED.
- Ten affected services deployed. Preview compilation reports build OK.
- Real customer sign-in remains unverified because authentication is externally managed. Frontend labels require publication; the saved status correction and service guards are already live. No real emails, payments, account changes or new cover were initiated.
- Pre-existing security findings are unrelated and were not changed.