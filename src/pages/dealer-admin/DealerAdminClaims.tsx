import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Plus, Search, Pencil, Trash2, Upload, FileText, Download, X,
} from 'lucide-react';

interface Claim {
  id: string;
  dealer_id: string | null;
  claim_reference: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  registration_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  fault_description: string | null;
  repair_garage: string | null;
  repair_estimate: number | null;
  status: string;
  risk_level: string | null;
  approved_amount: number | null;
  paid_amount: number | null;
  internal_notes: string | null;
  attachments: any;
  created_at: string;
  updated_at: string;
}

interface Dealer { id: string; company_name: string }

const STATUSES = ['new', 'in_review', 'approved', 'rejected', 'paid', 'closed'] as const;
const RISKS = ['low', 'medium', 'high'] as const;

const statusVariant = (s: string): any => {
  switch (s) {
    case 'new': return 'default';
    case 'in_review': return 'secondary';
    case 'approved': return 'default';
    case 'rejected': return 'destructive';
    case 'paid': return 'default';
    case 'closed': return 'outline';
    default: return 'secondary';
  }
};

const emptyForm: Partial<Claim> = {
  dealer_id: null,
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  registration_plate: '',
  vehicle_make: '',
  vehicle_model: '',
  fault_description: '',
  repair_garage: '',
  repair_estimate: null,
  status: 'new',
  risk_level: 'medium',
  approved_amount: null,
  paid_amount: null,
  internal_notes: '',
};

