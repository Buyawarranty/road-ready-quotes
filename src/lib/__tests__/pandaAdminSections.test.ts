import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PANDA_SECTION_ORDER, resolvePandaSection } from '../pandaAdminSections';

// Warranty claims are worked by the Buy A Warranty claims desk, so this
// dashboard must never offer its own claims queue.
describe('Panda Protect admin menu with the claims section retired', () => {
  it('does not offer a Claims section', () => {
    assert.equal(PANDA_SECTION_ORDER.some((s) => s.id === 'claims'), false);
  });

  it('sends old Claims links to Overview instead of a dead tab', () => {
    assert.equal(resolvePandaSection('claims'), 'dealer-overview');
  });

  it('keeps the sections the trade desk still works from', () => {
    const ids = PANDA_SECTION_ORDER.map((s) => s.id);
    for (const id of [
      'dealer-overview',
      'dealer-dealers',
      'dealer-sales',
      'customers',
      'dealer-cancellations',
      'dealer-invoices',
      'trader-pricing',
    ]) {
      assert.ok(ids.includes(id), `expected ${id} to stay in the menu`);
    }
  });

  it('lists BDM contacts as the first section', () => {
    assert.equal(PANDA_SECTION_ORDER[0].id, 'bdm-contacts');
  });

  it('still hides retired Buy A Warranty sections behind Overview', () => {
    assert.equal(resolvePandaSection('new-leads'), 'dealer-overview');
    assert.equal(resolvePandaSection('analytics'), 'dealer-overview');
  });
});
