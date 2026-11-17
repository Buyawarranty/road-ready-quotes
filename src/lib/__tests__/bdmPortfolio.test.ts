import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapPortfolioRow, parseUkDate, statusFrom } from '../bdm/bdmPortfolio';

describe('BDM portfolio import', () => {
  it('reads UK dates as day/month', () => {
    assert.equal(parseUkDate('03/11/2026'), '2026-11-03');
  });
  it('skips rows without a dealership name', () => {
    assert.equal(mapPortfolioRow({ Phone: '0121' }), null);
  });
  it('maps common master-sheet headings', () => {
    const r = mapPortfolioRow({ Dealership: 'Northfield Motors', 'Contact Name': 'Sam', Town: 'Leeds', Status: 'Live', 'Date onboarded': '01/10/2026' });
    assert.equal(r?.dealership_name, 'Northfield Motors');
    assert.equal(r?.status, 'live');
    assert.equal(r?.onboarded_at, '2026-10-01');
  });
  it('defaults unknown status to onboarding', () => {
    assert.equal(statusFrom(''), 'onboarding');
  });
});
