import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { BDM_ACTIVITY_TYPES, BDM_OUTCOMES, OUTCOME_TONE } from '@/lib/bdm/bdmShared';

export interface BdmStaff { user_id: string; name: string }

interface Props {
  dealershipId: string;
  contacts: { full_name: string }[];
  staff: BdmStaff[];
  canAssign: boolean;
  assigned: string | null;
  saveLabel?: string;
  onSaved: () => void;
}

const quickDate = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
};

const BdmLogActivityForm: React.FC<Props> = ({ dealershipId, contacts, staff, canAssign, assigned, saveLabel = 'Save activity', onSaved }) => {
  const { toast } = useToast();
  const [type, setType] = useState('call');
  const [outcome, setOutcome] = useState('');
  const [contact, setContact] = useState(contacts[0]?.full_name ?? '');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [assignee, setAssignee] = useState(assigned ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (type !== 'note' && !outcome) { toast({ title: 'Choose an outcome', variant: 'destructive' }); return; }
    if (type === 'note' && !notes.trim()) { toast({ title: 'Write the note first', variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await (supabase.rpc as any)('bdm_log_activity', {
      p_dealership: dealershipId, p_type: type, p_outcome: type === 'note' ? null : outcome,
      p_contact: contact, p_notes: notes, p_next_action: nextAction,
      p_follow_up: followUp ? new Date(followUp).toISOString() : null,
      p_assigned: canAssign && assignee && assignee !== assigned ? assignee : null,
    });
    setBusy(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Activity saved' });
    setOutcome(''); setNotes(''); setNextAction(''); setFollowUp('');
    onSaved();
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Activity</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{BDM_ACTIVITY_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Contact spoken to</Label>
          <Input className="h-9" list={`bdm-contacts-${dealershipId}`} value={contact} onChange={e => setContact(e.target.value)} />
          <datalist id={`bdm-contacts-${dealershipId}`}>{contacts.map(c => <option key={c.full_name} value={c.full_name} />)}</datalist>
        </div>
      </div>
      {type !== 'note' && (
        <div>
          <Label className="text-xs">Outcome</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {BDM_OUTCOMES.map(o => (
              <button key={o.id} type="button" onClick={() => setOutcome(o.id)} aria-pressed={outcome === o.id}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity ${outcome === o.id ? 'border-crm-orange bg-crm-orange text-primary-foreground' : `border-transparent hover:opacity-75 ${OUTCOME_TONE[o.id] ?? 'bg-muted text-muted-foreground'}`}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was said?" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Next action</Label>
          <Input className="h-9" value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="e.g. Call back with pricing" />
        </div>
        <div>
          <Label className="text-xs">Next follow-up</Label>
          <Input className="h-9" type="datetime-local" value={followUp} onChange={e => setFollowUp(e.target.value)} />
          <div className="mt-1 flex gap-1">
            {[['Tomorrow', 1], ['3 days', 3], ['1 week', 7], ['2 weeks', 14]].map(([l, d]) => (
              <button key={l} type="button" className="rounded border px-1.5 py-0.5 text-[11px] hover:bg-muted" onClick={() => setFollowUp(quickDate(d as number))}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {canAssign && (
        <div>
          <Label className="text-xs">Assigned BDM</Label>
          <Select value={assignee || 'none'} onValueChange={v => setAssignee(v === 'none' ? '' : v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {staff.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button onClick={save} disabled={busy} className="w-full bg-crm-orange text-primary-foreground hover:bg-crm-orange/90">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saveLabel}
      </Button>
    </div>
  );
};

export default BdmLogActivityForm;
