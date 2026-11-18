import { it } from 'node:test';
import assert from 'node:assert/strict';
import { dealerActivityStage, type DealerSignupActivity } from '../dealerSignupActivity';

const base: DealerSignupActivity = {
  dealer_account_created: true,
  dealer_created_at: '2026-11-01T10:00:00.000Z',
  dealer_status: 'active',
  last_sign_in_at: null,
  quote_count: 0,
  warranty_count: 0,
  last_quote_at: null,
  last_warranty_at: null,
  last_activity_at: null,
};
const now = new Date('2026-11-18T10:00:00.000Z');

it('marks a signup without a linked dealer account as account not created', () => {
  assert.equal(dealerActivityStage({ ...base, dealer_account_created: false }, now), 'not_created');
});

it('marks an approved account with no sign-in or portal use as awaiting first sign-in', () => {
  assert.equal(dealerActivityStage(base, now), 'login_not_used');
});

it('marks a sign-in, quote or warranty within 30 days as active', () => {
  assert.equal(dealerActivityStage({ ...base, last_sign_in_at: '2026-11-01T09:00:00.000Z', last_activity_at: '2026-11-01T09:00:00.000Z' }, now), 'active');
});

it('keeps older portal users visible as signed up rather than active', () => {
  assert.equal(dealerActivityStage({ ...base, last_sign_in_at: '2026-10-01T09:00:00.000Z', last_activity_at: '2026-10-01T09:00:00.000Z' }, now), 'signed_up');
});
