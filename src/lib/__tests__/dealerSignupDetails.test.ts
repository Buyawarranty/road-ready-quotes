import { it } from 'node:test';
import assert from 'node:assert/strict';
import { dealerSignupDetailsDraft, validateDealerSignupDetails } from '../dealerSignupDetails';

it('validates the editable inbound email address', () => {
  const draft = dealerSignupDetailsDraft({ dealership_name: 'Example Motors', contact_name: '', email_address: 'not-an-email', phone_number: '', monthly_vehicle_sales: '', current_warranty_provider: '', interested_in: '', heard_about_us: '', additional_information: '' });
  assert.deepEqual(validateDealerSignupDetails(draft), { error: 'Enter a valid email address.' });
});

it('trims edited details and normalises the contact email without changing other answers', () => {
  const result = validateDealerSignupDetails({ dealership_name: '  Example Motors  ', contact_name: '  Alex  ', email_address: ' INFO@EXAMPLE.COM ', phone_number: ' 07700 900123 ', monthly_vehicle_sales: ' 12 ', current_warranty_provider: ' None ', interested_in: ' full-cover ', heard_about_us: ' https://example.com/stock ', additional_information: ' Called before approval. ' });
  assert.equal('error' in result, false);
  if ('payload' in result) {
    assert.equal(result.payload.dealership_name, 'Example Motors');
    assert.equal(result.payload.email_address, 'info@example.com');
    assert.equal(result.payload.phone_number, '07700 900123');
    assert.equal(result.payload.heard_about_us, 'https://example.com/stock');
    assert.equal(result.payload.additional_information, 'Called before approval.');
  }
});
