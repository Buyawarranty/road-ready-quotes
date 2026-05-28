# Embed Dealer Hero on WordPress

Goal: drop the "Sell more warranties / Grow your business" hero (with reg input + Dealer Login / Become a Dealer CTAs) onto a WordPress site so every action lands on the correct page inside `road-ready-quotes.lovable.app`.

## Recommended approach: standalone iframe widget

Build a self-contained widget page on this app, then embed it in WordPress with one `<iframe>`. This is the cleanest fit because:
- WordPress can't run our React/Vite/Tailwind/Supabase auth stack natively.
- An iframe keeps styling, DVLA lookup, plate validation, and reg → journey routing identical to the main site — no drift.
- All CTAs already navigate inside this app, so they just need to break out of the iframe to the top window.

We already do this pattern for the consumer quote form (`public/widget.html`, `src/pages/Widget.tsx`, `VehicleWidget.tsx`). We'll add a dealer equivalent.

## What gets built

1. **New route `/dealer-widget`** (`src/pages/DealerWidget.tsx`)
   - Renders the hero: headline, subcopy, `DealerRegHero` (reg plate + Get Quote), and the two CTA cards (Dealer Login / Become a Dealer).
   - Transparent background option via `?bg=transparent` so it blends into any WordPress section.
   - Optional `?theme=light|dark` and `?compact=1` (hide headline, keep just the form) query params.
   - All internal links use `target="_top"` so clicks escape the iframe and load the full Panda Protect page in the parent tab:
     - Reg submit (logged out) → `/dealer-portal/login?redirect=/dealer-portal&reg=XX00XXX`
     - Reg submit (logged in via cookie on our domain) → `/dealer-portal/quote/pricing?reg=...`
     - Dealer Login → `/dealer-portal/login`
     - Become a Dealer → `/dealer-portal/signup`
   - Auto-resize: posts `{ type: 'panda:resize', height }` via `postMessage` on mount + resize so the iframe can grow with content.

2. **Public loader `public/dealer-widget.html`**
   - Minimal HTML that mounts the React route in standalone mode (mirrors `public/widget.html`).
   - Sets permissive `X-Frame-Options` / `Content-Security-Policy frame-ancestors` via `public/_redirects` / `vercel.json` headers so WordPress origins can frame it.

3. **WordPress embed snippet** (documentation only — given to the user to paste into a Custom HTML block, Elementor HTML widget, or `functions.php` shortcode):
   ```html
   <iframe
     src="https://road-ready-quotes.lovable.app/dealer-widget?bg=transparent"
     style="width:100%;border:0;min-height:780px"
     loading="lazy"
     title="Panda Protect dealer quote"
     allow="clipboard-write"
   ></iframe>
   <script>
     window.addEventListener('message', (e) => {
       if (e.origin !== 'https://road-ready-quotes.lovable.app') return;
       if (e.data?.type === 'panda:resize') {
         document.querySelector('iframe[title="Panda Protect dealer quote"]').style.height = e.data.height + 'px';
       }
     });
   </script>
   ```
   Optional shortcode version (`[panda_dealer_hero]`) included in the docs for non-technical editors.

4. **Headers / framing**
   - Update `vercel.json` (and `public/_redirects` if needed) to send `Content-Security-Policy: frame-ancestors 'self' https://*.<wordpress-domain>` for `/dealer-widget` and `/dealer-widget.html` only — keeps the rest of the app unframable.

## What we explicitly don't do
- No shared SSO between WordPress and Panda Protect — clicks navigate the top window to our login/signup, the user signs in here. (True SSO would need an OAuth bridge, well outside this scope.)
- No WordPress plugin. A copy-paste iframe snippet is enough and is upgrade-safe.
- No business-logic changes to the dealer journey, auth, or Supabase tables.

## Technical notes
- Files touched: `src/App.tsx` (lazy route), `src/pages/DealerWidget.tsx` (new), `public/dealer-widget.html` (new, optional — the SPA route alone is usually enough), `vercel.json` (frame-ancestors header), plus a short `docs/WORDPRESS_EMBED.md` with the snippet.
- Reuse `DealerRegHero`, `useDealerAuth`, and existing routing — no duplicate validation logic.
- One open question before building: **what WordPress domain(s) should be allowed to frame the widget?** We'll lock `frame-ancestors` to those origins for safety.
