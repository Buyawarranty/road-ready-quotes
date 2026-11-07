import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PANDA_SECTION_ORDER } from '../pandaAdminSections';
import { buildGrantableTabs, PANDA_GRANTABLE_TABS } from '../permissions/pandaAdminTabs';

// The access screens must only ever offer the sections the Panda Protect
// dashboard actually shows, never the Buy A Warranty consumer sections.
describe('Panda Protect grantable permission sections', () => {
  it('offers exactly the dashboard sections, in menu order', () => {
    assert.deepEqual(
      PANDA_GRANTABLE_TABS.map((t) => t.id),
      PANDA_SECTION_ORDER.map((s) => s.id)
    );
  });

  it('drops the retired Buy A Warranty sections', () => {
    const ids = new Set(PANDA_GRANTABLE_TABS.map((t) => t.id));
    for (const retired of [
      'new-leads',
      'get-quote',
      'abandoned-carts',
      'ab-testing',
      'analytics',
      'call-tracking',
      'claims',
      'unsubscribe',
      'blogs-data',
      'landing-pages',
      'goldmine-leads',
      'ghl-sync-log',
      'security',
      'testing',
    ]) {
      assert.equal(ids.has(retired), false, `${retired} must not be grantable`);
    }
  });

  it('keeps the sections the trade desk works from', () => {
    const ids = new Set(PANDA_GRANTABLE_TABS.map((t) => t.id));
    for (const kept of [
      'dealer-overview',
      'dealer-dealers',
      'dealer-sales',
      'customers',
      'dealer-cancellations',
      'dealer-invoices',
      'trader-pricing',
      'discount-codes',
      'user-permissions',
      'account',
    ]) {
      assert.ok(ids.has(kept), `${kept} must stay grantable`);
    }
  });

  it('labels each section the same as the dashboard menu', () => {
    const byId = new Map(PANDA_SECTION_ORDER.map((s) => [s.id, s.label]));
    for (const tab of PANDA_GRANTABLE_TABS) {
      assert.equal(tab.label, byId.get(tab.id));
      assert.ok(tab.description.length > 0, `${tab.id} needs a description`);
    }
  });

  it('only offers extra detail switches where they exist', () => {
    const granular = PANDA_GRANTABLE_TABS.filter((t) => t.hasGranular).map((t) => t.id);
    assert.deepEqual(granular, ['customers']);
  });

  it('automatically includes a newly created dashboard section as an assignable option', () => {
    const newSection = { id: 'new-admin-section', label: 'New section', description: 'New dashboard section' };
    const options = buildGrantableTabs([...PANDA_SECTION_ORDER, newSection]);
    assert.equal(options.length, PANDA_SECTION_ORDER.length + 1);
    assert.deepEqual(options.find((option) => option.id === newSection.id), {
      ...newSection,
      hasGranular: false,
    });
  });
});
