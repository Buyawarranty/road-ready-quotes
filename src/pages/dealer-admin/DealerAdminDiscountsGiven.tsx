import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, PercentCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DealerRow { id: string; company_name: string | null; name: string | null; discount_pct: number | null }
interface SaleRow { dealer_id: string | null; final_amount: number | null; signup_date: string | null; status: string | null }

const DealerAdminDiscountsGiven: React.FC = () => {
  const [dealers, setDealers] = useState<DealerRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: s }] = await Promise.all([
        supabase.from('dealers').select('id, company_name, name, discount_pct'),
        supabase.from('customers')
          .select('dealer_id, final_amount, signup_date, status')
          .not('dealer_id', 'is', null)
          .eq('is_deleted', false),
      ]);
      setDealers((d || []) as DealerRow[]);
      setSales((s || []) as SaleRow[]);
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(() => {
    return dealers.map(d => {
      const ds = sales.filter(s => s.dealer_id === d.id && (s.status || '').toLowerCase() !== 'cancelled' && (s.status || '').toLowerCase() !== 'refunded');
      const pct = Number(d.discount_pct || 0);
      const dealerRevenue = ds.reduce((sum, s) => sum + Number(s.final_amount || 0), 0);
      // dealerRevenue = retail * (1 - pct/100)  → retail = dealerRevenue / (1 - pct/100)
      const retail = pct < 100 ? dealerRevenue / (1 - pct / 100) : dealerRevenue;
      const discountValue = retail - dealerRevenue;
      return {
        id: d.id,
        name: d.company_name || d.name || 'Unnamed dealer',
        pct,
        sales: ds.length,
        dealerRevenue,
        retail,
        discountValue,
      };
    }).sort((a, b) => b.discountValue - a.discountValue);
  }, [dealers, sales]);

  const totals = useMemo(() => {
    const totalDiscount = rows.reduce((s, r) => s + r.discountValue, 0);
    const totalRetail = rows.reduce((s, r) => s + r.retail, 0);
    const totalActual = rows.reduce((s, r) => s + r.dealerRevenue, 0);
    return { totalDiscount, totalRetail, totalActual };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PercentCircle className="h-6 w-6 text-primary" />
          Discounts Given
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Track dealer discounts vs retail pricing.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6">
              <p className="text-xs uppercase text-muted-foreground">Retail equivalent</p>
              <p className="text-2xl font-bold">£{totals.totalRetail.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs uppercase text-muted-foreground">Dealer revenue</p>
              <p className="text-2xl font-bold">£{totals.totalActual.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</p>
            </CardContent></Card>
            <Card className="border-amber-300 border-2"><CardContent className="pt-6">
              <p className="text-xs uppercase text-muted-foreground">Total discount given</p>
              <p className="text-2xl font-bold text-amber-700">£{totals.totalDiscount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Discount by dealer</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead>
                    <TableHead className="text-right">Discount %</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Retail</TableHead>
                    <TableHead className="text-right">Dealer paid</TableHead>
                    <TableHead className="text-right">Discount value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right"><Badge variant="secondary">{r.pct}%</Badge></TableCell>
                      <TableCell className="text-right">{r.sales}</TableCell>
                      <TableCell className="text-right">£{r.retail.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right">£{r.dealerRevenue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right font-semibold text-amber-700">£{r.discountValue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
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

export default DealerAdminDiscountsGiven;
