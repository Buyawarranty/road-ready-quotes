import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Medal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DealerRow {
  id: string;
  company_name: string | null;
  name: string | null;
}
interface SaleRow {
  dealer_id: string | null;
  final_amount: number | null;
  signup_date: string | null;
  status: string | null;
}

const DealerAdminSalesScoreboard: React.FC = () => {
  const [dealers, setDealers] = useState<DealerRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: s }] = await Promise.all([
        supabase.from('dealers').select('id, company_name, name'),
        supabase
          .from('customers')
          .select('dealer_id, final_amount, signup_date, status')
          .not('dealer_id', 'is', null)
          .eq('is_deleted', false),
      ]);
      setDealers((d || []) as DealerRow[]);
      setSales((s || []) as SaleRow[]);
      setLoading(false);
    })();
  }, []);

  const ranking = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return dealers
      .map(d => {
        const ds = sales.filter(s => s.dealer_id === d.id && (s.status || '').toLowerCase() !== 'cancelled' && (s.status || '').toLowerCase() !== 'refunded');
        const monthSales = ds.filter(s => s.signup_date && new Date(s.signup_date) >= monthStart);
        const revenue = ds.reduce((sum, s) => sum + Number(s.final_amount ?? 0), 0);
        const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.final_amount ?? 0), 0);
        return {
          id: d.id,
          name: d.company_name || d.name || 'Unnamed dealer',
          totalSales: ds.length,
          totalRevenue: revenue,
          monthSales: monthSales.length,
          monthRevenue,
          avg: ds.length ? revenue / ds.length : 0,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [dealers, sales]);

  const topThree = ranking.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Sales Scoreboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Dealer leaderboard, awards and sales competition.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topThree.map((d, i) => (
                <Card key={d.id} className={i === 0 ? 'border-yellow-400 border-2' : i === 1 ? 'border-slate-400 border-2' : 'border-amber-700 border-2'}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <Medal className={`h-6 w-6 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'}`} />
                      <Badge variant={i === 0 ? 'default' : 'secondary'}>#{i + 1}</Badge>
                    </div>
                    <p className="font-bold text-lg truncate">{d.name}</p>
                    <p className="text-2xl font-bold mt-2">£{d.totalRevenue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground">{d.totalSales} sales · £{d.monthRevenue.toLocaleString('en-GB', { maximumFractionDigits: 0 })} this month</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Full leaderboard</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">This month</TableHead>
                    <TableHead className="text-right">Avg order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((d, i) => (
                    <TableRow key={d.id}>
                      <TableCell>{i < 3 ? <Badge>#{i + 1}</Badge> : <span className="text-muted-foreground">#{i + 1}</span>}</TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right">{d.totalSales}</TableCell>
                      <TableCell className="text-right">£{d.totalRevenue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right">{d.monthSales} · £{d.monthRevenue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right">£{d.avg.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                    </TableRow>
                  ))}
                  {ranking.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No dealers yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default DealerAdminSalesScoreboard;
