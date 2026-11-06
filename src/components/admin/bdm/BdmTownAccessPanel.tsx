import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, MapPin, X } from 'lucide-react';

type Staff = { user_id: string; name: string; role: string };
type Grant = { id: string; user_id: string; town: string };

/** Super Admin / Admin only: open BDM contact list towns to individual staff. */
const BdmTownAccessPanel: React.FC = () => {
  const [allowed, setAllowed] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [towns, setTowns] = useState<string[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);
  const db = supabase as any;

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const saved = grants.filter(g => g.user_id === who).map(g => g.town).sort().join('|');
  const dirty = [...picked].sort().join('|') !== saved;

  const load = useCallback(async () => {
    const { data: g } = await db.from('bdm_town_access').select('id, user_id, town').order('town');
    setGrants(g || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: ok } = await db.rpc('bdm_is_town_admin', { _uid: u.user.id });
      setAllowed(!!ok);
      if (!ok) return;
      const [{ data: s }, { data: t }, { data: au }] = await Promise.all([
        db.rpc('bdm_staff_list'),
        db.rpc('bdm_town_list'),
        db.from('admin_users').select('user_id, role').eq('is_active', true),
      ]);
      // Only real, active Panda Protect staff accounts — not old copied roles.
      const roleOf = new Map((au || []).map((x: any) => [x.user_id, x.role]));
      const list: Staff[] = [];
      for (const x of (s || [])) {
        if (x.user_id === u.user.id || !roleOf.has(x.user_id)) continue;
        const { data: top } = await db.rpc('bdm_is_town_admin', { _uid: x.user_id });
        if (top) continue;
        list.push({ user_id: x.user_id, name: x.name, role: (roleOf.get(x.user_id) as string) || 'staff' });
      }
      setStaff(list);
      setTowns((t || []).map((x: any) => x.town));
      load();
    })();
  }, [load]);

  useEffect(() => { setSavedAt(null); setPicked(new Set(grants.filter(g => g.user_id === who).map(g => g.town))); }, [who, grants]);

  if (!allowed) return null;

  const toggle = (t: string) => setPicked(p => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const save = async () => {
    if (!who) { toast.error('Choose a staff member first'); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const current = grants.filter(g => g.user_id === who);
    const add = [...picked].filter(t => !current.some(g => g.town === t));
    const remove = current.filter(g => !picked.has(g.town)).map(g => g.id);
    let err: any = null;
    if (add.length) ({ error: err } = await db.from('bdm_town_access').insert(add.map(town => ({ user_id: who, town, granted_by: u.user?.id }))));
    if (!err && remove.length) ({ error: err } = await db.from('bdm_town_access').delete().in('id', remove));
    setBusy(false);
    if (err) { toast.error(err.message); return; }
    setSavedAt(new Date()); toast.success(`Saved — ${picked.size} town${picked.size === 1 ? '' : 's'} opened`); load();
  };
  const revoke = async (id: string) => {
    const { error } = await db.from('bdm_town_access').delete().eq('id', id);
    if (error) toast.error(error.message); else load();
  };
  const shown = towns.filter(t => t.toLowerCase().includes(filter.toLowerCase()));

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
        <div className="grid gap-3">
          <div>
            <Label>Staff member</Label>
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger><SelectValue placeholder={staff.length ? 'Choose staff' : 'No BDM or Manager logins yet'} /></SelectTrigger>
              <SelectContent>
                {staff.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.name} · {s.role.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <Label>Towns ({picked.size} ticked)</Label>
              <div className="flex gap-2 text-xs">
                <button type="button" className="underline" disabled={!who} onClick={() => setPicked(new Set([...picked, ...shown]))}>Tick all</button>
                <button type="button" className="underline" disabled={!who} onClick={() => setPicked(new Set())}>Clear</button>
              </div>
            </div>
            <Input className="my-2" placeholder="Search towns" value={filter} onChange={e => setFilter(e.target.value)} />
            <div className={`grid max-h-64 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2 ${who ? '' : 'pointer-events-none opacity-50'}`}>
              {shown.map(t => (
                <label key={t} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                  <Checkbox checked={picked.has(t)} onCheckedChange={() => toggle(t)} />{t}
                </label>
              ))}
              {shown.length === 0 && <p className="text-sm text-muted-foreground">No towns found.</p>}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {who && (dirty
              ? <span className="text-sm font-medium text-crm-ink-amber">Unsaved changes</span>
              : savedAt && <span className="flex items-center gap-1 text-sm font-medium text-crm-ink-green"><Check className="h-4 w-4" />Saved at {savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>)}
            <Button onClick={save} disabled={busy || !who || !dirty} className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90">{busy ? 'Saving…' : !dirty && who ? 'Saved' : 'Save town access'}</Button>
          </div>
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
