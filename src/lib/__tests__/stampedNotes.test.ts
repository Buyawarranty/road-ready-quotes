import { describe, it, expect } from 'vitest';
import { appendStampedNote, parseStampedNotes } from '../stampedNotes';

describe('stamped notes', () => {
  it('keeps history newest first with time and author', () => {
    const a = appendStampedNote('Old plain note', 'First call', 'Ammara', new Date('2026-11-19T10:03:00Z'));
    const b = appendStampedNote(a, 'Second call', 'James', new Date('2026-11-19T11:00:00Z'));
    const p = parseStampedNotes(b);
    expect(p.map(x => x.text)).toEqual(['Second call', 'First call', 'Old plain note']);
    expect(p[1]).toMatchObject({ author: 'Ammara', at: '2026-11-19T10:03:00.000Z' });
    expect(p[2].at).toBeNull();
  });
  it('ignores empty notes', () => {
    expect(appendStampedNote('x', '   ', 'A')).toBe('x');
  });
});
