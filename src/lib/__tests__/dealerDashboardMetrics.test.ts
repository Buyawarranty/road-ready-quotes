import { it } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyActivity, monthChange, type DashboardEvent } from '../dealerDashboardMetrics';

const event = (date: string): DashboardEvent => ({ id: date, date, series: 'Quotes', title: '', detail: '', to: '' });
it('counts only events inside the selected calendar days', () => {
  const result = monthlyActivity([event('2026-10-03T23:00:00Z'), event('2026-10-04T23:59:00Z'), event('2026-10-05T00:00:00Z')], new Date(2026, 9, 4), new Date(2026, 9, 4));
  assert.equal(result[0].Quotes, 1);
});
it('keeps six month buckets when the end month has fewer days', () => {
  assert.deepEqual(monthlyActivity([], new Date(2026, 0, 31), new Date(2026, 5, 30)).map(row => row.month), ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']);
});
it('does not fabricate a trend when the previous month has no records', () => {
  assert.equal(monthChange(['2026-10-01T00:00:00Z'], new Date('2026-10-04T00:00:00Z')), null);
});
it('compares current-month records with the previous month', () => {
  assert.equal(monthChange(['2026-09-01', '2026-10-01', '2026-10-02'], new Date('2026-10-04T00:00:00Z')), 100);
});