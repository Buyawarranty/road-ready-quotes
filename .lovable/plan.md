## Goal
Ensure that when a sales/admin user sends a quote, a copy of the exact same email is delivered to the **authenticated** sales user's registered account email — derived server-side, not from client input.

## Root cause
`send-admin-quote` (edge function) only sends to `to` + a client-supplied `cc`. The sales user email is currently picked client-side in `GetQuoteTab.tsx` (`adminEmail` from `supabase.auth.getUser()` → `admin_users.email`) and passed as `cc`. If that fetch fails, hasn't resolved, or is tampered with, the sales user never receives a copy. The function never independently identifies the caller.

`send-quote-email` (used by `PricingTable`, `QuoteDeliveryStep`, `DealerPricingTable`) is a public/customer flow — no sales user involved, so no change needed there.

## Changes

### 1. `supabase/functions/send-admin-quote/index.ts`
- Require an `Authorization: Bearer <jwt>` header. Reject with 401 if missing/invalid.
- Use the service-role Supabase client to:
  - Call `auth.getUser(jwt)` to identify the caller.
  - Look up `admin_users` by `user_id` (fallback by `email`) with `maybeSingle()` to get the active sales user record (email + name).
- Build recipient list:
  - **Primary send**: `to = customerEmail`, `cc = [additional emails the caller provided]` (sanitised: strings only, dedup, drop customer email and the sales user email).
  - **Sales-user copy**: send a **separate** Resend email to the authenticated sales user's email with the identical HTML body and subject prefixed `[Copy] `. This avoids leaking the sales user's address to the customer via CC headers and guarantees delivery even if the customer send partially fails.
- Stop trusting `cc` from the client as the source of the sales-user copy. Keep accepting `additionalEmails` for genuine extra recipients, but never use it to derive the sales user.
- Logging: emit clear, structured logs:
  - `quote_email.customer.sent` / `quote_email.customer.failed`
  - `quote_email.sales_copy.sent` / `quote_email.sales_copy.failed`
  - Include `caller_user_id`, `caller_email`, `to`, Resend message IDs, and error messages.
- Error handling:
  - If customer send fails → return 500 with the error (quote send considered failed).
  - If only sales-user copy fails → return 200 with `{ customerSent: true, salesCopySent: false, salesCopyError }` so the UI can warn but not block.
- Add `supabase/config.toml` entry:
  ```toml
  [functions.send-admin-quote]
  verify_jwt = true
  ```

### 2. `src/components/admin/GetQuoteTab.tsx`
- Remove `adminEmail` from the CC list passed to the function (the server now handles it).
- Keep the UI hint ("A copy will be sent to you: …") but read it from the function response (`salesCopyRecipient`) so the displayed address is the one the server actually used.
- Toast: on response, show success + warning if `salesCopySent === false`.
- Lines affected: ~816-855 and ~1040-1095.

### 3. `src/components/admin/FollowUpEmailDialog.tsx`
- Same treatment: rely on server to copy the authenticated sales user. No client `cc` for the sales user. Show warning if `salesCopySent === false`.

### 4. Deploy
- Deploy `send-admin-quote` after changes.

## Non-goals
- `send-quote-email` (customer-initiated public quote flow) is untouched — there is no sales user in that path.
- No template/PDF changes; the sales copy reuses the exact HTML the customer receives, so attachments/links are identical by construction.

## Verification
- Sign in as a sales user with a known `admin_users.email`, send a quote to a test customer address.
- Confirm two Resend sends in logs: one to the customer, one to the sales user's registered email.
- Confirm the customer email does **not** include the sales user in CC headers.
- Tamper test: call the function from the browser with a forged `cc`/`adminEmail` payload — server ignores it and still copies the authenticated user.
- Failure test: temporarily break the sales-copy send (e.g. invalid sales address) → customer send still succeeds, response indicates `salesCopySent: false`, UI shows warning.
