import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Save, KeyRound, Eye, ArrowDown, ArrowUp, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Download } from 'lucide-react';
import { functionErrorMessage } from '@/lib/functionError';
import { useToast } from '@/hooks/use-toast';
import { useDealerExportAccess } from '@/hooks/useDealerExportAccess';
import { AddDealerDialog } from '@/components/admin/AddDealerDialog';
import { useNavigate } from 'react-router-dom';
import { useDealerImpersonation, dealerImpersonationUrl } from '@/hooks/useDealerImpersonation';
import BdmQuickNotePopover from '@/components/admin/bdm/BdmQuickNotePopover';
import BdmReminderPopover from '@/components/admin/bdm/BdmReminderPopover';
import BdmOwnerTag from '@/components/admin/bdm/BdmOwnerTag';
import BdmEmailDialog from '@/components/admin/bdm/BdmEmailDialog';
import { Bell, Mail, X } from 'lucide-react';
import { formatActivityTime } from '@/lib/dealerActivityLabel';
import { dealerSaleAmount, isCountedDealerSale } from '@/lib/dealerSales';

interface DealerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string;
  is_test?: boolean;
  status?: string | null;
  discount_pct: number;
  created_at: string;
  sales_count?: number;
  accounts_pending?: boolean;
  revenue?: number;
  bdm?: { id: string; next_follow_up_at: string | null; next_action: string | null; assigned_bdm?: string | null } | null;
  last_activity?: { page_label: string; activity_at: string } | null;
}

type StatusKey = 'all' | 'approved' | 'pending' | 'cancelled' | 'declined' | 'other';
const STATUS_TABS: { key: StatusKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'declined', label: 'Declined' },
  { key: 'other', label: 'Other' },
];
export const dealerStatusGroup = (s?: string | null): Exclude<StatusKey, 'all'> => {
  const v = (s || '').toLowerCase().trim();
  if (['active', 'approved', 'live'].includes(v)) return 'approved';
  if (['pending', 'new', 'awaiting', 'awaiting_approval', 'review'].includes(v)) return 'pending';
  if (['cancelled', 'canceled', 'withdrawn', 'deactivated', 'suspended', 'inactive', 'closed'].includes(v)) return 'cancelled';
  if (['declined', 'rejected', 'denied'].includes(v)) return 'declined';
  return 'other';
};
const STATUS_BADGE: Record<string, string> = {
  approved: 'bg-primary/10 text-primary', pending: 'bg-accent text-accent-foreground',
  cancelled: 'bg-muted text-muted-foreground', declined: 'bg-destructive/10 text-destructive', other: 'bg-muted text-muted-foreground',
};

