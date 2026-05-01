import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Facebook, Globe, PoundSterling } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type ChannelStat = { channel: string; deals: number; revenue: number };

const SOURCE_MAP: Record<string, string> = {
  google: 'Google Ads',
  gclid: 'Google Ads',
  facebook: 'Facebook',
  fbclid: 'Facebook',
  organic: 'Organic',
  direct: 'Direct',
  referral: 'Referral',
  email: 'Email',
};

const classify = (src: string | null | undefined): string => {
  if (!src) return 'Direct';
  const s = src.toLowerCase();
  for (const k of Object.keys(SOURCE_MAP)) if (s.includes(k)) return SOURCE_MAP[k];
  return 'Other';
};

export default function DealerAdminMarketingAnalytics() {
  const [stats, setStats] = useState<ChannelStat[]>([]);
  const [totals, setTotals] = useState({ deals: 0, revenue: 0, channels: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('customers')
        .select('final_amount, status, signup_date, lead_source, referral_source')
        .gte('signup_date', since)
        .not('status', 'in', '(cancelled,refunded)');

      const map = new Map<string, ChannelStat>();
      let totalRev = 0;
      let totalDeals = 0;
      (data || []).forEach((c: any) => {
        const ch = classify(c.lead_source || c.referral_source);
        const cur = map.get(ch) || { channel: ch, deals: 0, revenue: 0 };
        cur.deals += 1;
        cur.revenue += Number(c.final_amount || 0);
        map.set(ch, cur);
        totalRev += Number(c.final_amount || 0);
        totalDeals += 1;
      });
      const arr = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
      setStats(arr);
      setTotals({ deals: totalDeals, revenue: totalRev, channels: arr.length });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Marketing Analytics</h1>
        <p className="text-muted-foreground mt-1">Conversions and revenue by channel — last 30 days</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Deals</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totals.deals}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PoundSterling className="h-4 w-4" />Revenue</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">£{totals.revenue.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" />Active channels</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totals.channels}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="google"><Target className="h-4 w-4 mr-1" />Google Ads</TabsTrigger>
          <TabsTrigger value="facebook"><Facebook className="h-4 w-4 mr-1" />Facebook</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Revenue by channel</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">Loading…</div>
              ) : stats.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">No data in the selected window</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="channel" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => `£${Number(v).toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Channel breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.map(s => (
                  <div key={s.channel} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{s.channel}</Badge>
                      <span className="text-sm text-muted-foreground">{s.deals} deals</span>
                    </div>
                    <div className="font-semibold">£{s.revenue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="mt-4">
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Google Ads conversion tracking is wired in the main admin. Channel revenue above reflects attributed dealer customers.
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="facebook" className="mt-4">
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Facebook attribution uses fbclid/referrer matching. Channel revenue above reflects attributed dealer customers.
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
