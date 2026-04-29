import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Search, Archive, ArchiveRestore, Pencil, Target, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';

interface DealerLead {
  id: string;
  dealer_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  registration_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_mileage: number | null;
  plan_interest: string | null;
  source: string | null;
  status: string;
  assigned_to: string | null;
  callback_at: string | null;
  last_contacted_at: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
}

interface DealerOption { id: string; name: string }

const STATUSES = ['new', 'contacted', 'callback', 'quoted', 'won', 'lost'] as const;

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (s) {
    case 'won': return 'default';
    case 'lost': return 'destructive';
    case 'callback': return 'outline';
    default: return 'secondary';
  }
};

const emptyForm: Partial<DealerLead> = {
  first_name: '', last_name: '', email: '', phone: '', mobile: '',
  registration_plate: '', vehicle_make: '', vehicle_model: '',
  vehicle_year: undefined, vehicle_mileage: undefined,
  plan_interest: '', source: '', status: 'new', notes: '', dealer_id: null,
  callback_at: null,
};

const DealerAdminLeads: React.FC = () => {
  const [rows, setRows] = useState<DealerLead[]>([]);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [editing, setEditing] = useState<Partial<DealerLead> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dealer_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) toast.error('Failed to load dealer leads', { description: error.message });
    else setRows((data || []) as DealerLead[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('dealers').select('id, name').order('name').then(({ data }) =>
      setDealers((data || []) as DealerOption[])
    );
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === 'active' && r.archived_at) return false;
      if (statusFilter === 'archived' && !r.archived_at) return false;
      if (STATUSES.includes(statusFilter as any) && r.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [r.first_name, r.last_name, r.email, r.phone, r.mobile, r.registration_plate]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, statusFilter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    rows.filter((r) => !r.archived_at).forEach((r) => { map[r.status] = (map[r.status] || 0) + 1; });
    return map;
  }, [rows]);

  const save = async () => {
    if (!editing) return;
    if (!editing.first_name && !editing.last_name && !editing.email && !editing.phone) {
      toast.error('Please provide at least a name, email or phone');
      return;
    }
    setSaving(true);
    const payload: any = {
      ...editing,
      vehicle_year: editing.vehicle_year ? Number(editing.vehicle_year) : null,
      vehicle_mileage: editing.vehicle_mileage ? Number(editing.vehicle_mileage) : null,
      dealer_id: editing.dealer_id || null,
      callback_at: editing.callback_at || null,
    };
    delete payload.email_normalized;
    delete payload.registration_plate_normalized;
    delete payload.created_at;
    delete payload.updated_at;

    const { error } = editing.id
      ? await supabase.from('dealer_leads').update(payload).eq('id', editing.id)
      : await supabase.from('dealer_leads').insert(payload);

    setSaving(false);
    if (error) { toast.error('Save failed', { description: error.message }); return; }
    toast.success(editing.id ? 'Lead updated' : 'Lead created');
    setEditing(null);
    load();
  };

  const updateStatus = async (row: DealerLead, status: string) => {
    const patch: any = { status };
    if (status === 'contacted' || status === 'quoted' || status === 'won' || status === 'lost') {
      patch.last_contacted_at = new Date().toISOString();
    }
    const { error } = await supabase.from('dealer_leads').update(patch).eq('id', row.id);
    if (error) { toast.error('Status update failed', { description: error.message }); return; }
    load();
  };

  const toggleArchive = async (row: DealerLead) => {
    const { error } = await supabase
      .from('dealer_leads')
      .update({ archived_at: row.archived_at ? null : new Date().toISOString() })
      .eq('id', row.id);
    if (error) { toast.error('Update failed', { description: error.message }); return; }
    toast.success(row.archived_at ? 'Lead restored' : 'Lead archived');
    load();
  };

  const dealerName = (id: string | null) => dealers.find((d) => d.id === id)?.name || '—';
  const toLocalDt = (iso: string | null) => iso ? new Date(iso).toISOString().slice(0, 16) : '';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" /> Dealer Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the dealer-scoped sales pipeline. Fully isolated from retail leads.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...emptyForm })}>
          <Plus className="h-4 w-4 mr-2" /> New lead
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-left rounded-md border p-3 transition-colors ${
              statusFilter === s ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
            }`}
          >
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s}</div>
            <div className="text-xl font-bold text-foreground">{counts[s] || 0}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone, reg…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (all)</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <CardTitle className="text-sm text-muted-foreground ml-auto">
              {filtered.length} {filtered.length === 1 ? 'lead' : 'leads'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No dealer leads yet. Click "New lead" to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Lead</th>
                    <th className="text-left px-4 py-2 font-medium">Contact</th>
                    <th className="text-left px-4 py-2 font-medium">Vehicle</th>
                    <th className="text-left px-4 py-2 font-medium">Dealer</th>
                    <th className="text-left px-4 py-2 font-medium">Source</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Callback</th>
                    <th className="text-right px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{r.email || '—'}</div>
                        <div className="text-xs text-muted-foreground">{r.phone || r.mobile || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-foreground">{r.registration_plate || '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {[r.vehicle_make, r.vehicle_model, r.vehicle_year].filter(Boolean).join(' ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{dealerName(r.dealer_id)}</td>
                      <td className="px-4 py-3 text-foreground">{r.source || '—'}</td>
                      <td className="px-4 py-3">
                        {r.archived_at ? (
                          <Badge variant="secondary">Archived</Badge>
                        ) : (
                          <Select value={r.status} onValueChange={(v) => updateStatus(r, v)}>
                            <SelectTrigger className="h-7 w-28">
                              <Badge variant={statusVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.callback_at ? (
                          <span className="inline-flex items-center gap-1">
                            <PhoneCall className="h-3 w-3" />
                            {new Date(r.callback_at).toLocaleString()}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ ...r })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleArchive(r)}>
                          {r.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit lead' : 'New dealer lead'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="First name"><Input value={editing.first_name || ''} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} /></Field>
              <Field label="Last name"><Input value={editing.last_name || ''} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
              <Field label="Mobile"><Input value={editing.mobile || ''} onChange={(e) => setEditing({ ...editing, mobile: e.target.value })} /></Field>
              <Field label="Dealer">
                <Select value={editing.dealer_id || 'none'} onValueChange={(v) => setEditing({ ...editing, dealer_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select dealer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {dealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Registration plate"><Input value={editing.registration_plate || ''} onChange={(e) => setEditing({ ...editing, registration_plate: e.target.value })} /></Field>
              <Field label="Vehicle make"><Input value={editing.vehicle_make || ''} onChange={(e) => setEditing({ ...editing, vehicle_make: e.target.value })} /></Field>
              <Field label="Vehicle model"><Input value={editing.vehicle_model || ''} onChange={(e) => setEditing({ ...editing, vehicle_model: e.target.value })} /></Field>
              <Field label="Year"><Input type="number" value={editing.vehicle_year ?? ''} onChange={(e) => setEditing({ ...editing, vehicle_year: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Mileage"><Input type="number" value={editing.vehicle_mileage ?? ''} onChange={(e) => setEditing({ ...editing, vehicle_mileage: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Plan interest"><Input value={editing.plan_interest || ''} onChange={(e) => setEditing({ ...editing, plan_interest: e.target.value })} /></Field>
              <Field label="Source"><Input placeholder="e.g. website, referral, FB ad" value={editing.source || ''} onChange={(e) => setEditing({ ...editing, source: e.target.value })} /></Field>
              <Field label="Status">
                <Select value={editing.status || 'new'} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Callback at">
                <Input
                  type="datetime-local"
                  value={toLocalDt(editing.callback_at || null)}
                  onChange={(e) => setEditing({ ...editing, callback_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </Field>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea rows={3} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing?.id ? 'Save changes' : 'Create lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default DealerAdminLeads;
