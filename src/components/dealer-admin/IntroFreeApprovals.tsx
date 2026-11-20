import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Gift, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;

interface Pending {
  id: string;
  dealer_id: string;
  customer_id: string;
  slot: number;
  duration_months: number;
  original_amount: number;
  created_at: string;
  dealers?: { company_name?: string; email?: string } | null;
  customers?: { name?: string; registration_plate?: string } | null;
  paid?: number;
  unwound?: number;
}

const isUnwound = (s: any) => ['cancelled', 'refunded'].includes(String(s.status || '').toLowerCase())
  || ['refunded', 'cancelled'].includes(String(s.payment_status || '').toLowerCase());

/** Free warranties stay pending until an Admin/Super Admin checks the dealer's paid sales were not cancelled or refunded. */
const IntroFreeApprovals: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pending | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from('dealer_intro_free_redemptions')
      .select('id, dealer_id, customer_id, slot, duration_months, original_amount, created_at, dealers(company_name, email), customers(name, registration_plate)')
      .eq('status', 'pending').order('created_at', { ascending: true });
    if (error) {
      setLoading(false);
      toast({ title: 'Could not load free warranty requests', description: error.message, variant: 'destructive' });
      return;
    }
    const list: Pending[] = data || [];
    const dealerIds = [...new Set(list.map((r) => r.dealer_id))];
    if (dealerIds.length) {
      const { data: sales } = await db.from('customers').select('dealer_id, status, payment_status, final_amount')
        .in('dealer_id', dealerIds).eq('brand', 'pandaprotect').gt('final_amount', 0);
      for (const row of list) {
        const mine = (sales || []).filter((s: any) => s.dealer_id === row.dealer_id);
        row.unwound = mine.filter(isUnwound).length;
        row.paid = mine.filter((s: any) => s.payment_status === 'paid' && !isUnwound(s)).length;
      }
    }
    setRows(list);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const open = (row: Pending, next: 'approved' | 'rejected') => { setSelected(row); setDecision(next); setNote(''); };

  const submit = async () => {
    if (!selected || saving) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('dealer-intro-free-decision', {
      body: { redemption_id: selected.id, decision, note: note.trim() || null },
    });
    setSaving(false);
    if (error || data?.error) {
      toast({ title: 'Could not save decision', description: data?.error || error?.message || 'Please try again.', variant: 'destructive' });
      return;
    }
    toast({ title: decision === 'approved' ? 'Free warranty approved and activated' : 'Free warranty rejected' });
    setSelected(null);
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Gift className="h-5 w-5" /> Free warranties to approve {rows.length > 0 && <Badge className="bg-crm-orange-soft text-crm-navy">{rows.length}</Badge>}</CardTitle>
        <p className="text-sm text-muted-foreground">Check the dealer's paid warranties are still live (not cancelled or refunded) before activating free cover.</p>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {loading ? <Loader2 className="m-6 h-6 w-6 animate-spin" /> : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No free warranties waiting for approval.</p>
        ) : rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-crm-navy">{row.dealers?.company_name || 'Dealership'} · free warranty #{row.slot}</p>
              <p className="mt-1 text-sm text-muted-foreground">{row.customers?.name || 'Customer'} · {row.customers?.registration_plate || '—'} · {row.duration_months} months · £{Number(row.original_amount).toFixed(2)} trade value</p>
              <p className="mt-1 text-sm"><strong>{row.paid ?? 0}</strong> live paid warranties{(row.unwound ?? 0) > 0 && <span className="ml-2 font-semibold text-destructive"><AlertTriangle className="mr-1 inline h-4 w-4" />{row.unwound} cancelled or refunded</span>}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" onClick={() => open(row, 'rejected')}><X className="mr-2 h-4 w-4" /> Reject</Button>
              <Button className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90" onClick={() => open(row, 'approved')}><Check className="mr-2 h-4 w-4" /> Approve</Button>
            </div>
          </div>
        ))}
      </CardContent>
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o && !saving) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogTitle>{decision === 'approved' ? 'Approve free warranty' : 'Reject free warranty'}</DialogTitle>
          <DialogDescription>{selected?.dealers?.company_name || 'This dealership'} · {selected?.customers?.registration_plate || ''}</DialogDescription>
          <div className="rounded-xl bg-muted p-3 text-sm">
            <p><strong>{selected?.paid ?? 0}</strong> live paid warranties.</p>
            {(selected?.unwound ?? 0) > 0 && <p className="mt-1 font-semibold text-destructive">{selected?.unwound} paid warranties were cancelled or refunded. Please check before approving.</p>}
            <p className="mt-2 text-muted-foreground">{decision === 'approved' ? 'Cover goes live now and the dealer and customer are emailed.' : 'The warranty is not issued and the free place goes back to the dealer.'}</p>
          </div>
          <div className="space-y-2"><Label htmlFor="intro-note">Note (optional)</Label><Textarea id="intro-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="e.g. Checked paid sales" /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => setSelected(null)}>Cancel</Button><Button disabled={saving} onClick={submit} className={decision === 'approved' ? 'bg-crm-orange text-primary-foreground' : ''}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm {decision === 'approved' ? 'approval' : 'rejection'}</Button></div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default IntroFreeApprovals;
