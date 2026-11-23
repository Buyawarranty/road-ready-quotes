// Plain-text integration guide handed to a CRM partner. Customer-safe: no trade cost or profit.
export function buildPartnerGuide(o: { apiBase: string; site: string; partner: { name: string; slug: string } | null; dealers: { id: string; name: string }[] }) {
  const code = o.partner?.slug || 'PARTNER_CODE';
  const dealerLines = o.dealers.length ? o.dealers.map((d) => `  - ${d.name}: ${d.id}`).join('\n') : '  - DEALER_ID (we send one per dealer)';
  const exampleDealer = o.dealers[0]?.id || 'DEALER_ID';
  return `PANDA PROTECT PARTNER GUIDE${o.partner ? ` - ${o.partner.name}` : ''}

IMPORTANT: Customers must always buy on Panda Protect's own screens. Do not build your own quote, checkout or payment pages, and do not copy, restyle or frame our pages. Your platform only shows a button or link that opens our checkout. Our checkout always opens as a full Panda Protect page, even if placed inside another website.

Customers buy and pay Panda Protect directly. We issue the warranty and email the customer; your system gets the sale details automatically.

YOUR DETAILS
Partner code (p): ${code}
Dealer IDs (d):
${dealerLines}
API key: sent separately (pp_live_...). Keep it on your server only.
Signing secret: sent separately (whsec_pp_...).
Please send us the HTTPS address where we should post sale updates.

1. CHECKOUT BUTTON
${o.site}/partner/checkout?p=${code}&d=${exampleDealer}&reg=AB12CDE&ref=YOUR_REFERENCE
reg pre-fills the vehicle; ref is your own deal number, returned in updates. Vehicles up to 15 years and 150,000 miles.

2. API - read-only, for showing prices and sales inside your system, never for building a checkout (header: Authorization: Bearer pp_live_...)
GET ${o.apiBase}/prices?dealer=DEALER_ID        customer prices in GBP incl. VAT
GET ${o.apiBase}/warranties?reg=AB12CDE          your sales for a registration
GET ${o.apiBase}/warranties/WARRANTY_ID          one warranty
Errors: 401 wrong or switched-off key, 404 dealer not linked / not your warranty.

3. SALE UPDATES (POST to your address)
Events: warranty.paid (sale complete), warranty.test (test sale), ping (test button).
Data: warranty_id, customer_name, customer_email, customer_phone, customer_address, customer_postcode, registration, vehicle, term_months, amount_paid, currency, status, payment_status, start_date, expiry_date, dealer_id.
Headers: X-PandaProtect-Event, X-PandaProtect-Timestamp, X-PandaProtect-Signature (sha256=...).
Verify: HMAC-SHA256(signing secret, timestamp + "." + raw body) as hex must match the signature. Reject if older than 5 minutes. Reply HTTP 200.

GOING LIVE
1. Test mode: we send a ping, you confirm it verifies.
2. Call prices and try a checkout (no charge).
3. Live test: full page, no payment.
4. We switch you to live.

Help: Panda Protect sales 0330 229 6547 (Mon-Sat 9am-6pm).
`;
}
