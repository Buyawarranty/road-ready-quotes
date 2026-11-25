import { makeClaimUrl, transactionalEmailIdentity, type Brand } from './brand.ts';
import { polishEmailPayload } from './emailPolish.ts';
import { DEALER_INTRO_FREE_TOTAL } from './dealerIntroOffer.ts';
import { expiryDate, type DealerWarrantyEmailCustomer, type DealerWarrantyEmailDealer } from './dealerWarrantyEmail.ts';
import { displayWarrantyPlanName } from './warrantyPlanDisplay.ts';

// Email clients cannot consume app CSS: use shared email-role colours and the brand accent.
const theme = { paper: '#ffffff', ink: '#1A1A1A', muted: '#666666', border: '#e7e7e7', offer: '#FFF8E7' };
const esc = (value: unknown) => String(value ?? '').replace(/[<>&"]/g, character => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;',
}[character] as string));

export interface DealerFreeOfferProgress {
  enabled: boolean;
  availableNow: number;
  issued: number;
  reserved: number;
  stillToEarn: number | null;
  total: number;
}

/** Available is the service RPC result after issuance, never the checkout preview. */
export function dealerFreeOfferProgress(input: {
  enabled: boolean;
  availableNow: number;
  redemptions: { status: string }[];
}): DealerFreeOfferProgress | null {
  if (!Number.isInteger(input.availableNow) || input.availableNow < 0 || input.availableNow > DEALER_INTRO_FREE_TOTAL) return null;
  const issued = input.redemptions.filter(row => row.status === 'approved').length;
  const reserved = input.redemptions.filter(row => row.status !== 'approved' && row.status !== 'rejected').length;
  const used = issued + reserved;
  // Concurrent reads must not advertise an inconsistent balance or a fourth free place.
  if (used > DEALER_INTRO_FREE_TOTAL || used + input.availableNow > DEALER_INTRO_FREE_TOTAL) return null;
  if (!input.enabled && input.availableNow !== 0) return null;
  return {
    enabled: input.enabled, availableNow: input.availableNow, issued, reserved,
    stillToEarn: input.enabled ? DEALER_INTRO_FREE_TOTAL - used - input.availableNow : null,
    total: DEALER_INTRO_FREE_TOTAL,
  };
}

export async function loadDealerFreeOfferProgress(reads: {
  available: () => Promise<number>;
  redemptions: () => Promise<{ status: string }[]>;
  enabled: () => Promise<boolean>;
}): Promise<DealerFreeOfferProgress | null> {
  try {
    const [availableNow, redemptions, enabled] = await Promise.all([reads.available(), reads.redemptions(), reads.enabled()]);
    return dealerFreeOfferProgress({ availableNow, redemptions, enabled });
  } catch {
    // Email issued cover even when the balance cannot be read; never invent a zero.
    return null;
  }
}

const date = (value?: string | null) => {
  const parsed = value ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC' }).format(parsed) : '—';
};

