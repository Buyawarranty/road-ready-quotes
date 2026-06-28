## What's happening

The `/dealer-portal/signup` route renders `src/pages/dealer-portal/DealerComingSoon.tsx`, and that file is still the **old long-form layout** in your screenshot. None of the previous redesign work survives in the codebase — no "Offer Trade Warranties Without the Paperwork" hero, no Qashqai hero image, no "How it works" 3-step, no "Why dealers choose Panda Protect" with the VW ID.3, no compact FAQ row, no dark navy `DealerPublicFooter`. So you're seeing the old page because the old page is what's actually there. It needs to be rebuilt.

## Plan — re-apply the Panda redesign to `/dealer-portal/signup`

### 1. Rebuild `src/pages/dealer-portal/DealerComingSoon.tsx`

Replace the current layout with the redesigned structure, keeping the existing submit logic, RLS-safe insert into `trade_warranty_signups`, `notify-dealer-waitlist` invocation, success screen, and validation helpers exactly as they work today.

New structure, top to bottom:

- **Header** — keep `DealerPublicHeader`.
- **Hero (two-column on desktop)**
  - Left: "Early dealer access now open" eyebrow → H1 **"Offer Trade Warranties Without the Paperwork"** → sub-copy ("Add extra profit to every sale… Panda Protect handles claims, documents and support."). Three trust bullets: *No obligation · Takes less than 30 seconds · UK dealer support*. Primary CTA scrolls to form.
  - Right: Compact 5-field form card (Dealership, Contact name, Email, UK phone, Where you sell vehicles URL + optional notes), green-tick live validation on email/phone, Airbnb-pink error on blur, `animate-breathing` "Register My Interest" CTA. Success state shows green-check confirmation copy.
  - Below the form column: small **Nissan Qashqai** image (`src/assets/nissan-qashqai-warranty-cover.png`) capped at `max-w-[270px]` (the 40%-smaller spec).
- **How it works** — 3 numbered steps with dashed connectors: *Register interest → Our team contacts you → Get early access*.
- **Why dealers choose Panda Protect** — two-column section: bulleted list (High-profit products, Quick onboarding, UK claims team, Digital docs, Marketing support) on the left, **VW ID.3** image (`src/assets/vw-id3-warranty.webp`) on the right.
- **Benefit cards row** — 3 compact cards: *Increase profit per vehicle*, *No claims admin*, *Flexible cover options*.
- **FAQ** — lighter, collapsed `DealerFAQSection` lower on the page + `DealerFAQSchema` for SEO.
- **Footer** — new `src/components/dealer/DealerPublicFooter.tsx`, dark navy, simple columns (Panda Protect, dealer links, contact, legal).

### 2. New file `src/components/dealer/DealerPublicFooter.tsx`

Dark navy (`bg-slate-900` / brand navy token) public footer used only on dealer-public routes. Logo + tagline, three link columns, copyright row.

### 3. Hide the global site footer/padding on this route

In `src/App.tsx`, keep `/dealer-portal/coming-soon` and `/dealer-portal/signup` in the existing "hide global Footer + main padding" condition so the new dark footer isn't doubled up.

### 4. SEO

Keep current `<Helmet>` title/description on the page. No route or meta changes.

### Out of scope (not touching)

- Form submit pipeline, RLS, edge functions, admin signups view — already working from prior fixes.
- `DealerHome`, `DealerLogin`, other dealer portal pages.
- Global header/nav.

### Verification

After rebuild: run typecheck/build, then drive Playwright to `http://localhost:8080/dealer-portal/signup`, screenshot the hero, "How it works", "Why dealers choose" with car image, and footer to confirm the new layout renders and the form still submits to `trade_warranty_signups`.