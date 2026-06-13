import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Loader2, Search, Mail, Phone, RefreshCw, Download, X, Building2, Car as CarIcon, FileText,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

type Status = 'new' | 'contacted' | 'qualified' | 'closed';

interface Signup {
  id: string;
  dealership_name: string | null;
  contact_name: string | null;
  email_address: string;
  phone_number: string;
  monthly_vehicle_sales: string | null;
  current_warranty_provider: string | null;
  interested_in: string | null;
  heard_about_us: string | null;
  additional_information: string | null;

  status: Status;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 25;
const STATUS_OPTIONS: Status[] = ['new', 'contacted', 'qualified', 'closed'];
const statusColor: Record<Status, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  qualified: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-200 text-gray-700',
};

const DealerAdminSignUps: React.FC = () => {
  const [rows, setRows] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Signup | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trade_warranty_signups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) {
      toast.error(error.message);
    } else {
      setRows((data || []) as Signup[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Auto-open detail if ?id=... in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && rows.length) {
      const match = rows.find((r) => r.id === id);
      if (match) setSelected(match);
    }
  }, [searchParams, rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [
        r.dealership_name, r.contact_name, r.email_address, r.phone_number,
        r.monthly_vehicle_sales, r.current_warranty_provider, r.interested_in,
        r.heard_about_us, r.additional_information,
      ].some((v) => v?.toLowerCase().includes(q));

    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const updateStatus = async (id: string, status: Status) => {
    const prev = rows;
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status } : row)));
    if (selected?.id === id) setSelected({ ...selected, status });
    const { error } = await supabase
      .from('trade_warranty_signups')
      .update({ status })
      .eq('id', id);
    if (error) {
      toast.error(error.message);
      setRows(prev);
    } else {
      toast.success('Status updated');
    }
  };

  const exportCsv = () => {
    const headers = [
      'Submission Date', 'Dealership Name', 'Contact Name', 'Email Address', 'Phone Number',
      'Monthly Vehicle Sales', 'Current Warranty Provider', 'Interested In',
      'Where They Sell Vehicles', 'Additional Information', 'Status',
    ];
    const lines = filtered.map((r) =>
      [
        format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
        r.dealership_name, r.contact_name, r.email_address, r.phone_number,
        r.monthly_vehicle_sales, r.current_warranty_provider, r.interested_in,
        r.heard_about_us, r.additional_information, r.status,
      ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    );

    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-warranty-signups-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDetail = (row: Signup) => {
    setSelected(row);
    setSearchParams((p) => { p.set('id', row.id); return p; });
  };
  const closeDetail = () => {
    setSelected(null);
    setSearchParams((p) => { p.delete('id'); return p; });
  };

  const todayCount = rows.filter((r) => new Date(r.created_at).toDateString() === new Date().toDateString()).length;
  const last7 = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000).length;
  const newCount = rows.filter((r) => r.status === 'new').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Signups</h1>
          <p className="text-sm text-gray-600 mt-1">Trade Warranty interest registrations from the dealer portal.</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total signups" value={rows.length} />
        <StatCard label="New (unhandled)" value={newCount} />
        <StatCard label="Today" value={todayCount} />
        <StatCard label="Last 7 days" value={last7} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dealership, name, email, phone…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-gray-500 ml-auto">{filtered.length} result{filtered.length === 1 ? '' : 's'}</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading signups…
          </div>
        ) : pageRows.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No signups match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <Th>Submission Date</Th>
                  <Th>Dealership</Th>
                  <Th>Contact</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Monthly Sales</Th>
                  <Th>Current Provider</Th>
                  <Th>Interested In</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} onClick={() => openDetail(r)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <Td className="whitespace-nowrap text-gray-600">
                      {format(new Date(r.created_at), 'd MMM yyyy')}
                      <div className="text-xs text-gray-400">{format(new Date(r.created_at), 'HH:mm')}</div>
                    </Td>
                    <Td className="font-medium text-gray-900">{r.dealership_name || '—'}</Td>
                    <Td className="text-gray-700">{r.contact_name || '—'}</Td>
                    <Td>
                      <a href={`mailto:${r.email_address}`} onClick={(e) => e.stopPropagation()}
                        className="text-[#eb4b00] hover:underline">{r.email_address}</a>
                    </Td>
                    <Td>
                      <a href={`tel:${r.phone_number}`} onClick={(e) => e.stopPropagation()}
                        className="text-gray-700 hover:underline">{r.phone_number}</a>
                    </Td>
                    <Td className="text-gray-700">{r.monthly_vehicle_sales || '—'}</Td>
                    <Td className="text-gray-700">{r.current_warranty_provider || '—'}</Td>
                    <Td className="text-gray-700 capitalize">{r.interested_in?.replace('-', ' ') || '—'}</Td>
                    <Td>
                      <Badge className={`capitalize ${statusColor[r.status]}`}>{r.status}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && closeDetail()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#eb4b00]" />
                  {selected.dealership_name || 'Trade Warranty signup'}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                <div className="flex items-center gap-3">
                  <Badge className={`capitalize ${statusColor[selected.status]}`}>{selected.status}</Badge>
                  <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v as Status)}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DetailGrid>
                  <DetailRow label="Submission Date" value={format(new Date(selected.created_at), 'd MMM yyyy, HH:mm')} />
                  <DetailRow label="Dealership Name" value={selected.dealership_name} />
                  <DetailRow label="Contact Name" value={selected.contact_name} />
                  <DetailRow label="Email Address" value={selected.email_address}
                    href={`mailto:${selected.email_address}`} icon={Mail} />
                  <DetailRow label="Phone Number" value={selected.phone_number}
                    href={`tel:${selected.phone_number}`} icon={Phone} />
                  <DetailRow label="Monthly Vehicle Sales" value={selected.monthly_vehicle_sales} icon={CarIcon} />
                  <DetailRow label="Current Warranty Provider" value={selected.current_warranty_provider} />
                  <DetailRow label="Interested In" value={selected.interested_in?.replace('-', ' ')} />
                  <DetailRow label="How They Heard About Us" value={selected.heard_about_us} />

                </DetailGrid>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Additional Information
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap min-h-[60px]">
                    {selected.additional_information || <span className="text-gray-400">No additional information provided.</span>}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={closeDetail}>
                    <X className="w-4 h-4 mr-2" /> Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{children}</th>
);
const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-4 py-3 ${className}`}>{children}</td>
);
const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className="text-xs font-semibold tracking-wider uppercase text-gray-500">{label}</div>
    <div className="text-3xl font-black text-gray-900 mt-1">{value}</div>
  </div>
);
const DetailGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
);
const DetailRow: React.FC<{ label: string; value?: string | null; href?: string; icon?: React.ComponentType<any> }> =
  ({ label, value, href, icon: Icon }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label}
      </div>
      {value ? (
        href ? <a href={href} className="text-sm text-[#eb4b00] hover:underline break-all">{value}</a>
             : <div className="text-sm text-gray-900 capitalize break-words">{value}</div>
      ) : <div className="text-sm text-gray-400">—</div>}
    </div>
  );

export default DealerAdminSignUps;
