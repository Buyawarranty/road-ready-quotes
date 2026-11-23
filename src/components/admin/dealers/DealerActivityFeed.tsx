import React, { useEffect, useMemo, useState } from 'react';
import { AdminTable } from '@/components/ui/table-sorting';
import { useAdminRecordSorting } from '@/hooks/useAdminRecordSorting';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, ChevronDown, ChevronRight, Loader2, LogIn, MousePointerClick, RefreshCw } from 'lucide-react';
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
  const [view, setView] = useState<'timeline' | 'byDealer'>('byDealer');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedShown, setExpandedShown] = useState<Record<string, number>>({});
  const columnSorting = useAdminRecordSorting<Item>({ 'Time and date': i => i.at, Dealer: i => i.dealer, Activity: i => i.kind === 'login' ? 'Signed in' : `Opened ${i.label}` });
  useEffect(() => { columnSorting.onSortChange(null); }, [order]);

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
      .sort((a, b) => columnSorting.columnSort ? columnSorting.compare(a, b) : (order === 'newest' ? 1 : -1) * (new Date(b.at).getTime() - new Date(a.at).getTime()));
  }, [items, q, dealer, kind, period, order, columnSorting.columnSort, columnSorting.compare]);
  useEffect(() => setShown(PAGE), [q, dealer, kind, period, order, columnSorting.columnSort]);

  const activeDealers = new Set(filtered.map((i) => i.dealer_id)).size;
  const loginCount = filtered.filter((i) => i.kind === 'login').length;

  const byDealer = useMemo(() => {
    const map = new Map<string, { id: string; name: string; items: Item[] }>();
    filtered.forEach((i) => {
      const g = map.get(i.dealer_id) || { id: i.dealer_id, name: i.dealer, items: [] };
      g.items.push(i);
      map.set(i.dealer_id, g);
    });
    return [...map.values()].sort((a, b) => {
      const at = Math.max(...a.items.map((i) => new Date(i.at).getTime()));
      const bt = Math.max(...b.items.map((i) => new Date(i.at).getTime()));
      return order === 'newest' ? bt - at : at - bt;
    });
  }, [filtered, order]);

  const toggleDealer = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5" />Dealer activity</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border overflow-hidden">
              <Button variant={view === 'byDealer' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('byDealer')}>By dealer</Button>
              <Button variant={view === 'timeline' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('timeline')}>Timeline</Button>
            </div>
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-1 h-4 w-4" />Refresh</Button>
          </div>
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
          : view === 'byDealer' ? (
            <div className="divide-y rounded-md border">
              {byDealer.map((g) => {
                const open = expanded.has(g.id);
                const logins = g.items.filter((i) => i.kind === 'login').length;
                const last = g.items.reduce((m, i) => (new Date(i.at).getTime() > new Date(m.at).getTime() ? i : m), g.items[0]);
                const limit = expandedShown[g.id] || 20;
                return (
                  <div key={g.id}>
                    <button type="button" onClick={() => toggleDealer(g.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40">
                      {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
                      <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">{logins} sign-ins · {g.items.length - logins} page visits</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">Last: {formatActivityTime(last.at)}</span>
                    </button>
                    {open && (
                      <div className="border-t bg-muted/20 px-3 py-2">
                        <ul className="space-y-1">
                          {g.items.slice(0, limit).map((i) => (
                            <li key={i.key} className="flex items-center gap-2 text-sm">
                              {i.kind === 'login' ? <LogIn className="h-4 w-4 shrink-0 text-primary" /> : <MousePointerClick className="h-4 w-4 shrink-0 text-muted-foreground" />}
                              <span className="min-w-0 flex-1 truncate">{i.kind === 'login' ? 'Signed in' : `Opened ${i.label}`}</span>
                              <span className="whitespace-nowrap text-xs text-muted-foreground">{formatActivityTime(i.at)}</span>
                            </li>
                          ))}
                        </ul>
                        {g.items.length > limit && (
                          <div className="pt-2 text-center">
                            <Button variant="outline" size="sm" onClick={() => setExpandedShown((p) => ({ ...p, [g.id]: limit + 50 }))}>Show more ({g.items.length - limit} left)</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
          : <div className="overflow-x-auto"><AdminTable className="w-full text-sm" onSortChange={columnSorting.onSortChange} sortColumns={columnSorting.sortColumns}>
              <thead className="border-y bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Time and date</th><th className="px-3 py-2 font-medium">Dealer</th><th className="px-3 py-2 font-medium">Activity</th></tr></thead>
              <tbody>{filtered.slice(0, shown).map((i) => (
                <tr key={i.key} className="border-b">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatActivityTime(i.at)}</td>
                  <td className="px-3 py-2 font-medium">{i.dealer}</td>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5">{i.kind === 'login' ? <LogIn className="h-4 w-4 text-primary" /> : <MousePointerClick className="h-4 w-4 text-muted-foreground" />}{i.kind === 'login' ? 'Signed in' : `Opened ${i.label}`}</span></td>
                </tr>))}</tbody>
            </AdminTable>
            {shown < filtered.length && <div className="pt-3 text-center"><Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE)}>Show more ({filtered.length - shown} left)</Button></div>}
          </div>}
      </CardContent>
    </Card>
  );
};
export default DealerActivityFeed;
