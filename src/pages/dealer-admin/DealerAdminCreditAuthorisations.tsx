import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clock3, FileCheck2, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import IntroFreeApprovals from '@/components/dealer-admin/IntroFreeApprovals';

const db = supabase as any;

type Status = 'pending' | 'approved' | 'rejected';
interface CreditRequest {
  id: string;
  dealer_id: string;
  paid_warranty_count: number;
  status: Status;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  dealers?: { company_name?: string; email?: string; status?: string } | null;
}

const statusStyle: Record<Status, string> = {
  pending: 'bg-crm-orange-soft text-crm-navy',
  approved: 'bg-crm-green-soft text-crm-green-deep',
  rejected: 'bg-destructive/10 text-destructive',
};

const DealerAdminCreditAuthorisations: React.FC = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Status>('pending');
  const [selected, setSelected] = useState<CreditRequest | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from('dealer_paylater_requests')
      .select('id, dealer_id, paid_warranty_count, status, review_note, reviewed_at, created_at, dealers(company_name, email, status)')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: 'Could not load credit requests', description: error.message, variant: 'destructive' });
      return;
    }
    setRequests(data || []);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }), [requests]);
  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const review = (request: CreditRequest, nextDecision: 'approved' | 'rejected') => {
    setSelected(request);
    setDecision(nextDecision);
    setNote('');
  };

  const submitReview = async () => {
    if (!selected || saving) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('dealer-credit-authorisation', {
      body: { action: 'review_request', request_id: selected.id, decision, note: note.trim() || null },
    });
    setSaving(false);
    if (error || data?.error) {
      toast({ title: 'Could not save decision', description: data?.error || error?.message || 'Please try again.', variant: 'destructive' });
      return;
    }
    toast({ title: decision === 'approved' ? '30-day invoicing authorised' : 'Credit request rejected' });
    setSelected(null);
    await load();
  };

  const date = (value: string | null) => value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credit authorisations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review dealer requests for 30-day invoicing. Dealers need 3 paid warranties with no cancellations or refunds, an active account and no overdue balance.</p>
      </div>
      <IntroFreeApprovals />
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-1 text-2xl font-bold">{counts.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Authorised</p><p className="mt-1 text-2xl font-bold">{counts.approved}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="mt-1 text-2xl font-bold">{counts.rejected}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-lg">Dealer requests</CardTitle>
          <div className="flex flex-wrap gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((value) => <Button key={value} size="sm" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value === 'approved' ? 'Authorised' : value[0].toUpperCase() + value.slice(1)}</Button>)}
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {loading ? <Loader2 className="m-8 h-6 w-6 animate-spin" /> : filtered.map((request) => (
            <div key={request.id} className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-crm-navy">{request.dealers?.company_name || 'Dealership'}</p><Badge className={statusStyle[request.status]}>{request.status === 'approved' ? 'Authorised' : request.status}</Badge></div>
                <p className="mt-1 break-all text-sm text-muted-foreground">{request.dealers?.email}</p>
                <p className="mt-2 text-sm"><strong>{request.paid_warranty_count}</strong> paid warranties when requested · {date(request.created_at)}</p>
                {request.review_note && <p className="mt-1 text-sm text-muted-foreground">Decision note: {request.review_note}</p>}
              </div>
              {request.status === 'pending' ? (
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" onClick={() => review(request, 'rejected')}><X className="mr-2 h-4 w-4" /> Reject</Button>
                  <Button className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90" onClick={() => review(request, 'approved')}><Check className="mr-2 h-4 w-4" /> Authorise</Button>
                </div>
              ) : <p className="shrink-0 text-xs text-muted-foreground">Reviewed {date(request.reviewed_at)}</p>}
            </div>
          ))}
          {!loading && filtered.length === 0 && <div className="py-10 text-center"><FileCheck2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No {filter === 'all' ? '' : filter} credit requests</p><p className="mt-1 text-sm text-muted-foreground">Eligible dealer requests will appear here for an Admin or Super Admin to review.</p></div>}
        </CardContent>
      </Card>
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !saving) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogTitle>{decision === 'approved' ? 'Authorise 30-day invoicing' : 'Reject credit request'}</DialogTitle>
          <DialogDescription>{selected?.dealers?.company_name || 'This dealership'} · {selected?.paid_warranty_count} paid warranties when requested.</DialogDescription>
          <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground"><Clock3 className="mr-2 inline h-4 w-4" />{decision === 'approved' ? 'The dealer will be able to activate warranties now and pay by 30-day invoice, subject to ongoing account status.' : 'The dealer can request again after addressing your feedback.'}</div>
          <div className="space-y-2"><Label htmlFor="credit-review-note">Decision note (optional)</Label><Textarea id="credit-review-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Add a note for the account record" /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => setSelected(null)}>Cancel</Button><Button disabled={saving} onClick={submitReview} className={decision === 'approved' ? 'bg-crm-orange text-primary-foreground' : ''}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm {decision === 'approved' ? 'authorisation' : 'rejection'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealerAdminCreditAuthorisations;
