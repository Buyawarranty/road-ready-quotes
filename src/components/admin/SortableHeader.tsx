import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

interface SortableHeaderProps {
  label: string;
  /** True when this column is the active sort column. */
  active: boolean;
  /** True when the active sort is newest/largest first. */
  newestFirst: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Clickable table-header button with up/down arrows.
 * First click sorts newest first; clicking again flips the direction.
 */
export function SortableHeader({ label, active, newestFirst, onToggle, className = '' }: SortableHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`Sort by ${label}`}
      className={`inline-flex items-center gap-1 uppercase hover:text-foreground ${className}`}
    >
      {label}{' '}
      {active ? (
        newestFirst ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}
