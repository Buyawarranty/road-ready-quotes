import { it } from 'node:test';
import assert from 'node:assert/strict';
import { dealerCheckoutState } from '../../../supabase/functions/_shared/dealerCheckoutState';

it('Stripe checkout stays Pending and unverified until payment confirms', () => {
  assert.deepEqual(dealerCheckoutState('pay_now'), { status: 'Pending', payment_status: 'pending', payment_verified: false });
});
it('Worldpay also stays Pending and unverified until payment confirms', () => {
  assert.deepEqual(dealerCheckoutState('worldpay'), { status: 'Pending', payment_status: 'pending', payment_verified: false });
});
it('approved invoice billing issues Active with invoice_pending', () => {
  assert.deepEqual(dealerCheckoutState('invoice'), { status: 'Active', payment_status: 'invoice_pending', payment_verified: true });
});