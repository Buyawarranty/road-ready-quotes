import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Car, User as UserIcon, Gauge, Tag, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#a3a3a3', '#737373', '#525252', '#404040', '#262626'];

const DealerAnalytics: React.FC = () => {
  const { dealer } = useDealerAuth();

  const { data: warranties = [] } = useQuery({
    queryKey: ['dealer-analytics-warranties', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data } = await supabase
        .from('customers')
        .select('id, name, vehicle_make, vehicle_model, mileage, final_amount, signup_date, status')
        .eq('dealer_id', dealer.id)
        .order('signup_date', { ascending: false });
      return data || [];
    },
    enabled: !!dealer?.id,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['dealer-analytics-quotes', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data } = await supabase
        .from('dealer_quotes')
        .select('id, status, created_at')
        .eq('dealer_id', dealer.id);
      return data || [];
    },
    enabled: !!dealer?.id,
  });

  const lastActivated = warranties[0];

  const monthsTrend = useMemo(() => {
    const now = new Date();
    const months: { label: string; key: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      months.push({ key, label, count: 0 });
    }
    warranties.forEach((w: any) => {
      if (!w.signup_date) return;
      const d = new Date(w.signup_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.count++;
    });
    return months;
  }, [warranties]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return warranties.filter((w: any) => {
      if (!w.signup_date) return false;
      const d = new Date(w.signup_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [warranties]);

  const lastActivatedDays = useMemo(() => {
    if (!lastActivated?.signup_date) return null;
    const diff = Date.now() - new Date(lastActivated.signup_date).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [lastActivated]);

  const manufacturerData = useMemo(() => {
    const counts: Record<string, number> = {};
    warranties.forEach((w: any) => {
      const make = (w.vehicle_make || 'OTHER').toUpperCase();
      counts[make] = (counts[make] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8);
    const otherTotal = sorted.slice(8).reduce((acc, [, v]) => acc + v, 0);
    if (otherTotal > 0) top.push(['OTHER', otherTotal]);
    return top.map(([name, value]) => ({
      name,
      value,
      percent: ((value / total) * 100).toFixed(2),
    }));
  }, [warranties]);

  const uncompletedQuotes = quotes.filter((q: any) => q.status !== 'won' && q.status !== 'lost').length;

  return (
    <DealerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">DEALER ANALYTICS</h1>
          <p className="text-gray-500 text-sm mt-1">Performance overview of your dealer plans and quotes</p>
        </div>

        {/* Top row: Last activated + plans activated chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <h2 className="text-xs font-bold tracking-[0.2em] text-gray-400 mb-4">LAST DEALER PLAN ACTIVATED</h2>
              {lastActivated ? (
                <>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-6xl font-bold text-white leading-none">
                      {lastActivatedDays ?? 0}
                    </span>
                    <span className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">
                      {lastActivatedDays === 1 ? 'Day Ago' : 'Days Ago'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-orange-400">
                      <Car className="h-4 w-4" />
                      <span className="font-semibold uppercase">
                        {[lastActivated.vehicle_make, lastActivated.vehicle_model].filter(Boolean).join(' ') || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-orange-400">
                      <UserIcon className="h-4 w-4" />
                      <span className="font-semibold uppercase">{lastActivated.name}</span>
                    </div>
                    {lastActivated.mileage && (
                      <div className="flex items-center gap-2 text-orange-400">
                        <Gauge className="h-4 w-4" />
                        <span className="font-semibold">{lastActivated.mileage}</span>
                      </div>
                    )}
                    {lastActivated.final_amount && (
                      <div className="flex items-center gap-2 text-orange-400">
                        <Tag className="h-4 w-4" />
                        <span className="font-semibold">£{Number(lastActivated.final_amount).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">No dealer plans activated yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <h2 className="text-xs font-bold tracking-[0.2em] text-gray-400 mb-4">DEALER PLANS ACTIVATED</h2>
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="col-span-1 text-center">
                  <div className="text-6xl font-bold text-white leading-none">{thisMonthCount}</div>
                  <div className="text-[11px] font-bold tracking-[0.2em] text-gray-400 uppercase mt-2">
                    This Month
                  </div>
                </div>
                <div className="col-span-2 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthsTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dealerArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#9ca3af"
                        tick={{ fontSize: 10 }}
                        angle={-25}
                        textAnchor="end"
                        height={40}
                      />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 6 }}
                        labelStyle={{ color: '#f3f4f6' }}
                        itemStyle={{ color: '#fbbf24' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fill="url(#dealerArea)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row: Quotes created + manufacturers pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <h2 className="text-xs font-bold tracking-[0.2em] text-gray-400 mb-4">QUOTES CREATED</h2>
              <div className="flex items-baseline gap-4">
                <span className="text-6xl font-bold text-white leading-none">{quotes.length}</span>
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase max-w-[180px]">
                  Number of quotes created
                  <br />
                  <span className="text-gray-500 normal-case">({uncompletedQuotes} uncompleted)</span>
                </span>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="h-4 w-4" />
                Total quotes across all time
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <h2 className="text-xs font-bold tracking-[0.2em] text-gray-400 mb-4">MANUFACTURERS ON COVER</h2>
              {manufacturerData.length === 0 ? (
                <p className="text-gray-500 text-sm">No vehicles on cover yet.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={manufacturerData}
                        dataKey="value"
                        nameKey="name"
                        cx="40%"
                        cy="50%"
                        outerRadius={80}
                        label={(e: any) => `${e.name} (${e.percent}%)`}
                        labelLine={false}
                        style={{ fontSize: 10, fill: '#f3f4f6' }}
                      >
                        {manufacturerData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 6 }}
                        labelStyle={{ color: '#f3f4f6' }}
                      />
                      <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        wrapperStyle={{ fontSize: 11, color: '#d1d5db' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DealerLayout>
  );
};

export default DealerAnalytics;
