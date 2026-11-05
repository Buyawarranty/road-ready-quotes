import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Ban, X } from 'lucide-react';
import BdmTownAccessPanel from './BdmTownAccessPanel';

type Staff = { user_id: string; name: string; role: string };
type Block = { id: string; user_id: string; town: string | null; dealership_id: string | null; reason: string | null; bdm_dealerships?: { name: string; town: string | null } | null };

/** BDM allocation: Super Admin / Admin open towns to people and block towns or single dealerships from them. */
const BdmAllocationTab: React.FC = () => {
  const db = supabase as any;
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [towns, setTowns] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [who, setWho] = useState('');
  const [kind, setKind] = useState<'town' | 'dealership'>('dealership');
  const [town, setTown] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; town: string | null }[]>([]);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await db.from('bdm_access_blocks')
      .select('id, user_id, town, dealership_id, reason, bdm_dealerships(name, town)').order('created_at', { ascending: false });
    setBlocks(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setAllowed(false); return; }
      const { data: me } = await db.from('admin_users').select('role').eq('user_id', u.user.id).eq('is_active', true);
      const ok = (me || []).some((r: any) => ['super_admin', 'admin'].includes(r.role));
      setAllowed(ok);
      if (!ok) return;
      const [{ data: s }, { data: t }] = await Promise.all([
        db.from('admin_users').select('user_id, first_name, last_name, email, role').eq('is_active', true).order('first_name'),
        db.rpc('bdm_town_list'),
      ]);
      setStaff((s || []).filter((x: any) => x.user_id && x.role !== 'super_admin').map((x: any) => ({
        user_id: x.user_id, role: x.role, name: [x.first_name, x.last_name].filter(Boolean).join(' ') || x.email,
      })));
      setTowns((t || []).map((x: any) => x.town));
      load();
    })();
  }, [load]);

  useEffect(() => {
    if (kind !== 'dealership' || q.trim().length < 2 || picked) { setResults([]); return; }
    const h = setTimeout(async () => {
      const { data } = await db.from('bdm_dealerships').select('id, name, town').ilike('name', `%${q.trim()}%`).limit(10);
      setResults(data || []);
    }, 250);
    return () => clearTimeout(h);
  }, [q, kind, picked]);

  if (allowed === null) return null;
  if (!allowed) return <p className="p-6 text-sm text-muted-foreground">Only Super Admin and Admin can manage BDM allocation.</p>;

  const nameOf = (id: string) => staff.find(s => s.user_id === id)?.name || 'Unknown';

  const addBlock = async () => {
    if (!who) { toast.error('Choose a person'); return; }
    if (kind === 'town' && !town) { toast.error('Choose a town'); return; }
    if (kind === 'dealership' && !picked) { toast.error('Choose a dealership'); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from('bdm_access_blocks').insert({
      user_id: who, blocked_by: u.user?.id, reason: reason.trim() || null,
      town: kind === 'town' ? town : null, dealership_id: kind === 'dealership' ? picked!.id : null,
    });
    setBusy(false);
    if (error) { toast.error(error.code === '23505' ? 'Already blocked' : error.message); return; }
    toast.success('Blocked'); setPicked(null); setQ(''); setTown(''); setReason(''); load();
  };
  const unblock = async (id: string) => {
    const { error } = await db.from('bdm_access_blocks').delete().eq('id', id);
    if (error) toast.error(error.message); else load();
  };

  const grouped = Array.from(new Set(blocks.map(b => b.user_id)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">BDM allocation</h1>
        <p className="text-sm text-muted-foreground">Open towns to people, and block towns or single dealerships from anyone — including Managers and Admins. Super Admins are never blocked.</p>
      </div>

      <BdmTownAccessPanel />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Ban className="h-5 w-5" />Blocked leads</CardTitle>
          <p className="text-sm text-muted-foreground">A block always wins over town access: the person stops seeing that town or dealership straight away.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Person</Label>
              <Select value={who} onValueChange={setWho}>
                <SelectTrigger><SelectValue placeholder="Choose person" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.name} · {s.role.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Block</Label>
              <Select value={kind} onValueChange={(v: any) => { setKind(v); setPicked(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dealership">One dealership</SelectItem>
                  <SelectItem value="town">A whole town</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {kind === 'town' ? (
              <div>
                <Label>Town</Label>
                <Select value={town} onValueChange={setTown}>
                  <SelectTrigger><SelectValue placeholder="Choose town" /></SelectTrigger>
                  <SelectContent>{towns.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="relative">
                <Label>Dealership</Label>
                {picked ? (
                  <div className="flex h-10 items-center justify-between rounded-md border px-3 text-sm">
                    {picked.name}<button type="button" aria-label="Clear" onClick={() => { setPicked(null); setQ(''); }}><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Type a dealership name" />
                )}
                {results.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
                    {results.map(r => (
                      <button key={r.id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => { setPicked({ id: r.id, name: r.name }); setResults([]); }}>
                        {r.name} <span className="text-muted-foreground">· {r.town || 'No town'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <Label>Reason (optional)</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Existing relationship with another BDM" />
            </div>
          </div>
          <Button onClick={addBlock} disabled={busy} variant="destructive">Block</Button>

          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is blocked.</p>
          ) : grouped.map(uid => (
            <div key={uid} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
              <span className="font-medium">{nameOf(uid)}</span>
              {blocks.filter(b => b.user_id === uid).map(b => (
                <Badge key={b.id} variant="secondary" className="gap-1" title={b.reason || undefined}>
                  {b.town ? `Town: ${b.town}` : b.bdm_dealerships?.name || 'Dealership'}
                  <button type="button" aria-label="Unblock" onClick={() => unblock(b.id)}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BdmAllocationTab;
