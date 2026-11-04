import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MapPin, X } from 'lucide-react';

type Staff = { user_id: string; name: string; role: string };
type Grant = { id: string; user_id: string; town: string };

/** Super Admin / Admin only: open BDM contact list towns to individual staff. */
const BdmTownAccessPanel: React.FC = () => {
  const [allowed, setAllowed] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [towns, setTowns] = useState<string[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [who, setWho] = useState('');
  const [town, setTown] = useState('');
  const [busy, setBusy] = useState(false);
  const db = supabase as any;

  const load = useCallback(async () => {
    const { data: g } = await db.from('bdm_town_access').select('id, user_id, town').order('town');
    setGrants(g || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: me } = await db.from('admin_users').select('role').eq('user_id', u.user.id).eq('is_active', true);
      const ok = (me || []).some((r: any) => ['super_admin', 'admin'].includes(r.role));
      setAllowed(ok);
      if (!ok) return;
      const [{ data: s }, { data: t }] = await Promise.all([
        db.from('admin_users').select('user_id, first_name, last_name, email, role').eq('is_active', true).order('first_name'),
        db.rpc('bdm_town_list'),
      ]);
      setStaff((s || []).filter((x: any) => x.user_id && !['super_admin', 'admin'].includes(x.role)).map((x: any) => ({
        user_id: x.user_id, role: x.role,
        name: [x.first_name, x.last_name].filter(Boolean).join(' ') || x.email,
      })));
      setTowns((t || []).map((x: any) => x.town));
      load();
    })();
  }, [load]);

  if (!allowed) return null;

  const grant = async () => {
    if (!who || !town) { toast.error('Choose a staff member and a town'); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from('bdm_town_access').insert({ user_id: who, town, granted_by: u.user?.id });
    setBusy(false);
    if (error) { toast.error(error.code === '23505' ? 'They already have this town' : error.message); return; }
    toast.success(`${town} opened`); setTown(''); load();
  };
  const revoke = async (id: string) => {
    const { error } = await db.from('bdm_town_access').delete().eq('id', id);
    if (error) toast.error(error.message); else load();
  };

  const byUser = staff.map(s => ({ ...s, towns: grants.filter(g => g.user_id === s.user_id) })).filter(s => s.towns.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><MapPin className="h-5 w-5" />BDM contact list — town access</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose which towns each BDM or Manager can see in the BDM contact list. Only Super Admin and Admin can change this. Nobody except Super Admin can import or download the list.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <Label>Staff member</Label>
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger><SelectValue placeholder="Choose staff" /></SelectTrigger>
              <SelectContent>
                {staff.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.name} · {s.role.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Town</Label>
            <Select value={town} onValueChange={setTown}>
              <SelectTrigger><SelectValue placeholder="Choose town" /></SelectTrigger>
              <SelectContent>
                {towns.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={grant} disabled={busy} className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90">Give access</Button>
        </div>
        {byUser.length === 0 ? (
          <p className="text-sm text-muted-foreground">No towns opened yet.</p>
        ) : (
          <div className="space-y-2">
            {byUser.map(s => (
              <div key={s.user_id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                <span className="font-medium">{s.name}</span>
                {s.towns.map(g => (
                  <Badge key={g.id} variant="secondary" className="gap-1">
                    {g.town}
                    <button type="button" aria-label={`Remove ${g.town}`} onClick={() => revoke(g.id)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BdmTownAccessPanel;
