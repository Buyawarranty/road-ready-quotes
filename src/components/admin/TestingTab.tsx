import { useCallback, useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AddDealerDialog } from '@/components/admin/AddDealerDialog';
import { FlaskConical, Loader2, RefreshCw, ExternalLink } from 'lucide-react';

type Dealer = { id: string; company_name?: string | null; contact_name?: string | null; email?: string | null; created_at?: string | null };
type Sale = { id: string; name: string | null; email: string | null; registration_plate: string | null; final_amount: number | null; status: string | null; payment_verified: boolean | null; dealer_id: string | null; signup_date: string | null; created_at: string | null };

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function TestingTab() {
  const { toast } = useToast();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const { data: d, error } = await supabase.from('dealers').select('*').eq('is_test', true).order('created_at', { ascending: false });
    if (error) { setErr(error.message); setLoading(false); return; }
    const list = (d || []) as Dealer[];
    setDealers(list);
    if (list.length) {
      const { data: s, error: sErr } = await supabase.from('customers')
        .select('id, name, email, registration_plate, final_amount, status, payment_verified, dealer_id, signup_date, created_at')
        .in('dealer_id', list.map(x => x.id)).eq('brand', 'pandaprotect').order('created_at', { ascending: false }).limit(500);
      if (sErr) setErr(sErr.message); else setSales((s || []) as Sale[]);
    } else setSales([]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const dealerName = (id: string | null) => dealers.find(d => d.id === id)?.company_name || '—';

  const markPaid = async (id: string) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke('test-complete-purchase', { body: { customer_id: id } });
    setBusy(null);
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json())?.error || msg; } catch { /* keep */ } }
      toast({ title: 'Test purchase not completed', description: msg, variant: 'destructive' });
      return;
    }
    toast({ title: 'Test purchase marked paid', description: data?.email?.sent ? 'Warranty is live and emails were sent.' : 'Warranty is live.' });
    void load();
  };

  const pending = sales.filter(s => !s.payment_verified && s.status !== 'Cancelled');
  const done = sales.filter(s => s.payment_verified || s.status === 'Cancelled');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold"><FlaskConical className="h-6 w-6 text-primary" /> Testing</h2>
          <p className="text-sm text-muted-foreground">Test dealers, test purchases and test customers. Everything here is tagged Test and kept out of live sales figures.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <AddDealerDialog label="Create test dealer" defaultTest onCreated={() => void load()} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">How to test a purchase</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>1. Create a test dealer above and copy its login.</p>
          <p>2. Sign in at <a className="text-primary underline" href="/dealer-portal/login" target="_blank" rel="noreferrer">dealer login <ExternalLink className="inline h-3 w-3" /></a> and get as far as the card payment page.</p>
          <p>3. Come back here and press <strong>Mark as paid</strong> — no card is charged. The warranty goes live and the emails send, exactly as a real sale.</p>
        </CardContent>
      </Card>

      {err && <p className="text-sm text-destructive">{err}</p>}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Test dealers ({dealers.length})</CardTitle><CardDescription>Only accounts tagged Test appear here.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              {dealers.length === 0 ? <p className="text-sm text-muted-foreground">No test dealers yet.</p> : (
                <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Company</th><th>Contact</th><th>Login email</th><th>Created</th></tr></thead>
                  <tbody>{dealers.map(d => <tr key={d.id} className="border-t"><td className="py-2 font-medium">{d.company_name || '—'} <Badge variant="secondary">Test</Badge></td><td>{d.contact_name || '—'}</td><td>{d.email || '—'}</td><td>{fmt(d.created_at)}</td></tr>)}</tbody></table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Waiting for payment ({pending.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {pending.length === 0 ? <p className="text-sm text-muted-foreground">No unpaid test purchases.</p> : (
                <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Customer</th><th>Reg</th><th>Dealer</th><th>Amount</th><th>Started</th><th /></tr></thead>
                  <tbody>{pending.map(s => <tr key={s.id} className="border-t"><td className="py-2">{s.name || '—'}<div className="text-xs text-muted-foreground">{s.email}</div></td><td>{s.registration_plate}</td><td>{dealerName(s.dealer_id)}</td><td>£{Number(s.final_amount || 0).toFixed(2)}</td><td>{fmt(s.created_at)}</td>
                    <td className="text-right"><Button size="sm" disabled={busy === s.id} onClick={() => void markPaid(s.id)}>{busy === s.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Mark as paid</Button></td></tr>)}</tbody></table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Test sales and customers ({done.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {done.length === 0 ? <p className="text-sm text-muted-foreground">No completed test sales yet.</p> : (
                <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Customer</th><th>Reg</th><th>Dealer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>{done.map(s => <tr key={s.id} className="border-t"><td className="py-2">{s.name || '—'}<div className="text-xs text-muted-foreground">{s.email}</div></td><td>{s.registration_plate}</td><td>{dealerName(s.dealer_id)}</td><td>£{Number(s.final_amount || 0).toFixed(2)}</td><td><Badge variant="outline">{s.status}</Badge></td><td>{fmt(s.signup_date || s.created_at)}</td></tr>)}</tbody></table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
