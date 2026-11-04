import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { autoMapColumns, BDM_DEFAULT_SORT, BDM_NOT_SPOKEN, BDM_SPOKEN_OPTIONS, findDuplicate, isConversation, parseStage, parseUkDate, safeCell } from '../bdm/bdmShared';

const existing = [{ id: 'a', name: 'Northfield Motors Ltd', postcode: 'B31 2AB', phone_digits: '1210000000', website_domain: 'northfield.co.uk', dealer_id: 'd1' }];

describe('BDM contact list rules', () => {
  it('only real conversations update Last spoken', () => {
    assert.equal(isConversation('call', 'no_answer'), false);
    assert.equal(isConversation('call', 'voicemail'), false);
    assert.equal(isConversation('call', 'spoke'), true);
    assert.equal(isConversation('meeting', null), true);
  });

  it('spots duplicates by dealer ID, name + postcode, website and phone', () => {
    assert.equal(findDuplicate({ dealer_id: 'd1', name: 'Other' }, existing)?.reason, 'Same dealer ID');
    assert.equal(findDuplicate({ name: 'Northfield Motors LTD', postcode: 'b312ab' }, existing)?.reason, 'Same name and postcode');
    assert.equal(findDuplicate({ name: 'X', website: 'https://www.northfield.co.uk/used' }, existing)?.reason, 'Same website');
    assert.equal(findDuplicate({ name: 'X', phone: '0121 000 0000' }, existing)?.reason, 'Same phone number');
    assert.equal(findDuplicate({ name: 'Elsewhere', postcode: 'LS1 4AP', phone: '0113 000 0000' }, existing), null);
  });

  it('stops exported cells being run as formulas', () => {
    assert.equal(safeCell('=HYPERLINK("x")'), `'=HYPERLINK("x")`);
    assert.equal(safeCell('Northfield'), 'Northfield');
  });

  it('reads UK dates as day/month', () => {
    assert.equal(parseUkDate('03/11/2026').slice(0, 10), '2026-11-03');
    assert.equal(parseUkDate('not a date'), '');
  });

  it('maps common spreadsheet headings and stage names', () => {
    const m = autoMapColumns(['Dealership Name', 'Post Code', 'Town', 'Telephone', 'Stock']);
    assert.equal(m.name, 'Dealership Name'); assert.equal(m.postcode, 'Post Code'); assert.equal(m.phone, 'Telephone'); assert.equal(m.vehicle_stock, 'Stock');
    assert.equal(parseStage('Follow up'), 'follow_up');
    assert.equal(parseStage('Active'), 'active_dealer');
  });

  it('opens the list on the most recently added dealerships', () => {
    assert.equal(BDM_DEFAULT_SORT.col, 'created_at');
    assert.equal(BDM_DEFAULT_SORT.asc, false);
  });

  it('offers one "not spoken to" filter among the last-spoken choices', () => {
    const ids = BDM_SPOKEN_OPTIONS.map(([id]) => id);
    assert.equal(ids.filter(id => id === BDM_NOT_SPOKEN).length, 1);
    assert.equal(new Set(ids).size, ids.length);
  });
});
