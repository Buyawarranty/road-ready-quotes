import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Car, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Row {
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  final_amount: number | null;
}

const DealerAdminVehicleStats: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('customers')
        .select('vehicle_make, vehicle_model, vehicle_year, final_amount')
        .not('dealer_id', 'is', null)
        .eq('is_deleted', false);
      setRows((data || []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const aggregated = useMemo(() => {
    const map = new Map<string, { make: string; model: string; count: number; revenue: number }>();
    rows.forEach(r => {
      const make = (r.vehicle_make || 'Unknown').trim();
      const model = (r.vehicle_model || 'Unknown').trim();
      const key = `${make.toLowerCase()}|${model.toLowerCase()}`;
      const existing = map.get(key);
      const rev = Number(r.final_amount || 0);
      if (existing) {
        existing.count += 1;
        existing.revenue += rev;
      } else {
        map.set(key, { make, model, count: 1, revenue: rev });
      }
    });
    let list = Array.from(map.values()).sort((a, b) => b.count - a.count);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.make.toLowerCase().includes(q) || r.model.toLowerCase().includes(q));
    }
    return list;
  }, [rows, search]);

  const totals = useMemo(() => {
    const totalSales = rows.length;
    const totalRevenue = rows.reduce((s, r) => s + Number(r.final_amount || 0), 0);
    const uniqueMakes = new Set(rows.map(r => (r.vehicle_make || '').toLowerCase())).size;
    return { totalSales, totalRevenue, uniqueMakes };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          Vehicle Stats
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Analyse which vehicles sell the most dealer warranties.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6">
              <p className="text-xs uppercase text-muted-foreground">Total dealer sales</p>
              <p className="text-2xl font-bold">{totals.totalSales}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs uppercase text-muted-foreground">Total revenue</p>
              <p className="text-2xl font-bold">£{totals.totalRevenue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs uppercase text-muted-foreground">Unique makes</p>
              <p className="text-2xl font-bold">{totals.uniqueMakes}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Top vehicles</span>
                <div className="relative w-64">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search make/model"
                    className="pl-8"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Make</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregated.slice(0, 100).map((r, i) => (
                    <TableRow key={`${r.make}-${r.model}`}>
                      <TableCell>
                        {i < 3 ? <Badge variant="default">#{i + 1}</Badge> : <span className="text-muted-foreground">#{i + 1}</span>}
                      </TableCell>
                      <TableCell className="font-medium">{r.make}</TableCell>
                      <TableCell>{r.model}</TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right">£{r.revenue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right">£{(r.revenue / r.count).toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                    </TableRow>
                  ))}
                  {aggregated.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No vehicles found</TableCell></TableRow>
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

export default DealerAdminVehicleStats;
