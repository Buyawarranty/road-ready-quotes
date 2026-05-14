## Goal

Use the same header from the home page (`/` → `DealerHome` → `DealerPublicHeader`) across every public-facing page on the site.

## Scope

**Replace header with `<DealerPublicHeader />` on these public pages:**

Marketing / info:
- `WarrantyPlan.tsx`, `WarrantyTypes.tsx`, `BuyCarWarranty.tsx`, `CarExtendedWarranty.tsx`, `LiveQuotePage.tsx`, `CancelWarranty.tsx`
- `Blog.tsx`, `BlogArticle.tsx`, `FAQ.tsx`, `ContactUs.tsx`, `Complaints.tsx`, `PrivacyPolicy.tsx`, `Terms.tsx`, `CookiePolicy.tsx`, `DiscountsOffers.tsx`, `UsedCarWarrantyUK.tsx`

Vehicle category / brand landing pages:
- `EVWarranty.tsx`, `MotorbikeWarranty.tsx`, `MotorcycleWarranty.tsx`, `VanWarrantyNew.tsx`
- `AudiWarranty.tsx`, `BMWWarranty.tsx`, `FordWarranty.tsx`, `HyundaiWarranty.tsx`, `JaguarWarranty.tsx`, `LandRoverWarranty.tsx`, `MercedesWarranty.tsx`, `NissanWarranty.tsx`, `SkodaWarranty.tsx`, `VolkswagenWarranty.tsx`

Misc:
- `NotFound.tsx`, `ThankYou.tsx` (public confirmation), `WarrantyTransfer.tsx`

**Leave unchanged (intentional own chrome):**
- `Auth.tsx`, `AdminDashboard.tsx`, `CustomerDashboard.tsx`, `SetupAdmin.tsx`, `RequestAccess.tsx`, `SalesLogin.tsx` — auth/admin areas
- `StripePayment.tsx`, `PaymentFallback.tsx`, `PaymentReceived.tsx`, `Cart.tsx` — checkout flow
- `dealer-portal/*` and `dealer-admin/*` — already use their own dealer headers
- `DynamicLandingPage.tsx`, `warranty-types/*Landing.tsx` — minimal landing template (separate brand pages)

## Approach

For each in-scope file:
1. Add `import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';`
2. Remove the existing `<header>...</header>` block (and its mobile `<Sheet>` if part of the header) and any now-unused imports (Menu, Sheet, etc.)
3. Render `<DealerPublicHeader />` in its place.

## Notes

- The `DealerPublicHeader` already renders the Panda Protect logo, the nav (Home, Why Us → /warranty-plan, Resources → /faq, Contact → /contact-us), Call Us hover card, WhatsApp, Start Today, and Login — so all current header functionality is preserved.
- Footers stay untouched.
- No business logic changes.
