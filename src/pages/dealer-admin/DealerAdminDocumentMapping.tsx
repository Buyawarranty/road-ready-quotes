import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Plus, Edit, Trash2 } from 'lucide-react';

type Mapping = {
  id: string;
  plan_name: string;
  vehicle_type: string;
  document_path: string;
  notes: string | null;
  updated_at: string;
};

const empty = { plan_name: '', vehicle_type: 'standard', document_path: '', notes: '' };

export default function DealerAdminDocumentMapping() {
  const [rows, setRows] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Mapping | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dealer_admin_document_mappings')
      .select('*')
      .order('plan_name');
    setRows((data as Mapping[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (m: Mapping) => {
    setEditing(m);
    setForm({ plan_name: m.plan_name, vehicle_type: m.vehicle_type, document_path: m.document_path, notes: m.notes || '' });
    setOpen(true);
  };

  const save = async () => {
    if (!form.plan_name || !form.document_path) { toast.error('Plan name and document path required'); return; }
    if (editing) {
      const { error } = await supabase.from('dealer_admin_document_mappings').update(form).eq('id', editing.id);
      if (error) return toast.error(error.message);
      toast.success('Mapping updated');
    } else {
      const { error } = await supabase.from('dealer_admin_document_mappings').insert(form);
      if (error) return toast.error(error.message);
      toast.success('Mapping created');
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this mapping?')) return;
    const { error } = await supabase.from('dealer_admin_document_mappings').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Mapping deleted'); load();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Mapping</h1>
          <p className="text-muted-foreground mt-1">Map dealer plans to warranty document paths</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />New mapping</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Mappings</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground text-sm">No mappings yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Vehicle type</TableHead>
                  <TableHead>Document path</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.plan_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.vehicle_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs break-all">{r.document_path}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit mapping' : 'New mapping'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Plan name</Label>
              <Input value={form.plan_name} onChange={e => setForm({ ...form, plan_name: e.target.value })} placeholder="e.g. Basic, Premium" />
            </div>
            <div>
              <Label>Vehicle type</Label>
              <Select value={form.vehicle_type} onValueChange={v => setForm({ ...form, vehicle_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="special_vehicle">Special vehicle</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document path</Label>
              <Input value={form.document_path} onChange={e => setForm({ ...form, document_path: e.target.value })} placeholder="/documents/standard/basic-policy.pdf" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
