import { it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCheckoutPlate, normalizeCheckoutEmail, dealerCheckoutReuseError } from '../../../supabase/functions/_shared/dealerCheckoutDuplicate';
const row = { dealer_id: 'own', brand: 'pandaprotect', purchase_source: 'dealer', payment_verified: false, payment_status: 'pending' };
it('normalizes registration spaces and email case for duplicate matching', () => {
  assert.equal(normalizeCheckoutPlate('b11 cad'), 'B11CAD');
  assert.equal(normalizeCheckoutEmail(' Test@Example.com '), 'test@example.com');
});
it('reuses only an own-brand own-dealer unpaid record', () => {
  assert.equal(dealerCheckoutReuseError(row, 'own'), null);
  assert.ok(dealerCheckoutReuseError(row, 'other'));
  assert.ok(dealerCheckoutReuseError({ ...row, brand: 'buyawarranty' }, 'own'));
});
it('preserves paid and invoice-issued warranties', () => {
  assert.ok(dealerCheckoutReuseError({ ...row, payment_verified: true }, 'own'));
  assert.ok(dealerCheckoutReuseError({ ...row, payment_status: 'paid' }, 'own'));
  assert.ok(dealerCheckoutReuseError({ ...row, payment_status: 'invoice_pending' }, 'own'));
});