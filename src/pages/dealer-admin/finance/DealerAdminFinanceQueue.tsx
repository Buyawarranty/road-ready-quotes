import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
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

const DealerAdminFinanceQueue: React.FC = () => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['admin-finance', status],
    queryFn: async () => {
      let query = (supabase as any)
        .from('finance_applications')
        .select('id, reference, status, customer, submitted_at, created_at, updated_at, dealer_id, dealers:dealer_id(name, company_name)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = apps.filter((a: any) => {
    const t = q.toLowerCase();
    if (!t) return true;
    return (
      a.reference?.toLowerCase().includes(t) ||
      (a.customer?.first_name || '').toLowerCase().includes(t) ||
      (a.customer?.last_name || '').toLowerCase().includes(t) ||
      (a.dealers?.company_name || '').toLowerCase().includes(t)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance applications</h1>
        <p className="text-sm text-muted-foreground">Underwriting queue across the dealer network.</p>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Search reference, customer, dealer…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 text-sm">
          <option value="">All statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Reference</th>
              <th className="text-left px-4 py-3">Dealer</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Submitted</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No applications.</td></tr>}
            {filtered.map((a: any) => (
              <tr key={a.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{a.reference}</td>
                <td className="px-4 py-3">{a.dealers?.company_name || a.dealers?.name || '—'}</td>
                <td className="px-4 py-3">{[a.customer?.first_name, a.customer?.last_name].filter(Boolean).join(' ') || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[a.status]}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.submitted_at ? format(new Date(a.submitted_at), 'dd MMM yyyy HH:mm') : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/dealer-admin/finance/${a.id}`} className="text-primary hover:underline">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DealerAdminFinanceQueue;
