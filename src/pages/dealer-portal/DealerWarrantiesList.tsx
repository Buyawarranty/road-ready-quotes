import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  CarFront,
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
  UserRound,
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
import { downloadInvoicePdf, type DealerPdfRow } from '@/lib/dealerPdf';
import { compareDealerInvoiceDueDates, DEALER_PAYMENT_STYLES, getDealerPaymentState, type DealerPaymentKey } from '@/lib/dealerPaymentStatus';
import { isCountedDealerSale, isOutstandingDealerInvoice } from '@/lib/dealerSales';
import { displayWarrantyPlanName } from '@/lib/warrantyPlanDisplay';
import DealerRegistrationPlate from '@/components/dealer/DealerRegistrationPlate';
import { dealerVehicleSpecification, dealerVehicleSummary, mergeWarrantyVehicleLookup, shouldLookupWarrantyVehicle } from '@/lib/dealerWarrantyVehicle';
import platinumPlanDoc from '@/assets/panda-protect-platinum-warranty-plan.pdf.asset.json';
import termsDoc from '@/assets/panda-protect-terms-and-conditions.pdf.asset.json';
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
import { functionErrorMessage } from '@/lib/functionError';
import { DEALER_CANCELLATION_REASONS, formatDealerCancellationReason } from '@/lib/dealerCancellationReasons';

type WarrantyRow = DealerPdfRow & {
  status?: string | null;
  claim_limit?: number | string | null;
  voluntary_excess?: number | string | null;
  labour_rate?: number | string | null;
  policy_number?: string | null;
  vehicle_year?: string | number | null;
  vehicle_fuel_type?: string | null;
  vehicle_transmission?: string | null;
};

type WarrantyEmailPreview = {
  from: string;
  reply_to: string;
  to: string[];
  subject: string;
  html: string;
};

type CoverFilter = 'all' | 'active' | 'pending' | 'expired' | 'cancelled';

