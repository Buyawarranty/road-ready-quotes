import { describe, it, expect } from 'vitest';
import { BDM_NO_FILTERS, bdmFilterConditions } from './bdmFilters';

describe('bdm filters', () => {
  it('ORs options within a group and keeps groups separate', () => {
    const out = bdmFilterConditions({ ...BDM_NO_FILTERS, calls: ['0', '6+'], account: ['dnc'] }, new Date('2026-11-05T00:00:00Z'));
    expect(out).toEqual(['call_count.eq.0,call_count.gte.6', 'do_not_contact.is.true']);
  });
  it('no filters gives no conditions', () => {
    expect(bdmFilterConditions(BDM_NO_FILTERS, new Date())).toEqual([]);
  });
});
