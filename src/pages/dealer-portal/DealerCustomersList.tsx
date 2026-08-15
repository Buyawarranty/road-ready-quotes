import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Input } from '@/components/ui/input';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { Search, Users } from 'lucide-react';

const DealerCustomersList = () => {
  const { dealer } = useDealerAuth();
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['dealer-customers-list', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data, error } = await supabase
        .from('dealer_customers')
        .select('*')
        .eq('dealer_id', dealer.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealer?.id,
  });

  const q = search.trim().toLowerCase();
  const filtered = customers.filter((c: any) =>
    !q ||
    `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.phone || c.mobile || '').toLowerCase().includes(q) ||
    (c.registration_plate || '').toLowerCase().includes(q)
  );

  return (
    <DealerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-orange-500" /> My customers
            </h1>
            <p className="text-sm text-gray-600 mt-1">Customers linked to your dealership only.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, reg..."
              className="pl-9 bg-gray-100"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Customer</th>
                  <th className="text-left font-semibold px-4 py-3">Contact</th>
                  <th className="text-left font-semibold px-4 py-3">Vehicle</th>
                  <th className="text-left font-semibold px-4 py-3">Plan</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading customers...</td></tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No customers yet.</td></tr>
                )}
                {filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{c.email || '—'}</div>
                      <div className="text-gray-500">{c.phone || c.mobile || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium">{c.registration_plate || '—'}</div>
                      <div className="text-gray-500">
                        {[c.vehicle_make, c.vehicle_model, c.vehicle_year].filter(Boolean).join(' ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.plan_type || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-700 px-2.5 py-0.5 text-xs font-semibold">
                        {c.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DealerLayout>
  );
};

export default DealerCustomersList;
