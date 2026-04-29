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
import { Loader2, Plus, Search, Archive, ArchiveRestore, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';

interface DealerCustomer {
  id: string;
  dealer_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  registration_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_mileage: number | null;
  vehicle_fuel_type: string | null;
  plan_type: string | null;
  status: string;
  signup_date: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DealerOption { id: string; name: string }

const emptyForm: Partial<DealerCustomer> = {
  first_name: '', last_name: '', email: '', phone: '', mobile: '',
  address_line_1: '', address_line_2: '', city: '', county: '', postcode: '', country: 'United Kingdom',
  registration_plate: '', vehicle_make: '', vehicle_model: '', vehicle_year: undefined,
  vehicle_mileage: undefined, vehicle_fuel_type: '', plan_type: '', status: 'active',
  notes: '', dealer_id: null,
};

const DealerAdminCustomers: React.FC = () => {
  const [rows, setRows] = useState<DealerCustomer[]>([]);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [editing, setEditing] = useState<Partial<DealerCustomer> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dealer_customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      toast.error('Failed to load dealer customers', { description: error.message });
    } else {
      setRows((data || []) as DealerCustomer[]);
    }
    setLoading(false);
  };

  const loadDealers = async () => {
    const { data } = await supabase.from('dealers').select('id, name').order('name');
    setDealers((data || []) as DealerOption[]);
  };

  useEffect(() => { load(); loadDealers(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === 'active' && r.archived_at) return false;
      if (statusFilter === 'archived' && !r.archived_at) return false;
      if (!q) return true;
      const hay = [
        r.first_name, r.last_name, r.email, r.phone, r.mobile,
        r.registration_plate, r.vehicle_make, r.vehicle_model, r.postcode,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, statusFilter]);

  const startCreate = () => setEditing({ ...emptyForm });
  const startEdit = (row: DealerCustomer) => setEditing({ ...row });

  const save = async () => {
    if (!editing) return;
    if (!editing.first_name && !editing.last_name && !editing.email) {
      toast.error('Please provide at least a name or email');
      return;
    }
    setSaving(true);
    const payload: any = {
      ...editing,
      vehicle_year: editing.vehicle_year ? Number(editing.vehicle_year) : null,
      vehicle_mileage: editing.vehicle_mileage ? Number(editing.vehicle_mileage) : null,
      dealer_id: editing.dealer_id || null,
    };
    delete payload.email_normalized;
    delete payload.registration_plate_normalized;
    delete payload.created_at;
    delete payload.updated_at;

    const { error } = editing.id
      ? await supabase.from('dealer_customers').update(payload).eq('id', editing.id)
      : await supabase.from('dealer_customers').insert(payload);

    setSaving(false);
    if (error) {
      toast.error('Save failed', { description: error.message });
      return;
    }
    toast.success(editing.id ? 'Customer updated' : 'Customer created');
    setEditing(null);
    load();
  };

  const toggleArchive = async (row: DealerCustomer) => {
    const { error } = await supabase
      .from('dealer_customers')
      .update({ archived_at: row.archived_at ? null : new Date().toISOString() })
      .eq('id', row.id);
    if (error) { toast.error('Update failed', { description: error.message }); return; }
    toast.success(row.archived_at ? 'Customer restored' : 'Customer archived');
    load();
  };

  const dealerName = (id: string | null) => dealers.find((d) => d.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Dealer Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage dealer-scoped customer records. Fully isolated from retail customers.
          </p>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-2" /> New customer</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone, reg, postcode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <CardTitle className="text-sm text-muted-foreground ml-auto">
              {filtered.length} {filtered.length === 1 ? 'customer' : 'customers'}
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
              No dealer customers yet. Click "New customer" to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Customer</th>
                    <th className="text-left px-4 py-2 font-medium">Contact</th>
                    <th className="text-left px-4 py-2 font-medium">Vehicle</th>
                    <th className="text-left px-4 py-2 font-medium">Dealer</th>
                    <th className="text-left px-4 py-2 font-medium">Plan</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
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
                        <div className="text-xs text-muted-foreground">{r.postcode || ''}</div>
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
                      <td className="px-4 py-3 text-foreground">{r.plan_type || '—'}</td>
                      <td className="px-4 py-3">
                        {r.archived_at ? (
                          <Badge variant="secondary">Archived</Badge>
                        ) : (
                          <Badge>{r.status}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit customer' : 'New dealer customer'}</DialogTitle>
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
              <Field label="Address line 1"><Input value={editing.address_line_1 || ''} onChange={(e) => setEditing({ ...editing, address_line_1: e.target.value })} /></Field>
              <Field label="Address line 2"><Input value={editing.address_line_2 || ''} onChange={(e) => setEditing({ ...editing, address_line_2: e.target.value })} /></Field>
              <Field label="City"><Input value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></Field>
              <Field label="County"><Input value={editing.county || ''} onChange={(e) => setEditing({ ...editing, county: e.target.value })} /></Field>
              <Field label="Postcode"><Input value={editing.postcode || ''} onChange={(e) => setEditing({ ...editing, postcode: e.target.value })} /></Field>
              <Field label="Country"><Input value={editing.country || ''} onChange={(e) => setEditing({ ...editing, country: e.target.value })} /></Field>

              <Field label="Registration plate"><Input value={editing.registration_plate || ''} onChange={(e) => setEditing({ ...editing, registration_plate: e.target.value })} /></Field>
              <Field label="Vehicle make"><Input value={editing.vehicle_make || ''} onChange={(e) => setEditing({ ...editing, vehicle_make: e.target.value })} /></Field>
              <Field label="Vehicle model"><Input value={editing.vehicle_model || ''} onChange={(e) => setEditing({ ...editing, vehicle_model: e.target.value })} /></Field>
              <Field label="Year"><Input type="number" value={editing.vehicle_year ?? ''} onChange={(e) => setEditing({ ...editing, vehicle_year: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Mileage"><Input type="number" value={editing.vehicle_mileage ?? ''} onChange={(e) => setEditing({ ...editing, vehicle_mileage: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Fuel type"><Input value={editing.vehicle_fuel_type || ''} onChange={(e) => setEditing({ ...editing, vehicle_fuel_type: e.target.value })} /></Field>

              <Field label="Plan type"><Input value={editing.plan_type || ''} onChange={(e) => setEditing({ ...editing, plan_type: e.target.value })} /></Field>
              <Field label="Status">
                <Select value={editing.status || 'active'} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
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
              {editing?.id ? 'Save changes' : 'Create customer'}
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

export default DealerAdminCustomers;
