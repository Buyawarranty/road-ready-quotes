import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { StampedNotesHistory } from '@/components/shared/StampedNotesHistory';
import { useBdmNoteHistory } from './useBdmNoteHistory';

/** Timestamped notes for a dealership, with optional "send to an agent" alert. */
const BdmEditNotes: React.FC<{ dealershipId: string; dealershipName: string; onSaved: () => void }> = ({ dealershipId, dealershipName, onSaved }) => {
  const { toast } = useToast();
  const sb = supabase as any;
  const { items, reload: load } = useBdmNoteHistory(dealershipId);
  const [staff, setStaff] = useState<{ user_id: string; name: string }[]>([]);
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState('none');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sb.rpc('bdm_staff_list').then(({ data }: any) => setStaff(data || []));
  }, [dealershipId]);

  const save = async () => {
    const n = text.trim().slice(0, 2000);
    if (!n) return;
    setSaving(true);
    const { error } = await sb.rpc('bdm_log_activity', { p_dealership: dealershipId, p_type: 'note', p_outcome: null, p_notes: n, p_contact: null, p_follow_up: null, p_next_action: null });
    if (error) { setSaving(false); toast({ title: 'Could not save note', description: error.message, variant: 'destructive' }); return; }
    if (assignee !== 'none') {
      const { data: u } = await supabase.auth.getUser();
      const me = staff.find(s => s.user_id === u.user?.id)?.name ?? u.user?.email ?? 'A colleague';
      const { error: e2 } = await sb.from('bdm_note_assignments').insert({ dealership_id: dealershipId, note: n, assigned_to: assignee, assigned_by: u.user?.id, assigned_by_name: me, dealership_name: dealershipName });
      if (e2) toast({ title: 'Note saved, but could not send it', description: e2.message, variant: 'destructive' });
      else toast({ title: `Note saved and sent to ${staff.find(s => s.user_id === assignee)?.name ?? 'agent'}` });
    } else toast({ title: 'Note saved' });
    setSaving(false); setText(''); setAssignee('none'); load(); onSaved();
  };

  return (
    <div className="grid gap-2 border-t pt-3">
      <Label htmlFor={`nt-${dealershipId}`}>Add a note</Label>
      <Textarea id={`nt-${dealershipId}`} rows={3} maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder="What happened, what's next…" />
      <div className="flex items-center gap-2">
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Send to agent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Don't send to anyone</SelectItem>
            {staff.map(s => <SelectItem key={s.user_id} value={s.user_id}>Send to {s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={save} disabled={saving || !text.trim()}>{saving ? 'Saving…' : 'Add note'}</Button>
      </div>
      <Label className="mt-1">Notes history</Label>
      <StampedNotesHistory items={items} />
    </div>
  );
};

export default BdmEditNotes;
