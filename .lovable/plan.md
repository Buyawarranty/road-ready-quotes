# Fresh start for the admin dashboard

Permanent deletion of the old copied records so every admin section starts empty, then a few clearly labelled sample records. Dashboard pages already handle empty lists, so nothing breaks.

## Kept (not touched)
- **Dealers:** all dealer accounts, dealer sign-ups / trade registrations, dealer profiles, dealer quotes, dealer users and their logins — everything needed to invite and onboard them.
- **Staff:** the two staff logins (info@ and prajwalchauhan) with their roles and permissions.
- **Settings:** pricing (annual plans, price matrices, vehicle rules, exclusions), email/SMS templates, document mappings, terms, feature switches, bank holidays, blog posts.

## Cleared (about 3.5 million old rows)
- Customers, policies, warranties, documents, notes, tags, notifications
- Leads, lead history, call logs, reminders, quick notes and backups
- Abandoned baskets, quotes, live quotes, step-2 attempts
- Email, SMS, WhatsApp and Trustpilot send logs and queues
- Page views, analytics, activity logs, UI events, click tracking
- Payments/transactions (Bumper, Worldpay), refunds, cancellations, complaints, contact messages, career applications
- Agent stats, timesheets, attendance, breaks, schedules, chat sandbox
- The other 21 old staff profiles (their records only — logins are blocked already because they have no Panda role)

## Samples added afterwards
- 3 customers with policies, named "SAMPLE – …" and using `sample@pandaprotect.co.uk` style addresses that cannot receive mail
- 2 contact/support messages and 1 cancellation, all prefixed "SAMPLE"
- No emails or texts are sent for them

## Warning
This cannot be undone. Buy A Warranty's own system is separate and keeps its data.

## Technical notes
- TRUNCATE ... CASCADE on cleared tables in batches; keep-list tables excluded explicitly; verify dealer/staff counts unchanged after each batch.
- Remove `admin_users` rows except the two staff; `user_roles` pruned to match. Auth users untouched.
- Check build and the Overview, Customers and Dealers pages load after clearing.
