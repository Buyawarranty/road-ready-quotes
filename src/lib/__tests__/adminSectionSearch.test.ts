import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterSectionsBySearch } from '../adminSectionSearch';

const SECTIONS = [
  { id: 'dealer-cancellations', label: 'Cancellations & refunds', description: 'Requests, processed cancellations and refunds' },
  { id: 'dealer-invoices', label: 'Dealer billing', description: 'Invoices, pay later rules and dealer finance' },
  { id: 'bdm-allocation', label: 'BDM allocation', description: 'Dealer portfolio, town access and blocks' },
  { id: 'trader-pricing', label: 'Pricing', description: 'Trade warranty pricing' },
];

describe('admin section search', () => {
  it('finds a section by a word only in its description', () => {
    assert.deepEqual(
      filterSectionsBySearch(SECTIONS, 'refund').map((s) => s.id),
      ['dealer-cancellations'],
    );
  });

  it('finds a section by a word only in its name', () => {
    assert.deepEqual(
      filterSectionsBySearch(SECTIONS, 'billing').map((s) => s.id),
      ['dealer-invoices'],
    );
  });

  it('needs every typed word to appear somewhere', () => {
    assert.deepEqual(
      filterSectionsBySearch(SECTIONS, 'town access').map((s) => s.id),
      ['bdm-allocation'],
    );
    assert.deepEqual(filterSectionsBySearch(SECTIONS, 'town refund'), []);
  });

  it('is not fazed by capital letters or stray spaces', () => {
    assert.deepEqual(
      filterSectionsBySearch(SECTIONS, '  TOWN  ACCESS ').map((s) => s.id),
      ['bdm-allocation'],
    );
  });

  it('keeps the whole list when nothing is typed', () => {
    assert.equal(filterSectionsBySearch(SECTIONS, '').length, SECTIONS.length);
    assert.equal(filterSectionsBySearch(SECTIONS, '   ').length, SECTIONS.length);
  });
});
