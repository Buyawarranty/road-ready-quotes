import { AdminTable } from '@/components/ui/table-sorting';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Phone, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

// Website "Request call-back" submissions (stored in abandoned_carts with
// cart_metadata.request_type = 'urgent_callback').
type CallbackRow = { id: string; phone: string | null; contact_status: string | null; created_at: string };

const useCallbacks = (enabled: boolean, onlyNew: boolean) =>
  useQuery({
    queryKey: ['callback-requests', onlyNew],
    enabled,
    refetchInterval: 20000,
    queryFn: async () => {
      let q = (supabase as any).from('abandoned_carts')
        .select('id, phone, contact_status, created_at')
        .contains('cart_metadata', { request_type: 'urgent_callback' })
        .order('created_at', { ascending: false }).limit(200);
      if (onlyNew) q = q.eq('contact_status', 'new');
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CallbackRow[];
    },
  });

const markCalled = async (id: string) => {
  const { error } = await (supabase as any).from('abandoned_carts').update({ contact_status: 'contacted' }).eq('id', id);
  if (error) { toast.error('Could not update the request'); return false; }
  toast.success('Marked as called');
  return true;
};

export const CallbackRequestAlert: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { data: rows = [] } = useCallbacks(enabled, true);
  const r = rows.find((x) => !dismissed.includes(x.id));
  if (!enabled || !r) return null;
  const dismiss = () => setDismissed((c) => [...c, r.id]);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PhoneCall className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle>New call-back request</DialogTitle>
          <DialogDescription>Someone on the website asked us to call them back.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border bg-muted/40 p-4 text-sm">
          <a href={`tel:${(r.phone || '').replace(/\s/g, '')}`} className="text-lg font-bold text-primary">{r.phone}</a>
          <p className="mt-2 text-xs text-muted-foreground">Requested {new Date(r.created_at).toLocaleString('en-GB')}</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={dismiss}>Later</Button>
          <Button variant="outline" onClick={async () => { if (await markCalled(r.id)) { dismiss(); qc.invalidateQueries({ queryKey: ['callback-requests'] }); } }}><Check className="mr-2 h-4 w-4" />Mark as called</Button>
          <Button onClick={() => { dismiss(); navigate('/admin-dashboard/?tab=callback-requests'); }}>Open list <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CallbackRequestsTab: React.FC = () => {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useCallbacks(true, false);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Call-back requests</h2>
        <p className="text-sm text-muted-foreground">Requests from the website "Request call-back" button, newest first.</p>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">No call-back requests yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <AdminTable className="w-full text-sm">
            <thead className="bg-muted/50 text-left"><tr><th className="p-3">Requested</th><th className="p-3">Phone</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString('en-GB')}</td>
                  <td className="p-3"><a className="inline-flex items-center gap-1 font-semibold text-primary" href={`tel:${(r.phone || '').replace(/\s/g, '')}`}><Phone className="h-4 w-4" />{r.phone}</a></td>
                  <td className="p-3">{r.contact_status === 'new' ? <Badge variant="destructive">New</Badge> : <Badge variant="secondary">Called</Badge>}</td>
                  <td className="p-3 text-right">{r.contact_status === 'new' && (
                    <Button size="sm" variant="outline" onClick={async () => { if (await markCalled(r.id)) qc.invalidateQueries({ queryKey: ['callback-requests'] }); }}>Mark as called</Button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </div>
      )}
    </div>
  );
};
