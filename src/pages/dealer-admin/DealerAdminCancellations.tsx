import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type Req = {
  id: string; dealer_id: string; customer_id: string; reason: string; status: string;
  cancellation_fee: number | null; refund_amount: number | null; admin_note: string | null;
  created_at: string; reviewed_at: string | null;
  dealers?: { company_name: string | null; email: string | null; phone: string | null } | null;
  customer?: { name: string | null; registration_plate: string | null; final_amount: number | null; signup_date: string | null; payment_type: string | null } | null;
};

const gbp = (n?: number | null) => (n == null ? '—' : `£${Number(n).toFixed(2)}`);

const DealerAdminCancellations: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [open, setOpen] = useState<Req | null>(null);
  const [fee, setFee] = useState('');
  const [refund, setRefund] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any).from('dealer_cancellation_requests')
      .select('*, dealers(company_name, email, phone)').order('created_at', { ascending: false }).limit(200);
    if (filter === 'pending') q = q.eq('status', 'pending');
    const { data, error } = await q;
    if (error) toast({ title: 'Could not load requests', description: error.message, variant: 'destructive' });
    const list: Req[] = data || [];
    const ids = [...new Set(list.map(r => r.customer_id))];
    if (ids.length) {
      const { data: cs } = await supabase.from('customers')
        .select('id, name, registration_plate, final_amount, signup_date, payment_type').in('id', ids);
      const map = new Map((cs || []).map((c: any) => [c.id, c]));
      list.forEach(r => { r.customer = map.get(r.customer_id) as any; });
    }
    setRows(list);
    setLoading(false);
    // Pop the oldest pending request open so it gets processed
    if (filter === 'pending' && list.length && !open) openReq(list[list.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const openReq = (r: Req) => {
    setOpen(r);
    setFee(r.cancellation_fee != null ? String(r.cancellation_fee) : '0');
    setRefund(r.refund_amount != null ? String(r.refund_amount) : '0');
    setNote(r.admin_note || '');
  };

  const process = async (approve: boolean) => {
    if (!open) return;
    const f = Number(fee || 0), rf = Number(refund || 0);
    if (approve && (!Number.isFinite(f) || f < 0 || !Number.isFinite(rf) || rf < 0)) {
      toast({ title: 'Enter a fee and refund of £0 or more', variant: 'destructive' }); return;
    }
    setBusy(true);
    const { error } = await (supabase as any).rpc('review_dealer_cancellation', {
      p_request_id: open.id, p_approve: approve, p_fee: approve ? f : null, p_refund: approve ? rf : null, p_note: note.trim() || null,
    });
    setBusy(false);
    if (error) { toast({ title: 'Could not process', description: error.message, variant: 'destructive' }); return; }
    toast({ title: approve ? 'Warranty cancelled' : 'Request declined' });
    setOpen(null);
    load();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Dealer cancellation requests</h1>
          <p className="text-sm text-muted-foreground">Dealers request cancellations from their warranties page. Set any fee and refund, then approve or decline.</p>
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
              <th className="p-3">Requested</th><th className="p-3">Dealer</th><th className="p-3">Customer</th><th className="p-3">Reg</th>
              <th className="p-3">Reason</th><th className="p-3">Fee</th><th className="p-3">Refund</th><th className="p-3">Status</th><th className="p-3" />
            </tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                <td className="p-3">{r.dealers?.company_name || '—'}<br /><span className="text-xs text-muted-foreground">{r.dealers?.email}</span></td>
                <td className="p-3">{r.customer?.name || '—'}</td>
                <td className="p-3 font-mono uppercase">{r.customer?.registration_plate || '—'}</td>
                <td className="p-3 max-w-[240px]">{r.reason}</td>
                <td className="p-3">{gbp(r.cancellation_fee)}</td>
                <td className="p-3">{gbp(r.refund_amount)}</td>
                <td className="p-3 capitalize">{r.status}</td>
                <td className="p-3">{r.status === 'pending' && <Button size="sm" onClick={() => openReq(r)}>Process</Button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process cancellation</DialogTitle>
            <DialogDescription>
              {open?.dealers?.company_name || 'Dealer'} · <span className="font-mono uppercase">{open?.customer?.registration_plate}</span> · {open?.customer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md bg-muted p-3">
              <p className="font-semibold">Reason</p><p>{open?.reason}</p>
              <p className="mt-2 text-muted-foreground">Paid {gbp(open?.customer?.final_amount)} · started {open?.customer?.signup_date ? new Date(open.customer.signup_date).toLocaleDateString('en-GB') : '—'} · {open?.customer?.payment_type || '—'} months</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="cx-fee">Cancellation fee (£)</Label><Input id="cx-fee" inputMode="decimal" value={fee} onChange={e => setFee(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="cx-refund">Refund to dealer (£)</Label><Input id="cx-refund" inputMode="decimal" value={refund} onChange={e => setRefund(e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label htmlFor="cx-note">Note (optional)</Label><Textarea id="cx-note" rows={2} value={note} onChange={e => setNote(e.target.value)} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => process(false)}>Decline</Button>
            <Button disabled={busy} onClick={() => process(true)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve & cancel warranty</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealerAdminCancellations;
