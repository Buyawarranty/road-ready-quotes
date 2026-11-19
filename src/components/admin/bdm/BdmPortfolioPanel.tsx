import BdmOwnerPicker from './BdmOwnerPicker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Briefcase, Plus, Upload, Link2, BadgeCheck, Pencil } from 'lucide-react';
import { useDealerPortalUsage } from '@/hooks/useDealerPortalUsage';
import { DealerFollowUpBar } from '@/components/admin/DealerFollowUpBar';
import { PORTAL_STAGE_LABEL, portalStage, isActiveOnPortal, isReadyForFollowUp, newestReadySignIn } from '@/lib/dealerPortalProgress';
import { appendStampedNote, parseStampedNotes } from '@/lib/stampedNotes';
import { StampedNotesHistory } from '@/components/shared/StampedNotesHistory';
import { PORTFOLIO_STATUSES, PortfolioInput, mapPortfolioRow } from '@/lib/bdm/bdmPortfolio';

type Row = PortfolioInput & { id: string; bdm_user_id: string; dealership_id: string | null; dealer_id: string | null };
const blank: PortfolioInput = { dealership_name: '', contact_name: null, phone: null, email: null, town: null, postcode: null, onboarded_at: new Date().toISOString().slice(0, 10), status: 'onboarding', next_follow_up_at: null, follow_up_action: null, notes: null };
const statusLabel = (s: string) => PORTFOLIO_STATUSES.find(x => x.id === s)?.label ?? s;
const ukDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** A BDM's master sheet of onboarded dealerships. BDMs see their own; managers and admins see everyone's (RLS). */
const BdmPortfolioPanel: React.FC = () => {
  const db = supabase as any;
  const [me, setMe] = useState<string | null>(null);
  const [seeAll, setSeeAll] = useState(false);
  const [staff, setStaff] = useState<{ user_id: string; name: string }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [owner, setOwner] = useState('mine');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'all' | 'active' | 'ready'>('all');
  const [edit, setEdit] = useState<(PortfolioInput & { id?: string; bdm_user_id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [pendingCredit, setPendingCredit] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, { claims: number; refunds: number }>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await db.from('bdm_portfolio').select('*').order('onboarded_at', { ascending: false }).limit(1000);
    if (error) { toast.error(error.message); return; }
    setRows(data || []);
    const ids = [...new Set((data || []).map((r: any) => r.dealer_id).filter(Boolean))];
    if (ids.length) {
      const { data: pend } = await db.rpc('bdm_pending_credit_dealers', { p_dealer_ids: ids });
      setPendingCredit(new Set((pend || []).map((p: any) => p.dealer_id)));
      const { data: cr } = await db.rpc('bdm_dealer_claim_refund_counts', { p_dealer_ids: ids });
      setCounts(Object.fromEntries((cr || []).map((c: any) => [c.dealer_id, { claims: c.claims, refunds: c.refunds }])));
    } else { setPendingCredit(new Set()); setCounts({}); }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);
      const [{ data: m }, { data: a }, { data: s }] = await Promise.all([
        db.rpc('bdm_is_manager', { _uid: u.user.id }), db.rpc('bdm_is_town_admin', { _uid: u.user.id }), db.rpc('bdm_staff_list'),
      ]);
      const all = !!m || !!a;
      setSeeAll(all); if (all) setOwner('all');
      setStaff(s || []);
      load();
    })();
  }, [load]);

  const nameOf = (id: string) => staff.find(s => s.user_id === id)?.name || 'Unknown';
  const today = new Date().toISOString().slice(0, 10);
  const usage = useDealerPortalUsage(useMemo(() => rows.map(r => r.dealer_id).filter(Boolean) as string[], [rows]));
  const mineOrAll = rows.filter(r => owner === 'all' || (owner === 'mine' ? r.bdm_user_id === me : r.bdm_user_id === owner));
  const activeCount = mineOrAll.filter(r => r.dealer_id && isActiveOnPortal(usage[r.dealer_id])).length;
  const readyList = mineOrAll.filter(r => r.dealer_id && isReadyForFollowUp(usage[r.dealer_id]));
  const shown = useMemo(() => rows.filter(r =>
    (view === 'all' || (!!r.dealer_id && (view === 'active' ? isActiveOnPortal(usage[r.dealer_id]) : isReadyForFollowUp(usage[r.dealer_id])))) &&
    (owner === 'all' || (owner === 'mine' ? r.bdm_user_id === me : r.bdm_user_id === owner)) &&
    (!q.trim() || [r.dealership_name, r.contact_name, r.town, r.postcode, r.phone, r.email].join(' ').toLowerCase().includes(q.trim().toLowerCase()))
  ), [rows, owner, q, me, view, usage]);
  const dueCount = shown.filter(r => r.next_follow_up_at && r.next_follow_up_at <= today).length;

  const save = async () => {
    if (!edit || !edit.dealership_name.trim()) { toast.error('Enter the dealership name'); return; }
    setBusy(true);
    const { id, ...rest } = edit;
    const author = staff.find(s => s.user_id === me)?.name ?? null;
    const payload = { ...rest, notes: appendStampedNote(rest.notes, newNote, author) || null, dealership_name: rest.dealership_name.trim(), bdm_user_id: rest.bdm_user_id || me };
    const { error } = id ? await db.from('bdm_portfolio').update(payload).eq('id', id) : await db.from('bdm_portfolio').insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved'); setEdit(null); setNewNote(''); load();
  };

  const onFile = async (f: File) => {
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const mapped = raw.map(mapPortfolioRow).filter(Boolean) as PortfolioInput[];
      if (!mapped.length) { toast.error('No rows found — make sure there is a "Dealership" column'); return; }
      const have = new Set(rows.filter(r => r.bdm_user_id === me).map(r => `${r.dealership_name.toLowerCase()}|${(r.town || '').toLowerCase()}`));
      const fresh = mapped.filter(r => !have.has(`${r.dealership_name.toLowerCase()}|${(r.town || '').toLowerCase()}`)).map(r => ({ ...r, bdm_user_id: me }));
      for (let i = 0; i < fresh.length; i += 200) {
        const { error } = await db.from('bdm_portfolio').insert(fresh.slice(i, i + 200));
        if (error) throw error;
      }
      toast.success(`Imported ${fresh.length} dealership${fresh.length === 1 ? '' : 's'}${mapped.length - fresh.length ? `, skipped ${mapped.length - fresh.length} already in your portfolio` : ''}`);
      load();
    } catch (e: any) { toast.error(`Import failed: ${e.message || e}`); }
  };

  const set = (k: keyof PortfolioInput, v: string) => setEdit(e => (e ? { ...e, [k]: v || null } : e));

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5" />Dealer portfolio</CardTitle>
        <p className="text-sm text-muted-foreground">Your master sheet of onboarded dealerships. Each one is linked to BDM contacts and its dealer account where we can match it, so others see who onboarded it.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEdit({ ...blank })}><Plus className="mr-1 h-4 w-4" />Add dealership</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" />Import sheet</Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
        </div>
        <p className="text-xs text-muted-foreground">Import reads Excel or CSV with headings like Dealership, Contact, Phone, Email, Town, Postcode, Date onboarded, Status, Next follow-up, Notes. Dates as DD/MM/YYYY.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <DealerFollowUpBar storageKey="pp-portfolio-followup-dismissed" count={readyList.length} newestSignIn={newestReadySignIn(readyList.map(r => usage[r.dealer_id!]))} onView={() => setView('ready')} />
        <div className="flex flex-wrap gap-2" role="tablist">
          {([['all', 'All dealerships', mineOrAll.length], ['active', 'Active on portal', activeCount], ['ready', 'Ready for follow-up', readyList.length]] as const).map(([id, label, n]) => (
            <Button key={id} role="tab" aria-selected={view === id} size="sm" variant={view === id ? 'default' : 'outline'} onClick={() => setView(id)}>{label} ({n})</Button>
          ))}
        </div>
        {view === 'active' && <p className="text-xs text-muted-foreground">Active = signed in, or updated a quote or warranty, in the last 30 days.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" value={q} onChange={e => setQ(e.target.value)} placeholder="Search dealership, town, phone…" />
          {seeAll && (
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="mine">Mine</SelectItem>
                {staff.filter(s => s.user_id !== me).map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <span className="text-sm text-muted-foreground">{shown.length} dealerships{dueCount ? ` · ${dueCount} follow-ups due` : ''}</span>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-2">Dealership</th><th className="p-2">Contact</th><th className="p-2">Onboarded</th><th className="p-2">Status</th><th className="p-2">Next follow-up</th><th className="p-2">Portal</th><th className="p-2">Links</th>{seeAll && <th className="p-2">BDM</th>}<th className="p-2" /></tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No dealerships yet — add one or import your sheet.</td></tr>
              ) : shown.map(r => {
                const due = r.next_follow_up_at && r.next_follow_up_at <= today;
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-2"><p className="font-semibold">{r.dealership_name}</p><div className="my-0.5"><BdmOwnerPicker table="bdm_portfolio" allowNone={false} dealershipId={r.id} ownerId={r.bdm_user_id} staff={staff} onChanged={load} /></div><p className="text-xs text-muted-foreground">{[r.town, r.postcode].filter(Boolean).join(' · ')}</p></td>
                    <td className="p-2"><p>{r.contact_name || '—'}</p><p className="text-xs text-muted-foreground">{[r.phone, r.email].filter(Boolean).join(' · ')}</p></td>
                    <td className="p-2 whitespace-nowrap">{ukDate(r.onboarded_at)}</td>
                    <td className="p-2 space-y-1"><Badge variant="secondary">{statusLabel(r.status)}</Badge>{r.dealer_id && pendingCredit.has(r.dealer_id) && <Badge className="block w-fit border-accent bg-accent text-accent-foreground" title="30-day invoice request waiting for accounts@ to approve">Accounts@ needs to approve</Badge>}</td>
                    <td className="p-2"><p className={due ? 'font-semibold text-destructive' : ''}>{ukDate(r.next_follow_up_at)}</p>{r.follow_up_action && <p className="text-xs text-muted-foreground">{r.follow_up_action}</p>}</td>
                    <td className="p-2 space-y-1">{(() => { const u = r.dealer_id ? usage[r.dealer_id] : undefined; return (<>
                      <Badge variant={isActiveOnPortal(u) ? 'default' : 'outline'}>{PORTAL_STAGE_LABEL[portalStage(r.dealer_id, u)]}</Badge>
                      {u && <p className="text-xs text-muted-foreground">Last sign-in {ukDate(u.last_sign_in_at)}<br />{u.quote_count} quotes · {u.warranty_count} warranties</p>}
                    </>); })()}</td>
                    <td className="p-2 space-y-1">
                      {r.dealership_id ? <a className="flex items-center gap-1 text-xs text-primary hover:underline" href={`/admin-dashboard/?tab=bdm-contacts&q=${encodeURIComponent(r.dealership_name)}`}><Link2 className="h-3 w-3" />BDM contact</a> : <span className="block text-xs text-muted-foreground">No contact match</span>}
                      {r.dealer_id ? <><span className="flex items-center gap-1 text-xs text-primary"><BadgeCheck className="h-3 w-3" />Dealer account</span><span className="flex flex-wrap gap-1"><Badge variant={counts[r.dealer_id]?.claims ? 'destructive' : 'outline'} className="text-[11px]">{counts[r.dealer_id]?.claims ?? 0} claims</Badge><Badge variant={counts[r.dealer_id]?.refunds ? 'destructive' : 'outline'} className="text-[11px]">{counts[r.dealer_id]?.refunds ?? 0} refunds</Badge></span></> : <span className="block text-xs text-muted-foreground">No account yet</span>}
                    </td>
                    {seeAll && <td className="p-2 text-xs">{nameOf(r.bdm_user_id)}</td>}
                    <td className="p-2"><Button size="icon" variant="ghost" aria-label={`Edit ${r.dealership_name}`} onClick={() => setEdit({ ...r })}><Pencil className="h-4 w-4" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={!!edit} onOpenChange={o => { if (!o) { setEdit(null); setNewNote(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? 'Edit dealership' : 'Add dealership'}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Dealership name</Label><Input value={edit.dealership_name} onChange={e => setEdit({ ...edit, dealership_name: e.target.value })} /></div>
              <div><Label>Contact name</Label><Input value={edit.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={edit.phone ?? ''} onChange={e => set('phone', e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={edit.email ?? ''} onChange={e => set('email', e.target.value)} /></div>
              <div><Label>Town</Label><Input value={edit.town ?? ''} onChange={e => set('town', e.target.value)} /></div>
              <div><Label>Postcode</Label><Input value={edit.postcode ?? ''} onChange={e => set('postcode', e.target.value)} /></div>
              <div><Label>Date onboarded</Label><Input type="date" value={edit.onboarded_at ?? ''} onChange={e => set('onboarded_at', e.target.value)} /></div>
              <div><Label>Status</Label>
                <Select value={edit.status} onValueChange={v => setEdit({ ...edit, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PORTFOLIO_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Next follow-up</Label><Input type="date" value={edit.next_follow_up_at ?? ''} onChange={e => set('next_follow_up_at', e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Follow-up action</Label><Input value={edit.follow_up_action ?? ''} onChange={e => set('follow_up_action', e.target.value)} placeholder="e.g. Check first sales, send marketing pack" /></div>
              <div className="sm:col-span-2 grid gap-2"><Label>Add a note</Label><Textarea value={newNote} maxLength={2000} onChange={e => setNewNote(e.target.value)} placeholder="Saved with today's date and time when you press Save" />
                <Label>Notes history</Label>
                <StampedNotesHistory items={parseStampedNotes(edit.notes).map((n, i) => ({ id: String(i), ...n }))} maxHeight="max-h-48" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BdmPortfolioPanel;
