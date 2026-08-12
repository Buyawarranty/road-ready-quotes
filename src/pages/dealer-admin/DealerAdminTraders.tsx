import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, Search, RefreshCw, Download, Mail, Phone, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface TraderRow {
  id: string;
  name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  created_at: string;
  approved_at?: string | null;
}

const DealerAdminTraders: React.FC = () => {
  const [rows, setRows] = useState<TraderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: dealers, error }, { data: signups }] = await Promise.all([
      supabase.from('dealers').select('*').order('created_at', { ascending: false }).limit(2000),
      supabase
        .from('trade_warranty_signups')
        .select('dealer_id, approved_at')
        .not('dealer_id', 'is', null)
        .limit(2000),
    ]);
    if (error) toast.error(error.message);
    const approvedMap = new Map<string, string | null>();
    (signups || []).forEach((s: any) => approvedMap.set(s.dealer_id, s.approved_at));
    setRows(
      (dealers || []).map((d: any) => ({
        ...d,
        approved_at: approvedMap.get(d.id) ?? null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.company_name, r.email, r.phone].some((v) => v?.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const exportCsv = () => {
    const headers = ['Company', 'Contact', 'Email', 'Phone', 'Status', 'Approved', 'Joined'];
    const lines = filtered.map((r) =>
      [
        r.company_name, r.name, r.email, r.phone, r.status,
        r.approved_at ? format(new Date(r.approved_at), 'yyyy-MM-dd') : '',
        format(new Date(r.created_at), 'yyyy-MM-dd'),
      ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Traders</h1>
          <p className="text-sm text-gray-500">Dealers who have joined Panda Protect Trade.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total traders</div>
          <div className="text-3xl font-black text-gray-900 mt-1">{rows.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active</div>
          <div className="text-3xl font-black text-gray-900 mt-1">
            {rows.filter((r) => (r.status || 'active') === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">From approvals</div>
          <div className="text-3xl font-black text-gray-900 mt-1">
            {rows.filter((r) => r.approved_at).length}
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search traders…"
          className="pl-9"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No traders yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Company</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {r.company_name || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.name || '—'}</td>
                  <td className="px-4 py-3">
                    {r.email ? (
                      <a href={`mailto:${r.email}`} className="text-[#eb4b00] hover:underline inline-flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />{r.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.phone ? (
                      <a href={`tel:${r.phone}`} className="text-[#eb4b00] hover:underline inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />{r.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={(r.status || 'active') === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-200 text-gray-700'}>
                      {r.status || 'active'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {format(new Date(r.approved_at || r.created_at), 'd MMM yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DealerAdminTraders;
