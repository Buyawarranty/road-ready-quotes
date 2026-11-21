import { it } from 'node:test';
import assert from 'node:assert/strict';
import { dealerLoginRecipients } from '../../../supabase/functions/_shared/dealerLoginEmail';

it('copies login emails to the verified approving admin and sends replies to that admin', () => {
  assert.deepEqual(dealerLoginRecipients('dealer@example.com', 'ammara@pandaprotect.co.uk', 'hello@pandaprotect.co.uk'), {
    to: ['dealer@example.com'], cc: ['ammara@pandaprotect.co.uk'], reply_to: 'ammara@pandaprotect.co.uk',
  });
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