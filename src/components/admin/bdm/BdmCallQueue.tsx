import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Phone } from 'lucide-react';
import { BdmDealership, outcomeLabel, stageLabel, typeLabel } from '@/lib/bdm/bdmShared';
import BdmLogActivityForm, { BdmStaff } from './BdmLogActivityForm';

const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.toISOString(); };

const BdmCallQueue: React.FC<{ open: boolean; onClose: () => void; userId: string | null; staff: BdmStaff[]; isManager: boolean; onChanged: () => void }> = ({ open, onClose, userId, staff, isManager, onChanged }) => {
  const [queue, setQueue] = useState<BdmDealership[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Overdue first, then today's calls; only the BDM's own, never Do Not Contact.
  const build = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any).from('bdm_dealerships').select('*').eq('do_not_contact', false)
      .not('next_follow_up_at', 'is', null).lte('next_follow_up_at', endOfToday())
      .order('next_follow_up_at', { ascending: true }).limit(200);
    if (userId) q = q.eq('assigned_bdm', userId);
    const { data } = await q;
    setQueue(data || []); setIndex(0); setLoading(false);
  }, [userId]);

  useEffect(() => { if (open) build(); }, [open, build]);

  const current = queue[index];
  useEffect(() => {
    if (!current) return;
    const db = supabase as any;
    db.from('bdm_contacts').select('*').eq('dealership_id', current.id).order('is_decision_maker', { ascending: false }).then(({ data }: any) => setContacts(data || []));
    db.from('bdm_activities').select('*').eq('dealership_id', current.id).order('created_at', { ascending: false }).limit(5).then(({ data }: any) => setHistory(data || []));
  }, [current]);

  const dm = contacts.find(c => c.is_decision_maker) ?? contacts.find(c => c.is_primary) ?? contacts[0];
  const phone = dm?.mobile || dm?.phone || current?.phone;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[min(520px,calc(100vw-2rem))] max-w-[520px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Today's call list</DialogTitle>
          <DialogDescription>
            {loading ? 'Building your list…' : queue.length === 0 ? 'Nothing due — you are all caught up.' : index >= queue.length ? `All ${queue.length} calls done.` : `Call ${index + 1} of ${queue.length}`}
          </DialogDescription>
        </DialogHeader>
        {queue.length > 0 && index < queue.length && (
          <div className="h-1.5 w-full rounded-full bg-muted"><div className="h-1.5 rounded-full bg-crm-orange" style={{ width: `${(index / queue.length) * 100}%` }} /></div>
        )}
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : current ? (
          <div className="space-y-3">
            <div className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{current.name}</p>
                  <p className="text-sm text-muted-foreground">{[current.town, current.postcode].filter(Boolean).join(' · ')} · {stageLabel(current.stage)}</p>
                  {new Date(current.next_follow_up_at!) < new Date(new Date().setHours(0, 0, 0, 0)) && <p className="text-xs font-semibold text-destructive">Overdue since {new Date(current.next_follow_up_at!).toLocaleDateString('en-GB')}</p>}
                  {current.next_action && <p className="text-sm">To do: {current.next_action}</p>}
                </div>
                {phone && (
                  <Button asChild className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90">
                    <a href={`tel:${phone.replace(/\s/g, '')}`}><Phone className="mr-2 h-4 w-4" />{phone}</a>
                  </Button>
                )}
              </div>
              {dm && <p className="mt-2 text-sm"><strong>{dm.full_name}</strong>{dm.job_title ? `, ${dm.job_title}` : ''}{dm.is_decision_maker ? ' · decision maker' : ''}</p>}
              {history.length > 0 && (
                <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
                  {history.map(h => <li key={h.id}><span className="text-muted-foreground">{new Date(h.created_at).toLocaleDateString('en-GB')}</span> · {typeLabel(h.activity_type)}{h.outcome ? ` — ${outcomeLabel(h.outcome)}` : ''}{h.notes ? `: ${h.notes}` : ''}</li>)}
                </ul>
              )}
            </div>
            <BdmLogActivityForm key={current.id} dealershipId={current.id} contacts={contacts} staff={staff} canAssign={isManager}
              assigned={current.assigned_bdm} saveLabel="Save & next call" onSaved={() => { onChanged(); setIndex(i => i + 1); }} />
            <div className="flex justify-between">
              <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Previous</Button>
              <Button variant="ghost" onClick={() => setIndex(i => i + 1)}>Skip for now</Button>
            </div>
          </div>
        ) : !loading && queue.length > 0 ? (
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={build}>Check again</Button><Button onClick={onClose}>Close</Button></div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default BdmCallQueue;
