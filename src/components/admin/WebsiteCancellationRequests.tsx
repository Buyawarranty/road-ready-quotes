import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type Row = {
  id: string; registration_plate: string; email: string | null; reason: string; feedback: string | null;
  request_type: string; status: string; admin_note: string | null; created_at: string; email_sent: boolean;
};

const STATUS: Record<string, string> = { new: 'New', in_progress: 'In progress', done: 'Cancelled', closed: 'Closed' };
const label = (r: string) => r.replace(/[-_]/g, ' ').replace(/^\w/, c => c.toUpperCase());

const WebsiteCancellationRequests: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any).from('website_cancellation_requests').select('*')
      .eq('brand', 'pandaprotect').order('created_at', { ascending: false }).limit(200);
    if (!showAll) q = q.in('status', ['new', 'in_progress']);
    const { data, error } = await q;
    if (error) toast({ title: 'Could not load requests', description: error.message, variant: 'destructive' });
    setRows(data || []);
    setLoading(false);
  }, [showAll, toast]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (r: Row, status: string) => {
    const { error } = await (supabase as any).from('website_cancellation_requests').update({
      status, admin_note: (notes[r.id] ?? r.admin_note ?? '').trim() || null,
      handled_at: status === 'done' || status === 'closed' ? new Date().toISOString() : null,
    }).eq('id', r.id);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Marked ${STATUS[status].toLowerCase()}` });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Website cancellation requests</h2>
          <p className="text-sm text-muted-foreground">From the "Cancel a warranty" form in the website footer. Requests made by email go to support@pandaprotect.co.uk.</p>
        </div>
        <Button variant="outline" onClick={() => setShowAll(v => !v)}>{showAll ? 'Show open only' : 'Show all'}</Button>
      </div>

      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : rows.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-muted-foreground">No {showAll ? '' : 'open '}cancellation requests.</p>
      ) : rows.map(r => (
        <div key={r.id} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold text-lg">{r.registration_plate}</span>
            <Badge variant={r.status === 'new' ? 'destructive' : 'secondary'}>{STATUS[r.status] ?? r.status}</Badge>
            {r.request_type === 'withdrawn' && <Badge variant="outline">Customer wants to keep warranty</Badge>}
            <span className="ml-auto text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString('en-GB')}</span>
          </div>
          <div className="text-sm space-y-1">
            {r.email && <p><strong>Email:</strong> <a className="underline" href={`mailto:${r.email}`}>{r.email}</a></p>}
            <p><strong>Reason:</strong> {label(r.reason)}</p>
            {r.feedback && <p className="whitespace-pre-wrap"><strong>Comments:</strong> {r.feedback}</p>}
          </div>
          <Textarea placeholder="Admin note (optional)" value={notes[r.id] ?? r.admin_note ?? ''}
            onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} />
          <div className="flex flex-wrap gap-2">
            {r.status === 'new' && <Button variant="outline" onClick={() => setStatus(r, 'in_progress')}>Mark in progress</Button>}
            <Button onClick={() => setStatus(r, 'done')}>Warranty cancelled</Button>
            <Button variant="outline" onClick={() => setStatus(r, 'closed')}>Close without cancelling</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WebsiteCancellationRequests;
