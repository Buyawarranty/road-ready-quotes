import { it } from 'node:test';
import assert from 'node:assert/strict';
import { dealerLoginRecipients, resolveDealerAgentEmail, type DealerAgentStore } from '../../../supabase/functions/_shared/dealerLoginEmail';

it('copies login emails to the active assigned agent Ammara and sends replies to her', () => {
  assert.deepEqual(dealerLoginRecipients('dealer@example.com', 'ammara@pandaprotect.co.uk', 'hello@pandaprotect.co.uk'), {
    to: ['dealer@example.com'], cc: ['ammara@pandaprotect.co.uk'], reply_to: 'ammara@pandaprotect.co.uk',
  });
});

const store = (overrides: Partial<DealerAgentStore> = {}): DealerAgentStore => ({
  contactOwners: async () => [{ assigned_bdm: 'ammara-id' }],
  portfolioOwners: async () => [{ bdm_user_id: 'other-agent' }],
  isActiveStaff: async (id) => id === 'ammara-id',
  authEmail: async (id) => id === 'ammara-id' ? 'ammara@pandaprotect.co.uk' : 'other@pandaprotect.co.uk',
  ...overrides,
});

it('uses the dealer contact assignment instead of another portfolio owner or approving admin', async () => {
  assert.equal(await resolveDealerAgentEmail(store(), 'dealer-id'), 'ammara@pandaprotect.co.uk');
});

it('does not send credentials to a deactivated assigned agent', async () => {
  assert.equal(await resolveDealerAgentEmail(store({ isActiveStaff: async () => false }), 'dealer-id'), undefined);
});

it('does not revive an old portfolio assignment when the contact owner was cleared', async () => {
  assert.equal(await resolveDealerAgentEmail(store({ contactOwners: async () => [{ assigned_bdm: null }] }), 'dealer-id'), undefined);
});

it('uses the portfolio owner only when the dealer has no linked contact', async () => {
  assert.equal(await resolveDealerAgentEmail(store({ contactOwners: async () => [], portfolioOwners: async () => [{ bdm_user_id: 'ammara-id' }] }), 'dealer-id'), 'ammara@pandaprotect.co.uk');
});

it('does not leak login details when linked records disagree on the owner', async () => {
  assert.equal(await resolveDealerAgentEmail(store({ contactOwners: async () => [{ assigned_bdm: 'ammara-id' }, { assigned_bdm: 'other-agent' }] }), 'dealer-id'), undefined);
});

it('does not duplicate a recipient when the approving admin is the recipient', () => {
  assert.deepEqual(dealerLoginRecipients('hello@pandaprotect.co.uk', 'HELLO@pandaprotect.co.uk', 'hello@pandaprotect.co.uk'), {
    to: ['hello@pandaprotect.co.uk'], reply_to: 'hello@pandaprotect.co.uk',
  });
});

it('keeps the brand reply address when a verified caller has no valid email', () => {
  assert.deepEqual(dealerLoginRecipients('dealer@example.com', undefined, 'hello@pandaprotect.co.uk'), {
    to: ['dealer@example.com'], reply_to: 'hello@pandaprotect.co.uk',
  });
});