import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Sale {
  signup_date: string;
  final_amount: number | null;
  total_amount_paid: number | null;
  plan_type: string;
  payment_status: string | null;
  dealer_id: string;
  dealer_company?: string;
}

const COLORS = ['hsl(var(--primary))', '#0BA360', '#FF6B00', '#3B82F6', '#A855F7', '#F59E0B'];

const DealerAdminAnalytics: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: customers }, { data: dealers }] = await Promise.all([
        supabase
          .from('customers')
          .select('signup_date, final_amount, total_amount_paid, plan_type, payment_status, dealer_id, status')
          .not('dealer_id', 'is', null),
        supabase.from('dealers').select('id, company_name'),
      ]);
      const dealerMap = new Map((dealers || []).map((d: any) => [d.id, d.company_name]));
      const filtered = (customers || [])
        .filter((c: any) => !['cancelled', 'refunded'].includes((c.status || '').toLowerCase()))
        .map((c: any) => ({ ...c, dealer_company: dealerMap.get(c.dealer_id) || 'Unknown' }));
      setSales(filtered);
      setLoading(false);
    };
    load();
  }, []);

  // Monthly revenue (last 12 months)
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, { month: string; revenue: number; count: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      buckets[key] = {
        month: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        revenue: 0,
        count: 0,
      };
    }
    sales.forEach((s) => {
      const d = new Date(s.signup_date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) {
        buckets[key].revenue += Number(s.total_amount_paid ?? s.final_amount ?? 0);
        buckets[key].count += 1;
      }
    });
    return Object.values(buckets);
  }, [sales]);

  // Top dealers by revenue
  const topDealers = useMemo(() => {
    const m = new Map<string, { name: string; revenue: number; count: number }>();
    sales.forEach((s) => {
      const e = m.get(s.dealer_id) || { name: s.dealer_company || '—', revenue: 0, count: 0 };
      e.revenue += Number(s.total_amount_paid ?? s.final_amount ?? 0);
      e.count += 1;
      m.set(s.dealer_id, e);
    });
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [sales]);

  // Plan mix
  const planMix = useMemo(() => {
    const m = new Map<string, number>();
    sales.forEach((s) => {
      const k = (s.plan_type || 'unknown').toLowerCase();
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [sales]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Dealer channel performance trends.</p>
      </div>

      <Card className="border-2">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly revenue (last 12 months)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v}`} />
                <Tooltip formatter={(v: any) => [`£${Number(v).toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 dealers by revenue</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDealers} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: any) => [`£${Number(v).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#0BA360" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Plan mix</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planMix} dataKey="value" nameKey="name" outerRadius={90} label>
                    {planMix.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Sales count per month</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#FF6B00" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerAdminAnalytics;
