import { it } from 'node:test';
import assert from 'node:assert/strict';
import { dealerCustomerErrors } from '../dealerCustomerValidation';

const blank = { name: '', email: '', phone: '', address_line1: '', town: '', postcode: '' };
it('every required blank customer field produces a validation error', () => {
  const errors = dealerCustomerErrors(blank);
  assert.deepEqual(Object.keys(errors), ['name', 'email', 'phone', 'address_line1', 'town', 'postcode']);
  assert.equal(errors.address_line2, undefined);
});
it('invalid email and UK mobile values produce field errors', () => {
  const errors = dealerCustomerErrors({ ...blank, name: 'Jo', email: 'invalid', phone: '123' });
  assert.ok(errors.email);
  assert.ok(errors.phone);
  assert.equal(errors.name, undefined);
});
it('complete customer details have no validation errors', () => {
  assert.deepEqual(dealerCustomerErrors({ name: 'Test Person', email: 'test@example.com', phone: '07123456789', address_line1: '12 High Street', town: 'London', postcode: 'SW1A 1AA' }), {});
});