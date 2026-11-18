import { functionErrorMessage } from '@/lib/functionError';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Loader2, Search, Mail, Phone, RefreshCw, Download, X, Building2, Car as CarIcon, FileText, Check, Ban,
  StickyNote, Pin, Trash2, Plus, Eye, Pencil, Save,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DealerSignupActivityCard } from '@/components/admin/DealerSignupActivityCard';
import type { DealerSignupActivity } from '@/lib/dealerSignupActivity';
import { dealerSignupDetailsDraft, validateDealerSignupDetails, type DealerSignupDetailsDraft } from '@/lib/dealerSignupDetails';
import { duplicateDealerSignupIds, isDealerSignupSetAside, isProtectedDealerSignup, organiseDealerSignups } from '@/lib/dealerSignupOrganisation';
import { Checkbox } from '@/components/ui/checkbox';
import { useDealerPortalUsage } from '@/hooks/useDealerPortalUsage';
import { DealerFollowUpBar } from '@/components/admin/DealerFollowUpBar';
import { PORTAL_STAGE_LABEL, portalStage, isReadyForFollowUp, newestReadySignIn } from '@/lib/dealerPortalProgress';
import { Archive, ChevronDown, RotateCcw } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [statusEdit, setStatusEdit] = useState<{ signup: Signup; status: Status } | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | Status>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Signup | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [canBulkDelete, setCanBulkDelete] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [rowResending, setRowResending] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState<DealerSignupDetailsDraft | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [activity, setActivity] = useState<DealerSignupActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityRetry, setActivityRetry] = useState(0);
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

  const [archivedRows, setArchivedRows] = useState<(Signup & { archived_at?: string | null })[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const restoreSignup = async (id: string) => {
    setRestoringId(id);
    const { error } = await (supabase.rpc as any)('restore_trade_warranty_signups', { p_signup_ids: [id] });
    setRestoringId(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Signup restored');
    await load();
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
      const all = (data || []) as (Signup & { archived_at?: string | null })[];
      setRows(all.filter(r => !r.archived_at));
      setArchivedRows(all.filter(r => !!r.archived_at));
    }
    setLoading(false);

    const { data: noteRows } = await supabase
      .from('trade_warranty_signup_notes')
      .select('id, signup_id, note_text, created_at')
      .order('created_at', { ascending: true });
    setNoteIndex((noteRows || []) as NoteIndexRow[]);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let cancelled = false;
    const loadDeleteAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      if (!cancelled) setCanBulkDelete((roles || []).some(row => row.role === 'admin' || row.role === 'super_admin'));
    };
    void loadDeleteAccess();
    return () => { cancelled = true; };
  }, []);

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

  const duplicateIds = useMemo(() => duplicateDealerSignupIds(rows), [rows]);
  const portalUsage = useDealerPortalUsage(useMemo(() => rows.map(r => r.dealer_id).filter(Boolean) as string[], [rows]));
  const readyRows = rows.filter(r => r.dealer_id && isReadyForFollowUp(portalUsage[r.dealer_id]));
  const newestReady = newestReadySignIn(readyRows.map(r => portalUsage[r.dealer_id!]));
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = rows.filter((r) => {
      if (statusFilter === 'ready') { if (!r.dealer_id || !isReadyForFollowUp(portalUsage[r.dealer_id])) return false; }
      else if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [
        r.dealership_name, r.contact_name, r.email_address, r.phone_number,
        r.monthly_vehicle_sales, r.current_warranty_provider, r.interested_in,
        r.heard_about_us, r.additional_information,
      ].some((v) => v?.toLowerCase().includes(q));

    });
    return organiseDealerSignups(matches, duplicateIds);
  }, [rows, search, statusFilter, duplicateIds, portalUsage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const deletablePageRows = pageRows.filter(row => !isProtectedDealerSignup(row));
  const allPageSelected = deletablePageRows.length > 0 && deletablePageRows.every(row => checkedIds.has(row.id));
  const somePageSelected = deletablePageRows.some(row => checkedIds.has(row.id));

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => {
    setCheckedIds(current => {
      const next = new Set([...current].filter(id => {
        const row = rows.find(signup => signup.id === id);
        return row && !isProtectedDealerSignup(row);
      }));
      return next.size === current.size ? current : next;
    });
  }, [rows]);

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

  useEffect(() => {
    setDetailsDraft(selected ? dealerSignupDetailsDraft(selected) : null);
    setEditingDetails(false);
  }, [selected?.id]);

  useEffect(() => {
    let cancelled = false;
    setActivity(null);
    setActivityError(null);
    if (!selected?.id) return;
    setActivityLoading(true);
    const fetchActivity = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('dealer-signup-activity', { body: { signup_id: selected.id } });
        if (error) throw new Error(await functionErrorMessage(error));
        if (data?.error) throw new Error(data.error);
        if (!cancelled) setActivity(data.activity as DealerSignupActivity);
      } catch (error) {
        if (!cancelled) setActivityError(error instanceof Error ? error.message : 'Activity could not be loaded.');
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    };
    void fetchActivity();
    return () => { cancelled = true; };
  }, [selected?.id, selected?.dealer_id, activityRetry]);

  const updateDraft = (field: keyof DealerSignupDetailsDraft, value: string) => {
    setDetailsDraft(draft => draft ? { ...draft, [field]: value } : draft);
  };

  const saveDetails = async () => {
    if (!selected || !detailsDraft || savingDetails) return;
    const result = validateDealerSignupDetails(detailsDraft);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    setSavingDetails(true);
    const { data, error } = await supabase
      .from('trade_warranty_signups')
      .update(result.payload)
      .eq('id', selected.id)
      .select('*')
      .single();
    setSavingDetails(false);
    if (error) {
      toast.error(`Details were not saved: ${error.message}`);
      return;
    }
    const saved = data as Signup;
    setRows(current => current.map(row => row.id === saved.id ? saved : row));
    setSelected(saved);
    setDetailsDraft(dealerSignupDetailsDraft(saved));
    setEditingDetails(false);
    toast.success('Dealer details updated');
  };

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
    const signup = rows.find(row => row.id === id);
    if (!signup) return;
    if (status === 'approved' && !signup.dealer_id) { openDetail(signup); toast.info('Use Approve to create this dealer’s login.'); return; }
    setStatusEdit({ signup, status });
    setStatusMessage('');
  };

  const saveStatus = async () => {
    if (!statusEdit || statusSaving) return;
    setStatusSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('dealer-signup-decision', { body: { signup_id: statusEdit.signup.id, decision: 'status', status: statusEdit.status, notes: statusMessage.trim() || null, notify: true } });
      if (error) throw new Error(await functionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      const patch = { status: statusEdit.status, approved_at: statusEdit.status === 'approved' ? new Date().toISOString() : null, rejected_at: statusEdit.status === 'rejected' ? new Date().toISOString() : null };
      setRows(value => value.map(row => row.id === statusEdit.signup.id ? { ...row, ...patch } : row));
      if (selected?.id === statusEdit.signup.id) setSelected({ ...selected, ...patch });
      if (data.email_sent === false) toast.error(`Status saved, but the email was not sent: ${data.email_error}`);
      else toast.success('Status saved — account update email sent');
      setStatusEdit(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update status'); }
    finally { setStatusSaving(false); }
  };

  const decide = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    setDeciding(decision);
    try {
      const { data, error } = await supabase.functions.invoke('dealer-signup-decision', {
        body: { signup_id: selected.id, decision, notes: decisionNotes.trim() || null },
      });
      if (error) throw new Error(await functionErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      const newStatus: Status = decision === 'approve' ? 'approved' : 'rejected';
      const stamp = new Date().toISOString();
      const patch: any = decision === 'approve'
        ? { status: newStatus, approved_at: stamp, rejected_at: null, dealer_id: (data as any)?.dealer_id || selected.dealer_id }
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
      if (error) throw new Error(await functionErrorMessage(error));
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
      if (error) throw new Error(await functionErrorMessage(error));
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
    setEditingDetails(false);
    setActivity(null);
    setActivityError(null);
    setSearchParams((p) => { p.delete('id'); return p; });
  };

  const toggleChecked = (id: string) => {
    setCheckedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 200) {
          toast.error('Select up to 200 signups at a time');
          return current;
        }
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllOnPage = () => {
    const newlySelected = deletablePageRows.filter(row => !checkedIds.has(row.id)).length;
    if (!allPageSelected && checkedIds.size + newlySelected > 200) {
      toast.error('Select up to 200 signups at a time');
      return;
    }
    setCheckedIds(current => {
      const next = new Set(current);
      deletablePageRows.forEach(row => {
        if (allPageSelected) next.delete(row.id);
        else next.add(row.id);
      });
      return next;
    });
  };

  const deleteCheckedSignups = async () => {
    const ids = [...checkedIds];
    if (!ids.length || deleting) return;
    setDeleting(true);
    try {
      const { data, error } = await (supabase.rpc as any)('delete_trade_warranty_signups', { p_signup_ids: ids });
      if (error) throw error;
      const deletedIds = new Set<string>((data?.deleted_ids || []) as string[]);
      const deleted = Number(data?.deleted ?? deletedIds.size);
      const skipped = Number(data?.skipped ?? 0);
      setArchivedRows(current => [...rows.filter(row => deletedIds.has(row.id)).map(row => ({ ...row, archived_at: new Date().toISOString() })), ...current]);
      setRows(current => current.filter(row => !deletedIds.has(row.id)));
      setCheckedIds(new Set());
      setDeleteConfirmOpen(false);
      if (selected && deletedIds.has(selected.id)) closeDetail();
      if (deleted === 0) toast.error('No signups were deleted. Approved or recently changed signups stay protected.');
      else toast.success(`${deleted} signup${deleted === 1 ? '' : 's'} moved to the archive${skipped ? `; ${skipped} protected or changed row${skipped === 1 ? '' : 's'} skipped` : ''}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete the selected signups');
    } finally {
      setDeleting(false);
    }
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
        <div className="flex flex-wrap gap-2">
          <AddDealerDialog label="Add trader" size="sm" onCreated={load} />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <DealerFollowUpBar storageKey="pp-signups-followup-dismissed" count={readyRows.length} newestSignIn={newestReady} onView={() => setStatusFilter('ready')} />

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
            <SelectItem value="ready">Ready for follow-up</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-gray-500 ml-auto">{filtered.length} result{filtered.length === 1 ? '' : 's'}</div>
      </div>

      {canBulkDelete && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-semibold">{checkedIds.size} selected</span>
          <Button type="button" size="sm" variant="outline" disabled={!checkedIds.size || deleting} onClick={() => setCheckedIds(new Set())}>Clear selection</Button>
          <Button type="button" size="sm" variant="destructive" disabled={!checkedIds.size || deleting} onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />Delete selected
          </Button>
          <span className="text-xs text-muted-foreground">Use the top tick box to select this page. Approved dealer accounts stay protected.</span>
        </div>
      )}

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
                  {canBulkDelete && (
                    <th className="w-12 px-4 py-3">
                      <Checkbox
                        aria-label="Select all deletable signups on this page"
                        checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleAllOnPage}
                        disabled={!deletablePageRows.length || deleting}
                      />
                    </th>
                  )}
                  <Th>Action</Th>
                  <Th>Signed Up</Th>
                  <Th>Approved</Th>
                  <Th>Dealership</Th>
                  <Th>Contact</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Status</Th>
                  <Th>Portal progress</Th>
                  <Th>Monthly Sales</Th>
                  <Th>Current Provider</Th>
                  <Th>Interested In</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, index) => {
                  const setAside = isDealerSignupSetAside(r, duplicateIds);
                  const showSetAsideHeading = statusFilter === 'all' && setAside && (index === 0 || !isDealerSignupSetAside(pageRows[index - 1], duplicateIds));
                  const protectedFromDeletion = isProtectedDealerSignup(r);
                  return (
                    <React.Fragment key={r.id}>
                      {showSetAsideHeading && (
                        <tr className="border-y border-border bg-muted/60">
                          <td colSpan={canBulkDelete ? 14 : 13} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Declined and possible duplicates — kept below fresh signups
                          </td>
                        </tr>
                      )}
                      <tr onClick={() => openDetail(r)}
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${setAside ? 'bg-muted/20' : ''}`}>
                        {canBulkDelete && (
                          <Td className="w-12" >
                            <div onClick={event => event.stopPropagation()}>
                              <Checkbox
                                aria-label={`Select ${r.dealership_name || 'signup'}`}
                                checked={checkedIds.has(r.id)}
                                onCheckedChange={() => toggleChecked(r.id)}
                                disabled={protectedFromDeletion || deleting}
                                title={protectedFromDeletion ? 'Approved dealer accounts are protected' : 'Select signup'}
                              />
                            </div>
                          </Td>
                        )}
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
                        <Td className="font-medium text-gray-900">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{r.dealership_name || '—'}</span>
                            {duplicateIds.has(r.id) && <Badge variant="outline" className="border-crm-orange/30 bg-crm-orange-soft text-crm-orange">Possible duplicate</Badge>}
                          </div>
                        </Td>
                        <Td className="text-gray-700">{r.contact_name || '—'}</Td>
                        <Td>
                          <a href={`mailto:${r.email_address}`} onClick={(e) => e.stopPropagation()}
                            className="text-[#eb4b00] hover:underline">{r.email_address}</a>
                        </Td>
                        <Td>
                          <a href={`tel:${r.phone_number}`} onClick={(e) => e.stopPropagation()}
                            className="text-gray-700 hover:underline">{r.phone_number}</a>
                        </Td>
                        <Td><div onClick={event => event.stopPropagation()}><Select value={r.status} onValueChange={value => updateStatus(r.id, value as Status)}><SelectTrigger aria-label={`Edit status for ${r.dealership_name}`} className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map(value => <SelectItem key={value} value={value}>{STATUS_LABEL[value] || value.charAt(0).toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></div></Td>
                        <Td className="whitespace-nowrap">{(() => {
                          const u = r.dealer_id ? portalUsage[r.dealer_id] : undefined;
                          const stage = portalStage(r.dealer_id, u);
                          return (<div className="space-y-1">
                            <Badge variant={stage === 'first_warranty' ? 'default' : stage === 'signed_up' ? 'outline' : 'secondary'}>{PORTAL_STAGE_LABEL[stage]}</Badge>
                            {u?.last_sign_in_at && <div className="text-xs text-gray-500">Last sign-in {format(new Date(u.last_sign_in_at), 'dd MMM yyyy')}</div>}
                          </div>);
                        })()}</Td>
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
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={!!statusEdit} onOpenChange={open => { if (!open && !statusSaving) setStatusEdit(null); }}>
          <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Update signup status</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{statusEdit?.signup.dealership_name} → {statusEdit?.status.replace('_', ' ')}</p><p className="text-sm text-foreground">An account update email will be sent. Withdrawing approval pauses dealer portal access; existing paid warranties remain active.</p><label htmlFor="status-message" className="text-sm font-semibold">Additional message (optional)</label><Textarea id="status-message" value={statusMessage} onChange={event => setStatusMessage(event.target.value)} placeholder="Add a brief explanation for the trader" /><DialogFooter><Button variant="outline" disabled={statusSaving} onClick={() => setStatusEdit(null)}>Cancel</Button><Button disabled={statusSaving} onClick={saveStatus}>{statusSaving ? 'Saving…' : 'Save and email trader'}</Button></DialogFooter></DialogContent>
        </Dialog>
        <AlertDialog open={deleteConfirmOpen} onOpenChange={open => { if (!deleting) setDeleteConfirmOpen(open); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {checkedIds.size} selected signup{checkedIds.size === 1 ? '' : 's'}?</AlertDialogTitle>
              <AlertDialogDescription>
                The selected unapproved applications move to the hidden Archive at the bottom of this page, where you can restore them if deleted by mistake. Approved applications, dealer accounts, warranties and sales remain protected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting || !checkedIds.size}
                onClick={event => { event.preventDefault(); void deleteCheckedSignups(); }}
              >
                {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : 'Move to archive'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {canBulkDelete && (
          <div className="border-t border-gray-200">
            <button type="button" onClick={() => setArchiveOpen(o => !o)} aria-expanded={archiveOpen}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Archive className="h-4 w-4" /> Archive ({archivedRows.length})
              <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${archiveOpen ? 'rotate-180' : ''}`} />
            </button>
            {archiveOpen && (
              <div className="px-4 pb-4">
                {archivedRows.length === 0 ? <p className="text-sm text-gray-500">No archived signups.</p> : (
                  <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                    {archivedRows.map(r => (
                      <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900">{r.dealership_name || r.contact_name || '—'}</div>
                          <div className="text-xs text-gray-500">{r.email_address} · archived {r.archived_at ? format(new Date(r.archived_at), 'dd MMM yyyy HH:mm') : ''}</div>
                        </div>
                        <Button size="sm" variant="outline" disabled={restoringId === r.id} onClick={() => void restoreSignup(r.id)}>
                          {restoringId === r.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1 h-4 w-4" />}Restore
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
        <SheetContent className="w-full max-w-full overflow-x-hidden overflow-y-auto border-l-0 sm:max-w-xl sm:border-l">
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

                <DealerSignupActivityCard
                  activity={activity}
                  loading={activityLoading}
                  error={activityError}
                  onRetry={() => setActivityRetry(value => value + 1)}
                />

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

                <section aria-label="Editable signup details" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signup details</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Submitted {format(new Date(selected.created_at), 'd MMM yyyy, HH:mm')}</p>
                    </div>
                    {!editingDetails && (
                      <Button type="button" size="sm" variant="outline" onClick={() => { setDetailsDraft(dealerSignupDetailsDraft(selected)); setEditingDetails(true); }}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit details
                      </Button>
                    )}
                  </div>

                  {editingDetails && detailsDraft ? (
                    <div className="rounded-xl border border-crm-orange/30 bg-crm-orange-soft/40 p-4">
                      <DetailGrid>
                        <EditField label="Dealership name" value={detailsDraft.dealership_name || ''} onChange={value => updateDraft('dealership_name', value)} />
                        <EditField label="Contact name" value={detailsDraft.contact_name || ''} onChange={value => updateDraft('contact_name', value)} />
                        <EditField label="Email address" type="email" value={detailsDraft.email_address} onChange={value => updateDraft('email_address', value)} icon={Mail} />
                        <EditField label="Phone number" type="tel" value={detailsDraft.phone_number} onChange={value => updateDraft('phone_number', value)} icon={Phone} />
                        <EditField label="Monthly vehicle sales" value={detailsDraft.monthly_vehicle_sales || ''} onChange={value => updateDraft('monthly_vehicle_sales', value)} icon={CarIcon} />
                        <EditField label="Current warranty provider" value={detailsDraft.current_warranty_provider || ''} onChange={value => updateDraft('current_warranty_provider', value)} />
                        <EditField label="Interested in" value={detailsDraft.interested_in || ''} onChange={value => updateDraft('interested_in', value)} />
                        <EditField label="Where they sell vehicles" value={detailsDraft.heard_about_us || ''} onChange={value => updateDraft('heard_about_us', value)} />
                      </DetailGrid>
                      <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="edit-additional-information">
                        <span className="mb-1.5 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Additional information</span>
                        <Textarea id="edit-additional-information" value={detailsDraft.additional_information || ''} onChange={event => updateDraft('additional_information', event.target.value)} className="min-h-24 bg-card text-sm normal-case tracking-normal" disabled={savingDetails} />
                      </label>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Changes update this signup application. An approved dealer’s existing login email and password stay unchanged.</p>
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" disabled={savingDetails} onClick={() => { setDetailsDraft(dealerSignupDetailsDraft(selected)); setEditingDetails(false); }}>Cancel</Button>
                        <Button type="button" disabled={savingDetails} onClick={saveDetails}>
                          {savingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          {savingDetails ? 'Saving…' : 'Save changes'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <DetailGrid>
                        <DetailRow label="Dealership Name" value={selected.dealership_name} />
                        <DetailRow label="Town or city" value={selected.town} />
                        <DetailRow label="Contact Name" value={selected.contact_name} />
                        <DetailRow label="Email Address" value={selected.email_address} href={`mailto:${selected.email_address}`} icon={Mail} />
                        <DetailRow label="Phone Number" value={selected.phone_number} href={`tel:${selected.phone_number}`} icon={Phone} />
                        <DetailRow label="Monthly Vehicle Sales" value={selected.monthly_vehicle_sales} icon={CarIcon} />
                        <DetailRow label="Current Warranty Provider" value={selected.current_warranty_provider} />
                        <DetailRow label="Interested In" value={selected.interested_in?.replace('-', ' ')} />
                        <DetailRow label="Where They Sell Vehicles" value={selected.heard_about_us} href={selected.heard_about_us && /^https?:\/\//i.test(selected.heard_about_us) ? selected.heard_about_us : undefined} />
                      </DetailGrid>
                      <div>
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><FileText className="h-3.5 w-3.5" /> Additional Information</div>
                        <div className="min-h-16 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
                          {selected.additional_information || <span className="text-muted-foreground">No additional information provided.</span>}
                        </div>
                      </div>
                    </>
                  )}
                </section>


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
const EditField: React.FC<{ label: string; value: string; onChange: (value: string) => void; type?: string; icon?: React.ComponentType<any> }> = ({ label, value, onChange, type = 'text', icon: Icon }) => {
  const id = React.useId();
  return (
    <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="mb-1.5 flex items-center gap-1.5">{Icon && <Icon className="h-3.5 w-3.5" />}{label}</span>
      <Input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} className="h-10 bg-card text-sm normal-case tracking-normal" />
    </label>
  );
};
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
