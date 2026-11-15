import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { downloadInvoicePdf, downloadWarrantyPdf, type DealerPdfRow } from '@/lib/dealerPdf';
import { DEALER_PAYMENT_STYLES, getDealerPaymentState, type DealerPaymentKey } from '@/lib/dealerPaymentStatus';
import { displayWarrantyPlanName } from '@/lib/warrantyPlanDisplay';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type WarrantyRow = DealerPdfRow & {
  status?: string | null;
  claim_limit?: number | string | null;
  voluntary_excess?: number | string | null;
  labour_rate?: number | string | null;
  policy_number?: string | null;
};

type CoverFilter = 'all' | 'active' | 'pending' | 'expired' | 'cancelled';

const PAGE_SIZE = 20;
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const ref = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();
const money = (value?: number | string | null) => `£${Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const wholeMoney = (value?: number | string | null) => value == null || value === '' ? '—' : `£${Number(value).toLocaleString('en-GB')}`;

const paymentBadgeClasses: Record<DealerPaymentKey, string> = {
  paid: 'border-crm-green/20 bg-crm-green-soft text-crm-green-deep',
  due: 'border-crm-amber/25 bg-crm-amber-soft text-crm-gold-deep',
  overdue: 'border-crm-red/25 bg-crm-red-soft text-crm-red',
  awaiting: 'border-crm-line bg-crm-tint-slate text-crm-ink-slate',
};

const coverBadgeClasses: Record<Exclude<CoverFilter, 'all'>, string> = {
  active: 'border-crm-green/20 bg-crm-green-soft text-crm-green-deep',
  pending: 'border-crm-amber/25 bg-crm-amber-soft text-crm-gold-deep',
  expired: 'border-crm-line bg-crm-tint-slate text-crm-ink-slate',
  cancelled: 'border-crm-red/25 bg-crm-red-soft text-crm-red',
};

const getCoverKey = (row: WarrantyRow): Exclude<CoverFilter, 'all'> => {
  const status = String(row.status || '').trim().toLowerCase();
  if (status === 'active') return 'active';
  if (status === 'expired') return 'expired';
  if (status === 'cancelled' || status === 'refunded') return 'cancelled';
  return 'pending';
};

const getCoverLabel = (row: WarrantyRow) => {
  const key = getCoverKey(row);
  if (key === 'pending') return row.status || 'Pending';
  return key.charAt(0).toUpperCase() + key.slice(1);
};

function StatCard({ icon: Icon, label, value, green = false }: { icon: LucideIcon; label: string; value: string | number; green?: boolean }) {
  return (
    <div className="crm-panel-shadow flex min-h-32 flex-col items-start gap-3 rounded-2xl border-2 border-crm-line/70 bg-card p-4 sm:min-h-28 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl ${green ? 'bg-crm-green-soft text-crm-green' : 'bg-muted text-crm-navy-soft'}`}>
        <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground sm:text-base">{label}</p>
        <p className={`mt-1 whitespace-nowrap text-xl font-extrabold tracking-tight sm:text-3xl ${green ? 'text-crm-green-deep' : 'text-crm-navy'}`}>{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ filtered, cancellations = false, onReset }: { filtered: boolean; cancellations?: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-crm-orange-soft text-crm-orange">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-crm-navy">{filtered ? 'No matching warranties' : cancellations ? 'No cancellations yet' : 'No warranties yet'}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered ? 'Try a different search or reset the filters.' : cancellations ? 'Cancelled and refunded warranties will appear here.' : 'Create your first warranty to see its cover, payment and documents here.'}
      </p>
      {filtered && <Button variant="outline" className="mt-5 rounded-xl" onClick={onReset}>Reset filters</Button>}
    </div>
  );
}

