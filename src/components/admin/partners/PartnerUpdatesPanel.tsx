import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { PARTNER_GUIDE_VERSION, PARTNER_GUIDE_DATE, PARTNER_UPDATE_PERMISSION } from '../../../../supabase/functions/_shared/partnerGuideVersion';

const db = supabase as any;
interface P { id: string; name: string; contact_email: string | null }
interface Sent { partner_id: string; guide_version: string; success: boolean; created_at: string }

const PartnerUpdatesPanel: React.FC<{ partners: P[] }> = ({ partners }) => {
  const [allowed, setAllowed] = useState(false);
  const [sent, setSent] = useState<Sent[]>([]);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const loadSent = () => db.from('partner_guide_update_emails').select('partner_id, guide_version, success, created_at').order('created_at', { ascending: false }).limit(500).then((r: any) => setSent(r.data || []));
  useEffect(() => {
    loadSent();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: roles }, { data: staff }] = await Promise.all([
        db.from('user_roles').select('role').eq('user_id', u.user.id),
        db.from('admin_users').select('permissions').eq('user_id', u.user.id).maybeSingle(),
      ]);
      const r = (roles || []).map((x: any) => x.role);
      setAllowed(r.includes('super_admin') || (r.includes('admin') && staff?.permissions?.[PARTNER_UPDATE_PERMISSION] === true));
    })();
  }, []);

  const latest = (id: string) => sent.find((s) => s.partner_id === id && s.success);
  const behind = partners.filter((p) => latest(p.id)?.guide_version !== PARTNER_GUIDE_VERSION);
  const openDialog = () => { setPick(new Set(behind.filter((p) => p.contact_email).map((p) => p.id))); setOpen(true); };
  const send = async () => {
    if (summary.trim().length < 10) return toast.error('Write what changed (at least 10 characters).');
    if (!pick.size) return toast.error('Choose at least one partner.');
    if (!window.confirm(`Email ${pick.size} partner contact${pick.size > 1 ? 's' : ''} about guide version ${PARTNER_GUIDE_VERSION}?`)) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('partner-admin', { body: { action: 'send_guide_update', partner_ids: [...pick], summary: summary.trim() } });
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error || 'Sending failed. Please try again.');
    const ok = (data.results || []).filter((r: any) => r.success).length;
    const bad = (data.results || []).filter((r: any) => !r.success);
    toast.success(`Sent to ${ok} partner${ok === 1 ? '' : 's'}`);
    bad.forEach((r: any) => toast.error(`${r.name}: ${r.error}`));
    setOpen(false); setSummary(''); loadSent();
  };

  return (
    <section aria-labelledby="partner-updates" className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="partner-updates" className="text-base font-semibold">Guide updates <Badge variant="secondary" className="ml-2">Version {PARTNER_GUIDE_VERSION} · {PARTNER_GUIDE_DATE}</Badge></h2>
          <p className="mt-1 text-sm text-muted-foreground">Design and price changes need no email: partners link to our screens, so customers see them straight away. Only send an update when something changes for their developers (links, look-ups, sale updates, security). Emails go only to each partner's contact.</p>
          <p className="mt-2 text-sm">{behind.length ? <span className="font-medium text-destructive">{behind.length} partner{behind.length > 1 ? 's' : ''} not yet sent version {PARTNER_GUIDE_VERSION}: {behind.map((p) => p.name).join(', ')}</span> : <span className="text-muted-foreground">Every partner has the latest version.</span>}</p>
        </div>
        {allowed && <Button size="sm" onClick={openDialog}><Mail className="mr-1 h-4 w-4" />Send update to partners</Button>}
      </div>
      {partners.length > 0 && (
        <ul className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {partners.map((p) => { const l = latest(p.id); return <li key={p.id}><span className="font-medium text-foreground">{p.name}</span> — {l ? `version ${l.guide_version}, sent ${new Date(l.created_at).toLocaleDateString('en-GB')}` : 'no update sent yet'}</li>; })}
        </ul>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send guide update (version {PARTNER_GUIDE_VERSION})</DialogTitle>
            <DialogDescription>For changes their developers need to know about. Each contact gets a short email with your note and a link to the latest guide PDF.</DialogDescription></DialogHeader>
          <div className="space-y-3 text-sm">
            <label className="block font-medium" htmlFor="pu-summary">What changed</label>
            <Textarea id="pu-summary" rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Sale updates now include the customer's phone number, address and expiry date." />
            <p className="font-medium">Send to</p>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {partners.map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <Checkbox disabled={!p.contact_email} checked={pick.has(p.id)} onCheckedChange={(v) => setPick((s) => { const n = new Set(s); v ? n.add(p.id) : n.delete(p.id); return n; })} />
                  <span>{p.name}</span><span className="text-xs text-muted-foreground">{p.contact_email || 'no contact email saved'}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send emails'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
export default PartnerUpdatesPanel;
