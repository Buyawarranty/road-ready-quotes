import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Mail, Phone, Car, Building2, RefreshCw, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface SignUp {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  registration_plate: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
}

const DealerAdminSignUps: React.FC = () => {
  const [rows, setRows] = useState<SignUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dealer_leads')
      .select('id, first_name, last_name, email, phone, registration_plate, notes, status, created_at')
      .eq('source', 'coming_soon_waitlist')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (!error && data) setRows(data as SignUp[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.first_name, r.last_name, r.email, r.phone, r.registration_plate, r.notes]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const exportCsv = () => {
    const headers = ['Date', 'First name', 'Last name', 'Email', 'Phone', 'Dealership', 'Reg', 'Status'];
    const lines = filtered.map((r) => [
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      r.first_name || '',
      r.last_name || '',
      r.email,
      r.phone || '',
      (r.notes || '').replace(/^Dealership:\s*/i, '').replace(/\n/g, ' '),
      r.registration_plate || '',
      r.status || '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealer-signups-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayCount = rows.filter((r) => {
    const d = new Date(r.created_at);
    const t = new Date();
    return d.toDateString() === t.toDateString();
  }).length;
  const last7 = rows.filter((r) => {
    return Date.now() - new Date(r.created_at).getTime() < 7 * 24 * 3600 * 1000;
  }).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sign-Ups</h1>
          <p className="text-sm text-gray-600 mt-1">
            Dealer waitlist submissions from <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/dealer-portal/signup</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total sign-ups" value={rows.length} />
        <StatCard label="Today" value={todayCount} />
        <StatCard label="Last 7 days" value={last7} />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, reg…"
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading sign-ups…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No sign-ups yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Dealership</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Reg</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const dealership = r.notes?.replace(/^Dealership:\s*/i, '') || '';
                  return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {format(new Date(r.created_at), 'd MMM yyyy')}
                        <div className="text-xs text-gray-400">{format(new Date(r.created_at), 'HH:mm')}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 text-[#eb4b00] hover:underline">
                          <Mail className="w-3.5 h-3.5" /> {r.email}
                        </a>
                        {r.phone && (
                          <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-xs mt-0.5">
                            <Phone className="w-3 h-3" /> {r.phone}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {dealership ? (
                          <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-gray-400" /> {dealership}</span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.registration_plate ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-yellow-100 text-yellow-900 font-mono text-xs font-bold">
                            <Car className="w-3 h-3" /> {r.registration_plate}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="capitalize">{r.status || 'new'}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className="text-xs font-semibold tracking-wider uppercase text-gray-500">{label}</div>
    <div className="text-3xl font-black text-gray-900 mt-1">{value}</div>
  </div>
);

export default DealerAdminSignUps;