const DealerAdminClaims: React.FC = () => {
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Claim | null>(null);
  const [form, setForm] = useState<Partial<Claim>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: cls, error }, { data: dls }] = await Promise.all([
      supabase.from('dealer_admin_claims').select('*').order('created_at', { ascending: false }),
      supabase.from('dealers').select('id, company_name').order('company_name'),
    ]);
    if (error) toast({ title: 'Failed to load claims', description: error.message, variant: 'destructive' });
    setClaims((cls as Claim[]) || []);
    setDealers((dls as Dealer[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.claim_reference, c.customer_name, c.customer_email, c.customer_phone, c.registration_plate, c.vehicle_make, c.vehicle_model]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [claims, search, statusFilter]);

  const counters = useMemo(() => {
    const map: Record<string, number> = { all: claims.length };
    STATUSES.forEach((s) => { map[s] = 0; });
    claims.forEach((c) => { map[c.status] = (map[c.status] || 0) + 1; });
    return map;
  }, [claims]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c: Claim) => { setEditing(c); setForm(c); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const payload: any = {
      dealer_id: form.dealer_id || null,
      customer_name: form.customer_name || null,
      customer_email: form.customer_email || null,
      customer_phone: form.customer_phone || null,
      registration_plate: form.registration_plate || null,
      vehicle_make: form.vehicle_make || null,
      vehicle_model: form.vehicle_model || null,
      fault_description: form.fault_description || null,
      repair_garage: form.repair_garage || null,
      repair_estimate: form.repair_estimate ? Number(form.repair_estimate) : null,
      status: form.status || 'new',
      risk_level: form.risk_level || 'medium',
      approved_amount: form.approved_amount ? Number(form.approved_amount) : null,
      paid_amount: form.paid_amount ? Number(form.paid_amount) : null,
      internal_notes: form.internal_notes || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('dealer_admin_claims').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('dealer_admin_claims').insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Claim updated' : 'Claim created' });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this claim? This cannot be undone.')) return;
    const { error } = await supabase.from('dealer_admin_claims').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Claim deleted' });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('dealer_admin_claims').update({ status }).eq('id', id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else load();
  };

  const handleUpload = async (claim: Claim, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFor(claim.id);
    const newAttachments: any[] = Array.isArray(claim.attachments) ? [...claim.attachments] : [];
    for (const file of Array.from(files)) {
      const path = `${claim.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('dealer-admin-claims').upload(path, file, { upsert: false });
      if (upErr) {
        toast({ title: `Upload failed: ${file.name}`, description: upErr.message, variant: 'destructive' });
        continue;
      }
      newAttachments.push({ path, name: file.name, size: file.size, uploaded_at: new Date().toISOString() });
    }
    const { error: updErr } = await supabase
      .from('dealer_admin_claims')
      .update({ attachments: newAttachments })
      .eq('id', claim.id);
    setUploadingFor(null);
    if (updErr) toast({ title: 'Failed to save attachments', description: updErr.message, variant: 'destructive' });
    else { toast({ title: 'Attachments uploaded' }); load(); }
  };

  const downloadFile = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from('dealer-admin-claims').createSignedUrl(path, 60);
    if (error || !data) {
      toast({ title: 'Download failed', description: error?.message, variant: 'destructive' });
      return;
    }
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = name;
    a.target = '_blank';
    a.click();
  };

  const removeFile = async (claim: Claim, path: string) => {
    if (!confirm('Remove this attachment?')) return;
    await supabase.storage.from('dealer-admin-claims').remove([path]);
    const remaining = (Array.isArray(claim.attachments) ? claim.attachments : []).filter((a: any) => a.path !== path);
    await supabase.from('dealer_admin_claims').update({ attachments: remaining }).eq('id', claim.id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Claims</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage dealer customer claim submissions, attachments and decisions.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New claim</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {(['all', ...STATUSES] as const).map((s) => (
          <Card
            key={s}
            className={`border-2 cursor-pointer transition-colors ${statusFilter === s ? 'border-primary' : 'border-border'}`}
            onClick={() => setStatusFilter(s)}
          >
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s === 'all' ? 'Total' : s.replace('_', ' ')}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{counters[s] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2">
        <CardContent className="pt-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by reference, customer, reg, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Estimate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No claims found.</TableCell></TableRow>
                  ) : filtered.map((c) => {
                    const atts: any[] = Array.isArray(c.attachments) ? c.attachments : [];
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.claim_reference}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{c.customer_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{c.customer_email || c.customer_phone || ''}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{[c.vehicle_make, c.vehicle_model].filter(Boolean).join(' ') || '—'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{c.registration_plate || ''}</div>
                        </TableCell>
                        <TableCell className="text-sm">{c.repair_estimate ? `£${Number(c.repair_estimate).toFixed(2)}` : '—'}</TableCell>
                        <TableCell>
                          <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                            <SelectTrigger className="h-8 w-[130px]">
                              <SelectValue><Badge variant={statusVariant(c.status)} className="capitalize">{c.status.replace('_', ' ')}</Badge></SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer">
                              <input type="file" multiple className="hidden" onChange={(e) => handleUpload(c, e.target.files)} />
                              <span className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
                                {uploadingFor === c.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                                {atts.length} file{atts.length === 1 ? '' : 's'}
                              </span>
                            </label>
                          </div>
                          {atts.length > 0 && (
                            <div className="mt-1 space-y-0.5 max-w-[200px]">
                              {atts.slice(0, 3).map((a: any) => (
                                <div key={a.path} className="flex items-center gap-1 text-xs">
                                  <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <button onClick={() => downloadFile(a.path, a.name)} className="truncate hover:underline">{a.name}</button>
                                  <button onClick={() => removeFile(c, a.path)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                                </div>
                              ))}
                              {atts.length > 3 && <div className="text-xs text-muted-foreground">+{atts.length - 3} more</div>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit claim ${editing.claim_reference}` : 'New claim'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2">
              <Label>Dealer</Label>
              <Select value={form.dealer_id ?? 'none'} onValueChange={(v) => setForm({ ...form, dealer_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Select dealer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {dealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer name</Label>
              <Input value={form.customer_name || ''} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div>
              <Label>Customer email</Label>
              <Input type="email" value={form.customer_email || ''} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
            </div>
            <div>
              <Label>Customer phone</Label>
              <Input value={form.customer_phone || ''} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            </div>
            <div>
              <Label>Registration plate</Label>
              <Input value={form.registration_plate || ''} onChange={(e) => setForm({ ...form, registration_plate: e.target.value })} />
            </div>
            <div>
              <Label>Vehicle make</Label>
              <Input value={form.vehicle_make || ''} onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })} />
            </div>
            <div>
              <Label>Vehicle model</Label>
              <Input value={form.vehicle_model || ''} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} />
            </div>
            <div>
              <Label>Repair garage</Label>
              <Input value={form.repair_garage || ''} onChange={(e) => setForm({ ...form, repair_garage: e.target.value })} />
            </div>
            <div>
              <Label>Repair estimate (£)</Label>
              <Input type="number" step="0.01" value={form.repair_estimate ?? ''} onChange={(e) => setForm({ ...form, repair_estimate: e.target.value as any })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || 'new'} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risk level</Label>
              <Select value={form.risk_level || 'medium'} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISKS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Approved amount (£)</Label>
              <Input type="number" step="0.01" value={form.approved_amount ?? ''} onChange={(e) => setForm({ ...form, approved_amount: e.target.value as any })} />
            </div>
            <div>
              <Label>Paid amount (£)</Label>
              <Input type="number" step="0.01" value={form.paid_amount ?? ''} onChange={(e) => setForm({ ...form, paid_amount: e.target.value as any })} />
            </div>
            <div className="md:col-span-2">
              <Label>Fault description</Label>
              <Textarea rows={3} value={form.fault_description || ''} onChange={(e) => setForm({ ...form, fault_description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Internal notes</Label>
              <Textarea rows={3} value={form.internal_notes || ''} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Save changes' : 'Create claim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealerAdminClaims;
