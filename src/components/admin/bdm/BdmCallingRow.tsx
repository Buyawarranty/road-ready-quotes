import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import BdmReminderPopover from './BdmReminderPopover';
import BdmQuickNotePopover from './BdmQuickNotePopover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Bell, Copy, Mail, MailX, MessageSquare, Minus, NotebookPen, Pencil, Phone, Plus, Send } from 'lucide-react';
import { BDM_STAGES, STAGE_TONE, BdmDealership } from '@/lib/bdm/bdmShared';

export type BdmRowContact = { full_name: string; phone: string | null; mobile: string | null; email?: string | null };

const dur = (ms: number) => { const m = Math.max(0, Math.round(ms / 60000)); if (m < 60) return `${m} min`; const h = Math.round(m / 60); if (h < 48) return `${h} hr`; return `${Math.round(h / 24)} days`; };
const ago = (d: string) => `${dur(Date.now() - new Date(d).getTime())} ago`;
/** Same as ago() but with the unit tucked against the number: "9hr ago", "20min ago", "3 days ago". */
const agoTight = (d: string) => ago(d).replace(' min ', 'min ').replace(' hr ', 'hr ');
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
  const firstTouch = r.last_spoken_at || r.last_attempt_at;
  const [editOpen, setEditOpen] = useState(false);
  const toDay = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const [form, setForm] = useState({ phone: '', email: '', last: '', follow: '', action: '' });
  const openEdit = () => { setForm({ phone: r.phone ?? c?.mobile ?? c?.phone ?? '', email: r.email ?? c?.email ?? '', last: toDay(r.last_spoken_at), follow: toDay(r.next_follow_up_at), action: r.next_action ?? '' }); setEditOpen(true); };
  const saveEdit = async () => {
    const em = form.email.trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast({ title: 'Enter a valid email address', variant: 'destructive' }); return; }
    const ph = form.phone.trim();
    if (ph && ph.replace(/\D/g, '').length < 7) { toast({ title: 'Enter a valid phone number', variant: 'destructive' }); return; }
    const iso = (d: string) => (d ? new Date(d + 'T00:00:00Z').toISOString() : null);
    setSaving(true);
    const { error } = await (supabase as any).from('bdm_dealerships').update({ phone: ph.slice(0, 30) || null, email: em || null, last_spoken_at: iso(form.last), next_follow_up_at: iso(form.follow), next_action: form.action.trim().slice(0, 200) || null }).eq('id', r.id);
    setSaving(false);
    if (error) { toast({ title: 'Could not save changes', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Changes saved' }); setEditOpen(false); onChanged();
  };
  const editBtn = <button type="button" onClick={openEdit} className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Edit details"><Pencil className="h-3 w-3" /></button>;

  const phone = r.phone || c?.mobile || c?.phone || null;
  const email = r.email || c?.email || null;
  const dnc = !!r.do_not_contact;
  const tel = phone?.replace(/\s/g, '') ?? '';
  const followDays = dayDiff(r.next_follow_up_at);
  const followWord = followDays == null ? '' : followDays < 0 ? 'late' : followDays === 0 ? '' : 'in';
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
          <SelectTrigger className={`h-8 w-[150px] border-transparent text-xs font-semibold ${STAGE_TONE[stage] ?? 'bg-muted text-foreground'}`} aria-label={`Status for ${r.name}`}><SelectValue /></SelectTrigger>
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
          <BdmQuickNotePopover dealershipId={r.id} dealershipName={r.name} contactName={c?.full_name} onSaved={onChanged} onOpenFull={() => onOpen(r.id, 'activity')} />
          {email && !dnc && (
            <Button asChild size="icon" variant="ghost" className="h-8 w-8" aria-label={`Email ${r.name}`}>
              <a href={`mailto:${email}`} onClick={() => logContact('email')}><Mail className="h-4 w-4" /></a>
            </Button>
          )}
          {!email && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="No email — add one" aria-label={`Add an email for ${r.name}`} onClick={openEdit}>
              <MailX className="h-4 w-4" />
            </Button>
          )}
          <BdmReminderPopover dealershipId={r.id} name={r.name} onSaved={onChanged} trigger={
          <Button variant="ghost" title={followLabel} aria-label={followLabel}
            className={`h-9 w-11 gap-0 rounded-md px-1 leading-none hover:bg-transparent ${
              followDays == null ? 'text-muted-foreground'
              : followDays < 0 ? 'bg-destructive/10 text-destructive'
              : followDays === 0 ? 'bg-crm-orange-soft text-crm-orange'
              : 'bg-crm-blue-soft/70 text-foreground'
            }`}>
            <span className="text-sm font-bold tabular-nums">{followDays == null ? <Bell className="h-4 w-4" /> : followDays === 0 ? 'Today' : Math.abs(followDays)}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{followWord}</span>
          </Button>
          } />
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
            {editBtn}
          </div>
        ) : <button type="button" onClick={openEdit} className="text-xs text-muted-foreground underline-offset-2 hover:underline">No number · add</button>}
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
            {editBtn}
          </div>
        ) : <button type="button" onClick={openEdit} className="text-xs text-muted-foreground underline-offset-2 hover:underline">No email · add</button>}
      </td>
      {/* Last spoken */}
      <td className="p-2 whitespace-nowrap text-xs">{shortDate(r.last_spoken_at)}{editBtn}</td>
      {/* Follow-up */}
      <td className="p-2">
        <p className={`whitespace-nowrap text-xs ${overdue ? 'font-semibold text-destructive' : ''}`}>{r.next_follow_up_at ? shortDate(r.next_follow_up_at) : '—'}{editBtn}</p>
        {r.next_action && <p className="max-w-[140px] truncate text-[11px] text-muted-foreground">{r.next_action}</p>}
      </td>
      {/* Latest note */}
      <td className="p-2"><button type="button" onClick={() => setNoteOpen(true)} className="flex max-w-[200px] items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground" title={r.latest_note ? `${r.latest_note} — click to add a note` : 'Add a note'}><span className="truncate">{r.latest_note ?? 'Add note'}</span><Pencil className="h-3 w-3 shrink-0" /></button></td>

      {/* Agent activity */}
      <td className="p-2 text-xs">
        {r.last_attempt_at
          ? <><p>{ago(r.last_attempt_at)}</p>{r.last_outcome && <p className="text-muted-foreground">{r.last_outcome.replace(/_/g, ' ')}</p>}</>
          : <p className="italic text-muted-foreground">No agent activity</p>}
      </td>
      {/* Lead date */}
      <td className="p-2 whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
      {/* Customer activity */}
      <td className="p-2 text-xs">
        <p className={`whitespace-nowrap ${r.dealer_id ? 'font-medium text-success' : 'italic text-muted-foreground'}`}>
          {r.dealer_id ? 'Dealer account' : 'Not signed up'}
          {r.stock_updated_at && <span className="font-normal not-italic"> updated {agoTight(r.stock_updated_at)}</span>}
        </p>
      </td>
      {/* Time to contact */}
      <td className="p-2 whitespace-nowrap text-xs">{firstTouch ? dur(new Date(firstTouch).getTime() - new Date(r.created_at).getTime()) : <span className="italic text-muted-foreground">Not contacted</span>}</td>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="w-[min(360px,calc(100vw-2rem))] max-w-[360px] gap-4 p-5">
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
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[min(360px,calc(100vw-2rem))] max-w-[360px] gap-4 p-5">
          <DialogHeader>
            <DialogTitle>Edit details — {r.name}</DialogTitle>
            <DialogDescription>Update the phone, email, last spoken date and next follow-up.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1"><Label htmlFor={`ph-${r.id}`}>Phone</Label><Input id={`ph-${r.id}`} type="tel" maxLength={30} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="grid gap-1"><Label htmlFor={`em-${r.id}`}>Email</Label><Input id={`em-${r.id}`} type="email" maxLength={255} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="grid gap-1"><Label htmlFor={`ls-${r.id}`}>Last spoken</Label><Input id={`ls-${r.id}`} type="date" value={form.last} onChange={e => setForm(f => ({ ...f, last: e.target.value }))} /></div>
            <div className="grid gap-1"><Label htmlFor={`fu-${r.id}`}>Follow-up date</Label><Input id={`fu-${r.id}`} type="date" value={form.follow} onChange={e => setForm(f => ({ ...f, follow: e.target.value }))} /></div>
            <div className="grid gap-1"><Label htmlFor={`na-${r.id}`}>Next action</Label><Input id={`na-${r.id}`} maxLength={200} value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} placeholder="e.g. Call back about pricing" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </tr>
  );
};

export default BdmCallingRow;
