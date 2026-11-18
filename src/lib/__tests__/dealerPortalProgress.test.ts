import { describe, it, expect } from 'vitest';
import { portalStage, isActiveOnPortal, isReadyForFollowUp, shouldShowFollowUpBar, type DealerPortalUsage } from '../dealerPortalProgress';

const now = new Date('2026-11-18T12:00:00Z').getTime();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const u = (p: Partial<DealerPortalUsage>): DealerPortalUsage => ({ dealer_id: 'd', last_sign_in_at: null, quote_count: 0, warranty_count: 0, last_activity_at: null, ...p });

describe('dealer portal progress', () => {
  it('stages follow link sent → login → quote → warranty', () => {
    expect(portalStage(null)).toBe('signed_up');
    expect(portalStage('d', u({}))).toBe('link_sent');
    expect(portalStage('d', u({ last_sign_in_at: daysAgo(1) }))).toBe('logged_in');
    expect(portalStage('d', u({ last_sign_in_at: daysAgo(1), quote_count: 2 }))).toBe('first_quote');
    expect(portalStage('d', u({ quote_count: 2, warranty_count: 1 }))).toBe('first_warranty');
  });
  it('active means activity within 30 days', () => {
    expect(isActiveOnPortal(u({ last_activity_at: daysAgo(30) }), now)).toBe(true);
    expect(isActiveOnPortal(u({ last_activity_at: daysAgo(31) }), now)).toBe(false);
  });
  it('ready for follow-up needs a recent sign-in and no warranty sold', () => {
    expect(isReadyForFollowUp(u({ last_sign_in_at: daysAgo(2) }), now)).toBe(true);
    expect(isReadyForFollowUp(u({ last_sign_in_at: daysAgo(2), warranty_count: 1 }), now)).toBe(false);
    expect(isReadyForFollowUp(u({ last_sign_in_at: daysAgo(20) }), now)).toBe(false);
  });
  it('bar returns only after a newer sign-in than the dismissal', () => {
    expect(shouldShowFollowUpBar(daysAgo(1), daysAgo(0))).toBe(false);
    expect(shouldShowFollowUpBar(daysAgo(0), daysAgo(1))).toBe(true);
    expect(shouldShowFollowUpBar(null, null)).toBe(false);
  });
});
