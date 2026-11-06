import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Loader2, Search, Mail, Phone, RefreshCw, Download, X, Building2, Car as CarIcon, FileText, Check, Ban,
  StickyNote, Pin, Trash2, Plus, Eye,
} from 'lucide-react';
import { useDealerImpersonation } from '@/hooks/useDealerImpersonation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { fireDealerConfetti } from '@/lib/dealerConfetti';
import { AddDealerDialog } from '@/components/admin/AddDealerDialog';

type Status = 'new' | 'pending' | 'needs_info' | 'contacted' | 'qualified' | 'closed' | 'approved' | 'rejected';

interface Signup {
  id: string;
  dealer_id?: string | null;
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
  town?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface NoteIndexRow {
  id: string;
  signup_id: string;
  note_text: string;
  created_at: string;
}

interface SignupNote {
  id: string;
  signup_id: string;
  note_text: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  author: string;
}

const PAGE_SIZE = 25;
const STATUS_OPTIONS: Status[] = ['new', 'pending', 'needs_info', 'contacted', 'qualified', 'closed', 'approved', 'rejected'];
const statusColor: Record<Status, string> = {
  new: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  needs_info: 'bg-orange-100 text-orange-800',
  contacted: 'bg-amber-100 text-amber-800',
  qualified: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-200 text-gray-700',
  approved: 'bg-green-600 text-white',
  rejected: 'bg-red-100 text-red-800',
};

const STATUS_LABEL: Record<string, string> = { needs_info: 'Needs more info' };

const DealerAdminSignUps: React.FC = () => {
  const [rows, setRows] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Signup | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [rowResending, setRowResending] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [noteIndex, setNoteIndex] = useState<NoteIndexRow[]>([]);
  const [notes, setNotes] = useState<SignupNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const navigate = useNavigate();
  const { startImpersonation } = useDealerImpersonation();

  const viewAsDealer = (signup: Signup) => {
    if (!signup.dealer_id) return;
    startImpersonation(
      signup.dealer_id,
      signup.dealership_name || signup.contact_name || 'Dealer',
      signup.email_address,
    );
    toast.success(`Now viewing the dealer portal as ${signup.dealership_name || signup.contact_name || 'this dealer'}`, {
      description: 'Your admin session stays active. Use the banner to exit.',
    });
    navigate('/dealer-portal/dashboard');
  };

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

    const { data: noteRows } = await supabase
      .from('trade_warranty_signup_notes')
      .select('id, signup_id, note_text, created_at')
      .order('created_at', { ascending: true });
    setNoteIndex((noteRows || []) as NoteIndexRow[]);
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

  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    noteIndex.forEach((n) => { counts[n.signup_id] = (counts[n.signup_id] || 0) + 1; });
    return counts;
  }, [noteIndex]);

  const notesForExport = useMemo(() => {
    const map: Record<string, string> = {};
    noteIndex.forEach((n) => {
      map[n.signup_id] = map[n.signup_id] ? `${map[n.signup_id]} | ${n.note_text}` : n.note_text;
    });
    return map;
  }, [noteIndex]);

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

  const fetchNotes = async (signupId: string) => {
    setNotesLoading(true);
    const { data, error } = await supabase
      .from('trade_warranty_signup_notes')
      .select('*')
      .eq('signup_id', signupId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message);
      setNotes([]);
      setNotesLoading(false);
      return;
    }
    const rowsData = (data || []) as Omit<SignupNote, 'author'>[];
    const ids = Array.from(new Set(rowsData.map((r) => r.created_by)));
    const names: Record<string, string> = {};
    if (ids.length) {
      const { data: admins } = await supabase
        .from('admin_users')
        .select('user_id, first_name, last_name, email')
        .in('user_id', ids);
      (admins || []).forEach((a) => {
        names[a.user_id] = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email;
      });
    }
    setNotes(rowsData.map((r) => ({ ...r, author: names[r.created_by] || 'Staff' })));
    setNotesLoading(false);
  };

  useEffect(() => {
    setNotes([]);
    setNoteDraft('');
    if (selected?.id) fetchNotes(selected.id);
  }, [selected?.id]);

  const addNote = async () => {
    if (!selected || !noteDraft.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in again to add a note');
      return;
    }
    setSavingNote(true);
    const { data: inserted, error } = await supabase
      .from('trade_warranty_signup_notes')
      .insert({
        signup_id: selected.id,
        note_text: noteDraft.trim(),
        created_by: user.id,
      })
      .select('id, signup_id, note_text, created_at')
      .single();
    if (error) {
      toast.error(error.message);
    } else {
      setNoteDraft('');
      await fetchNotes(selected.id);
      if (inserted) setNoteIndex((idx) => [...idx, inserted as NoteIndexRow]);
      toast.success('Note saved — also added to the dealer contact list history');
    }
    setSavingNote(false);
  };

  const togglePin = async (note: SignupNote) => {
    const { error } = await supabase
      .from('trade_warranty_signup_notes')
      .update({ is_pinned: !note.is_pinned })
      .eq('id', note.id);
    if (error) toast.error(error.message);
    else fetchNotes(note.signup_id);
  };

  const removeNote = async (noteId: string) => {
    if (!window.confirm('Delete this note?')) return;
    const { error } = await supabase
      .from('trade_warranty_signup_notes')
      .delete()
      .eq('id', noteId);
    if (error) toast.error(error.message);
    else {
      setNoteIndex((idx) => idx.filter((n) => n.id !== noteId));
      if (selected) fetchNotes(selected.id);
      toast.success('Note deleted');
    }
  };

  const [towns, setTowns] = useState<string[]>([]);
  const [newTown, setNewTown] = useState('');
  const [savingTown, setSavingTown] = useState(false);
  useEffect(() => {
    (supabase.rpc as any)('bdm_town_list').then(({ data }: any) => {
      setTowns(Array.from(new Set(((data || []) as { town: string }[]).map((t) => t.town).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b)));
    });
  }, []);
  useEffect(() => { setNewTown(''); }, [selected?.id]);

  const saveTown = async (town: string) => {
    if (!selected) return;
    const value = town.trim().replace(/\s+/g, ' ');
    if (!value) return;
    setSavingTown(true);
    const { error } = await supabase.from('trade_warranty_signups')
      .update({ town: value } as any).eq('id', selected.id);
    setSavingTown(false);
    if (error) { toast.error(error.message); return; }
    setSelected({ ...selected, town: value });
    setRows((rs) => rs.map((r) => (r.id === selected.id ? { ...r, town: value } : r)));
    if (!towns.includes(value)) setTowns((t) => [...t, value].sort((a, b) => a.localeCompare(b)));
    setNewTown('');
    toast.success(`Town set to ${value} — the dealer contact list is updated too`);
  };

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

  const decide = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    setDeciding(decision);
    try {
      const { data, error } = await supabase.functions.invoke('dealer-signup-decision', {
        body: { signup_id: selected.id, decision, notes: decisionNotes.trim() || null },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const newStatus: Status = decision === 'approve' ? 'approved' : 'rejected';
      const stamp = new Date().toISOString();
      const patch: any = decision === 'approve'
        ? { status: newStatus, approved_at: stamp, rejected_at: null }
        : { status: newStatus, rejected_at: stamp, approved_at: null };
      setRows((r) => r.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)));
      setSelected({ ...selected, ...patch });
      setDecisionNotes('');
      if (decision === 'approve') fireDealerConfetti(0.4);
      if (decision === 'approve' && (data as any)?.email_sent === false) {
        toast.error(`Approved, but the login email was NOT sent: ${(data as any)?.email_error}. Use Resend login once fixed.`, { duration: 15000 });
      } else toast.success(
        decision === 'approve'
          ? 'Approved — login details emailed to the trader.'
          : 'Declined — notification email sent.'
      );
    } catch (e: any) {
      toast.error(e?.message || 'Could not complete this action');
    } finally {
      setDeciding(null);
    }
  };

  const resendCredentials = async () => {
    if (!selected) return;
    const alt = resendEmail.trim().toLowerCase();
    if (alt && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alt)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('dealer-signup-decision', {
        body: {
          signup_id: selected.id,
          decision: 'resend',
          notes: decisionNotes.trim() || null,
          alternate_email: alt || null,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.email_sent === false) throw new Error(`Login email NOT sent: ${(data as any)?.email_error}`);
      toast.success(`Login details sent to ${(data as any)?.sent_to || alt || selected.email_address}`);
      setResendEmail('');
    } catch (e: any) {
      toast.error(e?.message || 'Could not send login details');
    } finally {
      setResending(false);
    }
  };

  const resendForRow = async (row: Signup) => {
    setRowResending(row.id);
    try {
      const { data, error } = await supabase.functions.invoke('dealer-signup-decision', {
        body: { signup_id: row.id, decision: 'resend' },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.email_sent === false) throw new Error(`Login email NOT sent: ${(data as any)?.email_error}`);
      toast.success(`Login details sent to ${(data as any)?.sent_to || row.email_address}`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not send login details');
    } finally {
      setRowResending(null);
    }
  };

  const exportCsv = () => {
    const headers = [
      'Submission Date', 'Dealership Name', 'Contact Name', 'Email Address', 'Phone Number',
      'Monthly Vehicle Sales', 'Current Warranty Provider', 'Interested In',
      'Where They Sell Vehicles', 'Additional Information', 'Status', 'Notes',
    ];
    const lines = filtered.map((r) =>
      [
        format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
        r.dealership_name, r.contact_name, r.email_address, r.phone_number,
        r.monthly_vehicle_sales, r.current_warranty_provider, r.interested_in,
        r.heard_about_us, r.additional_information, r.status, notesForExport[r.id] || '',
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
    setNotes([]);
    setNoteDraft('');
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
          <AddDealerDialog label="Add trader" size="sm" onCreated={load} />
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
              <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
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
                  <Th>Action</Th>
                  <Th>Signed Up</Th>
                  <Th>Approved</Th>
                  <Th>Dealership</Th>
                  <Th>Contact</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Monthly Sales</Th>
                  <Th>Current Provider</Th>
                  <Th>Interested In</Th>
                  <Th>Notes</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} onClick={() => openDetail(r)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <Td className="whitespace-nowrap">
                      {(r.approved_at || r.status === 'approved') ? (
                        <span className="inline-flex items-center gap-2">
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); openDetail(r); }}
                            className="bg-green-600 hover:bg-green-700 text-white">
                            <Check className="w-4 h-4 mr-1" />
                            Approved
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={(e) => { e.stopPropagation(); resendForRow(r); }}
                            disabled={rowResending === r.id}>
                            {rowResending === r.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Mail className="w-4 h-4 mr-1" />}
                            Resend login
                          </Button>
                        </span>
                      ) : (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); openDetail(r); }}
                          className="bg-[#eb4b00] hover:bg-[#c93f00] text-white">
                          Approve
                        </Button>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-600">
                      {format(new Date(r.created_at), 'd MMM yyyy')}
                      <div className="text-xs text-gray-400">{format(new Date(r.created_at), 'HH:mm')}</div>
                    </Td>
                    <Td className="whitespace-nowrap text-gray-600">
                      {r.approved_at ? format(new Date(r.approved_at), 'd MMM yyyy')
                        : r.rejected_at ? <span className="text-red-600">Declined {format(new Date(r.rejected_at), 'd MMM')}</span>
                        : <span className="text-gray-400">Not yet</span>}
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
                      {noteCounts[r.id] ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                          <StickyNote className="w-3 h-3" /> {noteCounts[r.id]}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </Td>
                    <Td>
                      <Badge className={`capitalize ${statusColor[r.status]}`}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
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
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Decision
                  </div>
                  <textarea
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Optional message included in the email to the trader…"
                    className="w-full rounded-md border border-gray-300 bg-white p-3 text-sm min-h-[70px]"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(selected.approved_at || selected.status === 'approved') ? (
                      <Button
                        disabled
                        className="bg-green-600 text-white opacity-100 cursor-default"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approved
                      </Button>
                    ) : (
                      <Button
                        onClick={() => decide('approve')}
                        disabled={deciding !== null}
                        className="bg-[#eb4b00] hover:bg-[#c93f00] text-white"
                      >
                        {deciding === 'approve'
                          ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          : <Mail className="w-4 h-4 mr-2" />}
                        Approve & send login details
                      </Button>
                    )}
                    {!(selected.approved_at || selected.status === 'approved') && (
                      selected.rejected_at || selected.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">
                          <Ban className="w-4 h-4" /> Declined
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => decide('reject')}
                          disabled={deciding !== null}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          {deciding === 'reject'
                            ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            : <Ban className="w-4 h-4 mr-2" />}
                          Decline
                        </Button>
                      )
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Approving creates the trader's dealer portal account and emails their login details.
                    Declining emails them a polite note inviting them to apply again.
                  </p>
                  {selected.dealer_id && (
                    <div className="border-t border-gray-200 pt-3">
                      <Button
                        variant="outline"
                        onClick={() => viewAsDealer(selected)}
                        className="w-full border-[#eb4b00]/40 text-[#eb4b00] hover:bg-orange-50"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View dealer portal as this trader
                      </Button>
                      <p className="mt-1.5 text-xs text-gray-500">
                        Opens their dealer portal exactly as they see it. Your admin login stays active and you can exit at any time.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Town or city</div>
                  <Select value={selected.town || ''} onValueChange={(v) => saveTown(v)} disabled={savingTown}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choose a town" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(selected.town && !towns.includes(selected.town) ? [selected.town, ...towns] : towns).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input value={newTown} onChange={(e) => setNewTown(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTown(newTown); } }}
                      placeholder="Or add a new town…" className="h-9 text-sm" disabled={savingTown} />
                    <Button size="sm" variant="outline" onClick={() => saveTown(newTown)} disabled={savingTown || !newTown.trim()}>
                      {savingTown ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}Add
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Puts this dealership under that town in the dealer contact list.</p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5" /> Notes
                    {notes.length > 0 && (
                      <span className="font-normal normal-case tracking-normal text-gray-400">({notes.length})</span>
                    )}
                  </div>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add a private note about this dealer…"
                    className="w-full rounded-md border border-gray-300 bg-white p-3 text-sm min-h-[70px]"
                    disabled={savingNote}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={addNote} disabled={savingNote || !noteDraft.trim()}>
                      {savingNote
                        ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        : <Plus className="w-4 h-4 mr-2" />}
                      Add note
                    </Button>
                  </div>
                  {notesLoading ? (
                    <div className="py-3 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-gray-400">No notes yet. Notes are also saved to this dealership's history in the dealer contact list.</p>
                  ) : (
                    <ul className="space-y-2">
                      {notes.map((n) => (
                        <li key={n.id}
                          className={`rounded-lg border p-3 text-sm ${n.is_pinned ? 'border-[#eb4b00]/40 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                          <p className="whitespace-pre-wrap break-words text-gray-800">{n.note_text}</p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
                            <span className="truncate">
                              {n.author} · {format(new Date(n.created_at), 'd MMM yyyy, HH:mm')}
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => togglePin(n)}
                                title={n.is_pinned ? 'Unpin note' : 'Pin to top'}
                                className={`rounded p-1 hover:bg-white ${n.is_pinned ? 'text-[#eb4b00]' : 'text-gray-400 hover:text-[#eb4b00]'}`}>
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => removeNote(n.id)} title="Delete note"
                                className="rounded p-1 text-gray-400 hover:bg-white hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={`capitalize ${statusColor[selected.status]}`}>{STATUS_LABEL[selected.status] ?? selected.status}</Badge>
                  <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v as Status)}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DetailGrid>
                  <DetailRow label="Submission Date" value={format(new Date(selected.created_at), 'd MMM yyyy, HH:mm')} />
                  <DetailRow label="Dealership Name" value={selected.dealership_name} />
                  <DetailRow label="Town or city" value={selected.town} />
                  <DetailRow label="Contact Name" value={selected.contact_name} />
                  <DetailRow label="Email Address" value={selected.email_address}
                    href={`mailto:${selected.email_address}`} icon={Mail} />
                  <DetailRow label="Phone Number" value={selected.phone_number}
                    href={`tel:${selected.phone_number}`} icon={Phone} />
                  <DetailRow label="Monthly Vehicle Sales" value={selected.monthly_vehicle_sales} icon={CarIcon} />
                  <DetailRow label="Current Warranty Provider" value={selected.current_warranty_provider} />
                  <DetailRow label="Interested In" value={selected.interested_in?.replace('-', ' ')} />
                  <DetailRow
                    label="Where They Sell Vehicles"
                    value={selected.heard_about_us}
                    href={selected.heard_about_us && /^https?:\/\//i.test(selected.heard_about_us) ? selected.heard_about_us : undefined}
                  />


                </DetailGrid>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Additional Information
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap min-h-[60px]">
                    {selected.additional_information || <span className="text-gray-400">No additional information provided.</span>}
                  </div>
                </div>


                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Resend login details
                  </div>
                  <p className="text-xs text-gray-500">
                    Didn't receive the credentials email? This resets their password and emails a new
                    temporary one. Leave blank to send to <strong>{selected.email_address}</strong>, or
                    enter a different address below.
                  </p>
                  <Input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder={`Alternate email (optional) — default ${selected.email_address}`}
                    disabled={resending}
                  />
                  <Button
                    variant="outline"
                    onClick={resendCredentials}
                    disabled={resending}
                    className="border-[#eb4b00] text-[#eb4b00] hover:bg-orange-50"
                  >
                    {resending
                      ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      : <Mail className="w-4 h-4 mr-2" />}
                    Send login credentials
                  </Button>
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
