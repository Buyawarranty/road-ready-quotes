import { useCallback, useRef, useState } from 'react';
import { compareAdminValues, type AdminSortDirection, type AdminSortKind } from '@/lib/adminTableSorting';

export type AdminColumnSort = { label: string; column: number; direction: AdminSortDirection; kind: AdminSortKind };

/** Parent-owned sorting runs before pagination and preserves record-level rules. */
export function useAdminRecordSorting<T>(accessors: Record<string, (row: T) => string | number | null | undefined>) {
  const getters = useRef(accessors);
  getters.current = accessors;
  const [columnSort, onSortChange] = useState<AdminColumnSort | null>(null);
  const compare = useCallback((a: T, b: T) => {
    if (!columnSort) return 0;
    const getter = getters.current[columnSort.label];
    if (!getter) return 0;
    return compareAdminValues(String(getter(a) ?? ''), String(getter(b) ?? ''), columnSort.kind, columnSort.direction);
  }, [columnSort]);
  return { columnSort, compare, onSortChange, sortColumns: Object.keys(accessors) };
}