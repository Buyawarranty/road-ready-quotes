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
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import PartnerUpdatesPanel from './PartnerUpdatesPanel';
import { buildPartnerGuide } from '@/lib/partnerGuide';
import { Code2, Webhook, MousePointerClick, Copy, Download, KeyRound, Link2, Plus, Send, Trash2 } from 'lucide-react';
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
    db.from('customers').select('id, name, registration_plate, final_amount, payment_status, status, signup_date, dealer_id, payment_type, phone, flat_number, building_name, building_number, street, town, county, postcode').eq('partner_id', selected).order('created_at', { ascending: false }).limit(200).then((r: any) => setSales(r.data || []));
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
  const toggle = async (p: Partner, on: boolean) => {
    if (!on && !window.confirm(`Turn off ${p.name}? Their checkout links and API key stop working until you turn them back on.`)) return;
    const { error } = await db.from('partners').update({ status: on ? 'active' : 'paused', updated_at: new Date().toISOString() }).eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success(on ? `${p.name} is on` : `${p.name} is off`); load();
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
    <div className="space-y-5 p-4 text-sm md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-semibold">Partners</h1><p className="text-sm text-muted-foreground">CRM suppliers who sell Panda Protect warranties on their own websites. Customers pay the standard price to Panda Protect.</p></div>
        <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> Add partner</Button>
      </div>


      <PartnerUpdatesPanel partners={partners} />

      <section aria-labelledby="partner-guide" className="rounded-xl border border-border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="partner-guide" className="text-base font-semibold">Guide to send the partner</h2>
            <p className="mt-1 text-sm text-muted-foreground">Only what their developers need. Select a partner below and "Copy guide" fills in their own partner code and dealer IDs.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => copy(buildPartnerGuide({ apiBase: API_BASE, site: PARTNER_SITE, partner: partner ? { name: partner.name, slug: partner.slug } : null, dealers: links.filter((l) => l.partner_id === selected).map((l) => ({ id: l.dealer_id, name: dealerName(l.dealer_id) })) }), 'Guide')}><Copy className="mr-1 h-3 w-3" />Copy guide{partner ? ` for ${partner.name}` : ''}</Button>
            <Button size="sm" asChild><a href="/downloads/panda-protect-partner-guide.pdf" download="Panda-Protect-Partner-Guide.pdf">Export guide (PDF)</a></Button>
            <Button size="sm" variant="outline" asChild><a href="/downloads/panda-protect-partner-guide.pdf" download="Panda-Protect-Partner-Guide.pdf"><Download className="mr-1 h-3 w-3" />Download</a></Button>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm"><strong>Our screens only.</strong> Partners must send every customer to Panda Protect's own checkout pages and designs. They may not build their own quote or payment screens, or copy or restyle ours. Their platform just shows our button or link. If someone puts our checkout inside their own website, it opens as our full page instead.</p>
        <Accordion type="multiple" className="mt-2 text-sm [&_button]:py-2.5 [&_button]:text-sm [&_button]:font-medium [&_code]:text-xs">
          <AccordionItem value="setup"><AccordionTrigger>What they receive from us</AccordionTrigger><AccordionContent className="space-y-1 text-muted-foreground">
            <p>• Partner code (the <code>p</code> value) and a dealer ID for each linked dealer (the <code>d</code> value).</p>
            <p>• API key <code>pp_live_…</code> — shown once, kept on their server only.</p>
            <p>• Signing secret <code>whsec_pp_…</code> — to check our updates are genuine.</p>
            <p>• They give us one HTTPS address where we send sale updates.</p></AccordionContent></AccordionItem>
          <AccordionItem value="button"><AccordionTrigger><span className="flex items-center gap-2"><MousePointerClick className="h-4 w-4 text-primary" />1. Checkout button</span></AccordionTrigger><AccordionContent className="space-y-2 text-muted-foreground">
            <p>Put this link next to each vehicle. It opens our own checkout screen; they must not recreate it. The customer pays Panda Protect the standard price and gets our confirmation email.</p>
            <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{PARTNER_SITE}/partner/checkout?p=PARTNER_CODE&amp;d=DEALER_ID&amp;reg=AB12CDE&amp;ref=THEIR_REFERENCE</code>
            <p><code>reg</code> pre-fills the car; <code>ref</code> is their own deal number, returned in updates. Cars up to 15 years and 150,000 miles.</p></AccordionContent></AccordionItem>
          <AccordionItem value="api"><AccordionTrigger><span className="flex items-center gap-2"><Code2 className="h-4 w-4 text-primary" />2. API (read-only look-ups, not for building screens)</span></AccordionTrigger><AccordionContent className="space-y-2 text-muted-foreground">
            <p>Every request from their server sends <code>Authorization: Bearer pp_live_…</code>.</p>
            <ul className="space-y-1 text-xs">
              <li><code className="break-all">GET {API_BASE}/prices?dealer=DEALER_ID</code> — customer prices incl. VAT</li>
              <li><code className="break-all">GET {API_BASE}/warranties?reg=AB12CDE</code> — their sales for a car</li>
              <li><code className="break-all">GET {API_BASE}/warranties/WARRANTY_ID</code> — one warranty</li>
            </ul>
            <p>401 = wrong or switched-off key · 404 = dealer not linked or not their warranty.</p>
            <Button variant="outline" size="sm" onClick={() => copy(API_BASE, 'API address')}><Copy className="mr-1 h-3 w-3" />Copy API address</Button></AccordionContent></AccordionItem>
          <AccordionItem value="hook"><AccordionTrigger><span className="flex items-center gap-2"><Webhook className="h-4 w-4 text-primary" />3. Sale updates we send them</span></AccordionTrigger><AccordionContent className="space-y-2 text-muted-foreground">
            <p><code>warranty.paid</code> sale completed · <code>warranty.test</code> test sale · <code>ping</code> test button.</p>
            <p>Each update includes customer name, email, phone, address, postcode, registration, vehicle, cover months, amount paid, start date and expiry date. Never trade cost or profit.</p>
            <p>Check it is genuine: HMAC-SHA256 of <code>X-PandaProtect-Timestamp + "." + raw body</code> with the signing secret must equal <code>X-PandaProtect-Signature</code> (after <code>sha256=</code>). Reply 200.</p></AccordionContent></AccordionItem>
          <AccordionItem value="live"><AccordionTrigger>Going live</AccordionTrigger><AccordionContent className="space-y-1 text-muted-foreground">
            <p>1. Test mode: we press Send test, they confirm the ping. 2. They call prices and try a checkout (no charge). 3. Live test runs the full page with no payment. 4. We switch them to Live.</p>
            <p>Switching a partner off stops their checkout links and API key straight away; switching on restores them.</p></AccordionContent></AccordionItem>
        </Accordion>
      </section>
      {partners.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No partners yet. Press “Add partner” to create the CRM supplier — their API key, webhook and checkout links appear here once added.</p>}
      {partners.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
            <Switch checked={p.status === 'active'} aria-label={`Turn ${p.name} ${p.status === 'active' ? 'off' : 'on'}`} onCheckedChange={(on) => toggle(p, on)} />
            <Button variant={p.id === selected ? 'default' : 'outline'} size="sm" onClick={() => setSelected(p.id)}>
              {p.name} <Badge variant={p.mode === 'live' ? 'secondary' : 'test'} className="ml-2">{p.status !== 'active' ? 'Off' : p.mode === 'live' ? 'Live' : p.mode === 'live_test' ? 'Live test' : 'Test'}</Badge>
            </Button>
            </div>
          ))}
        </div>
      )}

      {partner && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-border p-4">
            <h2 className="text-base font-semibold">Settings</h2>
            <p className="text-sm text-muted-foreground">{[partner.contact_name, partner.contact_email, partner.platform].filter(Boolean).join(' · ') || 'No contact saved'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Mode</Label>
                <Select value={partner.mode} onValueChange={(v) => update({ mode: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="test">Test (no payments)</SelectItem><SelectItem value="live_test">Live test (real page, no payment)</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="partner-on">Partner on / off</Label>
                <div className="flex h-10 items-center gap-2"><Switch id="partner-on" checked={partner.status === 'active'} onCheckedChange={(on) => toggle(partner, on)} /><span className="text-sm">{partner.status === 'active' ? 'On — can sell' : 'Off — links and API stopped'}</span></div></div>
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
            <h2 className="text-base font-semibold">Linked dealers</h2>
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
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-semibold">Sales through {partner.name}</h2>
              <p className="text-sm text-muted-foreground">{paid.length} paid · {gbp(paid.reduce((a, s) => a + Number(s.final_amount || 0), 0))}</p></div>
            {sales.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : (
              <div className="overflow-x-auto"><AdminTable className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Date</th><th className="pr-3">Customer</th><th className="pr-3">Phone</th><th className="pr-3">Address</th><th className="pr-3">Reg</th><th className="pr-3">Dealer</th><th className="pr-3">Amount</th><th className="pr-3">Expiry date</th><th>Status</th></tr></thead>
                <tbody>{sales.map((s) => <tr key={s.id} className="border-t border-border"><td className="py-2 pr-3">{new Date(s.signup_date).toLocaleDateString('en-GB')}</td><td className="pr-3">{s.name}</td><td className="pr-3 whitespace-nowrap">{s.phone || '—'}</td><td className="pr-3 min-w-[12rem]">{partnerSaleAddress(s) || '—'}</td><td className="pr-3 font-mono">{s.registration_plate}</td><td className="pr-3">{dealerName(s.dealer_id)}</td><td className="pr-3">{gbp(s.final_amount)}</td><td className="pr-3 whitespace-nowrap">{partnerSaleExpiry(s)}</td><td><Badge variant={s.payment_status === 'paid' ? 'default' : 'secondary'}>{s.payment_status === 'paid' ? s.status : 'Awaiting payment'}</Badge></td></tr>)}</tbody></AdminTable></div>
            )}
          </section>

          <section className="space-y-2 rounded-xl border border-border p-4 lg:col-span-2">
            <h2 className="text-base font-semibold">Recent updates sent</h2>
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

function partnerSaleAddress(c: any): string {
  const first = [c.flat_number, c.building_number, c.building_name, c.street].filter((v: any) => String(v || '').trim()).join(' ');
  return [first, c.town, c.county, c.postcode ? String(c.postcode).toUpperCase() : null].filter((v: any) => String(v || '').trim()).join(', ');
}

/** Same rule as the customer email: start date plus the warranty length in months. */
function partnerSaleExpiry(c: any): string {
  const months = Number.parseInt(String(c.payment_type || ''), 10);
  if (!c.signup_date || !Number.isFinite(months) || months <= 0) return '—';
  const d = new Date(c.signup_date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
  return d.toLocaleDateString('en-GB', { timeZone: 'UTC' });
}
