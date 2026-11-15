import { it as test } from 'node:test';
import assert from 'node:assert/strict';
import { ukPhoneError, emailError, personNameError } from '../contactValidation';

test('UK mobile with 11 digits is valid, with spaces or +44', () => {
  assert.equal(ukPhoneError('07700 900123'), null);
  assert.equal(ukPhoneError('+44 7700 900123'), null);
});
test('the screenshot number 0790000000000-0 is rejected', () => {
  assert.notEqual(ukPhoneError('0790000000000-0'), null);
});
test('letters in a phone number are rejected', () => {
  assert.notEqual(ukPhoneError('0770ABC0123'), null);
});
test('email needs a domain with a dot', () => {
  assert.equal(emailError('1FAIRDEAL@GMAIL.COM'), null);
  assert.notEqual(emailError('john@gmail'), null);
});
test('names need at least two letters and no digits', () => {
  assert.equal(personNameError('John Smith'), null);
  assert.notEqual(personNameError('J'), null);
  assert.notEqual(personNameError('ABC1'), null);
});
