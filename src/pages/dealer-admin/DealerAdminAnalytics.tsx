import React, { useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Building2, CheckCircle2, FileText, Loader2, PoundSterling, RefreshCw, ShoppingBag, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DealerDateFilter } from '@/components/dealer/DealerDateFilter';
import { dealerSaleAmount } from '@/lib/dealerSales';
import { AnalyticsSale, AnalyticsSignup, buildSalesAnalytics, monthlySalesSeries } from '@/lib/salesAnalytics';
import { displayWarrantyPlanName } from '@/lib/warrantyPlanDisplay';

interface Sale extends AnalyticsSale {
  name?: string | null;
  dealer_company?: string;
}
interface Dealer {
  id: string;
  company_name?: string | null;
  status?: string | null;
  created_at?: string | null;
}

const money = (value: number) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-GB') : '—';

const DealerAdminAnalytics: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [signups, setSignups] = useState<AnalyticsSignup[]>([]);
  const [range, setRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    setLoading(true);
    const [salesResult, signupsResult, dealersResult] = await Promise.all([
      supabase.from('customers')
        .select('id, name, email, registration_plate, signup_date, created_at, final_amount, payment_status, status, plan_type, dealer_id')
        .eq('brand', 'pandaprotect').not('dealer_id', 'is', null).order('signup_date', { ascending: false }).limit(5000),
      supabase.from('trade_warranty_signups').select('id, status, created_at, dealer_id').order('created_at', { ascending: false }).limit(5000),
      supabase.from('dealers').select('id, company_name, status, created_at').order('company_name'),
    ]);
    const error = salesResult.error || signupsResult.error || dealersResult.error;
    if (error) {
      console.error('Sales analytics failed to load:', error);
      setLoadError(true);
      setLoading(false);
      return;
    }
    const dealerMap = new Map((dealersResult.data || []).map((dealer) => [dealer.id, dealer.company_name || 'Dealership']));
    setSales(((salesResult.data || []) as Sale[]).map((sale) => ({ ...sale, dealer_company: dealerMap.get(sale.dealer_id || '') || 'Unknown dealer' })));
    setSignups((signupsResult.data || []) as AnalyticsSignup[]);
    setLoadError(false);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const metrics = useMemo(() => buildSalesAnalytics(sales, signups, range), [sales, signups, range]);
  const monthly = useMemo(() => monthlySalesSeries(sales, signups), [sales, signups]);
  const leaderboard = useMemo(() => {
    const map = new Map<string, { dealer: string; sales: number; paidRevenue: number }>();
    metrics.issued.forEach((sale) => {
      const id = sale.dealer_id || 'unknown';
      const row = map.get(id) || { dealer: sale.dealer_company || 'Unknown dealer', sales: 0, paidRevenue: 0 };
      row.sales += 1;
      if ((sale.payment_status || '').toLowerCase() === 'paid') row.paidRevenue += dealerSaleAmount(sale);
      map.set(id, row);
    });
    return Array.from(map.values()).sort((a, b) => b.paidRevenue - a.paidRevenue || b.sales - a.sales).slice(0, 10);
  }, [metrics]);
  const planMix = useMemo(() => {
    const map = new Map<string, number>();
    metrics.issued.forEach((sale) => {
      const plan = displayWarrantyPlanName(sale.plan_type) || 'Warranty';
      map.set(plan, (map.get(plan) || 0) + 1);
    });
    return Array.from(map, ([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count);
  }, [metrics]);
  const signupStates = useMemo(() => ({
    approved: metrics.approvedSignups,
    awaiting: metrics.filteredSignups.filter((signup) => !['approved', 'rejected'].includes((signup.status || '').toLowerCase()) && !signup.dealer_id).length,
    rejected: metrics.filteredSignups.filter((signup) => (signup.status || '').toLowerCase() === 'rejected' && !signup.dealer_id).length,
  }), [metrics]);

  const cards = [
    { label: 'Customers', value: metrics.customers.toLocaleString(), detail: 'Unique customers in the selected period', icon: Users },
    { label: 'Dealer signups', value: metrics.signups.toLocaleString(), detail: `${metrics.approvedSignups} approved · ${metrics.signupConversion}% conversion`, icon: UserPlus },
    { label: 'Warranty sales', value: metrics.sales.toLocaleString(), detail: `${metrics.paidSales} paid · ${metrics.freeSales} introductory offer`, icon: ShoppingBag },
    { label: 'Paid revenue', value: money(metrics.paidRevenue), detail: `${money(metrics.averagePaidSale)} average paid sale`, icon: PoundSterling },
    { label: 'Outstanding invoices', value: metrics.outstandingInvoices.toLocaleString(), detail: `${money(metrics.outstandingBalance)} awaiting collection`, icon: FileText },
    { label: 'Pending card checkouts', value: metrics.pendingCheckouts.toLocaleString(), detail: 'Not counted as issued warranty sales', icon: BarChart3 },
  ];

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (loadError) return <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><p role="alert" className="text-destructive">Sales analytics could not be loaded.</p><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">Sales analytics</h1><Badge variant="secondary">Admin & Super Admin</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">Panda Protect customers, dealer signups, warranty sales and revenue.</p>
        </div>
        <DealerDateFilter value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <Card key={card.label} className="border-2"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">{card.label}</p><p className="mt-2 text-3xl font-bold">{card.value}</p><p className="mt-1 text-xs text-muted-foreground">{card.detail}</p></div><span className="rounded-lg bg-crm-orange-soft p-2 text-crm-orange"><card.icon className="h-5 w-5" /></span></div></CardContent></Card>)}
      </div>

      <Card className="border-2">
        <CardHeader><CardTitle className="text-lg">Sales, signups and paid revenue · last 12 months</CardTitle></CardHeader>
        <CardContent><div className="h-80" aria-label="Monthly sales analytics chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(value) => `£${value}`} /><Tooltip formatter={(value, name) => name === 'Paid revenue' ? [money(Number(value)), name] : [value, name]} /><Bar yAxisId="count" dataKey="sales" name="Warranty sales" fill="hsl(var(--crm-orange))" radius={[3, 3, 0, 0]} /><Bar yAxisId="count" dataKey="signups" name="Dealer signups" fill="hsl(var(--crm-blue))" radius={[3, 3, 0, 0]} /><Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Paid revenue" stroke="hsl(var(--crm-green))" strokeWidth={2} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer></div></CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserPlus className="h-5 w-5" />Signup pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[['Approved', signupStates.approved, 'bg-crm-green-soft text-crm-green-deep'], ['Awaiting decision', signupStates.awaiting, 'bg-crm-orange-soft text-crm-navy'], ['Rejected', signupStates.rejected, 'bg-muted text-muted-foreground']].map(([label, value, tone]) => <div key={String(label)} className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm font-medium">{label}</span><Badge className={String(tone)}>{Number(value)}</Badge></div>)}
            <p className="text-xs text-muted-foreground">Signup conversion is approved signups divided by all signups in the selected period.</p>
          </CardContent>
        </Card>

        <Card className="border-2 lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" />Dealer performance</CardTitle></CardHeader>
          <CardContent>{leaderboard.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-y bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Dealer</th><th className="px-3 py-2 text-right font-medium">Sales</th><th className="px-3 py-2 text-right font-medium">Paid revenue</th></tr></thead><tbody>{leaderboard.map((row) => <tr key={row.dealer} className="border-b"><td className="px-3 py-2 font-medium">{row.dealer}</td><td className="px-3 py-2 text-right">{row.sales}</td><td className="px-3 py-2 text-right font-semibold">{money(row.paidRevenue)}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">No issued sales in this period.</p>}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-2">
          <CardHeader><CardTitle className="text-lg">Plan mix</CardTitle></CardHeader>
          <CardContent className="space-y-3">{planMix.length ? planMix.map((row) => <div key={row.plan} className="flex items-center justify-between gap-3 rounded-lg border p-3"><span className="text-sm font-medium">{row.plan}</span><Badge variant="secondary">{row.count}</Badge></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No plans in this period.</p>}</CardContent>
        </Card>

        <Card className="border-2 lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5" />Recent issued sales</CardTitle></CardHeader>
          <CardContent>{metrics.issued.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-y bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Customer</th><th className="px-3 py-2 font-medium">Dealer</th><th className="px-3 py-2 font-medium">Plan</th><th className="px-3 py-2 text-right font-medium">Amount</th></tr></thead><tbody>{metrics.issued.slice(0, 8).map((sale) => <tr key={sale.id} className="border-b"><td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{date(sale.signup_date || sale.created_at)}</td><td className="px-3 py-2"><p className="font-medium">{sale.name || 'Customer'}</p><p className="break-all text-xs text-muted-foreground">{sale.email || 'No email'}</p></td><td className="px-3 py-2">{sale.dealer_company}</td><td className="px-3 py-2">{displayWarrantyPlanName(sale.plan_type)}</td><td className="px-3 py-2 text-right font-semibold">{money(dealerSaleAmount(sale))}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">No issued sales in this period.</p>}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DealerAdminAnalytics;
