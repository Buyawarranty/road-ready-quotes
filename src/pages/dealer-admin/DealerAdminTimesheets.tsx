import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Clock, TrendingUp, PoundSterling } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);

const DealerAdminTimesheets: React.FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['dealer-admin-timesheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dealer_admin_timesheet_entries')
        .select('*')
        .order('work_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const totals = entries.reduce(
    (acc: any, e: any) => ({
      hours: acc.hours + Number(e.hours_worked || 0),
      deals: acc.deals + Number(e.deals_closed || 0),
      commission: acc.commission + Number(e.commission_amount || 0),
    }),
    { hours: 0, deals: 0, commission: 0 }
  );

  const save = async () => {
    if (!editing?.work_date) {
      toast({ title: 'Date required', variant: 'destructive' });
      return;
    }
    const payload: any = {
      user_id: editing.user_id || user?.id,
      user_email: editing.user_email || user?.email,
      work_date: editing.work_date,
      hours_worked: Number(editing.hours_worked || 0),
      deals_closed: Number(editing.deals_closed || 0),
      commission_amount: Number(editing.commission_amount || 0),
      notes: editing.notes,
    };
    const op = editing.id
      ? supabase.from('dealer_admin_timesheet_entries').update(payload).eq('id', editing.id)
      : supabase.from('dealer_admin_timesheet_entries').insert(payload);
    const { error } = await op;
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing.id ? 'Entry updated' : 'Entry added' });
    setOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ['dealer-admin-timesheets'] });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const { error } = await supabase.from('dealer_admin_timesheet_entries').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['dealer-admin-timesheets'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Timesheets</h1>
          <p className="text-sm text-muted-foreground">Track work hours, deals and commissions.</p>
        </div>
        <Button onClick={() => { setEditing({ work_date: today(), hours_worked: 8 }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Log entry
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Total hours</p><p className="text-xl font-bold">{totals.hours.toFixed(1)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Deals closed</p><p className="text-xl font-bold">{totals.deals}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10"><PoundSterling className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Commission</p><p className="text-xl font-bold">£{totals.commission.toFixed(2)}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Entries ({entries.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">User</th>
                    <th className="text-right py-2">Hours</th>
                    <th className="text-right py-2">Deals</th>
                    <th className="text-right py-2">Commission</th>
                    <th className="text-left py-2 pl-3">Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e: any) => (
                    <tr key={e.id} className="border-b hover:bg-muted/30">
                      <td className="py-2">{e.work_date}</td>
                      <td className="py-2 text-xs">{e.user_email || '—'}</td>
                      <td className="py-2 text-right">{Number(e.hours_worked).toFixed(1)}</td>
                      <td className="py-2 text-right">{e.deals_closed}</td>
                      <td className="py-2 text-right">£{Number(e.commission_amount).toFixed(2)}</td>
                      <td className="py-2 pl-3 text-xs text-muted-foreground truncate max-w-[200px]">{e.notes || '—'}</td>
                      <td className="py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit entry' : 'New entry'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={editing.work_date || ''} onChange={(e) => setEditing({ ...editing, work_date: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Hours</Label>
                  <Input type="number" step="0.25" value={editing.hours_worked ?? ''} onChange={(e) => setEditing({ ...editing, hours_worked: e.target.value })} />
                </div>
                <div>
                  <Label>Deals</Label>
                  <Input type="number" value={editing.deals_closed ?? ''} onChange={(e) => setEditing({ ...editing, deals_closed: e.target.value })} />
                </div>
                <div>
                  <Label>Commission £</Label>
                  <Input type="number" step="0.01" value={editing.commission_amount ?? ''} onChange={(e) => setEditing({ ...editing, commission_amount: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={3} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealerAdminTimesheets;
