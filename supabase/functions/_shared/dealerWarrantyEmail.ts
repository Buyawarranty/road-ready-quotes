import { makeClaimUrl, transactionalEmailIdentity, type Brand } from './brand.ts';
import { polishEmailPayload } from './emailPolish.ts';
import { displayWarrantyPlanName } from './warrantyPlanDisplay.ts';
import { pandaWarrantyDocumentsHtml, type PandaWarrantyAttachment } from './dealerWarrantyDocuments.ts';

export interface DealerWarrantyEmailTemplate {
  subject: string;
  heading: string;
  introduction: string;
  closing_text: string;
}

export interface DealerWarrantyEmailCustomer {
  id: string;
  name?: string | null;
  email?: string | null;
  registration_plate?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  plan_type?: string | null;
  payment_type?: string | null;
  signup_date?: string | null;
  warranty_start_date?: string | null;
  policy_end_date?: string | null;
  warranty_number?: string | null;
}

export interface DealerWarrantyEmailDealer {
  id: string;
  name?: string | null;
  company_name?: string | null;
  email?: string | null;
}

export const DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE: DealerWarrantyEmailTemplate = {
  subject: 'Your vehicle warranty — {{registration}}',
  heading: 'Your warranty is confirmed',
  introduction: '{{dealer_name}} has arranged a Panda Protect warranty for your vehicle. Here are your warranty details:',
  closing_text: 'Thank you for choosing Panda Protect.',
};

const esc = (value: unknown) => String(value ?? '').replace(/[<>&"]/g, character => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;',
}[character] as string));

const fmt = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC' }).format(new Date(value))
  : '—';

function expiryDate(customer: DealerWarrantyEmailCustomer): string | null {
  if (customer.policy_end_date) return customer.policy_end_date;
  const start = customer.warranty_start_date || customer.signup_date;
  const months = Number.parseInt(String(customer.payment_type || ''), 10);
  if (!start || !Number.isFinite(months) || months <= 0) return null;
  const date = new Date(start);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date.toISOString();
}

export function normaliseDealerWarrantyEmailTemplate(value?: Partial<DealerWarrantyEmailTemplate> | null): DealerWarrantyEmailTemplate {
  return {
    subject: String(value?.subject || DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE.subject).trim(),
    heading: String(value?.heading || DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE.heading).trim(),
    introduction: String(value?.introduction || DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE.introduction).trim(),
    closing_text: String(value?.closing_text ?? DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE.closing_text).trim(),
  };
}

export function buildDealerWarrantyEmail(options: {
  brand: Brand;
  template: DealerWarrantyEmailTemplate;
  customer: DealerWarrantyEmailCustomer;
  dealer: DealerWarrantyEmailDealer;
  recipientType: 'customer' | 'me';
  to: string;
  message?: string;
  now?: Date;
}) {
  const { brand, customer, dealer, recipientType, to, now = new Date() } = options;
  const template = normaliseDealerWarrantyEmailTemplate(options.template);
  const dealerName = dealer.company_name || dealer.name || 'your dealer';
  const recipientName = recipientType === 'me' ? dealerName : customer.name || 'there';
  const reference = customer.warranty_number || customer.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const registration = customer.registration_plate || reference;
  const plan = displayWarrantyPlanName(customer.plan_type, 'Platinum').replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const vehicle = [customer.vehicle_make, customer.vehicle_model, customer.vehicle_year].filter(Boolean).join(' ');
  const start = customer.warranty_start_date || customer.signup_date;
  const end = expiryDate(customer);
  const values: Record<string, string> = {
    customer_name: customer.name || 'there',
    dealer_name: dealerName,
    registration,
    reference,
    plan,
  };
  const tokens = (text: string) => text.replace(/\{\{(customer_name|dealer_name|registration|reference|plan)\}\}/g, (_match, key) => values[key]);
  const subject = tokens(template.subject).trim() || `Your vehicle warranty — ${registration}`;
  const note = String(options.message || '').trim();
  const noteHtml = note
    ? `<div style="background:#fff7ed;border-left:4px solid #f97316;padding:12px 14px;margin:16px 0;font-size:14px;line-height:1.6">${esc(note)}</div>`
    : '';
  const closing = template.closing_text
    ? `<p style="font-size:14px;line-height:1.6">${esc(tokens(template.closing_text))}</p>`
    : '';
  const endRow = end
    ? `<tr><td style="padding:8px 0;color:#666">Expiry date</td><td style="padding:8px 0;text-align:right;font-weight:600">${fmt(end)}</td></tr>`
    : '';
  const html = `
    <div style="font-family:Arial,sans-serif;color:#333;max-width:620px;margin:0 auto;padding:24px">
      <img src="${brand.logoUrl}" alt="${esc(brand.name)}" width="220" style="display:block;width:220px;max-width:100%;height:auto;margin-bottom:24px;border:0" />
      <h1 style="color:#f97316;font-size:22px;margin:0 0 6px">${esc(tokens(template.heading))}</h1>
      <p style="font-size:13px;color:#666;margin:0 0 18px">Provided by ${esc(dealerName)} · ${fmt(now.toISOString())}</p>
      <p style="font-size:14px;line-height:1.6">Hi ${esc(recipientName)},</p>
      <p style="font-size:14px;line-height:1.6">${esc(tokens(template.introduction))}</p>
      ${noteHtml}
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;border-top:1px solid #eee">
        <tr><td style="padding:8px 0;color:#666">Reference</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(reference)}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Vehicle</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(registration)}${vehicle ? ` · ${esc(vehicle)}` : ''}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Plan</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(plan)}${customer.payment_type ? ` · ${esc(customer.payment_type)} months` : ''}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Start date</td><td style="padding:8px 0;text-align:right;font-weight:600">${fmt(start)}</td></tr>
        ${endRow}
      </table>
      ${closing}
      ${pandaWarrantyDocumentsHtml()}
      <p style="font-size:13px;color:#666;margin-top:22px"><strong>Need to make a claim?</strong><br>Visit our <a href="${makeClaimUrl(brand)}" style="color:${brand.accentColor};font-weight:600">Make a claim page</a> to start your claim online. You can also email <a href="mailto:${brand.claimsEmail}" style="color:${brand.accentColor}">${brand.claimsEmail}</a>. Please quote your warranty reference.</p>
      <p style="font-size:12px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:14px">${esc(brand.name)} · ${brand.supportEmail}</p>
    </div>`;

  return polishEmailPayload({
    ...transactionalEmailIdentity(brand, 'warranty_purchase'),
    to: [to],
    subject,
    html,
  }) as {
    from: string;
    reply_to: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
    attachments?: PandaWarrantyAttachment[];
  };
}
