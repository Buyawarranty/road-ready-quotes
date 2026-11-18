import { assert, assertEquals, assertFalse, assertRejects, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { BRANDS } from '../_shared/brand.ts';
import { buildDealerWarrantyEmail, DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE } from '../_shared/dealerWarrantyEmail.ts';
import { loadPandaWarrantyAttachments, PANDA_WARRANTY_DOCUMENTS } from '../_shared/dealerWarrantyDocuments.ts';

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
  assertStringIncludes(email.html, 'Both PDF documents are attached to this email.');
  for (const document of PANDA_WARRANTY_DOCUMENTS) {
    assertStringIncludes(email.html, document.url);
    assertStringIncludes(email.html, document.label);
  }
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

Deno.test('both official v11 PDFs are loaded as named email attachments', async () => {
  const requested: string[] = [];
  const attachments = await loadPandaWarrantyAttachments(async input => {
    requested.push(String(input));
    return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), { status: 200 });
  });
  assertEquals(requested, [...PANDA_WARRANTY_DOCUMENTS.map(document => document.url)]);
  assertEquals(attachments.map(attachment => attachment.filename), [
    'Panda-Protect-Platinum-Warranty-Plan-v11.pdf',
    'Panda-Protect-Terms-and-Conditions-v11.pdf',
  ]);
  assertEquals(attachments.map(attachment => attachment.content), ['JVBERi0=', 'JVBERi0=']);
});

Deno.test('a missing warranty PDF fails instead of sending an incomplete email', async () => {
  await assertRejects(
    () => loadPandaWarrantyAttachments(async () => new Response('missing', { status: 404 })),
    Error,
    'could not be loaded (404)',
  );
});
