import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const DealerAdminFinancePayouts: React.FC = () => {
  const { data: payouts = [] } = useQuery({
    queryKey: ['finance-payouts'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('payouts').select('*, dealers:dealer_id(company_name, name)').order('created_at', { ascending: false }).limit(500);
      return data || [];
    },
  });
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Payouts</h1><p className="text-sm text-muted-foreground">Commission and remittance schedule.</p></div>
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase"><tr>
            <th className="text-left px-4 py-3">Dealer</th><th className="text-left px-4 py-3">Period</th>
            <th className="text-left px-4 py-3">Amount</th><th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Paid</th>
          </tr></thead>
          <tbody className="divide-y">
            {payouts.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No payouts yet.</td></tr>}
            {payouts.map((p: any) => (
              <tr key={p.id}>
                <td className="px-4 py-3">{p.dealers?.company_name || p.dealers?.name}</td>
                <td className="px-4 py-3">{p.period}</td>
                <td className="px-4 py-3">£{Number(p.amount).toFixed(2)}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.paid_at ? format(new Date(p.paid_at), 'dd MMM yyyy') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default DealerAdminFinancePayouts;
