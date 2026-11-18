import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  duplicateDealerSignupIds,
  isProtectedDealerSignup,
  organiseDealerSignups,
} from '../dealerSignupOrganisation';

const signup = (id: string, name: string, created_at: string, extra: Record<string, unknown> = {}) => ({
  id,
  dealership_name: name,
  status: 'new',
  created_at,
  dealer_id: null,
  approved_at: null,
  ...extra,
});

describe('dealer signup list organisation', () => {
  it('marks a repeat dealership as a duplicate even when the email differs', () => {
    const rows = [
      signup('original', 'ABC Cars Ltd', '2026-11-01T10:00:00Z'),
      signup('repeat', 'abc cars ltd', '2026-11-02T10:00:00Z'),
    ];
    assert.deepEqual([...duplicateDealerSignupIds(rows)], ['repeat']);
  });

  it('does not mark different dealership names as duplicates', () => {
    const rows = [signup('one', 'ABC Cars', '2026-11-01T10:00:00Z'), signup('two', 'XYZ Motors', '2026-11-01T10:00:00Z')];
    assert.equal(duplicateDealerSignupIds(rows).size, 0);
  });

  it('keeps the approved application as the main record', () => {
    const rows = [
      signup('approved', 'ABC Cars', '2026-11-01T10:00:00Z', { status: 'approved', approved_at: '2026-11-03T10:00:00Z', dealer_id: 'dealer-1' }),
      signup('new-repeat', 'ABC Cars', '2026-11-04T10:00:00Z'),
    ];
    assert.deepEqual([...duplicateDealerSignupIds(rows)], ['new-repeat']);
  });

  it('keeps a fresh application above an older declined repeat', () => {
    const rows = [
      signup('declined', 'ABC Cars', '2026-11-01T10:00:00Z', { status: 'rejected' }),
      signup('fresh', 'ABC Cars', '2026-11-04T10:00:00Z'),
    ];
    assert.deepEqual([...duplicateDealerSignupIds(rows)], ['declined']);
  });

  it('orders fresh rows first, possible duplicates next and declined rows last', () => {
    const rows = [
      signup('declined', 'Old Motors', '2026-11-01T10:00:00Z', { status: 'rejected' }),
      signup('original', 'ABC Cars', '2026-11-01T10:00:00Z'),
      signup('fresh', 'New Motors', '2026-11-05T10:00:00Z'),
      signup('repeat', 'ABC Cars', '2026-11-04T10:00:00Z'),
    ];
    assert.deepEqual(organiseDealerSignups(rows).map(row => row.id), ['fresh', 'original', 'repeat', 'declined']);
  });

  it('protects every kind of approved account history', () => {
    assert.equal(isProtectedDealerSignup({ status: 'new', dealer_id: 'dealer-1', approved_at: null }), true);
    assert.equal(isProtectedDealerSignup({ status: 'pending', dealer_id: null, approved_at: '2026-11-01' }), true);
    assert.equal(isProtectedDealerSignup({ status: 'approved', dealer_id: null, approved_at: null }), true);
    assert.equal(isProtectedDealerSignup({ status: 'rejected', dealer_id: null, approved_at: null }), false);
  });
});
