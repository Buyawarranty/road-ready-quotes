import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canExportDealers } from '../dealerExportAccess';

describe('dealer export access', () => {
  it('super admin can always export', () => assert.equal(canExportDealers(['super_admin'], {}), true));
  it('admin cannot export without the permission', () => assert.equal(canExportDealers(['admin'], {}), false));
  it('staff with Export ticked can export', () => assert.equal(canExportDealers(['sales'], { 'tab_dealer-dealers_export': true }), true));
});
