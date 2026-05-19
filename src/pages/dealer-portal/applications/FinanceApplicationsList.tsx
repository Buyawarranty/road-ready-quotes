import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  pre_screen: 'bg-sky-100 text-sky-700',
  underwriting: 'bg-amber-100 text-amber-700',
  referred: 'bg-orange-100 text-orange-700',
  approved: 'bg-emerald-100 text-emerald-700',
  docs_pending: 'bg-indigo-100 text-indigo-700',
  payout_pending: 'bg-purple-100 text-purple-700',
  paid: 'bg-emerald-200 text-emerald-800',
  completed: 'bg-emerald-300 text-emerald-900',
  declined: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-200 text-gray-700',
};

const FinanceApplicationsList: React.FC = () => {
  const { dealer } = useDealerAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['finance-applications', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data, error } = await (supabase as any)
        .from('finance_applications')
        .select('id, reference, status, customer, submitted_at, created_at, updated_at')
        .eq('dealer_id', dealer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealer?.id,
  });

  const filtered = apps.filter((a: any) => {
    const t = q.toLowerCase();
    if (!t) return true;
    return (
      a.reference?.toLowerCase().includes(t) ||
      a.status?.toLowerCase().includes(t) ||
      (a.customer?.first_name || '').toLowerCase().includes(t) ||
      (a.customer?.last_name || '').toLowerCase().includes(t)
    );
  });

  return (
    <DealerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance applications</h1>
            <p className="text-sm text-gray-600">Submit and track vehicle finance applications for your customers.</p>
          </div>
          <Button onClick={() => navigate('/dealer-portal/applications/new')} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="h-4 w-4 mr-2" /> New application
          </Button>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search by reference, customer or status" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Reference</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">No applications yet. Start a new one.</td></tr>
              )}
              {filtered.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{a.reference}</td>
                  <td className="px-4 py-3">{[a.customer?.first_name, a.customer?.last_name].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[a.status] || 'bg-gray-100'}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.submitted_at ? format(new Date(a.submitted_at), 'dd MMM yyyy') : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{format(new Date(a.updated_at), 'dd MMM yyyy HH:mm')}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/dealer-portal/applications/${a.id}`} className="text-orange-600 hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DealerLayout>
  );
};

export default FinanceApplicationsList;
