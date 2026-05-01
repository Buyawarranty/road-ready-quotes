import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mailbox, Plus, Trash2, Search } from 'lucide-react';

type Log = {
  id: string;
  customer_name: string;
  customer_address: string | null;
  letter_type: string;
  status: string;
  tracking_ref: string | null;
  posted_by: string | null;
  notes: string | null;
  posted_at: string;
};

const empty = {
  customer_name: '', customer_address: '', letter_type: 'welcome',
  status: 'printed', tracking_ref: '', posted_by: '', notes: '',
};

const statusVariant = (s: string): 'default' | 'secondary' | 'outline' => {
  if (s === 'posted') return 'default';
  if (s === 'delivered') return 'default';
  if (s === 'returned') return 'secondary';
  return 'outline';
};

export default function DealerAdminPostedLettersLog() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dealer_admin_posted_letters_log')
      .select('*')
      .order('posted_at', { ascending: false })
      .limit(500);
    setRows((data as Log[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.customer_name.toLowerCase().includes(q) ||
      (r.tracking_ref || '').toLowerCase().includes(q) ||
      (r.posted_by || '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const create = async () => {
    if (!form.customer_name) { toast.error('Customer name required'); return; }
    const { error } = await supabase.from('dealer_admin_posted_letters_log').insert(form);
    if (error) return toast.error(error.message);
    toast.success('Letter logged');
    setOpen(false); setForm(empty); load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('dealer_admin_posted_letters_log').update({ status }).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this log entry?')) return;
    const { error } = await supabase.from('dealer_admin_posted_letters_log').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Posted Letters Log</h1>
          <p className="text-muted-foreground mt-1">Track every printed and posted dealer letter</p>
        </div>
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Log letter</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2"><Mailbox className="h-5 w-5" />Log entries</CardTitle>
            <div className="relative w-72">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search name, tracking, agent" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground text-sm">No log entries.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Posted by</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.customer_name}</div>
                      {r.customer_address && <div className="text-xs text-muted-foreground">{r.customer_address}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.letter_type}</Badge></TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="printed">Printed</SelectItem>
                          <SelectItem value="posted">Posted</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="returned">Returned</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.tracking_ref || '—'}</TableCell>
                    <TableCell>{r.posted_by || '—'}</TableCell>
                    <TableCell className="text-xs">{new Date(r.posted_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={statusVariant(r.status)} className="mr-2 hidden">{r.status}</Badge>
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
          <DialogHeader><DialogTitle>Log a posted letter</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Customer name</Label>
              <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea rows={2} value={form.customer_address} onChange={e => setForm({ ...form, customer_address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="printed">Printed</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tracking ref</Label>
                <Input value={form.tracking_ref} onChange={e => setForm({ ...form, tracking_ref: e.target.value })} />
              </div>
              <div>
                <Label>Posted by</Label>
                <Input value={form.posted_by} onChange={e => setForm({ ...form, posted_by: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Save log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
