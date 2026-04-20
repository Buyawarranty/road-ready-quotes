import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, ShoppingBag, PoundSterling, AlertCircle, Loader2 } from 'lucide-react';

interface Stats {
  totalDealers: number;
  totalSales: number;
  totalRevenue: number;
  unpaidInvoiceTotal: number;
  unpaidCount: number;
}

const DealerAdminOverview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalDealers: 0,
    totalSales: 0,
    totalRevenue: 0,
    unpaidInvoiceTotal: 0,
    unpaidCount: 0,
  });

  useEffect(() => {
    const load = async () => {
      const { count: dealerCount } = await supabase
        .from('dealers')
        .select('*', { count: 'exact', head: true });

      const { data: sales } = await supabase
        .from('customers')
        .select('id, payment_status, final_amount, total_amount_paid, signup_date')
        .not('dealer_id', 'is', null);

      const rows = sales || [];
      const totalRevenue = rows.reduce(
        (sum, r: any) => sum + Number(r.total_amount_paid ?? r.final_amount ?? 0),
        0
      );
      const unpaid = rows.filter(
        (r: any) => (r.payment_status || '').toLowerCase() !== 'paid'
      );
      const unpaidInvoiceTotal = unpaid.reduce(
        (sum, r: any) => sum + Number(r.final_amount ?? 0),
        0
      );

      setStats({
        totalDealers: dealerCount || 0,
        totalSales: rows.length,
        totalRevenue,
        unpaidInvoiceTotal,
        unpaidCount: unpaid.length,
      });
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { label: 'Active dealers', value: stats.totalDealers, icon: Users, color: 'text-blue-600' },
    { label: 'Total dealer sales', value: stats.totalSales, icon: ShoppingBag, color: 'text-green-600' },
    {
      label: 'Total revenue',
      value: `£${stats.totalRevenue.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`,
      icon: PoundSterling,
      color: 'text-emerald-600',
    },
    {
      label: `Unpaid invoices (${stats.unpaidCount})`,
      value: `£${stats.unpaidInvoiceTotal.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`,
      icon: AlertCircle,
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Dealer channel performance at a glance.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label} className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{c.label}</p>
                  <c.icon className={`h-5 w-5 ${c.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealerAdminOverview;
