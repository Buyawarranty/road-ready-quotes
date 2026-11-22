import * as React from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminColumnSort } from '@/hooks/useAdminRecordSorting';
import { columnSortKind, compareAdminValues, sortDirectionLabel, type AdminSortDirection, type AdminSortKind } from '@/lib/adminTableSorting';

export const AdminTableSortingScope = React.createContext(false);
type Sort = { column: number; kind: AdminSortKind; direction: AdminSortDirection };
type TableState = { sort: Sort | null };
export interface AdminTableProps extends React.HTMLAttributes<HTMLTableElement> {
  onSortChange?: (sort: AdminColumnSort | null) => void;
  sortColumns?: string[];
}
const TableSortingContext = React.createContext<TableState | null>(null);
type Header = { element: HTMLTableCellElement; column: number; label: string; kind: AdminSortKind };

function cellValue(cell: HTMLTableCellElement | undefined): string {
  if (!cell) return '';
  const explicit = cell.getAttribute('data-sort-value') ?? cell.querySelector('[data-sort-value]')?.getAttribute('data-sort-value');
  if (explicit !== undefined && explicit !== null) return explicit;
  const time = cell.querySelector('time[datetime]');
  if (time) return time.getAttribute('datetime') || '';
  const input = cell.querySelector('input:not([type=checkbox]),select');
  if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) return input.value;
  return cell.textContent || '';
}

// Reorder keyed React children, not DOM nodes: edit, selection and expanded-row
// state remain attached to the same record after sorting.
export function SortableTableBody({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  const state = React.useContext(TableSortingContext);
  const ref = React.useRef<HTMLTableSectionElement>(null);
  const entries = React.Children.toArray(children);
  const values = React.useRef(new Map<string, string>());
  const [revision, refresh] = React.useReducer((n: number) => n + 1, 0);
  const sorted = [...entries];
  if (state?.sort) {
    const sort = state.sort;
    const movable = entries.filter((entry, index) => values.current.has(React.isValidElement(entry) ? String(entry.key ?? index) : String(index)));
    movable.sort((a, b) => compareAdminValues(values.current.get(String(React.isValidElement(a) ? a.key : '')) || '', values.current.get(String(React.isValidElement(b) ? b.key : '')) || '', sort.kind, sort.direction));
    let next = 0;
    entries.forEach((entry, index) => {
      if (values.current.has(React.isValidElement(entry) ? String(entry.key ?? index) : String(index))) sorted[index] = movable[next++];
    });
  }
  React.useLayoutEffect(() => {
    if (!state?.sort || !ref.current) return;
    const next = new Map<string, string>();
    const rows = Array.from(ref.current.rows);
    let rowIndex = 0;
    sorted.forEach((entry, index) => {
      if (!React.isValidElement(entry)) return;
      const row = rows[rowIndex];
      // Fragments keep a record and its expanded details together.
      const size = entry.type === React.Fragment ? React.Children.toArray((entry.props as { children?: React.ReactNode }).children).length : 1;
      rowIndex += size;
      if (!row || row.cells.length < 2 || Array.from(row.cells).some(cell => cell.colSpan > 1) || row.hasAttribute('data-sort-fixed') || /^(total|totals)$/i.test(row.cells[0]?.textContent?.trim() || '')) return;
      next.set(String(entry.key ?? index), cellValue(row.cells[state.sort.column]));
    });
    if (next.size !== values.current.size || [...next].some(([key, value]) => values.current.get(key) !== value)) {
      values.current = next;
      refresh();
    }
  }, [children, state?.sort, revision]);
  return <tbody {...props} ref={ref}>{sorted}</tbody>;
}

export const AdminTable = React.forwardRef<HTMLTableElement, AdminTableProps>(
  ({ children, onClickCapture, onSortChange, sortColumns, ...props }, forwardedRef) => {
    const table = React.useRef<HTMLTableElement>(null);
    React.useImperativeHandle(forwardedRef, () => table.current as HTMLTableElement);
    const [sort, setSort] = React.useState<Sort | null>(null);
    const [headers, setHeaders] = React.useState<Header[]>([]);
    React.useLayoutEffect(() => {
      const next: Header[] = [];
      const row = table.current?.tHead?.rows[0];
      if (row) Array.from(row.cells).forEach((element, column) => {
        const label = element.textContent?.trim() || '';
        const explicitKind = element.getAttribute('data-sort-kind');
        if (!label || element.colSpan > 1 || (!explicitKind && /^(#|actions?|login|documents?(?: & actions)?|select|options?|upgrade|price comp\. proof|trustpilot|google)$/i.test(label)) || (sortColumns && !sortColumns.includes(label)) || element.querySelector('button:not([data-admin-sort]),input,[role=checkbox]')) return;
        next.push({ element, column, label, kind: explicitKind === 'number' || explicitKind === 'date' || explicitKind === 'text' ? explicitKind : columnSortKind(label) });
      });
      setHeaders(current => current.length === next.length && current.every((h, i) => h.element === next[i].element && h.label === next[i].label) ? current : next);
    }, [children, sortColumns]);
    React.useLayoutEffect(() => {
      headers.forEach(header => header.element.setAttribute('aria-sort', sort?.column === header.column ? sort.direction : 'none'));
    }, [headers, sort]);
    const bodyChildren = React.Children.map(children, child => {
      if (React.isValidElement<React.HTMLAttributes<HTMLTableSectionElement>>(child) && child.type === 'tbody') return <SortableTableBody {...child.props} />;
      return child;
    });
    return <TableSortingContext.Provider value={{ sort: onSortChange ? null : sort }}>
      <table {...props} ref={table} onClickCapture={event => {
        const target = event.target;
        if (target instanceof Element && target.closest('thead button:not([data-admin-sort])')) { setSort(null); onSortChange?.(null); }
        onClickCapture?.(event);
      }}>{bodyChildren}</table>
      {headers.map(header => {
        const active = sort?.column === header.column;
        const direction: AdminSortDirection = active && sort?.direction === 'descending' ? 'ascending' : active ? 'descending' : header.kind === 'text' ? 'ascending' : 'descending';
        const label = `${header.label}: ${sortDirectionLabel(header.kind, direction)}`;
        return createPortal(<Button data-admin-sort type="button" variant="ghost" size="icon" className="ml-1 inline-flex h-7 w-7 align-middle text-muted-foreground hover:text-foreground" aria-label={label} title={label} onClick={() => {
          const next = { column: header.column, kind: header.kind, direction };
          setSort(next);
          onSortChange?.({ ...next, label: header.label });
        }}>
          {active ? sort?.direction === 'ascending' ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" /> : <ArrowUpDown aria-hidden="true" />}
        </Button>, header.element, String(header.column));
      })}
    </TableSortingContext.Provider>;
  },
);
AdminTable.displayName = 'AdminTable';