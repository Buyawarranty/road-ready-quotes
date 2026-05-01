import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, UserPlus, Trash2 } from 'lucide-react';

type UserRow = {
  id: string;
  user_email: string;
  full_name: string | null;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
};

const ROLES = ['super_admin', 'admin', 'manager', 'sales', 'viewer'];
const STATUSES = ['active', 'invited', 'suspended'];

export default function DealerAdminUserPermissions() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('viewer');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dealer_admin_user_permissions')
      .select('*')
      .order('created_at', { ascending: false });
    setRows((data as UserRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const invite = async () => {
    if (!email.trim()) { toast.error('Email required'); return; }
    const { error } = await supabase.from('dealer_admin_user_permissions').insert({
      user_email: email.trim().toLowerCase(),
      full_name: name.trim() || null,
      role,
      status: 'invited',
    });
    if (error) { toast.error(error.message); return; }
    toast.success('User invited');
    setOpen(false); setEmail(''); setName(''); setRole('viewer');
    load();
  };

  const update = async (id: string, patch: Partial<UserRow>) => {
    const { error } = await supabase.from('dealer_admin_user_permissions').update(patch).eq('id', id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this user?')) return;
    const { error } = await supabase.from('dealer_admin_user_permissions').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('User removed');
    load();
  };

  const statusColor = (s: string) =>
    s === 'active' ? 'default' : s === 'invited' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Permissions</h1>
          <p className="text-muted-foreground mt-1">Manage dealer admin user access and roles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-1" />Invite user</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite a team member</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Full name</label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={invite}>Send invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Users</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No users yet. Invite your first team member above.</div>
          ) : (
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.full_name || r.user_email}</div>
                    <div className="text-xs text-muted-foreground">{r.user_email}</div>
                    {r.last_login_at && (
                      <div className="text-xs text-muted-foreground mt-1">Last login: {new Date(r.last_login_at).toLocaleString()}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={r.role} onValueChange={(v) => update(r.id, { role: v })}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={r.status} onValueChange={(v) => update(r.id, { status: v })}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Badge variant={statusColor(r.status) as any}>{r.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
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
