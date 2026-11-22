export type AdminSortKind = 'text' | 'number' | 'date';
export type AdminSortDirection = 'ascending' | 'descending';

export function columnSortKind(label: string): AdminSortKind {
  if (/date|created|joined|approved|requested|started|submitted|follow.?up|last |first in|effective|^dob$|expiry|expires|inception|activation|^day$|^paid$|sent at/i.test(label)) return 'date';
  if (/amount|revenue|sales|stock|count|calls|dials|price|cost|profit|discount|balance|refund|fee|hours|days|mileage|total|value|limit|rate|commission|claims|excess|^dur\./i.test(label)) return 'number';
  return 'text';
}

export function adminSortValue(value: string, kind: AdminSortKind): string | number | null {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text || /^(—|-|n\/a|never|no activity yet|not yet|unassigned)$/i.test(text)) return null;
  if (kind === 'number') {
    const match = text.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }
  if (kind === 'date') {
    // UK dates must never be interpreted as US month/day dates.
    const uk = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (uk) return Date.UTC(Number(uk[3]), Number(uk[2]) - 1, Number(uk[1]), Number(uk[4] || 0), Number(uk[5] || 0), Number(uk[6] || 0));
    const iso = text.match(/\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?/);
    const named = text.match(/\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}(?:,?(?:\s+at)?\s+\d{1,2}:\d{2}(?::\d{2})?)?/);
    const parsed = Date.parse(iso?.[0] || named?.[0] || text);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return text;
}

const collator = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });

export function compareAdminValues(a: string, b: string, kind: AdminSortKind, direction: AdminSortDirection): number {
  const left = adminSortValue(a, kind);
  const right = adminSortValue(b, kind);
  // Unknown dates/numbers stay at the bottom in both directions.
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  const result = typeof left === 'number' && typeof right === 'number'
    ? left - right : collator.compare(String(left), String(right));
  return direction === 'descending' ? -result : result;
}

export function sortDirectionLabel(kind: AdminSortKind, direction: AdminSortDirection): string {
  if (kind === 'date') return direction === 'descending' ? 'Newest first' : 'Oldest first';
  if (kind === 'number') return direction === 'descending' ? 'Highest first' : 'Lowest first';
  return direction === 'ascending' ? 'A to Z' : 'Z to A';
}