const DealerAdminDealers: React.FC = () => {
  const { toast } = useToast();
  const canExport = useDealerExportAccess();
  const [rows, setRows] = useState<DealerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusKey>('all');
  const [newestFirst, setNewestFirst] = useState(true);
  const [testFilter, setTestFilter] = useState<'all' | 'hide' | 'only'>('all');
  const [salesFilter, setSalesFilter] = useState<'all' | 'sold' | 'none'>('all');
  const [joined, setJoined] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [accountsOnly, setAccountsOnly] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const EDIT_FIELDS: [string, string][] = [
    ['company_name', 'Company name'], ['trading_name', 'Trading name'], ['first_name', 'First name'], ['last_name', 'Last name'],
    ['phone', 'Phone'], ['address_line1', 'Address line 1'], ['address_line2', 'Address line 2'], ['city', 'Town / city'],
    ['county', 'County'], ['postcode', 'Postcode'], ['fca_number', 'FCA number'],
  ];
  const saveEdit = async () => {
    if (!editing || savingEdit) return;
    if (!String(editing.company_name || '').trim()) { toast({ title: 'Company name is required', variant: 'destructive' }); return; }
    setSavingEdit(true);
    const patch: Record<string, any> = {};
    EDIT_FIELDS.forEach(([k]) => { const v = String(editing[k] ?? '').trim(); patch[k] = v || null; });
    patch.company_name = String(editing.company_name).trim();
    const full = [patch.first_name, patch.last_name].filter(Boolean).join(' ');
    if (full) patch.name = full;
    const { error } = await supabase.from('dealers').update(patch as any).eq('id', editing.id);
    setSavingEdit(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...patch } : r)));
    setEditing(null);
    toast({ title: 'Dealer details updated' });
  };
  const [staff, setStaff] = useState<{ user_id: string; name: string }[]>([]);
  useEffect(() => { (supabase.rpc as any)('bdm_staff_list').then(({ data }: any) => setStaff(data || [])); }, []);
  const ownerName = (id?: string | null) => (id ? staff.find((s) => s.user_id === id)?.name : null);
  const [mailTo, setMailTo] = useState<DealerRow | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 60000); return () => clearInterval(t); }, []);
  const dueReminders = rows.filter((r) => r.bdm?.next_follow_up_at && new Date(r.bdm.next_follow_up_at).getTime() <= tick && !dismissed.has(r.id + r.bdm.next_follow_up_at));
  const navigate = useNavigate();
  const { startImpersonation } = useDealerImpersonation();

  const viewAsDealer = (r: DealerRow) => {
    const label = r.company_name || r.name || 'this dealer';
    const url = dealerImpersonationUrl('/dealer-portal/dashboard', { dealerId: r.id, dealerName: label, dealerEmail: r.email });
    const w = window.open(url, '_blank');
    if (!w) { startImpersonation(r.id, label, r.email); navigate('/dealer-portal/dashboard'); return; }
    toast({ title: `Opened the dealer portal as ${label} in a new tab` });
  };

  const resendLogin = async (r: DealerRow) => {
    if (!window.confirm(`Send new login details to ${r.email}? Their current password will be replaced.`)) return;
    setResendingId(r.id);
    try {
      const { data, error } = await supabase.functions.invoke('dealer-signup-decision', { body: { dealer_id: r.id, decision: 'resend' } });
      if (error) throw new Error(await functionErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.email_sent === false) throw new Error(`Password reset, but the email was NOT sent: ${(data as any)?.email_error}`);
      toast({ title: 'Login details sent', description: `New password emailed to ${(data as any)?.sent_to || r.email}` });
    } catch (e: any) {
      toast({ title: 'Could not resend password', description: e?.message, variant: 'destructive' });
    } finally {
      setResendingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    const [{ data: dealers }, { data: customers }] = await Promise.all([
      supabase.from('dealers').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('dealer_id, final_amount, status').eq('brand', 'pandaprotect').not('dealer_id', 'is', null),
    ]);
    const { data: pendingReqs } = await supabase.from('dealer_paylater_requests').select('dealer_id').eq('status', 'pending');
    const { data: acts } = await (supabase as any).from('dealer_last_activity').select('dealer_id, page_label, activity_at');
    const actMap = new Map<string, any>((acts || []).map((a: any) => [a.dealer_id, a]));
    const { data: bdmRows } = await (supabase as any).from('bdm_dealerships').select('id, dealer_id, next_follow_up_at, next_action, assigned_bdm').not('dealer_id', 'is', null);
    const bdmMap = new Map<string, any>((bdmRows || []).map((b: any) => [b.dealer_id, b]));
    const pendingSet = new Set((pendingReqs || []).map((p: any) => p.dealer_id));
    const stats = new Map<string, { count: number; revenue: number }>();
    (customers || []).filter(isCountedDealerSale).forEach((c: any) => {
      const existing = stats.get(c.dealer_id) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += dealerSaleAmount(c);
      stats.set(c.dealer_id, existing);
    });
    setRows(
      (dealers || []).map((d: any) => ({
        ...d,
        sales_count: stats.get(d.id)?.count || 0,
        revenue: stats.get(d.id)?.revenue || 0,
        accounts_pending: pendingSet.has(d.id),
        last_activity: actMap.get(d.id) || null,
        bdm: bdmMap.get(d.id) || null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = rows
      .filter((r) => statusTab === 'all' || dealerStatusGroup(r.status) === statusTab)
      .filter((r) => testFilter === 'all' || (testFilter === 'only' ? !!r.is_test : !r.is_test))
      .filter((r) => salesFilter === 'all' || (salesFilter === 'sold' ? (r.sales_count || 0) > 0 : !(r.sales_count || 0)))
      .filter((r) => !accountsOnly || r.accounts_pending)
      .filter((r) => {
        const t = new Date(r.created_at).getTime();
        if (joined === 'week') return Date.now() - t < 7 * 86400000;
        if (joined === 'month') { const n = new Date(); return new Date(r.created_at).getMonth() === n.getMonth() && new Date(r.created_at).getFullYear() === n.getFullYear(); }
        if (joined === 'custom') {
          if (fromDate && t < new Date(fromDate + 'T00:00:00').getTime()) return false;
          if (toDate && t > new Date(toDate + 'T23:59:59').getTime()) return false;
        }
        return true;
      })
      .sort((a, b) => (newestFirst ? -1 : 1) * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    if (!q) return base;
    return base.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.company_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
    );
  }, [rows, search, statusTab, newestFirst, testFilter, salesFilter, accountsOnly, joined, fromDate, toDate]);

  const allChecked = filtered.length > 0 && filtered.every((r) => checked.has(r.id));
  const someChecked = filtered.some((r) => checked.has(r.id));
  const toggleAll = () => setChecked((c) => { const n = new Set(c); filtered.forEach((r) => (allChecked ? n.delete(r.id) : n.add(r.id))); return n; });
  const toggleOne = (id: string) => setChecked((c) => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const exportChecked = () => {
    const list = rows.filter((r) => checked.has(r.id));
    const head = ['Company', 'Contact', 'Email', 'Phone', 'Status', 'Joined', 'Sales', 'Revenue', 'Test account'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...list.map((r) => [r.company_name, r.name, r.email, r.phone, r.status, new Date(r.created_at).toLocaleDateString('en-GB'), r.sales_count, (r.revenue || 0).toFixed(2), r.is_test ? 'Yes' : 'No'])].map((row) => row.map(esc).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `dealers-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    rows.forEach((r) => { const g = dealerStatusGroup(r.status); c[g] = (c[g] || 0) + 1; });
    return c;
  }, [rows]);

  const saveDiscount = async (id: string) => {
    const newPct = edits[id];
    if (newPct === undefined || isNaN(newPct)) return;
    if (newPct < 0 || newPct > 100) {
      toast({ title: 'Invalid discount', description: 'Must be between 0 and 100', variant: 'destructive' });
      return;
    }
    setSavingId(id);
    const { error } = await supabase.from('dealers').update({ discount_pct: newPct }).eq('id', id);
    setSavingId(null);
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Discount updated', description: `Set to ${newPct}%` });
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, discount_pct: newPct } : r)));
    setEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  return (
    <div className="space-y-6">
      {dueReminders.length > 0 && (
        <div className="sticky top-0 z-30 space-y-2">
          {dueReminders.map((r) => (
            <div key={r.id} role="alert" className="flex items-center gap-3 rounded-lg border border-primary/40 bg-accent px-4 py-3 shadow-md">
              <Bell className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-semibold">Reminder: {r.company_name || r.name}</span>
                <span className="text-muted-foreground"> · {r.bdm?.next_action || 'Follow up'} · due {formatActivityTime(r.bdm!.next_follow_up_at!)}</span>
              </div>
              <BdmReminderPopover dealershipId={r.bdm!.id} name={r.company_name || r.name} onSaved={load} trigger={<Button size="sm" variant="outline">Snooze</Button>} />
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Dismiss reminder" onClick={() => setDismissed((p) => new Set(p).add(r.id + r.bdm!.next_follow_up_at))}><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dealers</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage dealer accounts and their discount tier.</p>
        </div>
        <AddDealerDialog onCreated={load} />
      </div>

      <Card className="border-2">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.filter((t) => t.key !== 'other' || counts.other).map((t) => (
              <Button key={t.key} size="sm" variant={statusTab === t.key ? 'default' : 'outline'} onClick={() => setStatusTab(t.key)}>
                {t.label} <span className="ml-1.5 rounded-full bg-background/30 px-1.5 text-xs">{counts[t.key] || 0}</span>
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dealer, company, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => setNewestFirst((v) => !v)}>
            {newestFirst ? <ArrowDown className="h-4 w-4 mr-1" /> : <ArrowUp className="h-4 w-4 mr-1" />}
            {newestFirst ? 'Newest first' : 'Oldest first'}
          </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select className="h-9 rounded-md border border-input bg-background px-2" value={salesFilter} onChange={(e) => setSalesFilter(e.target.value as any)} aria-label="Sales filter">
              <option value="all">All sales</option><option value="sold">Has sold</option><option value="none">No sales yet</option>
            </select>
            <select className="h-9 rounded-md border border-input bg-background px-2" value={testFilter} onChange={(e) => setTestFilter(e.target.value as any)} aria-label="Test account filter">
              <option value="all">Incl. test accounts</option><option value="hide">Hide test accounts</option><option value="only">Test accounts only</option>
            </select>
            <select className="h-9 rounded-md border border-input bg-background px-2" value={joined} onChange={(e) => setJoined(e.target.value as any)} aria-label="Joined filter">
              <option value="all">Joined: any time</option><option value="week">Joined: last 7 days</option><option value="month">Joined: this month</option><option value="custom">Joined: pick dates</option>
            </select>
            {joined === 'custom' && (<>
              <Input type="date" className="h-9 w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From" />
              <Input type="date" className="h-9 w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To" />
            </>)}
            <Button size="sm" variant={accountsOnly ? 'default' : 'outline'} onClick={() => setAccountsOnly((v) => !v)}>
              Waiting on Accounts <span className="ml-1.5 rounded-full bg-background/30 px-1.5 text-xs">{rows.filter((r) => r.accounts_pending).length}</span>
            </Button>
          </div>
          {checked.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-semibold">{checked.size} selected</span>
              {canExport && <Button size="sm" variant="outline" onClick={exportChecked}><Download className="h-4 w-4 mr-1" />Download spreadsheet</Button>}
              <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())}>Clear</Button>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No dealers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-y border-border">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="w-10 px-3 py-2"><Checkbox aria-label="Select all shown dealers" checked={allChecked ? true : someChecked ? 'indeterminate' : false} onCheckedChange={toggleAll} /></th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">
                      <button type="button" className="inline-flex items-center gap-1 uppercase hover:text-foreground" onClick={() => setNewestFirst((v) => !v)}>
                        Joined {newestFirst ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                      </button>
                    </th>
                    <th className="px-3 py-2 font-medium">Follow up</th>
                    <th className="px-3 py-2 font-medium">Last activity</th>
                    <th className="px-3 py-2 font-medium text-right">Sales</th>
                    <th className="px-3 py-2 font-medium text-right">Revenue</th>
                    <th className="px-3 py-2 font-medium">Discount %</th>
                    <th className="px-3 py-2 font-medium">Login</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const editVal = edits[r.id];
                    const dirty = editVal !== undefined && editVal !== r.discount_pct;
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-3 py-2"><Checkbox aria-label={`Select ${r.company_name}`} checked={checked.has(r.id)} onCheckedChange={() => toggleOne(r.id)} /></td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-foreground">{r.company_name}{r.is_test && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-foreground align-middle">Test account</span>}{r.accounts_pending && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground align-middle">Accounts@ needs to approve</span>}</p>
                          <BdmOwnerTag name={ownerName(r.bdm?.assigned_bdm)} className="mt-1" />
                          <p className="text-xs text-muted-foreground">{r.name}</p>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-foreground">{r.email}</p>
                          <p className="text-xs text-muted-foreground">{r.phone || '—'}</p>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[dealerStatusGroup(r.status)]}`}>{r.status || '—'}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.bdm ? (
                            <div className="flex items-center gap-1">
                              <BdmQuickNotePopover dealershipId={r.bdm.id} dealershipName={r.company_name || r.name} contactName={r.name} onSaved={load} onOpenFull={() => navigate('/admin-dashboard/?tab=bdm-contacts')} />
                              <Button size="icon" variant="ghost" className="h-9 w-9" title={`Email ${r.email} (preview first)`} aria-label={`Email ${r.company_name}`} onClick={() => setMailTo(r)}><Mail className="h-4 w-4" /></Button>
                              <BdmReminderPopover dealershipId={r.bdm.id} name={r.company_name || r.name} onSaved={load} />
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                          {r.bdm?.next_follow_up_at && <div className="text-xs text-muted-foreground mt-0.5">Reminder {formatActivityTime(r.bdm.next_follow_up_at)}</div>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.last_activity ? (
                            <div className="leading-tight">
                              <div className="font-medium text-foreground">{r.last_activity.page_label}</div>
                              <div className="text-xs text-muted-foreground">{formatActivityTime(r.last_activity.activity_at)}</div>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">No activity yet</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{r.sales_count}</td>
                        <td className="px-3 py-2 text-right font-semibold">£{(r.revenue || 0).toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={editVal ?? r.discount_pct}
                              onChange={(e) =>
                                setEdits((prev) => ({ ...prev, [r.id]: parseFloat(e.target.value) }))
                              }
                              className="w-20 h-8"
                            />
                            <Button
                              size="sm"
                              variant={dirty ? 'default' : 'ghost'}
                              disabled={!dirty || savingId === r.id}
                              onClick={() => saveDiscount(r.id)}
                              className="h-8"
                            >
                              {savingId === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-8 whitespace-nowrap" onClick={() => setEditing({ ...r })}>
                            <Pencil className="h-3 w-3" />
                            <span className="ml-1">Edit</span>
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 whitespace-nowrap" onClick={() => viewAsDealer(r)}>
                            <Eye className="h-3 w-3" />
                            <span className="ml-1">View as dealer</span>
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 whitespace-nowrap" disabled={resendingId === r.id} onClick={() => resendLogin(r)}>
                            {resendingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
                            <span className="ml-1">Resend password</span>
                          </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit dealer details</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {EDIT_FIELDS.map(([k, label]) => (
                <div key={k} className="space-y-1">
                  <Label htmlFor={`edit-${k}`}>{label}</Label>
                  <Input id={`edit-${k}`} value={editing[k] ?? ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                </div>
              ))}
              <p className="sm:col-span-2 text-xs text-muted-foreground">Login email ({editing.email}) isn't changed here, so the dealer's sign-in stays the same.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {mailTo?.bdm && (
        <BdmEmailDialog open={!!mailTo} onOpenChange={(o) => !o && setMailTo(null)} to={mailTo.email} dealershipId={mailTo.bdm.id}
          dealershipName={mailTo.company_name || mailTo.name} contactName={mailTo.name} onSent={() => { setMailTo(null); load(); }} />
      )}
    </div>
  );
};

export default DealerAdminDealers;
