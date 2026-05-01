import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Mail, Plus, Edit, Trash2, Printer } from 'lucide-react';

type Letter = {
  id: string;
  letter_name: string;
  letter_type: string;
  subject: string | null;
  body: string;
  is_active: boolean;
  updated_at: string;
};

const empty = { letter_name: '', letter_type: 'welcome', subject: '', body: '', is_active: true };

export default function DealerAdminPolicyLetters() {
  const [rows, setRows] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Letter | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dealer_admin_policy_letters')
      .select('*')
      .order('updated_at', { ascending: false });
    setRows((data as Letter[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (l: Letter) => {
    setEditing(l);
    setForm({
      letter_name: l.letter_name, letter_type: l.letter_type,
      subject: l.subject || '', body: l.body, is_active: l.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.letter_name || !form.body) { toast.error('Name and body required'); return; }
    if (editing) {
      const { error } = await supabase.from('dealer_admin_policy_letters').update(form).eq('id', editing.id);
      if (error) return toast.error(error.message);
      toast.success('Letter updated');
    } else {
      const { error } = await supabase.from('dealer_admin_policy_letters').insert(form);
      if (error) return toast.error(error.message);
      toast.success('Letter created');
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this letter?')) return;
    const { error } = await supabase.from('dealer_admin_policy_letters').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Letter deleted'); load();
  };

  const print = (l: Letter) => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${l.letter_name}</title>
      <style>@page{size:A4;margin:20mm}body{font-family:Georgia,serif;line-height:1.6;color:#111}h1{font-size:18pt}p{white-space:pre-wrap}</style>
      </head><body><h1>${l.subject || l.letter_name}</h1><p>${l.body.replace(/</g,'&lt;')}</p></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policy Letters</h1>
          <p className="text-muted-foreground mt-1">Reusable A4 letter templates for dealer customers</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />New letter</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Templates</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground text-sm">No letter templates yet.</div>
          ) : (
            <div className="space-y-2">
              {rows.map(l => (
                <div key={l.id} className="flex items-center justify-between border rounded-lg p-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      {l.letter_name}
                      <Badge variant="outline">{l.letter_type}</Badge>
                      {!l.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    {l.subject && <div className="text-sm text-muted-foreground truncate">{l.subject}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => print(l)}><Printer className="h-4 w-4 mr-1" />Print</Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(l)}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit letter' : 'New letter'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Letter name</Label>
                <Input value={form.letter_name} onChange={e => setForm({ ...form, letter_name: e.target.value })} />
              </div>
              <div>
                <Label>Letter type</Label>
                <Select value={form.letter_type} onValueChange={v => setForm({ ...form, letter_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="renewal">Renewal</SelectItem>
                    <SelectItem value="cancellation">Cancellation</SelectItem>
                    <SelectItem value="claim">Claim</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={10} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
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
