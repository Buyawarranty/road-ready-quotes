import React, { useCallback, useEffect, useState } from 'react';
import { AdminTable } from '@/components/ui/table-sorting';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Code2, Webhook, MousePointerClick, Copy, KeyRound, Link2, Plus, Send, Trash2 } from 'lucide-react';
import { PARTNER_SITE, partnerButtonHtml, partnerCheckoutUrl, partnerSlug } from '@/lib/partnerCheckout';

const db = supabase as any;
const API_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/partner-api-v1`;
interface Partner { id: string; name: string; slug: string; contact_name: string | null; contact_email: string | null; platform: string | null; mode: string; status: string; api_key_prefix: string | null; webhook_url: string | null }
interface Dealer { id: string; company_name: string | null; name: string | null }
const copy = (text: string, what: string) => navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied`));
const gbp = (n: number) => `£${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

const PartnersTab: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [links, setLinks] = useState<{ id: string; partner_id: string; dealer_id: string }[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', contact_name: '', contact_email: '', platform: '', webhook_url: '' });
  const [newKey, setNewKey] = useState<string | null>(null);
  const [addDealer, setAddDealer] = useState('');

  const load = useCallback(async () => {
    const [p, d, l] = await Promise.all([
      db.from('partners').select('*').order('created_at', { ascending: false }),
      db.from('dealers').select('id, company_name, name').eq('status', 'active').order('company_name'),
      db.from('partner_dealers').select('id, partner_id, dealer_id'),
    ]);
    setPartners(p.data || []); setDealers(d.data || []); setLinks(l.data || []);
    setSelected((cur) => cur || p.data?.[0]?.id || null);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    db.from('customers').select('id, name, registration_plate, final_amount, payment_status, status, signup_date, dealer_id').eq('partner_id', selected).order('created_at', { ascending: false }).limit(200).then((r: any) => setSales(r.data || []));
    db.from('partner_webhook_deliveries').select('id, event, success, status_code, error, created_at').eq('partner_id', selected).order('created_at', { ascending: false }).limit(10).then((r: any) => setDeliveries(r.data || []));
  }, [selected]);

  const partner = partners.find((p) => p.id === selected);
  const dealerName = (id: string) => { const d = dealers.find((x) => x.id === id); return d?.company_name || d?.name || 'Dealer'; };
  const update = async (patch: Partial<Partner>) => {
    if (!partner) return;
    const { error } = await db.from('partners').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', partner.id);
    if (error) return toast.error(error.message);
    toast.success('Saved'); load();
  };
  const call = async (action: string) => {
    const { data, error } = await supabase.functions.invoke('partner-admin', { body: { action, partner_id: partner!.id } });
    if (error || data?.error) { toast.error(data?.error || 'That did not work. Please try again.'); return null; }
    return data;
  };

  const create = async () => {
    if (!draft.name.trim()) return toast.error('Enter the partner name');
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await db.from('partners').insert({ ...draft, slug: `${partnerSlug(draft.name)}-${Math.random().toString(36).slice(2, 6)}`, webhook_url: draft.webhook_url || null, created_by: user.user?.id }).select('id').single();
    if (error) return toast.error(error.message);
    setCreating(false); setDraft({ name: '', contact_name: '', contact_email: '', platform: '', webhook_url: '' });
    setSelected(data.id); load();
  };

  const linked = links.filter((l) => l.partner_id === selected);
  const paid = sales.filter((s) => s.payment_status === 'paid' && !/cancel|refund/i.test(s.status || ''));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Partners</h1><p className="text-sm text-muted-foreground">CRM suppliers who sell Panda Protect warranties on their own websites. Customers pay the standard price to Panda Protect.</p></div>
        <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> Add partner</Button>
      </div>


      <section aria-labelledby="partner-guide" className="rounded-xl border border-border bg-muted/30 p-4">
        <h2 id="partner-guide" className="font-semibold">How a partner connects</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add a partner, link their dealers, then create their API key. Everything below becomes available for that partner.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold"><MousePointerClick className="h-4 w-4 text-primary" />1. Checkout button</p>
            <p className="mt-1 text-muted-foreground">A ready-made link and button for each linked dealer. The customer pays Panda Protect the standard price.</p>
            <code className="mt-2 block break-all rounded bg-muted px-2 py-1 text-xs">{PARTNER_SITE}/partner/checkout?p=…&amp;d=…&amp;reg=…</code>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold"><Code2 className="h-4 w-4 text-primary" />2. API</p>
            <p className="mt-1 text-muted-foreground">Sent with <code>Authorization: Bearer pp_live_…</code>.</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li><code className="break-all">GET {API_BASE}/prices?dealer=…</code></li>
              <li><code className="break-all">GET {API_BASE}/warranties?reg=…</code></li>
              <li><code className="break-all">GET {API_BASE}/warranties/:id</code></li>
            </ul>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => copy(API_BASE, 'API address')}><Copy className="mr-1 h-3 w-3" />Copy API address</Button>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold"><Webhook className="h-4 w-4 text-primary" />3. Webhook updates</p>
            <p className="mt-1 text-muted-foreground">We post to the partner's update address, signed with their signing secret.</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li><code>warranty.paid</code> — sale completed</li>
              <li><code>warranty.test</code> — test / live-test sale</li>
              <li><code>ping</code> — test button</li>
            </ul>
          </div>
        </div>
      </section>
      {partners.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No partners yet. Press “Add partner” to create the CRM supplier — their API key, webhook and checkout links appear here once added.</p>}
      {partners.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {partners.map((p) => (
            <Button key={p.id} variant={p.id === selected ? 'default' : 'outline'} size="sm" onClick={() => setSelected(p.id)}>
              {p.name} <Badge variant="secondary" className="ml-2">{p.status === 'paused' ? 'Paused' : p.mode === 'live' ? 'Live' : p.mode === 'live_test' ? 'Live test' : 'Test'}</Badge>
            </Button>
          ))}
        </div>
      )}

      {partner && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-border p-4">
            <h2 className="font-semibold">Settings</h2>
            <p className="text-sm text-muted-foreground">{[partner.contact_name, partner.contact_email, partner.platform].filter(Boolean).join(' · ') || 'No contact saved'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Mode</Label>
                <Select value={partner.mode} onValueChange={(v) => update({ mode: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="test">Test (no payments)</SelectItem><SelectItem value="live_test">Live test (real page, no payment)</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={partner.status} onValueChange={(v) => update({ status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="pw-url">Their update address (webhook)</Label>
              <div className="flex gap-2"><Input id="pw-url" defaultValue={partner.webhook_url || ''} key={partner.id} placeholder="https://their-system.com/webhooks/panda" onBlur={(e) => e.target.value !== (partner.webhook_url || '') && update({ webhook_url: e.target.value || null })} />
                <Button variant="outline" size="icon" aria-label="Send test update" onClick={async () => { const r = await call('test_webhook'); if (r) r.delivery?.success ? toast.success('Test update delivered') : toast.error(r.delivery?.error || 'Add their update address first'); }}><Send className="h-4 w-4" /></Button></div></div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={async () => { if (partner.api_key_prefix && !confirm('Replace the key? The old key stops working straight away.')) return; const r = await call('issue_key'); if (r) { setNewKey(r.key); load(); } }}><KeyRound className="mr-1 h-4 w-4" />{partner.api_key_prefix ? `Replace key (${partner.api_key_prefix}…)` : 'Create API key'}</Button>
              <Button variant="outline" size="sm" onClick={async () => { const r = await call('signing_secret'); if (r) copy(r.secret, 'Signing secret'); }}><Copy className="mr-1 h-4 w-4" /> Copy signing secret</Button>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <h2 className="font-semibold">Linked dealers</h2>
            <div className="flex gap-2">
              <Select value={addDealer} onValueChange={setAddDealer}><SelectTrigger><SelectValue placeholder="Choose an approved dealer" /></SelectTrigger>
                <SelectContent>{dealers.filter((d) => !linked.some((l) => l.dealer_id === d.id)).map((d) => <SelectItem key={d.id} value={d.id}>{d.company_name || d.name}</SelectItem>)}</SelectContent></Select>
              <Button disabled={!addDealer} onClick={async () => { const { error } = await db.from('partner_dealers').insert({ partner_id: partner.id, dealer_id: addDealer }); if (error) toast.error(error.message); else { setAddDealer(''); load(); } }}>Link</Button>
            </div>
            {linked.length === 0 && <p className="text-sm text-muted-foreground">Link at least one dealer to get their button.</p>}
            <ul className="divide-y divide-border">
              {linked.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-medium">{dealerName(l.dealer_id)}</span>
                  <span className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => copy(partnerCheckoutUrl(partner.slug, l.dealer_id), 'Link')}><Link2 className="mr-1 h-4 w-4" /> Link</Button>
                    <Button variant="ghost" size="sm" onClick={() => copy(partnerButtonHtml(partner.slug, l.dealer_id), 'Button code')}><Copy className="mr-1 h-4 w-4" /> Button code</Button>
                    <Button variant="ghost" size="icon" aria-label="Unlink dealer" onClick={async () => { await db.from('partner_dealers').delete().eq('id', l.id); load(); }}><Trash2 className="h-4 w-4" /></Button>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4 lg:col-span-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-semibold">Sales through {partner.name}</h2>
              <p className="text-sm text-muted-foreground">{paid.length} paid · {gbp(paid.reduce((a, s) => a + Number(s.final_amount || 0), 0))}</p></div>
            {sales.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : (
              <div className="overflow-x-auto"><AdminTable className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Date</th><th className="pr-3">Customer</th><th className="pr-3">Reg</th><th className="pr-3">Dealer</th><th className="pr-3">Amount</th><th>Status</th></tr></thead>
                <tbody>{sales.map((s) => <tr key={s.id} className="border-t border-border"><td className="py-2 pr-3">{new Date(s.signup_date).toLocaleDateString('en-GB')}</td><td className="pr-3">{s.name}</td><td className="pr-3 font-mono">{s.registration_plate}</td><td className="pr-3">{dealerName(s.dealer_id)}</td><td className="pr-3">{gbp(s.final_amount)}</td><td><Badge variant={s.payment_status === 'paid' ? 'default' : 'secondary'}>{s.payment_status === 'paid' ? s.status : 'Awaiting payment'}</Badge></td></tr>)}</tbody></AdminTable></div>
            )}
          </section>

          <section className="space-y-2 rounded-xl border border-border p-4 lg:col-span-2">
            <h2 className="font-semibold">Recent updates sent</h2>
            {deliveries.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : deliveries.map((d) => (
              <p key={d.id} className="flex flex-wrap gap-2 text-sm"><Badge variant={d.success ? 'default' : 'destructive'}>{d.success ? 'Delivered' : 'Failed'}</Badge><span className="font-mono">{d.event}</span><span className="text-muted-foreground">{new Date(d.created_at).toLocaleString('en-GB')}{d.error ? ` · ${d.error}` : ''}</span></p>
            ))}
          </section>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent><DialogHeader><DialogTitle>Add partner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {([['name', 'Company name'], ['contact_name', 'Contact name'], ['contact_email', 'Contact email'], ['platform', 'Platform (e.g. Bitrix24, Lovable)'], ['webhook_url', 'Update address (optional)']] as const).map(([k, label]) => (
              <div key={k} className="space-y-1.5"><Label htmlFor={`np-${k}`}>{label}</Label><Input id={`np-${k}`} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} /></div>
            ))}
            <p className="text-xs text-muted-foreground">New partners start in test mode: no payments are taken until you switch them to live.</p>
            <Button className="w-full" onClick={create}>Add partner</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent><DialogHeader><DialogTitle>Partner API key</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Copy this now and send it to the partner securely. It won't be shown again.</p>
          <code className="block break-all rounded-md bg-muted p-3 text-sm">{newKey}</code>
          <Button onClick={() => newKey && copy(newKey, 'API key')}><Copy className="mr-1 h-4 w-4" /> Copy key</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default PartnersTab;
