import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { DealerStatsCards } from '@/components/dealer/DealerStatsCards';
import { DealerRecentQuotes } from '@/components/dealer/DealerRecentQuotes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import {
  FilePlus,
  FileText,
  Shield,
  Sparkles,
  Search,
  ArrowRight,
  Car,
} from 'lucide-react';

const DealerDashboard = () => {
  const { dealer } = useDealerAuth();
  const navigate = useNavigate();
  const [reg, setReg] = useState('');

  const { data: quotes = [] } = useQuery({
    queryKey: ['dealer-quotes', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data } = await supabase
        .from('dealer_quotes')
        .select('*')
        .eq('dealer_id', dealer.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!dealer?.id,
  });

  const { data: dealerOrders = [] } = useQuery({
    queryKey: ['dealer-orders', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data } = await supabase
        .from('customers')
        .select('id, name, email, registration_plate, plan_type, payment_type, final_amount, payment_status, status, signup_date, policy_end_date')
        .eq('dealer_id', dealer.id)
        .order('signup_date', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!dealer?.id,
  });

  const totalQuotes = quotes.length;
  const activeWarranties = dealerOrders.filter((o: any) => o.status === 'active').length;
  const totalOrders = dealerOrders.length;
  const conversionRate = totalQuotes > 0 ? (totalOrders / totalQuotes) * 100 : 0;

  const handleRegSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = reg.trim().toUpperCase();
    if (!cleaned) return;
    navigate(`/dealer-portal/quote/vehicle?reg=${encodeURIComponent(cleaned)}`);
  };

  const quickActions = [
    {
      label: 'Start full quote',
      desc: 'Guided vehicle, customer & checkout flow',
      icon: Sparkles,
      onClick: () => navigate('/dealer-portal/quote/vehicle'),
      tone: 'primary' as const,
    },
    {
      label: 'Quick quote',
      desc: 'Fast price without saving a customer',
      icon: FilePlus,
      onClick: () => navigate('/dealer-portal/quotes/create'),
    },
    {
      label: 'View quotes',
      desc: 'All saved & sent dealer quotes',
      icon: FileText,
      onClick: () => navigate('/dealer-portal/quotes'),
    },
    {
      label: 'View warranties',
      desc: 'Active dealer-issued policies',
      icon: Shield,
      onClick: () => navigate('/dealer-portal/warranties'),
    },
  ];

  return (
    <DealerLayout>
      <div className="space-y-6">
        {/* Hero / Reg lookup */}
        <Card className="bg-gradient-to-br from-yellow-300 via-yellow-200 to-orange-200 border border-orange-200 overflow-hidden">
          <CardContent className="p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <p className="text-xs font-bold tracking-[0.2em] text-orange-600">
                  DEALER DASHBOARD
                </p>
                <h1 className="text-2xl lg:text-3xl font-bold leading-tight text-gray-900">
                  Welcome back{dealer?.name ? `, ${dealer.name.split(' ')[0]}` : ''}
                </h1>
                <p className="text-sm text-gray-700">
                  {dealer?.company_name || 'Issue a warranty in under 60 seconds — start with a registration.'}
                </p>
              </div>

              <form
                onSubmit={handleRegSubmit}
                className="flex flex-col sm:flex-row items-stretch gap-2 w-full lg:w-auto lg:min-w-[420px]"
              >
                <div className="relative flex-1">
                  <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
                  <Input
                    value={reg}
                    onChange={(e) => setReg(e.target.value.toUpperCase())}
                    placeholder="ENTER REG"
                    aria-label="Vehicle registration"
                    className="h-12 pl-10 bg-white border-2 border-orange-300 text-gray-900 placeholder:text-gray-500 font-bold tracking-widest text-lg uppercase focus-visible:ring-orange-400"
                    maxLength={10}
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold tracking-wide px-6"
                >
                  Get quote <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <DealerStatsCards
          totalQuotes={totalQuotes}
          activeWarranties={activeWarranties}
          conversionRate={conversionRate}
        />

        {/* Quick actions grid */}
        <div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Quick actions</h2>
              <p className="text-xs text-gray-500">Pick the flow that fits the customer in front of you.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              const isPrimary = a.tone === 'primary';
              return (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className={`group text-left rounded-xl p-4 border transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    isPrimary
                      ? 'bg-orange-500 border-orange-500 hover:bg-orange-600'
                      : 'bg-white border-gray-200 hover:border-orange-400'
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${
                      isPrimary ? 'bg-gray-900/10 text-gray-900' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className={`font-bold text-sm ${isPrimary ? 'text-gray-900' : 'text-gray-900'}`}>
                    {a.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${isPrimary ? 'text-gray-900/80' : 'text-gray-500'}`}>
                    {a.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent dealer orders */}
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Recent dealer orders</h2>
                <p className="text-xs text-gray-500">Latest warranties issued under your account.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dealer-portal/warranties')}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              >
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            {dealerOrders.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
                <Shield className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600 text-sm font-medium">No dealer orders yet</p>
                <p className="text-gray-400 text-xs mb-4">Enter a reg above to issue your first warranty.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                      <th className="text-left py-2 font-medium">Customer</th>
                      <th className="text-left py-2 font-medium">Vehicle</th>
                      <th className="text-left py-2 font-medium">Plan</th>
                      <th className="text-right py-2 font-medium">Amount</th>
                      <th className="text-left py-2 font-medium pl-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealerOrders.slice(0, 8).map((o: any) => (
                      <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 text-gray-900">{o.name}</td>
                        <td className="py-3 text-gray-700 font-mono text-xs">{o.registration_plate}</td>
                        <td className="py-3 text-gray-700 capitalize">{o.plan_type} · {o.payment_type}mo</td>
                        <td className="py-3 text-right text-gray-900 font-semibold">£{Number(o.final_amount || 0).toFixed(2)}</td>
                        <td className="py-3 pl-4">
                          {o.payment_status === 'invoice_pending' ? (
                            <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100">Awaiting invoice</Badge>
                          ) : o.status === 'active' ? (
                            <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-100">{o.status || 'Pending'}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <DealerRecentQuotes quotes={quotes as any[]} />
      </div>
    </DealerLayout>
  );
};

export default DealerDashboard;
