# Dealer Coming Soon — Conversion Redesign

Scoped to `/dealer-portal/coming-soon` and its surrounding chrome. No backend/schema changes. Form still writes to `trade_warranty_signups` and triggers the existing notification email.

## 1. Hero (above the fold)

`src/pages/dealer-portal/DealerComingSoon.tsx`

- Replace big "Coming Soon" headline with:
  - Eyebrow (small, orange): `Early dealer access now open`
  - H1 (navy): `Offer Trade Warranty to Your Customers — Without the Admin`
  - Sub: `Panda Protect helps UK motor trade dealers sell flexible warranties, handle claims, and give customers extra confidence.`
- Remove the left-column benefit grid + "what happens next" stack. Replace with a single, calm 3-item benefit list:
  1. Increase profit per vehicle
  2. No claims admin — handled by Panda Protect
  3. Flexible cover — cars, vans, EVs, motorcycles
- Right column: form card only (see §2).

## 2. Form — shorter & calmer

Same component, fewer visible fields.

Visible fields (step 1):
- Dealership name (required)
- Contact name (required)
- Email (required)
- Phone (required)
- Monthly vehicle sales (required)

Hidden / removed from step 1:
- Current warranty provider → remove from initial form (kept in DB column, sent empty)
- Where do you sell vehicles? → remove from initial form
- Anything else → remove from initial form

Copy:
- Card title: `Get early dealer access`
- Sub: `Leave your details and our trade team will contact you within 1 working day.`
- Button: `Request Dealer Access`
- Microcopy under button: `No obligation. Takes less than 30 seconds. We'll only contact you about Trade Warranty.`

Validation:
- Keep blur-only validation (already in place). Confirm no errors render before blur or submit.
- Phone regex: widen to accept `+44`, leading `0`, spaces, dashes, parentheses. Strip non-digits before length check; require 10–13 digits.

Trust row under the button:
- `No obligation · Takes <30s · UK motor trade support · Claims handled by Panda Protect`

## 3. "What happens next" — single clean row

Below the hero, full width, light grey background:
```
1. Register          2. Quick call            3. Start selling
Tell us about        Our trade team           Get access to warranty
your dealership.     confirms your needs.     options and support.
```
Numbered orange circles, navy titles, grey body. No card borders.

## 4. Navigation simplification

`src/components/dealer/DealerPublicHeader.tsx` (only on dealer-portal routes; do not touch the consumer header).

- Keep: Home, Why Us, Resources, Contact
- Primary button: `Register Interest` (scrolls to form)
- Secondary text link: `Dealer Login`
- Move `Call Us` / `WhatsApp` out of the top nav into a small sticky support strip at the bottom on mobile, or a single inline "Need help? Call 0330…" line in the footer area of the hero.

## 5. FAQ — lighter & shorter

`src/components/dealer/DealerFAQSection.tsx`

- New prop `compact?: boolean` and `limit?: number`.
- When compact: render a single column (or 2-col) of the 5 selected FAQs only, with a `View all FAQs` link to `/faq/traders`.
- Selected FAQs:
  1. Do I need to process the warranty myself?
  2. What happens if there is a warranty claim?
  3. Is warranty support included for dealerships?
  4. When will I receive the warranty documents?
  5. Who do I contact for warranty support?
- Styling: keep current white card + orange left border (already updated). Remove the per-category orange uppercase headings in compact mode. Single soft heading: `Common questions from dealers`.
- Move the FAQ further down the page (after benefits + how it works), not directly after the form.

## 6. Page order on DealerComingSoon

```
Header (simplified)
Hero (form right, 3 benefits left)
What happens next (3 steps)
Why dealers choose Panda Protect (3 detail cards — moved from old left column)
Compact FAQ (5 items + View all)
Final CTA strip → scrolls to form
Footer
```

## 7. Visual hierarchy cleanup

- Use orange only for: primary CTA, eyebrow text, FAQ left accent, step numbers.
- Replace orange backgrounds on secondary blocks with `bg-gray-50` / white.
- Reduce border usage on benefit cards — use spacing + soft shadow instead.

## Technical notes

- No DB migration. The removed form fields are simply not collected in step 1; columns remain nullable in `trade_warranty_signups`.
- Submission payload sends empty strings for the dropped fields to preserve the existing edge function contract.
- Nav changes are scoped to `DealerPublicHeader` only.
- FAQ `compact` mode is additive; existing usages on `FullWarrantyService` and `ClaimsHandlingService` keep current behaviour.
- All copy lives inline in the components (no i18n layer in this project).

## Out of scope

- Backend/edge function changes
- Adding new trust logos / Trustpilot widgets (none provided)
- Redesigning the customer-side homepage
