import { it } from 'node:test';
import assert from 'node:assert/strict';
import { canProceedToDealerPayment, createAssistedCustomer } from '../dealerAssistedCheckout';

it('Panda completes the details but the dealer can still proceed to payment', () => {
  for (const channel of ['whatsapp', 'email'] as const) {
    assert.equal(canProceedToDealerPayment(createAssistedCustomer(channel)), true);
  }
});
it('unknown customer contact details remain blank during assisted payment', () => {
  const customer = createAssistedCustomer('whatsapp');
  assert.equal(customer.email, '');
  assert.equal(customer.name, '');
  assert.equal(customer.phone, '');
  assert.equal(customer.postcode, '');
});
it('incomplete self-entry still requires customer details before payment', () => {
  assert.equal(canProceedToDealerPayment({ name: '', email: '', phone: '', address_line1: '', town: '', postcode: '' }), false);
});