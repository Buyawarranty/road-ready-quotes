import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Loader2, LogIn, MousePointerClick, RefreshCw } from 'lucide-react';
import { formatActivityTime } from '@/lib/dealerActivityLabel';

type Item = { key: string; dealer_id: string; dealer: string; kind: 'login' | 'page'; label: string; at: string };
const PAGE = 50;

/** Timeline of dealer sign-ins and portal page visits, newest first. */
const DealerActivityFeed: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [dealers, setDealers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [dealer, setDealer] = useState('all');
  const [kind, setKind] = useState<'all' | 'login' | 'page'>('all');
  const [period, setPeriod] = useState<'today' | '7' | '30' | 'all'>('7');
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');
  const [shown, setShown] = useState(PAGE);

  const load = async () => {
    setLoading(true);
    const db = supabase as any;
    const [{ data: ds }, { data: logs }, { data: logins }] = await Promise.all([
      db.from('dealers').select('id, user_id, company_name, name'),
      db.from('dealer_activity_log').select('id, dealer_id, page_label, activity_at').order('activity_at', { ascending: false }).limit(2000),
      db.from('dealer_login_events').select('id, user_id, signed_in_at').order('signed_in_at', { ascending: false }).limit(2000),
    ]);
    const byId = new Map<string, string>(); const byUser = new Map<string, string>();
    (ds || []).forEach((d: any) => { byId.set(d.id, d.company_name || d.name || 'Dealer'); if (d.user_id) byUser.set(d.user_id, d.id); });
    setDealers((ds || []).map((d: any) => ({ id: d.id, name: d.company_name || d.name || 'Dealer' })).sort((a: any, b: any) => a.name.localeCompare(b.name)));
    const list: Item[] = [
      ...(logs || []).map((l: any) => ({ key: 'p' + l.id, dealer_id: l.dealer_id, dealer: byId.get(l.dealer_id) || 'Dealer', kind: 'page' as const, label: l.page_label, at: l.activity_at })),
      ...(logins || []).filter((l: any) => byUser.has(l.user_id)).map((l: any) => {
        const id = byUser.get(l.user_id)!;
        return { key: 'l' + l.id, dealer_id: id, dealer: byId.get(id) || 'Dealer', kind: 'login' as const, label: 'Signed in', at: l.signed_in_at };
      }),
    ];
    setItems(list); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const now = Date.now(); const day = 86400000;
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const min = period === 'today' ? startToday.getTime() : period === 'all' ? 0 : now - Number(period) * day;
    const s = q.trim().toLowerCase();
    return items
      .filter((i) => new Date(i.at).getTime() >= min)
      .filter((i) => dealer === 'all' || i.dealer_id === dealer)
      .filter((i) => kind === 'all' || i.kind === kind)
      .filter((i) => !s || i.dealer.toLowerCase().includes(s) || i.label.toLowerCase().includes(s))
      .sort((a, b) => (order === 'newest' ? 1 : -1) * (new Date(b.at).getTime() - new Date(a.at).getTime()));
  }, [items, q, dealer, kind, period, order]);
  useEffect(() => setShown(PAGE), [q, dealer, kind, period, order]);

  const activeDealers = new Set(filtered.map((i) => i.dealer_id)).size;
  const loginCount = filtered.filter((i) => i.kind === 'login').length;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5" />Dealer activity</CardTitle>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-1 h-4 w-4" />Refresh</Button>
        </div>
        <p className="text-sm text-muted-foreground">{activeDealers} dealers active · {loginCount} sign-ins · {filtered.length - loginCount} page visits</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="Search dealer or page" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={dealer} onValueChange={setDealer}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent className="max-h-72"><SelectItem value="all">All dealers</SelectItem>{dealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Select value={kind} onValueChange={(v) => setKind(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Sign-ins and pages</SelectItem><SelectItem value="login">Sign-ins only</SelectItem><SelectItem value="page">Page visits only</SelectItem></SelectContent></Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="today">Today</SelectItem><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="all">All time</SelectItem></SelectContent></Select>
          <Select value={order} onValueChange={(v) => setOrder(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Most recent first</SelectItem><SelectItem value="oldest">Oldest first</SelectItem></SelectContent></Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          : filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No dealer activity for these filters.</p>
          : <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="border-y bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Time and date</th><th className="px-3 py-2 font-medium">Dealer</th><th className="px-3 py-2 font-medium">Activity</th></tr></thead>
              <tbody>{filtered.slice(0, shown).map((i) => (
                <tr key={i.key} className="border-b">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatActivityTime(i.at)}</td>
                  <td className="px-3 py-2 font-medium">{i.dealer}</td>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5">{i.kind === 'login' ? <LogIn className="h-4 w-4 text-primary" /> : <MousePointerClick className="h-4 w-4 text-muted-foreground" />}{i.kind === 'login' ? 'Signed in' : `Opened ${i.label}`}</span></td>
                </tr>))}</tbody>
            </table>
            {shown < filtered.length && <div className="pt-3 text-center"><Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE)}>Show more ({filtered.length - shown} left)</Button></div>}
          </div>}
      </CardContent>
    </Card>
  );
};
export default DealerActivityFeed;
