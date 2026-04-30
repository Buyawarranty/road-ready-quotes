import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Mail, Phone, Building2, Plus, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Pending {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  company_name: string | null;
  registration_type: string;
  status: string;
  notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

const DealerAdminPendingRegister: React.FC = () => {
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', company_name: '', registration_type: 'dealer', notes: '' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dealer_admin_pending_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data || []) as Pending[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Pending>) => {
    const payload: any = { ...patch };
    if (patch.status && patch.status !== 'pending') {
      payload.reviewed_at = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) payload.reviewed_by = user.id;
    }
    const { error } = await supabase.from('dealer_admin_pending_registrations').update(payload).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Updated'); load(); }
  };

  const create = async () => {
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    const { error } = await supabase.from('dealer_admin_pending_registrations').insert({
      ...form,
      email: form.email.trim().toLowerCase(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Registration added');
      setForm({ full_name: '', email: '', phone: '', company_name: '', registration_type: 'dealer', notes: '' });
      setOpen(false);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const { error } = await supabase.from('dealer_admin_pending_registrations').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); load(); }
  };

  const filtered = items.filter((i) => {
    const okStatus = statusFilter === 'all' || i.status === statusFilter;
    const q = search.trim().toLowerCase();
    const okSearch = !q ||
      (i.full_name || '').toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      (i.company_name || '').toLowerCase().includes(q);
    return okStatus && okSearch;
  });

  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pending Register</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and approve new dealer/account registrations.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add pending registration</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.registration_type} onValueChange={(v) => setForm({ ...form, registration_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <Card key={s} className={`border-2 cursor-pointer ${statusFilter === s ? 'border-primary' : ''}`} onClick={() => setStatusFilter(s)}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s}</p>
              <p className="text-2xl font-bold">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Input placeholder="Search name, email, company…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-2"><CardContent className="py-12 text-center text-muted-foreground">No registrations found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id} className="border-2">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{p.full_name || '(no name)'}</span>
                      <Badge className={STATUS_COLORS[p.status] || ''}>{p.status}</Badge>
                      <Badge variant="outline">{p.registration_type}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(p.created_at).toLocaleString('en-GB')}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</span>
                      {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</span>}
                      {p.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {p.company_name}</span>}
                    </div>
                    {p.notes && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{p.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    {p.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => update(p.id, { status: 'approved' })}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => update(p.id, { status: 'rejected' })}><XCircle className="h-3.5 w-3.5 mr-1" />Reject</Button>
                      </>
                    )}
                    {p.status !== 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => update(p.id, { status: 'pending' })}>Reset to pending</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealerAdminPendingRegister;
