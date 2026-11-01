import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type Req = {
  id: string; dealer_id: string; current_value: string | null; requested_value: string;
  reason: string | null; status: string; created_at: string; reviewed_at: string | null;
  dealers?: { email: string | null; phone: string | null } | null;
};

const DealerAdminProfileChanges: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any).from('dealer_profile_change_requests')
      .select('*, dealers(email, phone)').order('created_at', { ascending: false }).limit(200);
    if (filter === 'pending') q = q.eq('status', 'pending');
    const { data, error } = await q;
    if (error) toast({ title: 'Could not load requests', description: error.message, variant: 'destructive' });
    setRows(data || []);
    setLoading(false);
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error } = await (supabase as any).rpc('review_dealer_profile_change', { p_request_id: id, p_approve: approve });
    setBusy(null);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); return; }
    toast({ title: approve ? 'Company name updated' : 'Request declined' });
    load();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Dealer profile changes</h1>
          <p className="text-sm text-muted-foreground">Dealers can change their phone and billing address themselves. Company name changes wait here for your approval.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>Pending</Button>
          <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
        </div>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No {filter === 'pending' ? 'pending ' : ''}requests.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr>
              <th className="p-3">Requested</th><th className="p-3">Current name</th><th className="p-3">New name</th>
              <th className="p-3">Reason</th><th className="p-3">Dealer contact</th><th className="p-3">Status</th><th className="p-3" />
            </tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                <td className="p-3">{r.current_value || '—'}</td>
                <td className="p-3 font-semibold">{r.requested_value}</td>
                <td className="p-3">{r.reason || '—'}</td>
                <td className="p-3">{r.dealers?.email || '—'}<br />{r.dealers?.phone || ''}</td>
                <td className="p-3 capitalize">{r.status}</td>
                <td className="p-3 whitespace-nowrap">{r.status === 'pending' && <div className="flex gap-2">
                  <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, true)}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => review(r.id, false)}>Decline</Button>
                </div>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DealerAdminProfileChanges;
