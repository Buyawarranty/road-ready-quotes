import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Trash2 } from 'lucide-react';
import {
  BDM_PRIORITIES, BDM_STAGES, BdmDealership, STAGE_TONE, outcomeLabel, stageLabel, typeLabel,
} from '@/lib/bdm/bdmShared';
import BdmLogActivityForm, { BdmStaff } from './BdmLogActivityForm';

interface Contact {
  id?: string; full_name: string; job_title: string | null; phone: string | null; mobile: string | null;
  email: string | null; is_primary: boolean; is_decision_maker: boolean; notes: string | null;
}

const fmt = (d?: string | null, time = true) => d ? new Date(d).toLocaleString('en-GB', time ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }) : '—';

interface Props {
  dealershipId: string | null;
  staff: BdmStaff[];
  isManager: boolean;
  initialTab?: string;
  onClose: () => void;
  onChanged: () => void;
}

const BdmDealershipDrawer: React.FC<Props> = ({ dealershipId, staff, isManager, initialTab = 'overview', onClose, onChanged }) => {
  const { toast } = useToast();
  const [d, setD] = useState<BdmDealership | null>(null);
  const [form, setForm] = useState<Partial<BdmDealership>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [tab, setTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState<Contact | null>(null);
  const staffName = (id?: string | null) => staff.find(s => s.user_id === id)?.name ?? (id ? 'Staff member' : 'Unassigned');

  const load = useCallback(async () => {
    if (!dealershipId) return;
    const db = supabase as any;
    const [a, c, act, st, acc] = await Promise.all([
      db.from('bdm_dealerships').select('*').eq('id', dealershipId).maybeSingle(),
      db.from('bdm_contacts').select('*').eq('dealership_id', dealershipId).order('is_primary', { ascending: false }),
      db.from('bdm_activities').select('*').eq('dealership_id', dealershipId).order('created_at', { ascending: false }).limit(200),
      db.from('bdm_stage_history').select('*').eq('dealership_id', dealershipId).order('created_at', { ascending: false }),
      (supabase.rpc as any)('bdm_account_summary', { p_dealership: dealershipId }),
    ]);
    if (a.error) toast({ title: 'Could not load dealership', description: a.error.message, variant: 'destructive' });
    setD(a.data); setForm(a.data || {});
    setContacts(c.data || []); setActivities(act.data || []); setStages(st.data || []); setAccount(acc.data || null);
  }, [dealershipId, toast]);

  useEffect(() => { setTab(initialTab); setD(null); load(); }, [load, initialTab]);

  const saveDetails = async (patch?: Partial<BdmDealership>) => {
    if (!d) return;
    const f = { ...form, ...patch };
    if (!f.name?.trim() || !f.postcode?.trim() || !f.town?.trim() || !f.phone?.trim()) {
      toast({ title: 'Name, postcode, town and phone are required', variant: 'destructive' }); return;
    }
    if (f.vehicle_stock != null && (!Number.isInteger(Number(f.vehicle_stock)) || Number(f.vehicle_stock) < 0)) {
      toast({ title: 'Vehicle stock must be a whole number of 0 or more', variant: 'destructive' }); return;
    }
    setSaving(true);
    const stockChanged = f.vehicle_stock !== d.vehicle_stock;
    const body: any = {
      name: f.name.trim(), address: f.address || null, town: f.town.trim(), county: f.county || null,
      postcode: f.postcode.trim().toUpperCase(), phone: f.phone.trim(), email: f.email || null, website: f.website || null,
      vehicle_stock: f.vehicle_stock === null || f.vehicle_stock === undefined || (f.vehicle_stock as any) === '' ? null : Number(f.vehicle_stock),
      est_monthly_sales: f.est_monthly_sales === null || (f.est_monthly_sales as any) === '' ? null : Number(f.est_monthly_sales),
      current_provider: f.current_provider || null, lead_source: f.lead_source || null,
      priority: f.priority, stage: f.stage, do_not_contact: !!f.do_not_contact,
      ...(stockChanged ? { stock_updated_at: new Date().toISOString() } : {}),
      ...(isManager ? { assigned_bdm: f.assigned_bdm || null } : {}),
    };
    const { error } = await (supabase as any).from('bdm_dealerships').update(body).eq('id', d.id);
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Saved' });
    load(); onChanged();
  };

  const saveContact = async (c: Contact) => {
    if (!d || !c.full_name.trim()) { toast({ title: 'Enter the contact name', variant: 'destructive' }); return; }
    const db = supabase as any;
    if (c.is_primary) await db.from('bdm_contacts').update({ is_primary: false }).eq('dealership_id', d.id).neq('id', c.id ?? '00000000-0000-0000-0000-000000000000');
    const row = { dealership_id: d.id, full_name: c.full_name.trim(), job_title: c.job_title || null, phone: c.phone || null,
      mobile: c.mobile || null, email: c.email || null, is_primary: c.is_primary, is_decision_maker: c.is_decision_maker, notes: c.notes || null };
    const { error } = c.id ? await db.from('bdm_contacts').update(row).eq('id', c.id) : await db.from('bdm_contacts').insert(row);
    if (error) { toast({ title: 'Could not save contact', description: error.message, variant: 'destructive' }); return; }
    setNewContact(null); toast({ title: 'Contact saved' }); load();
  };

  const removeContact = async (id: string) => {
    const { error } = await (supabase as any).from('bdm_contacts').delete().eq('id', id);
    if (error) toast({ title: 'Could not remove', description: error.message, variant: 'destructive' }); else load();
  };

  const field = (k: keyof BdmDealership, label: string, type = 'text') => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="h-9" type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 1 : undefined}
        value={(form[k] as any) ?? ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
    </div>
  );

  return (
    <Sheet open={!!dealershipId} onOpenChange={o => !o && onClose()} modal={false}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {!d ? <Loader2 className="m-6 h-6 w-6 animate-spin" /> : (
          <>
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle className="pr-6">{d.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{[d.town, d.postcode].filter(Boolean).join(' · ') || 'No address yet'}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_TONE[d.stage] ?? 'bg-muted'}`}>{stageLabel(d.stage)}</span>
                {d.do_not_contact && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Do not contact</span>}
              </div>
              {d.phone && <a href={`tel:${d.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><Phone className="h-3.5 w-3.5" />{d.phone}</a>}
            </SheetHeader>

            <div className="mt-3">
              <Label className="text-xs">Pipeline stage</Label>
              <Select value={d.stage} onValueChange={v => { setForm(f => ({ ...f, stage: v })); saveDetails({ stage: v }); }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{BDM_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              {d.stage === 'active_dealer' && !d.dealer_id && (
                <p className="mt-1 text-xs text-muted-foreground">Marking a dealership active doesn't create a dealer account. They still need to sign up and be approved under Dealers.</p>
              )}
            </div>

            <Tabs value={tab} onValueChange={setTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">{field('name', 'Dealership name *')}</div>
                  <div className="col-span-2">{field('address', 'Address')}</div>
                  {field('town', 'Town / city *')}{field('postcode', 'Postcode *')}
                  {field('county', 'County')}{field('phone', 'Telephone *', 'tel')}
                  {field('email', 'Email', 'email')}{field('website', 'Website')}
                  {field('vehicle_stock', 'Vehicle stock', 'number')}{field('est_monthly_sales', 'Est. monthly sales', 'number')}
                  {field('current_provider', 'Current warranty provider')}{field('lead_source', 'Lead source')}
                  <div>
                    <Label className="text-xs">Lead priority</Label>
                    <Select value={form.priority || 'medium'} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{BDM_PRIORITIES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Assigned BDM</Label>
                    {isManager ? (
                      <Select value={form.assigned_bdm || 'none'} onValueChange={v => setForm(f => ({ ...f, assigned_bdm: v === 'none' ? null : v }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {staff.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : <p className="py-2 text-sm">{staffName(d.assigned_bdm)}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Do not contact</p>
                    <p className="text-xs text-muted-foreground">Removes them from every call list.</p>
                  </div>
                  <Switch checked={!!form.do_not_contact} onCheckedChange={v => setForm(f => ({ ...f, do_not_contact: v }))} />
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-muted/50 p-3 text-xs">
                  <dt className="text-muted-foreground">Main contact</dt><dd>{contacts.find(c => c.is_primary)?.full_name ?? contacts[0]?.full_name ?? '—'}</dd>
                  <dt className="text-muted-foreground">Next follow-up</dt><dd>{fmt(d.next_follow_up_at)}{d.next_action ? ` · ${d.next_action}` : ''}</dd>
                  <dt className="text-muted-foreground">Last spoken</dt><dd>{fmt(d.last_spoken_at)}</dd>
                  <dt className="text-muted-foreground">Last attempt</dt><dd>{fmt(d.last_attempt_at)}</dd>
                  <dt className="text-muted-foreground">Stock last updated</dt><dd>{fmt(d.stock_updated_at, false)}</dd>
                  <dt className="text-muted-foreground">Dealer account</dt><dd>{d.dealer_id ? (account?.status ? `Linked · ${account.status}` : 'Linked') : 'Not registered'}</dd>
                </dl>
                <Button onClick={() => saveDetails()} disabled={saving} className="w-full">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save details</Button>
              </TabsContent>

              <TabsContent value="activity" className="space-y-3">
                <BdmLogActivityForm dealershipId={d.id} contacts={contacts} staff={staff} canAssign={isManager}
                  assigned={d.assigned_bdm} onSaved={() => { load(); onChanged(); }} />
                <ol className="space-y-2">
                  {activities.length === 0 && <li className="text-sm text-muted-foreground">No activity yet.</li>}
                  {activities.map(a => (
                    <li key={a.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>{fmt(a.created_at)}</span><span>· {staffName(a.bdm_user_id)}</span>
                        {a.contact_name && <span>· with {a.contact_name}</span>}
                      </div>
                      <p className="font-medium">{typeLabel(a.activity_type)}{a.outcome ? ` — ${outcomeLabel(a.outcome)}` : ''}</p>
                      {a.notes && <p className="whitespace-pre-wrap">{a.notes}</p>}
                      {(a.next_action || a.next_follow_up_at) && (
                        <p className="mt-1 text-xs text-muted-foreground">Next: {a.next_action || 'Follow up'}{a.next_follow_up_at ? ` · ${fmt(a.next_follow_up_at)}` : ''}</p>
                      )}
                    </li>
                  ))}
                </ol>
                {stages.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Stage history</p>
                    <ul className="space-y-1 text-xs">
                      {stages.map(s => (
                        <li key={s.id}>{fmt(s.created_at)} · {s.from_stage ? `${stageLabel(s.from_stage)} → ` : ''}{stageLabel(s.to_stage)} · {s.changed_by ? staffName(s.changed_by) : 'Automatic'}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contacts" className="space-y-2">
                {[...contacts, ...(newContact ? [newContact] : [])].map((c, i) => (
                  <ContactCard key={c.id ?? `new-${i}`} contact={c} onSave={saveContact} onRemove={c.id ? () => removeContact(c.id!) : () => setNewContact(null)} />
                ))}
                {!newContact && (
                  <Button variant="outline" className="w-full" onClick={() => setNewContact({ full_name: '', job_title: null, phone: null, mobile: null, email: null, is_primary: contacts.length === 0, is_decision_maker: false, notes: null })}>
                    Add contact
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="account" className="space-y-2 text-sm">
                {!d.dealer_id ? (
                  <p className="text-muted-foreground">This dealership doesn't have a Panda Protect dealer account yet. When they sign up and are approved, it links here automatically.</p>
                ) : !account ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <dt className="text-muted-foreground">Dealer account</dt><dd className="font-mono text-xs">{String(account.dealer_id).slice(0, 8).toUpperCase()}</dd>
                    <dt className="text-muted-foreground">Account name</dt><dd>{account.company_name}</dd>
                    <dt className="text-muted-foreground">Status</dt><dd>{account.status || '—'}</dd>
                    <dt className="text-muted-foreground">Registered</dt><dd>{fmt(account.registered_at, false)}</dd>
                    <dt className="text-muted-foreground">First warranty</dt><dd>{fmt(account.first_warranty, false)}</dd>
                    <dt className="text-muted-foreground">Last warranty</dt><dd>{fmt(account.last_warranty, false)}</dd>
                    <dt className="text-muted-foreground">This month</dt><dd>{account.this_month}</dd>
                    <dt className="text-muted-foreground">Total issued</dt><dd>{account.total}</dd>
                  </dl>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const ContactCard: React.FC<{ contact: Contact; onSave: (c: Contact) => void; onRemove: () => void }> = ({ contact, onSave, onRemove }) => {
  const [c, setC] = useState(contact);
  useEffect(() => setC(contact), [contact]);
  const inp = (k: keyof Contact, label: string, type = 'text') => (
    <div><Label className="text-xs">{label}</Label><Input className="h-9" type={type} value={(c[k] as any) ?? ''} onChange={e => setC({ ...c, [k]: e.target.value })} /></div>
  );
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-2">
        {inp('full_name', 'Full name *')}{inp('job_title', 'Job title')}
        {inp('phone', 'Telephone', 'tel')}{inp('mobile', 'Mobile', 'tel')}
        <div className="col-span-2">{inp('email', 'Email', 'email')}</div>
      </div>
      <Textarea rows={2} placeholder="Notes" value={c.notes ?? ''} onChange={e => setC({ ...c, notes: e.target.value })} />
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><Checkbox checked={c.is_primary} onCheckedChange={v => setC({ ...c, is_primary: !!v })} />Primary contact</label>
        <label className="flex items-center gap-2"><Checkbox checked={c.is_decision_maker} onCheckedChange={v => setC({ ...c, is_decision_maker: !!v })} />Decision maker</label>
        {(c.mobile || c.phone) && <a className="text-primary hover:underline" href={`tel:${(c.mobile || c.phone)!.replace(/\s/g, '')}`}>Call</a>}
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Remove contact"><Trash2 className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => onSave(c)}>Save</Button>
        </div>
      </div>
    </div>
  );
};

export default BdmDealershipDrawer;