const PAGE_SIZE = 20;
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const ref = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();
const money = (value?: number | string | null) => `£${Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const wholeMoney = (value?: number | string | null) => value == null || value === '' ? '—' : `£${Number(value).toLocaleString('en-GB')}`;
const warrantyRef = (row: WarrantyRow) => row.warranty_number || row.policy_number || ref(row.id);
const activationDate = (row: WarrantyRow) => row.warranty_start_date || row.signup_date;
const coverName = (row: WarrantyRow) => String(row.plan_type).toLowerCase() === 'basic' ? 'Manage My Claim' : 'Comprehensive Warranty';
const productName = (row: WarrantyRow) => displayWarrantyPlanName(row.plan_type, '—');

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
  if (key === 'pending') {
    const status = String(row.status || '').trim();
    return !status || status.toLowerCase() === 'pending' ? 'Awaiting activation' : status.replace(/_/g, ' ');
  }
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

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-bold text-crm-navy">{value}</dd></div>;
}

function DetailSection({ icon: Icon, title, tone = 'orange', children }: { icon: LucideIcon; title: string; tone?: 'orange' | 'blue' | 'green'; children: React.ReactNode }) {
  const tones = {
    orange: 'bg-crm-orange-soft text-crm-orange',
    blue: 'bg-crm-blue-soft text-crm-blue',
    green: 'bg-crm-green-soft text-crm-green',
  };
  return (
    <section className="rounded-2xl border border-crm-line bg-card p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-crm-navy">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
        {title}
      </h3>
      <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 min-[420px]:grid-cols-2">{children}</dl>
    </section>
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
        {filtered ? 'Try a different search or reset the filters.' : cancellations ? 'Cancellation requests and cancelled or refunded warranties will appear here. To request one, open a warranty in All warranties and tap Request cancellation.' : 'Create your first warranty to see its cover, payment and documents here.'}
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
  const [emailPreview, setEmailPreview] = useState<WarrantyEmailPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [cancelRow, setCancelRow] = useState<WarrantyRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetails, setCancelDetails] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [detailRow, setDetailRow] = useState<WarrantyRow | null>(null);
  const [vehicleLookup, setVehicleLookup] = useState<{ id: string; status: 'loading' | 'error' } | null>(null);
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
    () => rows.filter((row) => pendingCancel.has(row.id) || ['cancelled', 'refunded'].includes(String(row.status || '').trim().toLowerCase())),
    [rows, pendingCancel],
  );
  const unpaidRows = useMemo(
    () => rows.filter((row) => isCountedDealerSale(row) && isOutstandingDealerInvoice(row)).sort(compareDealerInvoiceDueDates),
    [rows],
  );
  const activeCoverCount = useMemo(() => rows.filter((row) => getCoverKey(row) === 'active').length, [rows]);
  const overdueCount = useMemo(() => unpaidRows.filter((row) => getDealerPaymentState(row).key === 'overdue').length, [unpaidRows]);
  const outstandingTotal = useMemo(() => unpaidRows.reduce((sum, row) => sum + Number(row.final_amount || 0), 0), [unpaidRows]);
  const nextDueRow = unpaidRows[0];
  const nextDueDate = nextDueRow ? getDealerPaymentState(nextDueRow).dueDate : null;

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

  React.useEffect(() => {
    if (!emailRow) {
      setEmailPreview(null);
      setPreviewError('');
      setPreviewLoading(false);
      return;
    }
    const recipient = emailTo.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient)) {
      setEmailPreview(null);
      setPreviewError('Enter a valid email address to see the preview.');
      setPreviewLoading(false);
      return;
    }

    let active = true;
    setEmailPreview(null);
    setPreviewError('');
    setPreviewLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('dealer-send-customer-warranty', {
          body: {
            action: 'preview',
            customer_id: emailRow.id,
            to_email: recipient,
            recipient_type: emailTarget,
            message: emailNote.trim() || undefined,
          },
        });
        if (error) throw new Error(await functionErrorMessage(error));
        if (data?.error) throw new Error(data.error);
        if (active) setEmailPreview(data.preview as WarrantyEmailPreview);
      } catch (error) {
        if (active) setPreviewError(error instanceof Error ? error.message : 'The email preview could not be loaded.');
      } finally {
        if (active) setPreviewLoading(false);
      }
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [emailRow, emailRow?.id, emailTarget, emailTo, emailNote]);

  const selectedIds = useMemo(() => unpaidRows.filter((row) => selected[row.id]).map((row) => row.id), [unpaidRows, selected]);
  const selectedTotal = useMemo(
    () => unpaidRows.filter((row) => selected[row.id]).reduce((sum, row) => sum + Number(row.final_amount || 0), 0),
    [unpaidRows, selected],
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
    const reason = formatDealerCancellationReason(cancelReason, cancelDetails);
    if (!reason) {
      toast.error(cancelReason === 'Other reason' ? 'Please add details for the cancellation' : 'Please select a cancellation reason');
      return;
    }
    setCancelling(true);
    const { data, error } = await supabase.functions.invoke('dealer-request-cancellation', {
      body: { customer_id: cancelRow.id, reason },
    });
    setCancelling(false);
    if (error || !data?.success) {
      const message = data?.error || (error ? await functionErrorMessage(error) : 'Could not send the cancellation request');
      toast.error(message);
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
    setEmailPreview(null);
    setPreviewError('');
  };

  const openCancellationDialog = (row: WarrantyRow) => {
    setDetailRow(null);
    setCancelRow(row);
    setCancelReason('');
    setCancelDetails('');
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
        body: {
          action: 'send',
          customer_id: emailRow.id,
          to_email: emailTo.trim(),
          recipient_type: emailTarget,
          message: emailNote.trim() || undefined,
        },
      });
      if (error) throw new Error(await functionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      toast.success(`Warranty emailed to ${data?.sent_to || emailTo.trim()}`);
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
        body: { dealer_id: dealer.id, customer_ids: selectedIds, return_path: '/dealer-portal/invoicing' },
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

  const openWarrantyDetails = (row: WarrantyRow) => {
    setDetailRow(row);
    if (!shouldLookupWarrantyVehicle(row)) {
      setVehicleLookup(null);
      return;
    }
    setVehicleLookup({ id: row.id, status: 'loading' });
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('dvla-vehicle-lookup', {
          body: { registrationNumber: String(row.registration_plate || '').replace(/\s/g, '') },
        });
        if (error || !data?.make) throw new Error('Vehicle details unavailable');
        setDetailRow((current) => current?.id === row.id ? mergeWarrantyVehicleLookup(current, data) : current);
        setVehicleLookup((current) => current?.id === row.id ? null : current);
      } catch {
        setVehicleLookup((current) => current?.id === row.id ? { id: row.id, status: 'error' } : current);
      }
    })();
  };

  const renderActions = (row: WarrantyRow, mobile = false) => (
    <div className={`flex items-center gap-2 ${mobile ? 'w-full' : 'justify-end'}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openWarrantyDetails(row)}
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
          <DropdownMenuItem asChild>
            <a href={platinumPlanDoc.url} download="Panda-Protect-Platinum-Warranty-Plan.pdf"><ShieldCheck className="mr-2 h-4 w-4" />Platinum warranty plan</a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={termsDoc.url} download="Panda-Protect-Terms-and-Conditions.pdf"><FileText className="mr-2 h-4 w-4" />Terms & Conditions</a>
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
    <div className="space-y-3 p-3 2xl:hidden">
      {data.map((row) => (
        <article key={row.id} className="rounded-2xl border-2 border-crm-line/70 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DealerRegistrationPlate registration={row.registration_plate} slim className="w-36" />
              <p className="mt-2 text-sm text-muted-foreground">{dealerVehicleSummary(row)}</p>
              <p className="mt-1 font-mono text-xs font-semibold text-muted-foreground">Ref {warrantyRef(row)}</p>
            </div>
            <p className="shrink-0 text-lg font-extrabold text-crm-navy">{money(row.final_amount)}</p>
          </div>
          <div className="mt-4 space-y-1">
            <p className="font-bold text-crm-navy">{row.name || '—'}</p>
            <p className="break-all text-sm text-muted-foreground">{row.email || '—'}</p>
          </div>
          <div className="mt-4 border-t border-crm-line pt-4">
            <p className="font-bold text-crm-navy">{coverName(row)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Product {productName(row)} · {row.payment_type ? `${row.payment_type} months` : '—'} · Claim limit {wholeMoney(row.claim_limit)}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div><dt className="text-muted-foreground">Activation</dt><dd className="mt-1 font-semibold text-crm-navy">{fmt(activationDate(row))}</dd></div>
              <div><dt className="text-muted-foreground">Inception</dt><dd className="mt-1 font-semibold text-crm-navy">{fmt(row.warranty_start_date || row.signup_date)}</dd></div>
              <div><dt className="text-muted-foreground">Expiry</dt><dd className="mt-1 font-semibold text-crm-navy">{fmt(computeEnd(row))}</dd></div>
            </dl>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{renderPaymentStatus(row)}{renderCoverStatus(row)}</div>
          <div className="mt-4">{renderActions(row, true)}</div>
        </article>
      ))}
    </div>
  );

  const renderWarrantyTable = (data: WarrantyRow[]) => (
    <div className="hidden overflow-x-auto 2xl:block">
      <Table className="min-w-[1740px]">
        <TableHeader>
          <TableRow className="border-crm-line bg-muted/50 hover:bg-muted/50">
            <TableHead className="px-5 py-4 font-bold text-crm-navy">Reference</TableHead>
            <TableHead className="font-bold text-crm-navy">Customer</TableHead>
            <TableHead className="font-bold text-crm-navy">Vehicle / reg no.</TableHead>
            <TableHead className="min-w-[140px] font-bold text-crm-navy">Product</TableHead>
            <TableHead className="min-w-[230px] font-bold text-crm-navy">Cover</TableHead>
            <TableHead className="whitespace-nowrap font-bold text-crm-navy">Activation</TableHead>
            <TableHead className="whitespace-nowrap font-bold text-crm-navy">Inception</TableHead>
            <TableHead className="whitespace-nowrap font-bold text-crm-navy">Expiry</TableHead>
            <TableHead className="font-bold text-crm-navy">Price</TableHead>
            <TableHead className="font-bold text-crm-navy">Payment</TableHead>
            <TableHead className="font-bold text-crm-navy">Cover status</TableHead>
            <TableHead className="sticky right-0 z-20 min-w-[190px] bg-muted pr-5 text-right font-bold text-crm-navy">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id} className="group border-crm-line bg-card hover:bg-crm-orange-soft/30">
              <TableCell className="px-5 py-5 align-top font-mono text-sm font-bold text-crm-orange">{warrantyRef(row)}</TableCell>
              <TableCell className="align-top">
                <p className="font-bold text-crm-navy">{row.name || '—'}</p>
                <p className="mt-1 max-w-[190px] break-all text-sm text-muted-foreground">{row.email || '—'}</p>
              </TableCell>
              <TableCell className="align-top">
                <DealerRegistrationPlate registration={row.registration_plate} slim className="w-36" />
                <p className="mt-2 max-w-[210px] text-sm text-muted-foreground">{dealerVehicleSummary(row)}</p>
              </TableCell>
              <TableCell className="align-top">
                <p className="font-bold text-crm-navy">{productName(row)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{row.payment_type ? `${row.payment_type} months` : '—'}</p>
              </TableCell>
              <TableCell className="align-top">
                <p className="font-bold text-crm-navy">{coverName(row)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Claim limit {wholeMoney(row.claim_limit)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Excess {wholeMoney(row.voluntary_excess)} · Labour rate {row.labour_rate ? `${wholeMoney(row.labour_rate)}/hr` : '—'}</p>
              </TableCell>
              <TableCell className="whitespace-nowrap align-top text-sm font-medium text-crm-navy">{fmt(activationDate(row))}</TableCell>
              <TableCell className="whitespace-nowrap align-top text-sm font-medium text-crm-navy">{fmt(row.warranty_start_date || row.signup_date)}</TableCell>
              <TableCell className="whitespace-nowrap align-top text-sm font-medium text-crm-navy">{fmt(computeEnd(row))}</TableCell>
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
                  <div><DealerRegistrationPlate registration={row.registration_plate} slim className="w-36" /><p className="mt-2 text-sm text-muted-foreground">{row.name || '—'}</p></div>
                  <p className="font-extrabold text-crm-navy">{money(row.final_amount)}</p>
                </div>
                <p className="mt-3 text-xs font-semibold text-crm-orange">Invoice {ref(row.id)}</p>
                <div className="mt-3">{renderPaymentStatus(row)}</div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-muted-foreground">Issued</dt><dd className="mt-1 font-semibold text-crm-navy">{fmt(row.signup_date)}</dd></div>
                  <div><dt className="text-muted-foreground">Payment due</dt><dd className="mt-1 font-semibold text-crm-navy">{fmt(getDealerPaymentState(row).dueDate?.toISOString())}</dd></div>
                </dl>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => downloadInvoicePdf(row, dealer?.name)}><Download className="mr-2 h-4 w-4" />Invoice</Button>
                  <Button asChild variant="outline" className="rounded-xl"><a href={platinumPlanDoc.url} download="Panda-Protect-Platinum-Warranty-Plan.pdf"><ShieldCheck className="mr-2 h-4 w-4" />Warranty plan</a></Button>
                  <Button asChild variant="outline" className="col-span-2 rounded-xl"><a href={termsDoc.url} download="Panda-Protect-Terms-and-Conditions.pdf"><FileText className="mr-2 h-4 w-4" />Terms & Conditions</a></Button>
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
              <TableHead className="whitespace-nowrap font-bold text-crm-navy">Issued</TableHead>
              <TableHead className="whitespace-nowrap font-bold text-crm-navy">Payment due</TableHead>
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
                <TableCell><DealerRegistrationPlate registration={row.registration_plate} slim className="w-36" /><p className="mt-2 text-sm text-muted-foreground">{dealerVehicleSummary(row)}</p></TableCell>
                <TableCell className="whitespace-nowrap text-sm text-crm-navy">{fmt(row.signup_date)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm font-semibold text-crm-navy">{fmt(getDealerPaymentState(row).dueDate?.toISOString())}</TableCell>
                <TableCell className="font-extrabold text-crm-navy">{money(row.final_amount)}</TableCell>
                <TableCell>{renderPaymentStatus(row)}</TableCell>
                <TableCell className="sticky right-0 z-10 bg-card pr-5 group-hover:bg-crm-orange-soft"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title="Download invoice" onClick={() => downloadInvoicePdf(row, dealer?.name)} className="rounded-xl text-crm-navy hover:text-crm-orange"><Download className="h-4 w-4" /></Button><Button asChild size="icon" variant="ghost" title="Download Platinum warranty plan" className="rounded-xl text-crm-navy hover:text-crm-orange"><a href={platinumPlanDoc.url} download="Panda-Protect-Platinum-Warranty-Plan.pdf"><ShieldCheck className="h-4 w-4" /></a></Button><Button asChild size="icon" variant="ghost" title="Download Terms & Conditions" className="rounded-xl text-crm-navy hover:text-crm-orange"><a href={termsDoc.url} download="Panda-Protect-Terms-and-Conditions.pdf"><FileText className="h-4 w-4" /></a></Button></div></TableCell>
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
            <h1 className="text-3xl font-extrabold tracking-tight text-crm-navy sm:text-4xl">{activeTab === 'payments' ? 'Invoicing' : activeTab === 'cancellations' ? 'Cancellations' : 'Dealer warranties'}</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{activeTab === 'payments' ? 'See what is due, when it is due and pay your outstanding account invoices.' : activeTab === 'cancellations' ? 'Track cancellation requests you have sent and warranties that have been cancelled or refunded. To cancel a warranty, open it in All warranties and tap Request cancellation.' : 'Manage customer cover, payments and documents.'}</p>
          </div>
          <Button asChild className="h-12 w-full rounded-xl bg-crm-orange px-5 text-base font-bold text-primary-foreground shadow-sm hover:bg-crm-orange/90 sm:w-auto">
            <Link to="/dealer-portal/quote/pricing"><Plus className="mr-2 h-5 w-5" />New warranty</Link>
          </Button>
        </header>

        <section aria-label={activeTab === 'payments' ? 'Invoicing summary' : 'Warranty summary'} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {activeTab === 'payments' ? (
            <>
              <StatCard icon={ReceiptText} label="Outstanding invoices" value={unpaidRows.length} />
              <StatCard icon={Coins} label="Total outstanding" value={money(outstandingTotal)} />
              <StatCard icon={Clock3} label="Overdue invoices" value={overdueCount} />
              <StatCard icon={CalendarDays} label={nextDueDate ? `Next due · ${fmt(nextDueDate.toISOString())}` : 'Next payment due'} value={nextDueRow ? money(nextDueRow.final_amount) : '—'} />
            </>
          ) : (
            <>
              <StatCard icon={FileText} label="Total plans" value={rows.length} />
              <StatCard icon={ShieldCheck} label="Active cover" value={activeCoverCount} green />
              <StatCard icon={ReceiptText} label="Unpaid invoices" value={unpaidRows.length} />
              <StatCard icon={Coins} label="Outstanding" value={money(outstandingTotal)} />
            </>
          )}
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
                { value: 'payments', label: `Invoicing (${unpaidRows.length})` },
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
                  <SelectItem value="pending">Cover status: Awaiting activation</SelectItem>
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
                {selectedIds.length > 0 ? <span><strong className="text-crm-navy">{selectedIds.length}</strong> selected · <strong className="text-crm-orange">{money(selectedTotal)}</strong></span> : 'Select outstanding account invoices to pay them in one secure checkout.'}
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

      <Dialog open={!!detailRow} onOpenChange={(open) => { if (!open) { setDetailRow(null); setVehicleLookup(null); } }}>
        <DialogContent className="dealer-crm sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Warranty details</DialogTitle>
            <DialogDescription>Vehicle, cover, payment and official warranty documents.</DialogDescription>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-crm-orange/25 bg-crm-orange-soft p-4 text-center">
                <DealerRegistrationPlate registration={detailRow.registration_plate} className="mx-auto max-w-xs" />
                <p className="mt-4 flex items-center justify-center gap-2 text-base font-extrabold text-crm-navy"><CarFront className="h-5 w-5 shrink-0 text-crm-orange" aria-hidden="true" />{dealerVehicleSummary(detailRow)}</p>
                {dealerVehicleSpecification(detailRow) && <p className="mt-1 text-sm text-muted-foreground">{dealerVehicleSpecification(detailRow)}</p>}
                {vehicleLookup?.id === detailRow.id && vehicleLookup.status === 'loading' && <p role="status" className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-crm-navy"><Loader2 className="h-4 w-4 animate-spin text-crm-orange" />Retrieving vehicle details…</p>}
                {vehicleLookup?.id === detailRow.id && vehicleLookup.status === 'error' && <p role="status" className="mt-3 text-sm text-muted-foreground">The vehicle lookup could not add any further details for this registration.</p>}
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <section className="rounded-xl border border-crm-amber/20 bg-crm-amber-soft p-3.5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-crm-gold-deep">Payment</h3>
                  {renderPaymentStatus(detailRow)}
                </section>
                <section className="rounded-xl border border-crm-blue/15 bg-crm-blue-soft p-3.5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-crm-navy">Cover status</h3>
                  {renderCoverStatus(detailRow)}
                </section>
              </div>

              <div className="space-y-3">
                <DetailSection icon={UserRound} title="Customer & warranty">
                  <DetailItem label="Customer" value={detailRow.name || '—'} />
                  <DetailItem label="Email" value={detailRow.email || '—'} />
                  <DetailItem label="Reference" value={warrantyRef(detailRow)} />
                  <DetailItem label="Product" value={productName(detailRow)} />
                </DetailSection>
                <DetailSection icon={ShieldCheck} title="Warranty cover" tone="green">
                  <DetailItem label="Cover" value={coverName(detailRow)} />
                  <DetailItem label="Duration" value={detailRow.payment_type ? `${detailRow.payment_type} months` : '—'} />
                  <DetailItem label="Claim limit" value={wholeMoney(detailRow.claim_limit)} />
                  <DetailItem label="Voluntary excess" value={wholeMoney(detailRow.voluntary_excess)} />
                  <DetailItem label="Labour rate" value={detailRow.labour_rate ? `${wholeMoney(detailRow.labour_rate)}/hr` : '—'} />
                  <DetailItem label="Amount" value={money(detailRow.final_amount)} />
                </DetailSection>
                <DetailSection icon={CalendarDays} title="Cover dates" tone="blue">
                  <DetailItem label="Activation" value={fmt(activationDate(detailRow))} />
                  <DetailItem label="Inception" value={fmt(detailRow.warranty_start_date || detailRow.signup_date)} />
                  <DetailItem label="Expiry" value={fmt(computeEnd(detailRow))} />
                </DetailSection>
              </div>

              <section className="rounded-2xl border border-crm-orange/20 bg-crm-orange-soft/60 p-4">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-crm-navy"><FileText className="h-5 w-5 text-crm-orange" aria-hidden="true" />Documents & actions</h3>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button asChild variant="outline" className="h-auto min-h-11 justify-start rounded-xl bg-card px-3 text-left">
                    <a href={platinumPlanDoc.url} download="Panda-Protect-Platinum-Warranty-Plan.pdf"><ShieldCheck className="mr-2 h-4 w-4 shrink-0 text-crm-orange" />Platinum warranty plan<Download className="ml-auto h-4 w-4 shrink-0" /></a>
                  </Button>
                  <Button asChild variant="outline" className="h-auto min-h-11 justify-start rounded-xl bg-card px-3 text-left">
                    <a href={termsDoc.url} download="Panda-Protect-Terms-and-Conditions.pdf"><FileText className="mr-2 h-4 w-4 shrink-0 text-crm-orange" />Terms & Conditions<Download className="ml-auto h-4 w-4 shrink-0" /></a>
                  </Button>
                  <Button variant="outline" className="h-auto min-h-11 justify-start rounded-xl bg-card px-3" onClick={() => openEmailDialog(detailRow)}><Mail className="mr-2 h-4 w-4 shrink-0 text-crm-orange" />Email documents</Button>
                  <Button variant="outline" className="h-auto min-h-11 justify-start rounded-xl bg-card px-3" onClick={() => downloadInvoicePdf(detailRow, dealer?.name)}><ReceiptText className="mr-2 h-4 w-4 shrink-0 text-crm-orange" />Invoice PDF<Download className="ml-auto h-4 w-4 shrink-0" /></Button>
                </div>
              </section>
            </div>
          )}
          <DialogFooter>
            {!['cancelled', 'refunded'].includes(String(detailRow?.status || '').toLowerCase()) && !pendingCancel.has(detailRow?.id || '') && (
              <Button variant="ghost" className="text-crm-red" onClick={() => detailRow && openCancellationDialog(detailRow)}><XCircle className="mr-2 h-4 w-4" />Request cancellation</Button>
            )}
            <Button variant="outline" onClick={() => { setDetailRow(null); setVehicleLookup(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!emailRow} onOpenChange={(open) => !open && !sending && setEmailRow(null)}>
        <DialogContent className="dealer-crm !w-[min(52rem,calc(100vw-2rem))] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Email warranty</DialogTitle>
            <DialogDescription>Preview the exact email for <span className="font-semibold uppercase">{emailRow?.registration_plate}</span>, then send it to your customer or to yourself.</DialogDescription>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-email">{emailTarget === 'me' ? 'Your email' : 'Customer email'}</Label>
                <Input id="customer-email" type="email" value={emailTo} onChange={(event) => setEmailTo(event.target.value)} placeholder="name@example.com" className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-note">Personal message (optional)</Label>
                <Textarea id="customer-note" value={emailNote} maxLength={1000} onChange={(event) => setEmailNote(event.target.value)} rows={2} placeholder="Thanks for your purchase — here are your warranty details." className="bg-muted/50" />
              </div>
            </div>

            <div className="rounded-xl border border-crm-line bg-muted/20 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-crm-orange" />
                <h3 className="text-base font-bold text-crm-navy">Email preview</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">This is the exact Panda Protect email that will be sent. It updates as you type.</p>
              {previewLoading && <div className="flex h-72 flex-col items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin text-crm-orange" />Preparing preview…</div>}
              {!previewLoading && emailPreview && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1 break-words text-xs text-muted-foreground">
                    <p><strong className="text-crm-navy">From:</strong> {emailPreview.from}</p>
                    <p><strong className="text-crm-navy">To:</strong> {emailPreview.to.join(', ')}</p>
                    <p><strong className="text-crm-navy">Subject:</strong> {emailPreview.subject}</p>
                  </div>
                  <iframe title="Warranty email preview" sandbox="" srcDoc={emailPreview.html} className="h-80 w-full rounded-lg border bg-background" />
                </div>
              )}
              {!previewLoading && !emailPreview && previewError && <p role="alert" className="mt-3 rounded-lg border border-crm-red/25 bg-crm-red-soft p-3 text-sm font-medium text-crm-red">{previewError}</p>}
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-0 flex-row justify-end gap-2 border-t bg-background p-4 sm:-mx-6 sm:-mb-6 sm:px-6">
            <Button variant="outline" onClick={() => setEmailRow(null)} disabled={sending}>Cancel</Button>
            <Button onClick={sendWarrantyToCustomer} disabled={sending || previewLoading || !emailPreview} className="min-w-40 bg-crm-orange text-primary-foreground hover:bg-crm-orange/90">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              {sending ? 'Sending…' : emailTarget === 'me' ? 'Send to myself' : 'Send to customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelRow} onOpenChange={(open) => !open && setCancelRow(null)}>
        <DialogContent className="dealer-crm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request cancellation</DialogTitle>
            <DialogDescription>For <span className="font-semibold uppercase">{cancelRow?.registration_plate}</span>. Panda Protect will review it, work out any cancellation fee or refund, and update the warranty.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancelling</Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger id="cancel-reason"><SelectValue placeholder="Select a cancellation reason" /></SelectTrigger>
              <SelectContent>{DEALER_CANCELLATION_REASONS.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent>
            </Select>
            <Label htmlFor="cancel-details">{cancelReason === 'Other reason' ? 'Details' : 'Additional details (optional)'}</Label>
            <Textarea id="cancel-details" rows={3} value={cancelDetails} onChange={(event) => setCancelDetails(event.target.value)} className="bg-muted/50" />
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
