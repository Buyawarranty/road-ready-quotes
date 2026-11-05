import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock, ChevronRight, NotebookPen, Phone, PhoneCall, PhoneOff, TriangleAlert, Voicemail } from 'lucide-react';

const OUTCOMES = [
  { id: 'no_answer', label: 'No answer', icon: PhoneOff },
  { id: 'voicemail', label: 'Voicemail', icon: Voicemail },
  { id: 'spoke', label: 'Connected', icon: PhoneCall },
  { id: 'wrong_number', label: 'Wrong number', icon: TriangleAlert },
  // "Busy" has no outcome of its own; it is recorded as no answer with a note.
  { id: 'busy', label: 'Busy', icon: Phone },
  { id: 'callback', label: 'Callback', icon: CalendarClock },
] as const;

interface Props {
  dealershipId: string;
  dealershipName: string;
  contactName?: string | null;
  onSaved: () => void;
  onOpenFull: () => void;
}

const BdmQuickNotePopover: React.FC<Props> = ({ dealershipId, dealershipName, contactName, onSaved, onOpenFull }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const db = supabase.rpc as any;

  const log = async (type: 'note' | 'call', outcome: string | null, text: string | null) => {
    setBusy(true);
    const { error } = await db('bdm_log_activity', {
      p_dealership: dealershipId, p_type: type, p_outcome: outcome, p_contact: contactName ?? null,
      p_notes: text, p_next_action: null, p_follow_up: null,
    });
    setBusy(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return false; }
    return true;
  };

  const saveNote = async () => {
    const t = note.trim();
    if (!t || busy) return;
    if (await log('note', null, t.slice(0, 2000))) { toast({ title: 'Note saved' }); setNote(''); setOpen(false); onSaved(); }
  };

  const logOutcome = async (id: string, label: string) => {
    if (busy) return;
    const outcome = id === 'busy' ? 'no_answer' : id;
    const parts = [id === 'busy' ? 'Line busy' : null, note.trim() || null].filter(Boolean).join(' — ');
    if (await log('call', outcome, parts ? parts.slice(0, 2000) : null)) {
      toast({ title: `Logged: ${label}` }); setNote(''); setOpen(false); onSaved();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-primary/50 bg-primary/10 px-2 text-sm font-medium text-primary hover:bg-primary/15" aria-label={`Notes for ${dealershipName}`}>
          <NotebookPen className="h-4 w-4" />Notes
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick note (optional)</p>
        <textarea
          autoFocus
          value={note}
          maxLength={2000}
          rows={3}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(); } }}
          placeholder="Type a quick note and press Enter to save"
          className="w-full resize-none rounded-md border-2 border-primary bg-muted/30 px-3 py-2 text-sm focus:outline-none"
        />
        <p className="mb-3 mt-1 text-xs text-muted-foreground">Press Enter to save · Shift+Enter for a new line</p>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Log outcome</p>
        <div className="grid grid-cols-2 gap-2">
          {OUTCOMES.map(o => (
            <button key={o.id} type="button" disabled={busy} onClick={() => logOutcome(o.id, o.label)}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
              <o.icon className="h-4 w-4 text-muted-foreground" />{o.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => { setOpen(false); onOpenFull(); }}
          className="mt-3 flex w-full items-center justify-between border-t pt-3 text-sm font-medium hover:text-primary">
          <span className="flex items-center gap-2"><NotebookPen className="h-4 w-4" />Open full notes</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default BdmQuickNotePopover;
