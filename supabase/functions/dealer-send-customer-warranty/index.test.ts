import { assert, assertEquals, assertFalse, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { BRANDS } from '../_shared/brand.ts';
import { buildDealerWarrantyEmail, DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE } from '../_shared/dealerWarrantyEmail.ts';

const customer = {
  id: '12345678-1234-1234-1234-123456789012',
  name: 'Alex Customer',
  email: 'alex@example.com',
  registration_plate: 'AB12 CDE',
  vehicle_make: 'Ford',
  vehicle_model: 'Focus',
  vehicle_year: '2020',
  plan_type: 'gold',
  payment_type: '12',
  signup_date: '2026-11-18T00:00:00.000Z',
  warranty_number: 'PP-1001',
};
const dealer = { id: 'dealer-1', company_name: 'Example Motors', email: 'dealer@example.com' };

Deno.test('dealer warranty preview and send payload use the Panda support sender and claims route', () => {
  const email = buildDealerWarrantyEmail({
    brand: BRANDS.pandaprotect,
    template: DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE,
    customer,
    dealer,
    recipientType: 'customer',
    to: customer.email,
    now: new Date('2026-11-18T09:00:00.000Z'),
  });
  assertEquals(email.from, 'Panda Protect Customer Care <support@pandaprotect.co.uk>');
  assertEquals(email.reply_to, 'support@pandaprotect.co.uk');
  assertEquals(email.to, ['alex@example.com']);
  assertEquals(email.subject, 'Your vehicle warranty — AB12 CDE');
  assertStringIncludes(email.html, 'https://www.pandaprotect.co.uk/make-a-claim/');
  assertStringIncludes(email.html, 'Platinum');
  assert(email.text.length > 0);
});

Deno.test('dealer warranty email excludes trade money and escapes editable wording', () => {
  const email = buildDealerWarrantyEmail({
    brand: BRANDS.pandaprotect,
    template: {
      subject: 'Warranty {{registration}}',
      heading: '<script>alert(1)</script>',
      introduction: '{{dealer_name}} arranged your cover',
      closing_text: 'Thank you',
    },
    customer: { ...customer, final_amount: 999, dealer_price: 1.19 } as typeof customer,
    dealer,
    recipientType: 'customer',
    to: customer.email,
    message: '<img src=x onerror=alert(1)>',
  });
  assertFalse(email.html.includes('<script>'));
  assertFalse(email.html.includes('<img src=x'));
  assertFalse(email.html.includes('£999'));
  assertFalse(email.html.includes('£1.19'));
  assertFalse(email.html.toLowerCase().includes('profit'));
  assertStringIncludes(email.html, '&lt;script&gt;');
});
