# Brand-aware emails: one backend, two brands

Goal: every email uses the branding, links and sender address of the website the person is actually using — Buy A Warranty emails for buyawarranty.co.uk, Panda Protect emails for pandaprotect.co.uk. Both keep sharing the same Supabase backend.

## How the brand is decided

Each email picks its brand from the first of these that is known:

1. **The website in use.** When a customer or staff member does something on a site, the browser tells the backend which address they are on. buyawarranty.co.uk → Buy A Warranty, pandaprotect.co.uk → Panda Protect. This covers quotes, signups, password resets, claims, contact forms and anything staff send from a dashboard.
2. **The customer's own record.** For automatic emails sent later (abandoned cart, reminders, review requests, scheduled sends) there is no live website, so the brand saved on the customer record is used.
3. **A safe default** for anything still unknown: Buy A Warranty, since that is the established customer-facing business.

## Brand marker on records

- Add a `brand` field to customers, leads/quotes and claims, filled in automatically at the moment the record is created, from the website in use.
- Existing records get a sensible one-off fill: records belonging to a dealer account become Panda Protect, everything else becomes Buy A Warranty.

## What changes in the emails

A single shared brand definition holds, per brand: display name, website address, logo, sender addresses (quotes/support/no-reply), support email and phone, and the accent colour. Every email-sending function reads from it instead of hard-coded text.

Fixed items replaced across all 47 email functions:
- Sender name and address
- Reply-to and support addresses
- Logo and wordmark
- All links in the body and footer (including quote, policy and dashboard links)
- Brand name in subject lines and copy
- Accent colour on buttons

## Rollout order

1. Shared brand definition + brand detection helper.
2. Database field and backfill.
3. Customer-facing emails: quotes, welcome/credentials, policy documents, payment and invoice, password reset, abandoned cart, reminders, review requests.
4. Form and claim emails: contact, claims, cancellations, access requests.
5. Staff/admin emails: sale notifications, invites, credential changes, dealer signup decisions.
6. Check the email log after deployment to confirm each brand's sends carry only its own domain.

## Technical notes

- New `supabase/functions/_shared/brand.ts` exporting `BRANDS` and `resolveBrand(req, { customer, fallback })`, reading the request `Origin`/`Referer` header first, then the record's `brand` column.
- Functions invoked from the browser get the origin automatically; cron and webhook-triggered functions pass the record's brand explicitly.
- Dealer-portal functions stay Panda Protect regardless of origin.
- Migration adds `brand text not null default 'buyawarranty'` with a check constraint, plus backfill by `dealer_id`.
