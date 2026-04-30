import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Eye, TrendingUp, Globe } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

interface PageView {
  id: string;
  path: string;
  referrer: string | null;
  viewed_at: string;
}

const DealerAdminPageAnalytics: React.FC = () => {
  const [rows, setRows] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('dealer_admin_page_views')
        .select('id, path, referrer, viewed_at')
        .gte('viewed_at', since)
        .order('viewed_at', { ascending: false })
        .limit(1000);
      setRows((data as PageView[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayCount = rows.filter((r) => new Date(r.viewed_at) >= today).length;
    const uniquePaths = new Set(rows.map((r) => r.path)).size;
    return { total: rows.length, today: todayCount, uniquePaths };
  }, [rows]);

  const topPaths = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.path, (m.get(r.path) || 0) + 1));
    return Array.from(m.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  }, [rows]);

  const daily = useMemo(() => {
    const buckets: Record<string, { day: string; views: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { day: d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit' }), views: 0 };
    }
    rows.forEach((r) => {
      const key = new Date(r.viewed_at).toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].views += 1;
    });
    return Object.values(buckets);
  }, [rows]);

  const topReferrers = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const ref = r.referrer ? new URL(r.referrer).hostname : 'direct';
      m.set(ref, (m.get(ref) || 0) + 1);
    });
    return Array.from(m.entries()).map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);
  }, [rows]);

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Page Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Dealer page traffic over the last 30 days.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Views (30 days)', value: stats.total, icon: Eye, color: 'text-primary' },
          { label: 'Today', value: stats.today, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Unique pages', value: stats.uniquePaths, icon: Globe, color: 'text-blue-600' },
        ].map((s) => (
          <Card key={s.label} className="border-2">
            <CardContent className="pt-6 flex items-center gap-4">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{s.value.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Daily views (last 14 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Top pages</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Path</TableHead><TableHead className="w-24 text-right">Views</TableHead></TableRow></TableHeader>
              <TableBody>
                {topPaths.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No data yet.</TableCell></TableRow>
                ) : topPaths.map((p) => (
                  <TableRow key={p.path}>
                    <TableCell className="font-mono text-xs truncate max-w-xs">{p.path}</TableCell>
                    <TableCell className="text-right font-semibold">{p.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Top referrers</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Source</TableHead><TableHead className="w-24 text-right">Visits</TableHead></TableRow></TableHeader>
              <TableBody>
                {topReferrers.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No referrers yet.</TableCell></TableRow>
                ) : topReferrers.map((r) => (
                  <TableRow key={r.source}>
                    <TableCell>{r.source}</TableCell>
                    <TableCell className="text-right font-semibold">{r.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DealerAdminPageAnalytics;
