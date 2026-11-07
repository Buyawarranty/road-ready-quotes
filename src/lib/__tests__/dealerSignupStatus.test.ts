import { it } from 'node:test';
import assert from 'node:assert/strict';
import { approvalWithdrawn, validateSignupStatus } from '../../../supabase/functions/_shared/dealerSignupStatus';
it('allows withdrawing approval to pending', () => assert.equal(approvalWithdrawn('approved', '2026-11-07', validateSignupStatus('pending')), true));
it('allows restoring approval', () => assert.equal(approvalWithdrawn('pending', null, validateSignupStatus('approved')), false));
it('rejects invalid statuses', () => assert.throws(() => validateSignupStatus('delete_warranties')));
it('treats retained approval date as approval when correcting status', () => assert.equal(approvalWithdrawn('contacted', '2026-11-07', 'pending'), true));