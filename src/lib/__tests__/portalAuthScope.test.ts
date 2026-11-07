import { it } from 'node:test';
import assert from 'node:assert/strict';
import { portalAuthScope, portalAuthStorageKey } from '../portalAuthScope';

it('keeps staff login and dashboard in the same session', () => {
  assert.equal(portalAuthScope('/auth/'), 'staff');
  assert.equal(portalAuthScope('/admin-dashboard/'), 'staff');
});
it('keeps dealer login and all dealer pages in a separate session', () => {
  for (const path of ['/dealer-portal/login', '/dealer-portal/dashboard', '/dealer-portal/quote/pricing', '/dealer-portal/settings/profile', '/dealer-admin/']) {
    assert.equal(portalAuthScope(path), 'dealer');
  }
});
it('never shares dealer and staff storage keys', () => {
  assert.equal(portalAuthStorageKey('panda', 'staff'), 'sb-panda-auth-token');
  assert.equal(portalAuthStorageKey('panda', 'dealer'), 'sb-panda-auth-token-dealer');
  assert.notEqual(portalAuthStorageKey('panda', 'staff'), portalAuthStorageKey('panda', 'dealer'));
});
it('password recovery cannot replace either dashboard session', () => {
  assert.equal(portalAuthScope('/reset-password/'), 'recovery');
  assert.equal(portalAuthStorageKey('panda', 'recovery'), 'sb-panda-auth-token-recovery');
});
it('view as dealer retains staff authorization without using the dealer login session', () => {
  assert.equal(portalAuthScope('/dealer-portal/dashboard', true), 'staff');
  assert.equal(portalAuthScope('/dealer-portal/login', true), 'dealer');
  assert.equal(portalAuthScope('/dealer-portal/signup', true), 'dealer');
});