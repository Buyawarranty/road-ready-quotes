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
  phone?: string | null;
  flat_number?: string | null;
  building_name?: string | null;
  building_number?: string | null;
  street?: string | null;
  town?: string | null;
  county?: string | null;
  postcode?: string | null;
}

export interface DealerWarrantyEmailDealer {
  id: string;
  name?: string | null;
  company_name?: string | null;
  email?: string | null;
}

export const DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE: DealerWarrantyEmailTemplate = {
  subject: 'Your Panda Protect warranty is now active — {{registration}}',
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

/** Single postal-address line from the stored customer address parts. */
export function customerAddressLine(c: DealerWarrantyEmailCustomer): string | null {
  const first = [c.flat_number, c.building_number, c.building_name, c.street].filter(v => String(v || '').trim()).join(' ');
  const line = [first, c.town, c.county, c.postcode ? String(c.postcode).toUpperCase() : null].filter(v => String(v || '').trim()).join(', ');
  return line || null;
}

export function expiryDate(customer: DealerWarrantyEmailCustomer): string | null {
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
  login?: { email: string; password?: string | null } | null;
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
  const plate = esc(String(customer.registration_plate || '—').toUpperCase());
  const months = Number.parseInt(String(customer.payment_type || ''), 10);
  const row = (label: string, value: string) => `<tr><td style="padding:5px 0;font-size:14px;color:#1f2a44"><strong>${label}:</strong> ${value}</td></tr>`;
  const login = options.login;
  const loginHtml = recipientType === 'customer' && login ? `
      <h2 style="font-size:18px;color:#1f2a44;margin:28px 0 8px">&#128274; Your portal login details</h2>
      <p style="font-size:14px;line-height:1.6;margin:0 0 8px">You can view your policy anytime in your customer portal:</p>
      <p style="font-size:14px;margin:0 0 8px"><strong>Login:</strong> <a href="${brand.siteUrl}/customer-dashboard" style="color:${brand.accentColor};font-weight:600">Customer Dashboard</a></p>
      <table style="border-collapse:collapse;margin-left:12px">
        ${row('Email', esc(login.email))}
        ${login.password
          ? row('Password', `<code style="background:#f3f4f6;border-radius:4px;padding:2px 6px;font-size:13px">${esc(login.password)}</code>`)
          : `<tr><td style="padding:5px 0;font-size:14px;color:#1f2a44">Use your existing password, or choose <a href="${brand.siteUrl}/customer-dashboard" style="color:${brand.accentColor}">Forgot password</a> to set a new one.</td></tr>`}
      </table>` : '';
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2a44;max-width:620px;margin:0 auto;padding:24px;background:#ffffff">
      <div style="text-align:center;margin-bottom:28px"><img src="${brand.logoUrl}" alt="${esc(brand.name)}" width="220" style="display:inline-block;width:220px;max-width:100%;height:auto;border:0" /></div>
      <h1 style="font-size:22px;margin:0 0 16px;color:#1f2a44">Hi ${esc(recipientName)},</h1>
      <p style="font-size:14px;line-height:1.6;margin:0 0 6px"><strong style="color:${brand.accentColor}">${esc(tokens(template.heading))}</strong></p>
      <p style="font-size:14px;line-height:1.6">${esc(tokens(template.introduction))}</p>
      ${noteHtml}
      <table style="border-collapse:collapse;margin:12px 0 0 12px">
        ${row('Policy number', esc(reference))}
        ${row('Plan type', esc(plan))}
        <tr><td style="padding:8px 0;font-size:14px;color:#1f2a44"><strong>Registration plate:</strong> <span style="display:inline-block;background:#FFD500;border:2px solid #111;border-radius:4px;padding:6px 16px;margin-left:6px;font-family:'Courier New',monospace;font-size:16px;font-weight:700;letter-spacing:2px;color:#111">${plate}</span></td></tr>
        ${vehicle ? row('Vehicle', esc(vehicle)) : ''}
        ${Number.isFinite(months) && months > 0 ? row('Coverage period', `${months} months`) : ''}
        ${row('Start date', fmt(start))}
        ${end ? row('End date', fmt(end)) : ''}
        ${recipientType === 'customer' && customer.phone ? row('Phone', esc(customer.phone)) : ''}
        ${recipientType === 'customer' && customerAddressLine(customer) ? row('Address', esc(customerAddressLine(customer))) : ''}
        ${row('Provided by', esc(dealerName))}
      </table>
      ${loginHtml}
      <h2 style="font-size:18px;color:#1f2a44;margin:28px 0 8px">&#128206; Your documents</h2>
      <p style="font-size:14px;margin:0 0 6px">Attached to this email, you'll find:</p>
      <ul style="font-size:14px;line-height:1.8;margin:0 0 8px;padding-left:22px"><li>Platinum Warranty Plan</li><li>Terms &amp; Conditions</li></ul>
      <p style="font-size:14px;margin:0">Please keep these safe — you'll need them if you ever need to make a claim.</p>
      ${pandaWarrantyDocumentsHtml()}
      <h2 style="font-size:18px;color:#1f2a44;margin:28px 0 8px">&#128222; Need a hand?</h2>
      <p style="font-size:14px;margin:0 0 10px">If you've got any questions or need help, feel free to reach out:</p>
      <p style="font-size:14px;margin:0 0 4px"><strong>Customer sales and support</strong></p>
      <p style="font-size:14px;margin:0 0 4px">Email: <a href="mailto:${brand.supportEmail}" style="color:${brand.accentColor}">${brand.supportEmail}</a></p>
      <p style="font-size:14px;margin:0 0 12px">Phone: <a href="tel:03302296547" style="color:${brand.accentColor}">0330 229 6547</a></p>
      <p style="font-size:14px;margin:0 0 4px"><strong>Claims and repairs</strong></p>
      <p style="font-size:14px;margin:0 0 4px">Email: <a href="mailto:${brand.claimsEmail}" style="color:${brand.accentColor}">${brand.claimsEmail}</a></p>
      <p style="font-size:14px;margin:0 0 12px">Online: <a href="${makeClaimUrl(brand)}" style="color:${brand.accentColor};font-weight:600">Make a claim page</a></p>
      <p style="font-size:14px;margin:0"><strong>Hours:</strong> Monday to Saturday, 9am – 6pm</p>
      <div style="background:#fff7f2;border-radius:8px;padding:16px 18px;margin:26px 0;font-size:14px;line-height:1.6">${esc(tokens(template.closing_text || 'Thank you for choosing Panda Protect — we are here to keep you covered and give you peace of mind on the road.'))}</div>
      <p style="font-size:14px;margin:0">Best regards,<br><strong>The ${esc(brand.name)} Team</strong></p>
      <div style="border-top:1px solid #eee;margin-top:26px;padding-top:16px;text-align:center;font-size:12px;color:#888">
        <a href="${brand.siteUrl}" style="color:#1f2a44;font-weight:700">${esc(brand.domain)}</a>
        <p style="margin:8px 0 0">Pandaprotect.co.uk is a trading name of Buy A Warranty Limited. Registered in the UK under Company number 10314863.<br>Registered address: Warranty House, 62 Berkhamsted Ave, Wembley, HA9 6DT, England.</p>
      </div>
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