const DealerWarrantiesList = () => {
  const { dealer } = useDealerAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = ['payments', 'cancellations'].includes(searchParams.get('tab') || '')
    ? searchParams.get('tab') || 'plans'
    : 'plans';
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState(false);
  const [emailRow, setEmailRow] = useState<WarrantyRow | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [sending, setSending] = useState(false);
  const [emailTarget, setEmailTarget] = useState<'customer' | 'me'>('customer');
  const [cancelRow, setCancelRow] = useState<WarrantyRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [detailRow, setDetailRow] = useState<WarrantyRow | null>(null);
  const [search, setSearch] = useState('');
  const [coverFilter, setCoverFilter] = useState<CoverFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | DealerPaymentKey>('all');
  const [page, setPage] = useState(1);

  const { data: pendingCancelIds = [], refetch: refetchCancels } = useQuery({
    queryKey: ['dealer-cancel-requests', dealer?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from('dealer_cancellation_requests').select('customer_id').eq('status', 'pending');
      return ((data || []) as { customer_id: string }[]).map((row) => row.customer_id);
    },
    enabled: !!dealer?.id,
  });
  const pendingCancel = useMemo(() => new Set(pendingCancelIds), [pendingCancelIds]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['dealer-plans', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('dealer_id', dealer.id)
        .order('signup_date', { ascending: false });
      return ((data || []) as unknown) as WarrantyRow[];
    },
    enabled: !!dealer?.id,
  });

  const isPaid = (row: WarrantyRow) => row.payment_status === 'paid';
  const cancellationRows = useMemo(
    () => rows.filter((row) => ['cancelled', 'refunded'].includes(String(row.status || '').trim().toLowerCase())),
    [rows],
  );
  const unpaidRows = useMemo(() => rows.filter((row) => !isPaid(row)), [rows]);
  const activeCoverCount = useMemo(() => rows.filter((row) => getCoverKey(row) === 'active').length, [rows]);
  const overdueCount = useMemo(() => rows.filter((row) => getDealerPaymentState(row).key === 'overdue').length, [rows]);
  const outstandingTotal = useMemo(() => unpaidRows.reduce((sum, row) => sum + Number(row.final_amount || 0), 0), [unpaidRows]);

  const computeEnd = (row: WarrantyRow): string | null => {
    if (row.policy_end_date) return row.policy_end_date;
    const start = row.warranty_start_date || row.signup_date;
    const months = parseInt(String(row.payment_type || '0'), 10);
    if (!start || !months) return null;
    const date = new Date(start);
    date.setMonth(date.getMonth() + months);
    return date.toISOString();
  };

  const hasFilters = Boolean(search.trim()) || coverFilter !== 'all' || paymentFilter !== 'all';
  const resetFilters = () => {
    setSearch('');
    setCoverFilter('all');
    setPaymentFilter('all');
  };

  const filterRows = (source: WarrantyRow[]) => {
    const query = search.trim().toLowerCase();
    return source.filter((row) => {
      const haystack = [row.name, row.email, row.registration_plate, row.warranty_number, row.policy_number, ref(row.id)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesCover = coverFilter === 'all' || getCoverKey(row) === coverFilter;
      const matchesPayment = paymentFilter === 'all' || getDealerPaymentState(row).key === paymentFilter;
      return matchesSearch && matchesCover && matchesPayment;
    });
  };

  const visiblePlans = useMemo(
    () => filterRows(activeTab === 'cancellations' ? cancellationRows : rows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, cancellationRows, rows, search, coverFilter, paymentFilter],
  );
  const currentRows = activeTab === 'payments' ? unpaidRows : visiblePlans;
  const pageCount = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE));
  const paginatedRows = currentRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [activeTab, search, coverFilter, paymentFilter]);

  React.useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  React.useEffect(() => {
    if (searchParams.get('paid') === '1') toast.success('Payment received — your invoices are now marked paid.');
    else if (searchParams.get('paid') === '0') toast.info('Payment cancelled.');
  }, [searchParams]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((key) => selected[key]), [selected]);
  const selectedTotal = useMemo(
    () => rows.filter((row) => selected[row.id] && !isPaid(row)).reduce((sum, row) => sum + Number(row.final_amount || 0), 0),
    [rows, selected],
  );
  const pageUnpaidIds = activeTab === 'payments' ? paginatedRows.map((row) => row.id) : [];
  const allSelected = pageUnpaidIds.length > 0 && pageUnpaidIds.every((id) => selected[id]);
  const toggleAll = () => {
    setSelected((current) => {
      const next = { ...current };
      pageUnpaidIds.forEach((id) => { next[id] = !allSelected; });
      return next;
    });
  };

  const submitCancellation = async () => {
    if (!cancelRow || !dealer?.id) return;
    if (cancelReason.trim().length < 3) {
      toast.error('Please give a reason for the cancellation');
      return;
    }
    setCancelling(true);
    const { error } = await (supabase as any).from('dealer_cancellation_requests')
      .insert({ dealer_id: dealer.id, customer_id: cancelRow.id, reason: cancelReason.trim() });
    setCancelling(false);
    if (error) {
      toast.error(error.code === '23505' ? 'A cancellation request is already pending for this warranty' : error.message);
      return;
    }
    toast.success('Cancellation request sent to Panda Protect');
    setCancelRow(null);
    refetchCancels();
  };

  const openEmailDialog = (row: WarrantyRow) => {
    setDetailRow(null);
    setEmailRow(row);
    setEmailTarget('customer');
    setEmailTo(row.email || '');
    setEmailNote('');
  };

  const openCancellationDialog = (row: WarrantyRow) => {
    setDetailRow(null);
    setCancelRow(row);
    setCancelReason('');
  };

  const sendWarrantyToCustomer = async () => {
    if (!emailRow) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailTo.trim())) {
      toast.error('Enter a valid customer email address');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('dealer-send-customer-warranty', {
        body: { customer_id: emailRow.id, to_email: emailTo.trim(), message: emailNote.trim() || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Warranty emailed to ${emailTo.trim()}`);
      setEmailRow(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to send warranty email');
    } finally {
      setSending(false);
    }
  };

  const handlePaySelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one unpaid plan to pay');
      return;
    }
    if (!dealer?.id) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('dealer-pay-invoices', {
        body: { dealer_id: dealer.id, customer_ids: selectedIds },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to start payment');
      setPaying(false);
    }
  };

  const renderPaymentStatus = (row: WarrantyRow) => {
    const state = getDealerPaymentState(row);
    const Icon = state.key === 'paid' ? CheckCircle2 : Clock3;
    return (
      <div>
        <Badge className={`gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold shadow-none ${paymentBadgeClasses[state.key]}`}>
          <Icon className="h-3.5 w-3.5" />{DEALER_PAYMENT_STYLES[state.key].label}
        </Badge>
        {state.dueDate && <div className="mt-1.5 whitespace-nowrap text-[11px] text-muted-foreground">Due {state.dueDate.toLocaleDateString('en-GB')}</div>}
      </div>
    );
  };

  const renderCoverStatus = (row: WarrantyRow) => {
    const key = getCoverKey(row);
    const Icon = key === 'active' ? CheckCircle2 : key === 'cancelled' ? XCircle : Clock3;
    return (
      <Badge className={`gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold capitalize shadow-none ${coverBadgeClasses[key]}`}>
        <Icon className="h-3.5 w-3.5" />{getCoverLabel(row)}
      </Badge>
    );
  };

  const renderActions = (row: WarrantyRow, mobile = false) => (
    <div className={`flex items-center gap-2 ${mobile ? 'w-full' : 'justify-end'}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDetailRow(row)}
        className={`h-10 rounded-xl border-crm-orange/60 bg-card px-4 font-bold text-crm-orange hover:bg-crm-orange-soft hover:text-crm-orange ${mobile ? 'flex-1' : ''}`}
      >
        <Eye className="mr-2 h-4 w-4" />View details
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground" aria-label={`Actions for ${row.registration_plate || row.name || 'warranty'}`}>
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
          <DropdownMenuItem onClick={() => openEmailDialog(row)}>
            <Mail className="mr-2 h-4 w-4" />{isPaid(row) ? 'Resend documents' : 'Email warranty'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadWarrantyPdf(row, dealer?.name)}>
            <FileText className="mr-2 h-4 w-4" />Download warranty
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadInvoicePdf(row, dealer?.name)}>
            <Download className="mr-2 h-4 w-4" />Download invoice
          </DropdownMenuItem>
          {!['cancelled', 'refunded'].includes(String(row.status || '').toLowerCase()) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={pendingCancel.has(row.id)}
                onClick={() => openCancellationDialog(row)}
                className="text-crm-red focus:text-crm-red"
              >
                <XCircle className="mr-2 h-4 w-4" />{pendingCancel.has(row.id) ? 'Cancellation requested' : 'Request cancellation'}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const renderWarrantyCards = (data: WarrantyRow[]) => (
    <div className="space-y-3 p-3 md:hidden">
      {data.map((row) => (
        <article key={row.id} className="rounded-2xl border-2 border-crm-line/70 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-base font-extrabold uppercase text-crm-navy">{row.registration_plate || '—'}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{[row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ') || 'Vehicle details unavailable'}</p>
            </div>
            <p className="shrink-0 text-lg font-extrabold text-crm-navy">{money(row.final_amount)}</p>
          </div>
          <div className="mt-4 space-y-1">
            <p className="font-bold text-crm-navy">{row.name || '—'}</p>
            <p className="break-all text-sm text-muted-foreground">{row.email || '—'}</p>
          </div>
          <div className="mt-4 border-t border-crm-line pt-4">
            <p className="font-bold text-crm-navy">{String(row.plan_type).toLowerCase() === 'basic' ? 'Manage My Claim' : 'Comprehensive Warranty'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{row.payment_type ? `${row.payment_type} months` : '—'} · Claim limit {wholeMoney(row.claim_limit)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{fmt(row.warranty_start_date || row.signup_date)} – {fmt(computeEnd(row))}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{renderPaymentStatus(row)}{renderCoverStatus(row)}</div>
          <div className="mt-4">{renderActions(row, true)}</div>
        </article>
      ))}
    </div>
  );

  const renderWarrantyTable = (data: WarrantyRow[]) => (
    <div className="hidden overflow-x-auto md:block">
      <Table className="min-w-[1180px]">
        <TableHeader>
          <TableRow className="border-crm-line bg-muted/50 hover:bg-muted/50">
            <TableHead className="px-5 py-4 font-bold text-crm-navy">Customer</TableHead>
            <TableHead className="font-bold text-crm-navy">Vehicle</TableHead>
            <TableHead className="min-w-[230px] font-bold text-crm-navy">Warranty</TableHead>
            <TableHead className="min-w-[150px] font-bold text-crm-navy">Cover period</TableHead>
            <TableHead className="font-bold text-crm-navy">Amount</TableHead>
            <TableHead className="font-bold text-crm-navy">Payment</TableHead>
            <TableHead className="font-bold text-crm-navy">Cover status</TableHead>
            <TableHead className="sticky right-0 z-20 min-w-[190px] bg-muted pr-5 text-right font-bold text-crm-navy">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id} className="group border-crm-line bg-card hover:bg-crm-orange-soft/30">
              <TableCell className="px-5 py-5 align-top">
                <p className="font-bold text-crm-navy">{row.name || '—'}</p>
                <p className="mt-1 max-w-[190px] break-all text-sm text-muted-foreground">{row.email || '—'}</p>
              </TableCell>
              <TableCell className="align-top">
                <p className="font-mono font-bold uppercase text-crm-navy">{row.registration_plate || '—'}</p>
                <p className="mt-1 text-sm text-muted-foreground">{[row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ')}</p>
              </TableCell>
              <TableCell className="align-top">
                <p className="font-bold text-crm-navy">{String(row.plan_type).toLowerCase() === 'basic' ? 'Manage My Claim' : 'Comprehensive Warranty'}</p>
                <p className="mt-1 text-sm text-muted-foreground">{row.payment_type ? `${row.payment_type} months` : '—'} · Claim limit {wholeMoney(row.claim_limit)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Excess {wholeMoney(row.voluntary_excess)} · Labour rate {row.labour_rate ? `${wholeMoney(row.labour_rate)}/hr` : '—'}</p>
              </TableCell>
              <TableCell className="align-top text-sm font-medium text-crm-navy">
                {fmt(row.warranty_start_date || row.signup_date)}<br />{fmt(computeEnd(row))}
              </TableCell>
              <TableCell className="align-top font-extrabold text-crm-navy">{money(row.final_amount)}</TableCell>
              <TableCell className="align-top">{renderPaymentStatus(row)}</TableCell>
              <TableCell className="align-top">{renderCoverStatus(row)}</TableCell>
              <TableCell className="sticky right-0 z-10 bg-card pr-5 align-top group-hover:bg-crm-orange-soft">{renderActions(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderPaymentTable = (data: WarrantyRow[]) => (
    <>
      <div className="space-y-3 p-3 2xl:hidden">
        {data.map((row) => (
          <article key={row.id} className="rounded-2xl border-2 border-crm-line/70 bg-card p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={!!selected[row.id]}
                onCheckedChange={(value) => setSelected((current) => ({ ...current, [row.id]: !!value }))}
                className="mt-1 border-crm-line data-[state=checked]:bg-crm-orange data-[state=checked]:text-primary-foreground"
                aria-label={`Select invoice ${ref(row.id)}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-mono font-bold uppercase text-crm-navy">{row.registration_plate || '—'}</p><p className="text-sm text-muted-foreground">{row.name || '—'}</p></div>
                  <p className="font-extrabold text-crm-navy">{money(row.final_amount)}</p>
                </div>
                <p className="mt-3 text-xs font-semibold text-crm-orange">Invoice {ref(row.id)}</p>
                <div className="mt-3">{renderPaymentStatus(row)}</div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => downloadInvoicePdf(row, dealer?.name)}><Download className="mr-2 h-4 w-4" />Invoice</Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => downloadWarrantyPdf(row, dealer?.name)}><FileText className="mr-2 h-4 w-4" />Warranty</Button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto 2xl:block">
        <Table className="min-w-[1050px]">
          <TableHeader>
            <TableRow className="border-crm-line bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-14 px-5"><Checkbox checked={allSelected} onCheckedChange={toggleAll} className="border-crm-line data-[state=checked]:bg-crm-orange data-[state=checked]:text-primary-foreground" aria-label="Select all invoices on this page" /></TableHead>
              <TableHead className="font-bold text-crm-navy">Invoice</TableHead>
              <TableHead className="font-bold text-crm-navy">Customer</TableHead>
              <TableHead className="font-bold text-crm-navy">Vehicle</TableHead>
              <TableHead className="font-bold text-crm-navy">Cover period</TableHead>
              <TableHead className="font-bold text-crm-navy">Amount</TableHead>
              <TableHead className="font-bold text-crm-navy">Payment</TableHead>
              <TableHead className="sticky right-0 z-20 bg-muted pr-5 text-right font-bold text-crm-navy">Documents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id} className="group border-crm-line hover:bg-crm-orange-soft/30">
                <TableCell className="px-5"><Checkbox checked={!!selected[row.id]} onCheckedChange={(value) => setSelected((current) => ({ ...current, [row.id]: !!value }))} className="border-crm-line data-[state=checked]:bg-crm-orange data-[state=checked]:text-primary-foreground" aria-label={`Select invoice ${ref(row.id)}`} /></TableCell>
                <TableCell className="font-mono font-bold text-crm-orange">{ref(row.id)}</TableCell>
                <TableCell><p className="font-bold text-crm-navy">{row.name || '—'}</p><p className="text-sm text-muted-foreground">{row.email || '—'}</p></TableCell>
                <TableCell><p className="font-mono font-bold uppercase text-crm-navy">{row.registration_plate || '—'}</p><p className="text-sm text-muted-foreground">{[row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ')}</p></TableCell>
                <TableCell className="text-sm text-crm-navy">{fmt(row.warranty_start_date || row.signup_date)}<br />{fmt(computeEnd(row))}</TableCell>
                <TableCell className="font-extrabold text-crm-navy">{money(row.final_amount)}</TableCell>
                <TableCell>{renderPaymentStatus(row)}</TableCell>
                <TableCell className="sticky right-0 z-10 bg-card pr-5 group-hover:bg-crm-orange-soft"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title="Download invoice" onClick={() => downloadInvoicePdf(row, dealer?.name)} className="rounded-xl text-crm-navy hover:text-crm-orange"><Download className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Download warranty" onClick={() => downloadWarrantyPdf(row, dealer?.name)} className="rounded-xl text-crm-navy hover:text-crm-orange"><FileText className="h-4 w-4" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );

  const renderPagination = () => {
    if (currentRows.length === 0) return null;
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, currentRows.length);
    const singular = activeTab === 'payments' ? 'invoice' : activeTab === 'cancellations' ? 'cancellation' : 'warranty';
    const plural = activeTab === 'payments' ? 'invoices' : activeTab === 'cancellations' ? 'cancellations' : 'warranties';
    return (
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-sm text-muted-foreground">Showing {start}–{end} of {currentRows.length} {currentRows.length === 1 ? singular : plural}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-crm-orange px-3 text-sm font-bold text-primary-foreground" aria-label={`Page ${page} of ${pageCount}`}>{page}</span>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  };

  const renderPlansContent = (cancellations = false) => (
    <div className="overflow-hidden rounded-2xl border-2 border-crm-line/70 bg-card crm-panel-shadow">
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-crm-orange" /></div>
      ) : paginatedRows.length === 0 ? (
        <EmptyState filtered={hasFilters} cancellations={cancellations} onReset={resetFilters} />
      ) : (
        <>{renderWarrantyCards(paginatedRows)}{renderWarrantyTable(paginatedRows)}{renderPagination()}</>
      )}
    </div>
  );

  return (
    <DealerLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-crm-navy sm:text-4xl">Dealer warranties</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">Manage customer cover, payments and documents.</p>
          </div>
          <Button asChild className="h-12 w-full rounded-xl bg-crm-orange px-5 text-base font-bold text-primary-foreground shadow-sm hover:bg-crm-orange/90 sm:w-auto">
            <Link to="/dealer-portal/quote/pricing"><Plus className="mr-2 h-5 w-5" />New warranty</Link>
          </Button>
        </header>

        <section aria-label="Warranty summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard icon={FileText} label="Total plans" value={rows.length} />
          <StatCard icon={ShieldCheck} label="Active cover" value={activeCoverCount} green />
          <StatCard icon={ReceiptText} label="Unpaid invoices" value={unpaidRows.length} />
          <StatCard icon={Coins} label="Outstanding" value={money(outstandingTotal)} />
        </section>

        {overdueCount > 0 && (
          <div className="rounded-2xl border-2 border-crm-red/25 bg-crm-red-soft px-4 py-3 text-sm text-crm-red">
            <strong>{overdueCount} overdue invoice{overdueCount === 1 ? '' : 's'}.</strong> Warranties linked to an unpaid invoice may be paused and claims unavailable until payment is received.
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(tab) => {
          setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            if (tab === 'plans') next.delete('tab');
            else next.set('tab', tab);
            return next;
          });
        }} className="space-y-5">
          <div className="max-w-full overflow-x-auto overscroll-x-contain">
            <TabsList className="h-auto w-max min-w-full justify-start gap-1 rounded-none border-b border-crm-line bg-transparent p-0">
              {[
                { value: 'plans', label: `All warranties (${rows.length})` },
                { value: 'payments', label: `Payments (${unpaidRows.length})` },
                { value: 'cancellations', label: `Cancellations (${cancellationRows.length})` },
              ].map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="min-h-12 shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-bold text-muted-foreground shadow-none data-[state=active]:border-crm-orange data-[state=active]:bg-transparent data-[state=active]:text-crm-orange data-[state=active]:shadow-none sm:px-5 sm:text-base">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {activeTab !== 'payments' && (
            <section aria-label="Warranty filters" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(300px,1fr)_230px_230px_auto]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, reg, email or warranty number…" className="h-12 rounded-xl border-crm-line bg-card pl-12 pr-4 text-sm shadow-sm" />
              </div>
              <Select value={coverFilter} onValueChange={(value) => setCoverFilter(value as CoverFilter)}>
                <SelectTrigger className="h-12 rounded-xl border-crm-line bg-card px-4 text-sm font-medium shadow-sm"><SelectValue placeholder="Cover status: All" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Cover status: All</SelectItem>
                  <SelectItem value="active">Cover status: Active</SelectItem>
                  <SelectItem value="pending">Cover status: Pending</SelectItem>
                  <SelectItem value="expired">Cover status: Expired</SelectItem>
                  <SelectItem value="cancelled">Cover status: Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as 'all' | DealerPaymentKey)}>
                <SelectTrigger className="h-12 rounded-xl border-crm-line bg-card px-4 text-sm font-medium shadow-sm"><SelectValue placeholder="Payment status: All" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Payment status: All</SelectItem>
                  <SelectItem value="paid">Payment status: Paid</SelectItem>
                  <SelectItem value="due">Payment status: Invoice outstanding</SelectItem>
                  <SelectItem value="overdue">Payment status: Overdue</SelectItem>
                  <SelectItem value="awaiting">Payment status: Awaiting payment</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={resetFilters} className="h-12 rounded-xl border-crm-line bg-card px-5 font-bold text-crm-navy shadow-sm"><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
            </section>
          )}

          <TabsContent value="plans" className="mt-0">{renderPlansContent()}</TabsContent>
          <TabsContent value="cancellations" className="mt-0">{renderPlansContent(true)}</TabsContent>
          <TabsContent value="payments" className="mt-0 space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-crm-line/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedIds.length > 0 ? <span><strong className="text-crm-navy">{selectedIds.length}</strong> selected · <strong className="text-crm-orange">{money(selectedTotal)}</strong></span> : 'Select unpaid warranties to pay their invoices in one secure checkout.'}
              </div>
              <Button onClick={handlePaySelected} disabled={paying || selectedIds.length === 0} className="h-11 rounded-xl bg-crm-orange font-bold text-primary-foreground hover:bg-crm-orange/90">
                {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Pay selected
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl border-2 border-crm-line/70 bg-card crm-panel-shadow">
              {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-crm-orange" /></div> : unpaidRows.length === 0 ? (
                <div className="px-5 py-14 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-crm-green" /><h3 className="mt-4 text-lg font-bold text-crm-navy">All invoices are paid</h3><p className="mt-1 text-sm text-muted-foreground">There are no outstanding invoice payments.</p></div>
              ) : <>{renderPaymentTable(paginatedRows)}{renderPagination()}</>}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Warranty details</DialogTitle>
            <DialogDescription>Cover, payment and document details for <span className="font-bold uppercase">{detailRow?.registration_plate}</span>.</DialogDescription>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">{renderPaymentStatus(detailRow)}{renderCoverStatus(detailRow)}</div>
              <dl className="grid grid-cols-1 gap-x-5 gap-y-4 rounded-2xl border border-crm-line bg-muted/30 p-4 sm:grid-cols-2">
                {[
                  ['Customer', detailRow.name || '—'],
                  ['Email', detailRow.email || '—'],
                  ['Vehicle', [detailRow.vehicle_make, detailRow.vehicle_model].filter(Boolean).join(' ') || '—'],
                  ['Warranty number', detailRow.warranty_number || detailRow.policy_number || ref(detailRow.id)],
                  ['Cover', String(detailRow.plan_type).toLowerCase() === 'basic' ? 'Manage My Claim' : 'Comprehensive Warranty'],
                  ['Plan', displayWarrantyPlanName(detailRow.plan_type, '—')],
                  ['Duration', detailRow.payment_type ? `${detailRow.payment_type} months` : '—'],
                  ['Cover period', `${fmt(detailRow.warranty_start_date || detailRow.signup_date)} – ${fmt(computeEnd(detailRow))}`],
                  ['Claim limit', wholeMoney(detailRow.claim_limit)],
                  ['Voluntary excess', wholeMoney(detailRow.voluntary_excess)],
                  ['Labour rate', detailRow.labour_rate ? `${wholeMoney(detailRow.labour_rate)}/hr` : '—'],
                  ['Amount', money(detailRow.final_amount)],
                ].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-bold text-crm-navy">{value}</dd></div>)}
              </dl>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button variant="outline" className="rounded-xl" onClick={() => openEmailDialog(detailRow)}><Mail className="mr-2 h-4 w-4" />Email documents</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => downloadWarrantyPdf(detailRow, dealer?.name)}><FileText className="mr-2 h-4 w-4" />Warranty PDF</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => downloadInvoicePdf(detailRow, dealer?.name)}><Download className="mr-2 h-4 w-4" />Invoice PDF</Button>
              </div>
            </div>
          )}
          <DialogFooter>
            {!['cancelled', 'refunded'].includes(String(detailRow?.status || '').toLowerCase()) && !pendingCancel.has(detailRow?.id || '') && (
              <Button variant="ghost" className="text-crm-red" onClick={() => detailRow && openCancellationDialog(detailRow)}><XCircle className="mr-2 h-4 w-4" />Request cancellation</Button>
            )}
            <Button variant="outline" onClick={() => setDetailRow(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!emailRow} onOpenChange={(open) => !open && setEmailRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email warranty</DialogTitle>
            <DialogDescription>Send the warranty details for <span className="font-semibold uppercase">{emailRow?.registration_plate}</span> to your customer or to yourself.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Send to">
              {(['customer', 'me'] as const).map((target) => (
                <Button key={target} type="button" variant="outline" role="radio" aria-checked={emailTarget === target}
                  onClick={() => { setEmailTarget(target); setEmailTo(target === 'me' ? (dealer as any)?.email || '' : emailRow?.email || ''); }}
                  className={emailTarget === target ? 'border-crm-orange bg-crm-orange-soft font-bold text-crm-orange' : ''}>
                  {target === 'customer' ? 'Email customer' : 'Email myself'}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">{emailTarget === 'me' ? 'Your email' : 'Customer email'}</Label>
              <Input id="customer-email" type="email" value={emailTo} onChange={(event) => setEmailTo(event.target.value)} placeholder="name@example.com" className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-note">Personal message (optional)</Label>
              <Textarea id="customer-note" value={emailNote} onChange={(event) => setEmailNote(event.target.value)} rows={3} placeholder="Thanks for your purchase — here are your warranty details." className="bg-muted/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailRow(null)} disabled={sending}>Cancel</Button>
            <Button onClick={sendWarrantyToCustomer} disabled={sending} className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Send warranty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelRow} onOpenChange={(open) => !open && setCancelRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request cancellation</DialogTitle>
            <DialogDescription>For <span className="font-semibold uppercase">{cancelRow?.registration_plate}</span>. Panda Protect will review it, work out any cancellation fee or refund, and update the warranty.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancelling</Label>
            <Textarea id="cancel-reason" rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="e.g. Customer returned the vehicle" className="bg-muted/50" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelRow(null)} disabled={cancelling}>Back</Button>
            <Button onClick={submitCancellation} disabled={cancelling} className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90">
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DealerLayout>
  );
};

export default DealerWarrantiesList;
