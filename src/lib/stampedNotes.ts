import { formatActivityTime } from './dealerActivityLabel';

export type StampedNote = { at: string | null; author: string | null; text: string };
const HEADER = /^\[(\d{4}-\d{2}-\d{2}T[^\]|]+|earlier)(?:\s*\|\s*([^\]]*))?\]\s?/;

/** Adds a new note on top of the stored history, stamped with time and author. */
export const appendStampedNote = (existing: string | null | undefined, text: string, author: string | null, now = new Date()): string => {
  const t = text.trim();
  let prev = (existing ?? '').trim();
  if (!t) return prev;
  if (prev && !HEADER.test(prev)) prev = `[earlier] ${prev}`;
  const entry = `[${now.toISOString()}${author ? ` | ${author.replace(/[\]|]/g, '')}` : ''}] ${t}`;
  return prev ? `${entry}\n\n${prev}` : entry;
};

/** Splits stored history into entries, newest first. Older plain text becomes one undated entry. */
export const parseStampedNotes = (stored: string | null | undefined): StampedNote[] => {
  const s = (stored ?? '').trim();
  if (!s) return [];
  const out: StampedNote[] = [];
  const chunks = s.split(/\n\n(?=\[(?:\d{4}-\d{2}-\d{2}T|earlier\]))/);
  for (const c of chunks) {
    const m = c.match(HEADER);
    if (m) out.push({ at: m[1] === 'earlier' ? null : m[1].trim(), author: m[2]?.trim() || null, text: c.slice(m[0].length).trim() });
    else out.push({ at: null, author: null, text: c.trim() });
  }
  return out;
};

export const noteStampLabel = (iso: string | null) => (iso ? formatActivityTime(iso) : 'Earlier note');
