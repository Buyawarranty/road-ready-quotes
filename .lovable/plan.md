# Drive Bright visual reskin for Panda Protect public pages

## Goal
Restyle Panda Protect’s public and customer-facing experience to closely match the existing **Buy A Warranty Co Uk-b-prod / Drive Bright** project while preserving Panda Protect branding, wording, routes, behavior, and all business logic.

The work will be delivered in reviewable batches. After every batch, the change summary will name every page and component touched and confirm the protected route checks performed.

## Locked scope

### Included
- `/`, `/home`, and the public dealer homepage at `/dealer-portal/`
- Public dealer marketing routes: `/dealer-portal/coming-soon`, `/dealer-portal/full-warranty`, `/dealer-portal/claims-handling`, and `/dealer-portal/signup`
- Public warranty, vehicle-type, brand, FAQ, contact, claims, legal, blog, and dynamic landing pages
- Customer quote, cart, checkout/payment, confirmation, and payment-result pages
- `/widget/` customer-facing widget
- Existing public headers, footers, banners, modals, and public-only visual building blocks

### Protected and excluded
- `/admin/*`, `/admin-dashboard/*`, `/dealer-admin/*`
- Logged-in dealer portal screens, including login, dashboard, quotes, warranties, customers, analytics, quote journey, applications, settings, and API documentation
- `/dealer-widget/*`, `/customer-dashboard/*`, `/sales-login/*`, `/auth/*`, password/admin setup routes
- Supabase, RLS, edge functions, API calls, pricing calculations, quote state, payment logic, validation rules, analytics, and submission behavior

## Visual direction from Drive Bright
- Reuse the reference project’s visual language: bright neutral surfaces, charcoal text, strong orange actions, restrained green success accents, crisp borders, compact radii, confident typography, and clear hierarchy.
- Match its spacing rhythm, navigation treatment, form density, registration plate treatment, cards, trust rows, section transitions, imagery proportions, responsive behavior, and button states.
- Keep the Panda Protect logo, name, legal text, contact details, and all existing page copy unchanged.
- Use Panda Protect imagery where available; match the reference’s image framing and presentation rather than copying Buy A Warranty branding.

## Implementation batches

### Batch 1 — Public styling boundary and static pages
- Add a public-only visual scope and public design tokens without changing global shadcn defaults used by internal areas.
- Remove or neutralize unscoped typography/theme leakage only through route-safe overrides; retain the current appearance of protected routes.
- Create public-only variants or wrappers for any shared button, card, header, footer, form, or navigation component also used internally.
- Restyle the first review set: trader FAQ, Terms, Privacy, Cookies, Contact/claims-related static routes currently served by `TradeOnlyPage`, and their public header/footer presentation.
- Preserve FAQ search, categories, accordions, links, forms, and all text exactly.

### Batch 2 — Homepage and public dealer marketing
- Restyle the root/home and `/dealer-portal/` marketing homepage to the Drive Bright composition and visual system.
- Keep the split hero, registration quote action, dealer login/join strip, service sections, resources, FAQ behavior, and all current content/functionality.
- Restyle the included dealer signup and public service pages without affecting dealer login or logged-in portal screens.

### Batch 3 — Warranty, vehicle-type, brand, and dynamic landing pages
- Restyle shared cover/brand page sections first, then apply them to the repeated warranty page families in small groups.
- Preserve metadata, structured data, links, calculators, selectors, callback controls, and route-specific content.
- Verify representative vehicle, EV, van, motorbike, brand, and dynamic pages before completing the family.

### Batch 4 — Blog and supporting content
- Restyle the blog index, article pages, resources-style content, and supporting public modals.
- Preserve article data, navigation, filters, links, and SEO behavior.

### Batch 5 — Quote and cart
- Restyle the customer quote journey, pricing/plan selection, quote token pages, and cart using the reference project’s form and pricing patterns.
- Keep every calculation, eligibility rule, state transition, query, validation condition, and submission handler unchanged.

### Batch 6 — Checkout, payment, and confirmation
- Restyle customer details, order summaries, payment choice, Stripe/payment result screens, thank-you pages, and supporting trust content.
- Do not alter payment initialization, checkout payloads, redirects, webhook expectations, or completion behavior.

### Batch 7 — Customer widget
- Apply the public visual system to `/widget/` while preserving its compact embed dimensions, communication contract, and customer quote behavior.
- Leave `/dealer-widget/*` unchanged.

## Technical safety approach
- Treat the Drive Bright project as a read-only visual and implementation reference.
- Do not replace global `:root` colors, global typography, Tailwind defaults, or shared shadcn variants where those changes could reach protected screens.
- Scope new public tokens beneath a public route wrapper and use semantic classes inside public pages.
- Before changing a shared component, inspect all imports. If an internal route uses it, add a public-only variant/wrapper instead of changing its existing default appearance.
- Do not rename, move, or delete existing files, routes, props, exports, or handlers.
- Do not copy source-project asset pointers; migrate only usable imagery through the proper asset flow when a reference image is genuinely needed.

## Validation after every batch
- Compare desktop and mobile screenshots against the Drive Bright reference.
- Exercise interactive controls on touched pages: navigation, mobile menus, accordions, search, forms, selectors, and modal opening/closing as applicable.
- Run the project’s TypeScript checks and focused tests relevant to the touched pages.
- Smoke-test representative protected routes at desktop and mobile sizes and compare their key visual states against the pre-change baseline.
- Confirm no console errors, broken images, text overflow, or horizontal scrolling.
- Report the exact touched pages/components and explicitly state that no business logic or backend files changed.

## First delivery for review
Batch 1 only: the public styling boundary plus the static-page family. No homepage, quote, cart, checkout, internal dashboard, or backend changes will be included in that first visual review.
