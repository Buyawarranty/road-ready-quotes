import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SaleRow {
  id: string;
  name: string;
  email: string;
  registration_plate: string | null;
  plan_type: string;
  payment_type: string | null;
  payment_status: string | null;
  status: string;
  signup_date: string;
  final_amount: number | null;
  total_amount_paid: number | null;
  dealer_id: string;
  dealer_name?: string;
  dealer_company?: string;
}

const DealerAdminSales: React.FC = () => {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [dealerFilter, setDealerFilter] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      const [{ data: customers }, { data: dealers }] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, email, registration_plate, plan_type, payment_type, payment_status, status, signup_date, final_amount, total_amount_paid, dealer_id')
          .not('dealer_id', 'is', null)
          .order('signup_date', { ascending: false })
          .limit(1000),
        supabase.from('dealers').select('id, name, company_name'),
      ]);

      const dealerMap = new Map((dealers || []).map((d: any) => [d.id, d]));
      const merged = (customers || []).map((c: any) => ({
        ...c,
        dealer_name: dealerMap.get(c.dealer_id)?.name,
        dealer_company: dealerMap.get(c.dealer_id)?.company_name,
      })) as SaleRow[];

      setRows(merged);
      setLoading(false);
    };
    load();
  }, []);

  const dealerOptions = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      if (r.dealer_id) m.set(r.dealer_id, r.dealer_company || r.dealer_name || r.dealer_id);
    });
    return Array.from(m.entries());
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (dealerFilter !== 'all' && r.dealer_id !== dealerFilter) return false;
      if (paymentFilter === 'paid' && (r.payment_status || '').toLowerCase() !== 'paid') return false;
      if (paymentFilter === 'unpaid' && (r.payment_status || '').toLowerCase() === 'paid') return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.registration_plate?.toLowerCase().includes(q) ||
        r.dealer_company?.toLowerCase().includes(q)
      );
    });
  }, [rows, search, paymentFilter, dealerFilter]);

  const totalRevenue = filtered.reduce(
    (sum, r) => sum + Number(r.total_amount_paid ?? r.final_amount ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dealer sales</h1>
          <p className="text-muted-foreground text-sm mt-1">All warranty sales originated by dealers.</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Filtered total</p>
          <p className="text-2xl font-bold text-foreground">£{totalRevenue.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} sales</p>
        </div>
      </div>

      <Card className="border-2">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, reg, dealer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={paymentFilter} onValueChange={(v: any) => setPaymentFilter(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="paid">Paid only</SelectItem>
                <SelectItem value="unpaid">Unpaid only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dealerFilter} onValueChange={setDealerFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dealers</SelectItem>
                {dealerOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No sales found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-y border-border">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Vehicle</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Dealer</th>
                    <th className="px-3 py-2 font-medium">Payment</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const paid = (r.payment_status || '').toLowerCase() === 'paid';
                    const active = (r.status || '').toLowerCase() === 'active';
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {new Date(r.signup_date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs uppercase">{r.registration_plate || '—'}</td>
                        <td className="px-3 py-2 capitalize">{r.plan_type} · {r.payment_type}m</td>
                        <td className="px-3 py-2 text-foreground">{r.dealer_company || r.dealer_name || '—'}</td>
                        <td className="px-3 py-2">
                          <Badge variant={paid ? 'default' : 'secondary'} className={paid ? 'bg-green-600' : 'bg-amber-500'}>
                            {paid ? 'Paid' : (r.payment_status || 'Unpaid')}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={active ? 'border-green-500 text-green-700' : ''}>
                            {r.status || '—'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          £{Number(r.total_amount_paid ?? r.final_amount ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerAdminSales;