/** Dealer-only £0 receipt. Customer confirmations remain separate and price-safe. */
export function buildDealerFreeWarrantyEmail(options: {
  brand: Brand;
  customer: DealerWarrantyEmailCustomer;
  dealer: DealerWarrantyEmailDealer;
  to: string;
  progress: DealerFreeOfferProgress | null;
  now?: Date;
}) {
  const { brand, customer, dealer, progress, now = new Date() } = options;
  const dealerName = dealer.company_name || dealer.name || 'Dealer account';
  const reference = customer.warranty_number || customer.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const registration = String(customer.registration_plate || reference).toUpperCase();
  const warrantyUrl = `${brand.siteUrl}/dealer-portal/warranties?search=${encodeURIComponent(registration)}`;
  const quoteUrl = `${brand.siteUrl}/dealer-portal/quote/pricing?new=1`;
  const plan = displayWarrantyPlanName(customer.plan_type, 'Platinum').replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const vehicle = [customer.vehicle_make, customer.vehicle_model, customer.vehicle_year].filter(Boolean).join(' ');
  const months = Number.parseInt(String(customer.payment_type || ''), 10);
  const row = (label: string, value: string) => `<tr><td style="padding:10px 10px 10px 0;width:36%;vertical-align:top;color:${theme.muted};border-bottom:1px solid ${theme.border}">${label}</td><td style="padding:10px 0;vertical-align:top;font-weight:600;overflow-wrap:anywhere;border-bottom:1px solid ${theme.border}">${esc(value)}</td></tr>`;
  const offerNote = !progress
    ? 'Your warranty is active. Open your dealer portal for your latest free-warranty balance.'
    : !progress.enabled
      ? 'The introductory offer is currently paused. Your issued warranty remains active.'
      : progress.stillToEarn === 0
        ? progress.availableNow > 0
          ? 'All three free warranties have been earned. Your remaining earned cover is ready to use for another customer.'
          : progress.reserved > 0
            ? 'Your three offer places are allocated. Your dealer portal shows any earlier requests awaiting approval.'
            : 'You have used all three free warranties in your introductory offer. Thank you for choosing Panda Protect.'
        : `${progress.stillToEarn} more free ${progress.stillToEarn === 1 ? 'warranty can' : 'warranties can'} still be earned — one for each next qualifying paid warranty.`;
  const summary = progress ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 0;table-layout:fixed"><tr>
      <td width="50%" style="padding:0 12px 0 0;vertical-align:top;border-right:1px solid ${theme.border}">
        <p style="font-size:12px;line-height:1.5;color:${theme.muted};margin:0 0 4px">Ready to use now</p>
        <p style="font-size:32px;font-weight:700;line-height:1.2;margin:0">${progress.availableNow}</p>
      </td>
      <td width="50%" style="padding:0 0 0 16px;vertical-align:top">
        <p style="font-size:12px;line-height:1.5;color:${theme.muted};margin:0 0 4px">Free warranties issued</p>
        <p style="font-size:32px;font-weight:700;line-height:1.2;margin:0">${progress.issued}<span style="font-size:15px;font-weight:400;color:${theme.muted}"> of ${progress.total}</span></p>
      </td>
    </tr></table>
    ${progress.reserved > 0 ? `<p style="font-size:13px;line-height:1.6;margin:12px 0 0">${progress.reserved} earlier ${progress.reserved === 1 ? 'request is' : 'requests are'} awaiting approval and ${progress.reserved === 1 ? 'uses' : 'use'} an offer place.</p>` : ''}
    <p style="font-size:11px;line-height:1.5;color:${theme.muted};margin:14px 0 0">Balance checked ${date(now.toISOString())}. Your portal shows the latest balance.</p>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>@media only screen and (max-width:480px){.receipt-pad{padding:24px 18px!important}.receipt-offer{padding:18px!important}}</style></head>
    <body style="margin:0;background:${theme.paper};color:${theme.ink};font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:${theme.paper}"><tr><td class="receipt-pad" style="padding:32px">
      <img src="${brand.logoUrl}" alt="${esc(brand.name)}" width="190" style="display:block;width:190px;max-width:100%;height:auto;border:0;margin:0 0 28px">
      <p style="margin:0 0 8px;font-size:12px;color:${theme.muted}">${esc(dealerName)} · ${date(now.toISOString())}</p>
      <h1 style="font-size:26px;line-height:1.25;margin:0 0 12px">Your free warranty is active</h1>
      <p style="font-size:15px;line-height:1.7;margin:0 0 22px">Cover for <strong>${esc(registration)}</strong> is confirmed under your buy one get one free offer.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid ${brand.accentColor};border-bottom:1px solid ${theme.border};margin:0 0 24px"><tr>
        <td style="padding:18px 0;font-size:14px;color:${theme.muted}">Total charged<br><span style="font-size:12px">Payment not required</span></td>
        <td align="right" style="padding:18px 0;font-size:34px;font-weight:700;color:${brand.accentColor}">£0.00</td>
      </tr></table>
      <h2 style="font-size:17px;margin:0 0 6px">Warranty details</h2>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;font-size:14px;line-height:1.5">
        ${row('Registration', registration)}${row('Reference', reference)}${row('Customer', customer.name || '—')}
        ${vehicle ? row('Vehicle', vehicle) : ''}${row('Cover', plan)}
        ${Number.isFinite(months) && months > 0 ? row('Duration', `${months} months`) : ''}
        ${row('Start date', date(customer.warranty_start_date || customer.signup_date))}
        ${expiryDate(customer) ? row('End date', date(expiryDate(customer))) : ''}
      </table>
      <p style="margin:22px 0 28px"><a href="${esc(warrantyUrl)}" style="display:inline-block;background:${brand.accentColor};color:${theme.paper};font-size:14px;font-weight:700;line-height:1.5;text-decoration:none;border-radius:6px;padding:13px 20px">View warranty</a></p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td class="receipt-offer" style="padding:22px;background:${theme.offer};border-radius:6px">
        <h2 style="font-size:17px;margin:0">Your free-warranty balance</h2>
        ${summary}<p style="font-size:14px;line-height:1.7;margin:16px 0 0">${esc(offerNote)}</p>
        ${progress?.enabled ? `<p style="font-size:12px;line-height:1.7;color:${theme.muted};margin:10px 0 0">Pay one, get the next one free — repeated up to three times, with up to three years of cover per free warranty. Paid purchases count while active and paid; free cover uses one place rather than earning another.</p>` : ''}
      </td></tr></table>
      <p style="font-size:14px;line-height:1.6;margin:22px 0 0"><a href="${quoteUrl}" style="color:${brand.accentColor};font-weight:700">Start the next customer’s warranty</a></p>
      <h2 style="font-size:17px;margin:28px 0 8px">We're here to help</h2>
      <p style="font-size:14px;line-height:1.8;margin:0">Dealer support: <a href="tel:${brand.quotePhone.replace(/\s/g, '')}" style="color:${theme.ink}">${esc(brand.quotePhone)}</a><br><a href="mailto:${brand.supportEmail}" style="color:${brand.accentColor}">${esc(brand.supportEmail)}</a></p>
      <p style="font-size:13px;line-height:1.7;margin:14px 0 0">For claims, your customer can use our <a href="${makeClaimUrl(brand)}" style="color:${brand.accentColor}">Make a claim page</a> or contact <a href="mailto:${brand.claimsEmail}" style="color:${brand.accentColor}">${esc(brand.claimsEmail)}</a>.</p>
      <p style="font-size:12px;color:${theme.muted};line-height:1.7;margin:26px 0 0;padding-top:16px;border-top:1px solid ${theme.border}">${esc(brand.name)} · <a href="${brand.siteUrl}" style="color:${theme.muted}">${esc(brand.domain)}</a></p>
    </td></tr></table></td></tr></table></body></html>`;
  return polishEmailPayload({
    ...transactionalEmailIdentity(brand, 'warranty_purchase'), to: [options.to],
    subject: `Free warranty active — ${registration}${progress ? ` · ${progress.availableNow} ready to use` : ''}`, html,
  });
}