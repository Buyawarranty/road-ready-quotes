import { describe, expect, it } from 'vitest';
import { compareAdminValues, columnSortKind } from '../adminTableSorting';

describe('admin table ordering', () => {
  it('sorts UK dates newest and oldest, not by month or displayed text', () => {
    const dates = ['02/11/2026, 09:15', '22/10/2026, 10:00', '22/11/2026, 08:35'];
    expect([...dates].sort((a, b) => compareAdminValues(a, b, 'date', 'descending'))).toEqual([dates[2], dates[0], dates[1]]);
    expect([...dates].sort((a, b) => compareAdminValues(a, b, 'date', 'ascending'))).toEqual([dates[1], dates[0], dates[2]]);
  });
  it('sorts amounts highest and lowest numerically', () => {
    const amounts = ['£99.00', '£1,199.00', '£299.00'];
    expect([...amounts].sort((a, b) => compareAdminValues(a, b, 'number', 'descending'))).toEqual(['£1,199.00', '£299.00', '£99.00']);
    expect([...amounts].sort((a, b) => compareAdminValues(a, b, 'number', 'ascending'))).toEqual(['£99.00', '£299.00', '£1,199.00']);
  });
  it('sorts agent names and statuses alphabetically in both directions', () => {
    expect(['Craig', 'Ammara', 'blair'].sort((a, b) => compareAdminValues(a, b, 'text', 'ascending'))).toEqual(['Ammara', 'blair', 'Craig']);
    expect(['Pending', 'Active', 'Cancelled'].sort((a, b) => compareAdminValues(a, b, 'text', 'descending'))).toEqual(['Pending', 'Cancelled', 'Active']);
  });
  it('keeps unknown activity last in both directions', () => {
    for (const direction of ['ascending', 'descending'] as const) expect(compareAdminValues('No activity yet', '22 Nov 2026 08:35', 'date', direction)).toBeGreaterThan(0);
  });
  it('identifies dates, amounts and text without treating agent or status as numeric', () => {
    expect(columnSortKind('Last activity')).toBe('date');
    expect(columnSortKind('Revenue')).toBe('number');
    expect(columnSortKind('Agent')).toBe('text');
    expect(columnSortKind('Status')).toBe('text');
  });
});