import { AdminTable } from '@/components/ui/table-sorting';
import { useCallback, useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AddDealerDialog } from '@/components/admin/AddDealerDialog';
import { FlaskConical, Loader2, RefreshCw, ExternalLink, Copy, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  const [q, setQ] = useState('');
  const loginUrl = `${window.location.origin}/dealer-portal/login`;
  const copyText = async (text: string, title: string) => { await navigator.clipboard.writeText(text); toast({ title }); };
  const copyLogin = (d: Dealer) => copyText(`Panda Protect TEST dealer login\nLogin: ${loginUrl}\nEmail: ${d.email}`, 'Login details copied');
  const newPassword = async (d: Dealer) => {
    if (!window.confirm(`Set a new password for ${d.email} and email it to them?`)) return;
    setBusy(d.id);
    const { data, error } = await supabase.functions.invoke('dealer-signup-decision', { body: { dealer_id: d.id, decision: 'resend' } });
    setBusy(null);
    const res = data as any;
    if (error || res?.error) {
      let msg = res?.error || error?.message;
      if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json())?.error || msg; } catch { /* keep */ } }
      toast({ title: 'Could not set a new password', description: msg, variant: 'destructive' }); return;
    }
    const pw = res?.temp_password || res?.password;
    if (pw) await copyText(`Panda Protect TEST dealer login\nLogin: ${loginUrl}\nEmail: ${d.email}\nPassword: ${pw}`, 'New password set — details copied to share');
    else toast({ title: 'New password emailed', description: `Sent to ${res?.sent_to || d.email}` });
  };

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

  const term = q.trim().toLowerCase();
  const match = (...v: (string | null | undefined)[]) => !term || v.some(x => (x || '').toLowerCase().includes(term));
  const shownDealers = dealers.filter(d => match(d.company_name, d.contact_name, d.email));
  const dealerName = (id: string | null) => dealers.find(d => d.id === id)?.company_name || '—';

  const pending = sales.filter(s => match(s.name, s.email, s.registration_plate, dealerName(s.dealer_id)) && !s.payment_verified && s.status !== 'Cancelled');
  const done = sales.filter(s => match(s.name, s.email, s.registration_plate, dealerName(s.dealer_id)) && ( s.payment_verified || s.status === 'Cancelled'));

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
          <p>2. Sign in at <a className="text-primary underline" href="/dealer-portal/login" target="_blank" rel="noreferrer">dealer login <ExternalLink className="inline h-3 w-3" /></a> and choose Pay now by card.</p>
          <p>3. Pay with <strong>4242 4242 4242 4242</strong>, any future expiry and any three-digit CVC. Test accounts use Stripe test payments; no real money moves. Completed purchases appear below.</p>
        </CardContent>
      </Card>

      <Input placeholder="Filter test dealers, customers or registrations…" value={q} onChange={e => setQ(e.target.value)} className="max-w-md" aria-label="Filter test data" />

      {err && <p className="text-sm text-destructive">{err}</p>}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Test dealers ({shownDealers.length})</CardTitle><CardDescription>Only accounts tagged Test appear here.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              {shownDealers.length === 0 ? <p className="text-sm text-muted-foreground">No test dealers yet.</p> : (
                <AdminTable className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Company</th><th>Contact</th><th>Login email</th><th>Created</th><th /></tr></thead>
                  <tbody>{shownDealers.map(d => <tr key={d.id} className="border-t"><td className="py-2 font-medium">{d.company_name || '—'} <Badge variant="secondary">Test</Badge></td><td>{d.contact_name || '—'}</td><td>{d.email || '—'}</td><td>{fmt(d.created_at)}</td><td className="whitespace-nowrap text-right"><Button size="sm" variant="outline" className="mr-2" onClick={() => void copyLogin(d)}><Copy className="mr-1 h-3 w-3" />Copy login</Button><Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => void newPassword(d)}>{busy === d.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <KeyRound className="mr-1 h-3 w-3" />}New password</Button></td></tr>)}</tbody></AdminTable>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Waiting for payment ({pending.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {pending.length === 0 ? <p className="text-sm text-muted-foreground">No unpaid test purchases.</p> : (
                <AdminTable className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Customer</th><th>Reg</th><th>Dealer</th><th>Amount</th><th>Started</th><th /></tr></thead>
                  <tbody>{pending.map(s => <tr key={s.id} className="border-t"><td className="py-2">{s.name || '—'}<div className="text-xs text-muted-foreground">{s.email}</div></td><td>{s.registration_plate}</td><td>{dealerName(s.dealer_id)}</td><td>£{Number(s.final_amount || 0).toFixed(2)}</td><td>{fmt(s.created_at)}</td>
                    <td className="text-right"><Badge variant="secondary">Awaiting test card payment</Badge></td></tr>)}</tbody></AdminTable>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Test sales and customers ({done.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {done.length === 0 ? <p className="text-sm text-muted-foreground">No completed test sales yet.</p> : (
                <AdminTable className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Customer</th><th>Reg</th><th>Dealer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>{done.map(s => <tr key={s.id} className="border-t"><td className="py-2">{s.name || '—'}<div className="text-xs text-muted-foreground">{s.email}</div></td><td>{s.registration_plate}</td><td>{dealerName(s.dealer_id)}</td><td>£{Number(s.final_amount || 0).toFixed(2)}</td><td><Badge variant="outline">{s.status}</Badge></td><td>{fmt(s.signup_date || s.created_at)}</td></tr>)}</tbody></AdminTable>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
