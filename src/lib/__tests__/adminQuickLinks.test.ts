import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuickLinks, readQuickLinks, saveQuickLinks } from '../adminQuickLinks';

const makeStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe('Saved admin quick links', () => {
  it('saves chosen dashboard sections and reads them back in the chosen order', () => {
    const storage = makeStorage();
    saveQuickLinks(storage, 'staff-a', ['bdm-contacts', 'dealer-dealers', 'account']);
    assert.deepEqual(readQuickLinks(storage, 'staff-a'), ['bdm-contacts', 'dealer-dealers', 'account']);
  });
  it('keeps each staff member’s quick links separate', () => {
    const storage = makeStorage();
    saveQuickLinks(storage, 'staff-a', ['bdm-contacts']);
    saveQuickLinks(storage, 'staff-b', ['dealer-dealers']);
    assert.deepEqual(readQuickLinks(storage, 'staff-a'), ['bdm-contacts']);
    assert.deepEqual(readQuickLinks(storage, 'staff-b'), ['dealer-dealers']);
  });
  it('persists removal of an individual link, including removal of all links', () => {
    const storage = makeStorage();
    saveQuickLinks(storage, 'staff-a', ['bdm-contacts', 'dealer-dealers']);
    saveQuickLinks(storage, 'staff-a', ['dealer-dealers']);
    assert.deepEqual(readQuickLinks(storage, 'staff-a'), ['dealer-dealers']);
    saveQuickLinks(storage, 'staff-a', []);
    assert.deepEqual(readQuickLinks(storage, 'staff-a'), []);
  });
  it('accepts only current Panda dashboard sections and removes duplicates', () => {
    assert.deepEqual(normalizeQuickLinks(['bdm-contacts', 'new-leads', 'claims', 'bdm-contacts', 1]), ['bdm-contacts']);
  });
  it('handles invalid saved values without crashing the dashboard', () => {
    assert.deepEqual(readQuickLinks({ getItem: () => '{bad-json' }, 'staff-a'), []);
    assert.deepEqual(normalizeQuickLinks({ id: 'bdm-contacts' }), []);
  });
  it('reports storage failure instead of pretending a link was saved', () => {
    assert.throws(() => saveQuickLinks({ setItem: () => { throw new Error('Storage blocked'); } }, 'staff-a', ['bdm-contacts']));
  });
});