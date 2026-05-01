import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Database, Download, RotateCcw, Plus, Trash2 } from 'lucide-react';

type Backup = {
  id: string;
  backup_name: string;
  backup_type: string;
  record_count: number;
  snapshot: any;
  notes: string | null;
  created_at: string;
};

export default function DealerAdminLeadBackup() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dealer_admin_lead_backups')
      .select('*')
      .order('created_at', { ascending: false });
    setBackups((data as Backup[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createBackup = async () => {
    if (!name.trim()) { toast.error('Backup name required'); return; }
    setCreating(true);
    try {
      const { data: leads, error: leadsErr } = await supabase
        .from('dealers')
        .select('*')
        .limit(5000);
      if (leadsErr) throw leadsErr;

      const { error } = await supabase.from('dealer_admin_lead_backups').insert({
        backup_name: name.trim(),
        backup_type: 'manual',
        record_count: leads?.length || 0,
        snapshot: leads || [],
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast.success(`Backed up ${leads?.length || 0} dealer records`);
      setOpen(false);
      setName(''); setNotes('');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Backup failed');
    } finally {
      setCreating(false);
    }
  };

  const downloadCSV = (b: Backup) => {
    const rows = Array.isArray(b.snapshot) ? b.snapshot : [];
    if (rows.length === 0) { toast.error('Backup is empty'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r: any) => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${b.backup_name}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this backup?')) return;
    const { error } = await supabase.from('dealer_admin_lead_backups').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Backup deleted');
    load();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Backup &amp; Recovery</h1>
          <p className="text-muted-foreground mt-1">Snapshot dealer records for export and recovery</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />New backup</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create lead backup</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pre-migration snapshot" />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createBackup} disabled={creating}>{creating ? 'Creating…' : 'Create backup'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Backups</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : backups.length === 0 ? (
            <div className="text-muted-foreground text-sm">No backups yet. Create your first snapshot above.</div>
          ) : (
            <div className="space-y-2">
              {backups.map(b => (
                <div key={b.id} className="flex items-center justify-between border rounded-lg p-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{b.backup_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString()} · <Badge variant="outline" className="ml-1">{b.backup_type}</Badge>
                    </div>
                    {b.notes && <div className="text-sm text-muted-foreground mt-1">{b.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge>{b.record_count} records</Badge>
                    <Button size="sm" variant="outline" onClick={() => downloadCSV(b)}><Download className="h-4 w-4 mr-1" />CSV</Button>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(JSON.stringify(b.snapshot)); toast.success('Snapshot copied'); }}>
                      <RotateCcw className="h-4 w-4 mr-1" />Copy JSON
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
