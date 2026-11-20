import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BULK_APPROVE_PERMISSION, TEST_DEALER_PERMISSION, canManageSignupAction, pendingApprovalRows } from '../../../supabase/functions/_shared/dealerSignupActionAccess';

describe('Signup actions', () => {
  it('bulk approval defaults off for Admin', () => assert.equal(canManageSignupAction(['admin'], {}, BULK_APPROVE_PERMISSION), false));
  it('Super Admin can bulk approve', () => assert.equal(canManageSignupAction(['super_admin'], {}, BULK_APPROVE_PERMISSION), true));
  it('explicit permission allows Admin bulk approval', () => assert.equal(canManageSignupAction(['admin'], { [BULK_APPROVE_PERMISSION]: true }, BULK_APPROVE_PERMISSION), true));
  it('other roles cannot approve even with a copied permission', () => assert.equal(canManageSignupAction(['bdm'], { [BULK_APPROVE_PERMISSION]: true }, BULK_APPROVE_PERMISSION), false));
  it('Test tagging defaults off for Admin', () => assert.equal(canManageSignupAction(['admin'], {}, TEST_DEALER_PERMISSION), false));
  it('only selected unapproved rows enter bulk approval', () => assert.deepEqual(pendingApprovalRows([{ id: 'a', status: 'approved' }, { id: 'b', status: 'pending' }, { id: 'c', status: 'new' }], new Set(['a', 'b'])), [{ id: 'b', status: 'pending' }]));
});