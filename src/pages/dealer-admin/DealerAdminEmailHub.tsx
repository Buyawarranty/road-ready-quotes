import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Send, Trash2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string | null;
  audience: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  created_at: string;
}

const empty = { name: '', subject: '', body: '', audience: 'all', status: 'draft', scheduled_at: '' };

const DealerAdminEmailHub: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dealer_admin_email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    setRows((data as Campaign[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: rows.length,
    sent: rows.filter((r) => r.status === 'sent').length,
    scheduled: rows.filter((r) => r.status === 'scheduled').length,
    drafts: rows.filter((r) => r.status === 'draft').length,
  }), [rows]);

  const save = async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      toast({ title: 'Name and subject required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('dealer_admin_email_campaigns').insert({
      name: form.name, subject: form.subject, body: form.body || null,
      audience: form.audience, status: form.status,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
    });
    setSaving(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Campaign saved' });
    setForm(empty); setOpen(false); load();
  };

  const markSent = async (id: string) => {
    const { error } = await supabase.from('dealer_admin_email_campaigns')
      .update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    const { error } = await supabase.from('dealer_admin_email_campaigns').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const statusVariant = (s: string): 'default' | 'secondary' | 'outline' =>
    s === 'sent' ? 'default' : s === 'scheduled' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Plan, draft, and track dealer email campaigns.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>New email campaign</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Internal name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Subject line *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div><Label>Body</Label><Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Audience</Label>
                  <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All dealers</SelectItem>
                      <SelectItem value="active">Active customers</SelectItem>
                      <SelectItem value="leads">Leads only</SelectItem>
                      <SelectItem value="abandoned">Abandoned carts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.status === 'scheduled' && (
                <div><Label>Send at</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Sent', value: stats.sent, color: 'text-emerald-600' },
          { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-600' },
          { label: 'Drafts', value: stats.drafts, color: 'text-amber-600' },
        ].map((s) => (
          <Card key={s.label} className="border-2">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2">
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled / sent</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />No campaigns yet.
                  </TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.subject}</TableCell>
                    <TableCell><Badge variant="outline">{r.audience}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.sent_at ? `Sent ${new Date(r.sent_at).toLocaleString('en-GB')}`
                        : r.scheduled_at ? new Date(r.scheduled_at).toLocaleString('en-GB')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status !== 'sent' && (
                          <Button variant="ghost" size="icon" title="Mark sent" onClick={() => markSent(r.id)}>
                            <Send className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerAdminEmailHub;
