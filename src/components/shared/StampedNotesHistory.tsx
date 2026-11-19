import React from 'react';
import { noteStampLabel } from '@/lib/stampedNotes';

export type HistoryItem = { id: string; at: string | null; author?: string | null; tag?: string | null; text: string };

/** Date-stamped notes list, newest first: tag · time · author, then the note. */
export const StampedNotesHistory: React.FC<{ items: HistoryItem[]; empty?: string; maxHeight?: string }> = ({ items, empty = 'No notes yet', maxHeight = 'max-h-64' }) => (
  items.length === 0 ? <p className="text-xs text-muted-foreground">{empty}</p> : (
    <ul className={`grid gap-2 overflow-y-auto ${maxHeight}`}>
      {items.map(n => (
        <li key={n.id} className="rounded-md bg-muted px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {n.tag && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">{n.tag}</span>}
            <span>{noteStampLabel(n.at)}</span>
            {n.author && <span>· {n.author}</span>}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">{n.text}</div>
        </li>
      ))}
    </ul>
  )
);
