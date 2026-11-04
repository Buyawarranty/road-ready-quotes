import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Copy, Mail, MessageSquare, Minus, NotebookPen, Phone, Plus, Send } from 'lucide-react';
import { BDM_STAGES, STAGE_TONE, BdmDealership } from '@/lib/bdm/bdmShared';

export type BdmRowContact = { full_name: string; phone: string | null; mobile: string | null; email?: string | null };

const shortDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : 'Never');

/** Whole days from today to a follow-up date: 0 = today, negative = overdue. */
const dayDiff = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const target = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
};

/** UK number → international digits for WhatsApp (07… → 447…). */
export const toWhatsAppDigits = (raw: string) => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '44' + d.slice(1);
  return d;
};

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
  </svg>
);

interface Props {
  r: BdmDealership & { call_count?: number };
  c?: BdmRowContact;
  overdue: boolean;
  assignedName?: string;
  showAssigned: boolean;
  onOpen: (id: string, tab?: string) => void;
  onChanged: () => void;
  rowNumber?: number;
  striped?: boolean;
}

const BdmCallingRow: React.FC<Props> = ({ r, c, overdue, assignedName, showAssigned, onOpen, onChanged, rowNumber, striped }) => {
  const { toast } = useToast();
  const [calls, setCalls] = useState<number>(r.call_count ?? 0);
  const [stage, setStage] = useState(r.stage);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const db = supabase.rpc as any;

  const phone = c?.mobile || r.phone || c?.phone || null;
  const email = c?.email || r.email || null;
  const dnc = !!r.do_not_contact;
  const tel = phone?.replace(/\s/g, '') ?? '';
  const followDays = dayDiff(r.next_follow_up_at);
  const followWord = followDays == null ? 'set' : followDays < 0 ? 'late' : followDays === 0 ? 'due' : 'in';
  const followLabel = followDays == null ? 'No follow-up set — add one'
    : followDays === 0 ? 'Follow up today'
    : followDays > 0 ? `Follow up in ${followDays} day${followDays === 1 ? '' : 's'}`
    : `Overdue by ${Math.abs(followDays)} day${Math.abs(followDays) === 1 ? '' : 's'}`;

  const adjust = async (delta: 1 | -1) => {
    if (delta === -1 && calls === 0) return;
    setCalls(n => Math.max(0, n + delta));
    const { data, error } = await db('bdm_adjust_calls', { p_dealership: r.id, p_delta: delta });
    if (error) { setCalls(n => Math.max(0, n - delta)); toast({ title: 'Could not update calls', description: error.message, variant: 'destructive' }); }
    else if (typeof data === 'number') setCalls(data);
  };

  const changeStage = async (v: string) => {
    const prev = stage; setStage(v);
    const { error } = await db('bdm_set_stage', { p_dealership: r.id, p_stage: v });
    if (error) { setStage(prev); toast({ title: 'Could not change status', description: error.message, variant: 'destructive' }); }
    else onChanged();
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    if (note.length > 2000) { toast({ title: 'Note is too long (2,000 characters max)', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await db('bdm_log_activity', { p_dealership: r.id, p_type: 'note', p_outcome: null, p_contact: c?.full_name ?? null, p_notes: note.trim(), p_next_action: null, p_follow_up: null });
    setSaving(false);
    if (error) { toast({ title: 'Could not save note', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Note saved' }); setNote(''); setNoteOpen(false); onChanged();
  };

  const logContact = (type: 'whatsapp' | 'email') =>
    db('bdm_log_activity', { p_dealership: r.id, p_type: type, p_outcome: null, p_contact: c?.full_name ?? null, p_notes: null, p_next_action: null, p_follow_up: null });

  const copyPhone = async () => { if (!phone) return; await navigator.clipboard.writeText(phone); toast({ title: 'Number copied' }); };

  return (
    <tr className={`border-b last:border-0 ${striped ? 'bg-muted/40' : 'bg-card'} hover:bg-accent/40 ${overdue ? 'border-l-2 border-l-destructive' : ''}`}>
      {rowNumber != null && <td className="bg-muted/70 p-2 text-right font-semibold tabular-nums text-muted-foreground">{rowNumber}</td>}
      {/* Status */}
      <td className="p-2">
        <Select value={stage} onValueChange={changeStage}>
          <SelectTrigger className={`h-8 w-[150px] text-xs font-semibold ${STAGE_TONE[stage] ?? 'bg-muted text-foreground'}`} aria-label={`Status for ${r.name}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {BDM_STAGES.map(s => (
              <SelectItem key={s.id} value={s.id} className={`font-semibold ${STAGE_TONE[s.id] ?? 'bg-muted text-foreground'}`}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dnc && <p className="mt-0.5 text-[11px] font-semibold text-destructive">Do not contact</p>}
      </td>
      {/* Calls */}
      <td className="bg-crm-blue-soft/60 p-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={calls === 0} onClick={() => adjust(-1)} aria-label="Remove a call"><Minus className="h-3 w-3" /></Button>
          <span className="flex min-w-[2.5rem] items-center justify-center gap-1 font-semibold"><Phone className="h-3 w-3 text-muted-foreground" />{calls}</span>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => adjust(1)} aria-label="Add a call"><Plus className="h-3 w-3" /></Button>
        </div>
      </td>
      {/* Actions */}
      <td className="bg-muted/50 p-2">
        <div className="flex items-center gap-1">
          {phone && !dnc && (
            <Button asChild size="icon" variant="ghost" className="h-8 w-8 text-primary" aria-label={`Call ${r.name}`}>
              <a href={`tel:${tel}`} onClick={() => adjust(1)}><Phone className="h-4 w-4" /></a>
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setNoteOpen(true)}><NotebookPen className="h-4 w-4" />Notes</Button>
          {email && !dnc && (
            <Button asChild size="icon" variant="ghost" className="h-8 w-8" aria-label={`Email ${r.name}`}>
              <a href={`mailto:${email}`} onClick={() => logContact('email')}><Mail className="h-4 w-4" /></a>
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Set a reminder" onClick={() => onOpen(r.id, 'activity')}><Bell className="h-4 w-4" /></Button>
        </div>
      </td>
      {/* Dealership + contact */}
      <td className="p-2">
        <button type="button" onClick={() => onOpen(r.id)} className="text-left font-bold hover:underline">{r.name}</button>
        <p className="text-xs text-muted-foreground">{c?.full_name ? `${c.full_name} · ` : ''}{[r.town, r.postcode].filter(Boolean).join(' · ')}</p>
        {(r.star_rating != null || r.vehicle_stock != null || r.website || r.autotrader_url) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {r.star_rating != null && <span>★ {Number(r.star_rating).toFixed(1)}{r.review_count != null ? ` (${r.review_count} reviews)` : ''}</span>}
            {r.vehicle_stock != null && <span>{r.vehicle_stock} cars in stock</span>}
            {r.website && <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Website</a>}
            {r.autotrader_url && <a href={r.autotrader_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">AutoTrader page</a>}
          </p>
        )}
        {showAssigned && <p className="text-[11px] text-muted-foreground">{assignedName ?? 'Unassigned'}</p>}
      </td>
      {/* Phone */}
      <td className="p-2">
        {phone ? (
          <div className="flex items-center gap-1 whitespace-nowrap">
            <a href={`tel:${tel}`} onClick={() => !dnc && adjust(1)} className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/10">
              <Phone className="h-3 w-3" />{phone}
            </a>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyPhone} aria-label="Copy number"><Copy className="h-3.5 w-3.5" /></Button>
            {!dnc && <Button asChild size="icon" variant="ghost" className="h-7 w-7" aria-label="Send text"><a href={`sms:${tel}`}><MessageSquare className="h-3.5 w-3.5" /></a></Button>}
          </div>
        ) : <span className="text-xs text-muted-foreground">No number</span>}
      </td>
      {/* WhatsApp */}
      <td className="bg-crm-green-soft/50 p-2">
        {phone && !dnc ? (
          <Button asChild size="sm" variant="outline" className="h-8 gap-1 border-success/50 text-success hover:bg-success/10">
            <a href={`https://wa.me/${toWhatsAppDigits(phone)}`} target="_blank" rel="noopener noreferrer" onClick={() => logContact('whatsapp')}><WhatsAppIcon />WhatsApp</a>
          </Button>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      {/* Email */}
      <td className="p-2">
        {email ? (
          <div className="flex items-center gap-1">
            <span className="max-w-[170px] truncate text-xs" title={email}>{email}</span>
            {!dnc && <Button asChild size="icon" variant="ghost" className="h-7 w-7" aria-label="Send email"><a href={`mailto:${email}`} onClick={() => logContact('email')}><Send className="h-3.5 w-3.5" /></a></Button>}
          </div>
        ) : <span className="text-xs text-muted-foreground">No email</span>}
      </td>
      {/* Last spoken */}
      <td className="p-2 whitespace-nowrap text-xs">{shortDate(r.last_spoken_at)}</td>
      {/* Follow-up */}
      <td className="p-2">
        <p className={`whitespace-nowrap text-xs ${overdue ? 'font-semibold text-destructive' : ''}`}>{r.next_follow_up_at ? shortDate(r.next_follow_up_at) : '—'}</p>
        {r.next_action && <p className="max-w-[140px] truncate text-[11px] text-muted-foreground">{r.next_action}</p>}
      </td>
      {/* Latest note */}
      <td className="p-2"><p className="max-w-[200px] truncate text-xs text-muted-foreground" title={r.latest_note ?? ''}>{r.latest_note ?? '—'}</p></td>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a note — {r.name}</DialogTitle>
            <DialogDescription>{r.latest_note ? `Latest note: ${r.latest_note}` : 'No notes yet.'}</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={e => setNote(e.target.value)} rows={5} maxLength={2000} placeholder="What was said, who you spoke to, what happens next…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpen(r.id, 'activity')}>Full history</Button>
            <Button onClick={saveNote} disabled={saving || !note.trim()}>{saving ? 'Saving…' : 'Save note'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </tr>
  );
};

export default BdmCallingRow;
