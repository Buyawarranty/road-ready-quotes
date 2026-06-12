## Goal

Swap in the 20 supplied dealer/trade FAQs (and matching FAQPage schema) on the dealer surfaces and the main public `/faq` page. Customer-facing brand/landing/cover/homepage FAQs stay as they are.

## FAQ groups (4 categories)

1. **Account Setup & Onboarding** (3 Qs)
2. **Portal Integration & AutoTrader** (2 Qs)
3. **Claims, Processing & Instant Payouts** (2 Qs)
4. **Commercial Terms & Insurance** (2 Qs)
5. **Support & Trade Resources** (2 Qs)
6. **Dealer Warranty Service & Admin** (9 Qs — the "How do you support dealerships…" set)

## Files to change

### 1. New shared data + schema component
- **`src/data/dealerFaqs.ts`** (new) — single source of truth: array of `{ category, question, answer }` for all 20 FAQs, plus a flat array used for JSON-LD.
- **`src/components/dealer/DealerFAQSection.tsx`** (new) — collapsible accordion grouped by category, brand-matched styling (uses the same orange gradient pattern as `BrandPageFAQ` so it feels native). Accepts optional `compact` / `limit` prop for shorter placements.
- **`src/components/dealer/DealerFAQSchema.tsx`** (new) — emits `<script type="application/ld+json">` with the FAQPage schema (verbatim from the supplied JSON, generated from the same data file so they never drift).

### 2. Pages that get the new FAQs + schema
- **`src/pages/FAQTraders.tsx`** — replace existing trader FAQ content with `<DealerFAQSection />` + `<DealerFAQSchema />`. Keep page header/SEO/CTA intact.
- **`src/pages/dealer-portal/DealerComingSoon.tsx`** — append `<DealerFAQSection />` + `<DealerFAQSchema />` below the existing interest form.
- **`src/pages/dealer-portal/FullWarrantyService.tsx`** — append `<DealerFAQSection />` + `<DealerFAQSchema />` below the existing "How it works" / before the final CTA.
- **`src/pages/dealer-portal/ClaimsHandlingService.tsx`** — same treatment.
- **`src/pages/FAQ.tsx`** (public `/faq`) — replace the FAQ content with `<DealerFAQSection />` and swap the existing FAQPage JSON-LD for `<DealerFAQSchema />`. SEO title/description updated to reference dealer/trade FAQs.

### 3. Untouched (per your answer)
- `src/components/HomepageFAQ.tsx`
- `src/components/brand-pages/BrandPageFAQ.tsx`
- `src/components/cover-page/CoverMiniFAQ.tsx`
- All car-brand landing pages (Audi/BMW/EV/Van/Motorbike etc.)

## Schema details

- One `FAQPage` JSON-LD block per page that renders `<DealerFAQSchema />` (Google's guidance: schema must match visible page content).
- Uses `react-helmet-async` where the page already uses Helmet (`FullWarrantyService` does); otherwise injected via a tiny `useEffect` script tag like `FAQSchema.tsx` already does, with a stable `id` so it's cleaned up on unmount.
- Question/answer strings come from `dealerFaqs.ts` so they exactly match the visible accordion (no duplication risk).

## Notes

- Existing `src/components/schema/FAQSchema.tsx` stays; the new dealer schema component is dealer-specific so customer pages keep their customer schema.
- Sentence-case headings, no negative phrasing — matches project copy rules.
- No backend, routing, or pricing changes.
