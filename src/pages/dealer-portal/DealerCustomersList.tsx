import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { downloadInvoicePdf, downloadWarrantyPdf, type DealerPdfRow } from '@/lib/dealerPdf';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

type CustomerRow = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  building_name: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  registration_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  vehicle_fuel_type: string | null;
  mileage: string | null;
  plan_type: string | null;
  payment_type: string | null;
  final_amount: number | null;
  payment_status: string | null;
  payment_due_date: string | null;
  payment_collected_at: string | null;
  warranty_start_date?: string | null;
  policy_end_date?: string | null;
  signup_date: string | null;
  status: string | null;
  claim_limit: number | null;
  voluntary_excess: number | null;
  labour_rate: number | null;
  warranty_number: string | null;
  warranty_reference_number: string | null;
  tyre_cover: boolean | null;
  breakdown_recovery: boolean | null;
  mot_repair: boolean | null;
  mot_fee: boolean | null;
  wear_tear: boolean | null;
  europe_cover: boolean | null;
  transfer_cover: boolean | null;
  consequential: boolean | null;
};

type ClaimRow = {
  id: string;
  customer_id: string | null;
  claim_reference: string | null;
  registration_plate: string | null;
  registration_plate_normalized: string | null;
  customer_name: string | null;
  created_at: string;
  status: string | null;
};

type WarrantyStatus = 'Active' | 'Paused – Payment Due' | 'Expiring Soon' | 'Expired' | 'Cancelled';

type AffectedInvoice = {
  customerId: string;
  customer: string;
  vehicle: string;
  registration: string;
  amount: number;
};

const PAGE_SIZE = 6;
const SELECTED_CUSTOMER_FIELDS = `
  id,
  name,
  first_name,
  last_name,
  email,
  phone,
  street,
  building_name,
  town,
  county,
  postcode,
  country,
  registration_plate,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vehicle_fuel_type,
  mileage,
  plan_type,
  payment_type,
  final_amount,
  payment_status,
  payment_due_date,
  payment_collected_at,
  warranty_start_date,
  policy_end_date,
  signup_date,
  status,
  claim_limit,
  voluntary_excess,
  labour_rate,
  warranty_number,
  warranty_reference_number,
  tyre_cover,
  breakdown_recovery,
  mot_repair,
  mot_fee,
  wear_tear,
  europe_cover,
  transfer_cover,
  consequential
`;

const normaliseReg = (value?: string | null) => (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const displayReg = (value?: string | null) => normaliseReg(value) || '—';
const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatMoney = (value?: number | null) => `£${Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n.toLocaleString('en-GB') : String(value);
};
const invoiceRef = (id: string) => `INV-${id.replace(/-/g, '').slice(0, 5).toUpperCase()}`;
const planLabel = (plan?: string | null) => {
  const value = String(plan || '').toLowerCase();
  if (value.includes('dealer')) return 'Dealer-Paid Warranty';
  if (value.includes('full') || value.includes('gold') || value.includes('premium')) return 'Fully Covered';
  return plan ? plan.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : 'Fully Covered';
};
const sourceLabel = (paymentStatus?: string | null) => (paymentStatus === 'paid' ? 'Paid' : 'Invoice');

const addMonths = (value: string | null | undefined, months: number) => {
  if (!value || !months) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
};

const getStartDate = (customer: CustomerRow) => customer.warranty_start_date || customer.signup_date;
const getEndDate = (customer: CustomerRow) =>
  customer.policy_end_date || addMonths(getStartDate(customer), Number(customer.payment_type || 0));

const getCustomerName = (customer: CustomerRow) =>
  customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unnamed customer';

const getVehicleName = (customer: CustomerRow) =>
  [customer.vehicle_make, customer.vehicle_model].filter(Boolean).join(' ') || 'Vehicle';

const isPaymentDue = (customer: CustomerRow) => String(customer.payment_status || '').toLowerCase() !== 'paid';

const getWarrantyStatus = (customer: CustomerRow): WarrantyStatus => {
  if (isPaymentDue(customer)) return 'Paused – Payment Due';
  const status = String(customer.status || '').toLowerCase();
  if (status.includes('cancel')) return 'Cancelled';
  const end = getEndDate(customer);
  if (end) {
    const expiry = new Date(end);
    const now = new Date();
    if (!Number.isNaN(expiry.getTime())) {
      if (expiry.getTime() < now.getTime()) return 'Expired';
      const days = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
      if (days <= 45) return 'Expiring Soon';
    }
  }
  return 'Active';
};

const warrantyBadgeClass = (status: WarrantyStatus) => {
  if (status === 'Active') return 'border-green-200 bg-green-50 text-green-700';
  if (status === 'Paused – Payment Due') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'Expired') return 'border-slate-200 bg-slate-100 text-slate-600';
  if (status === 'Cancelled') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-orange-200 bg-orange-50 text-orange-700';
};

const paymentBadgeClass = (customer: CustomerRow) =>
  isPaymentDue(customer)
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-green-200 bg-green-50 text-green-700';

const claimStatusLabel = (status?: string | null) => {
  const value = String(status || '').toLowerCase();
  if (value === 'information_required') return 'Information required';
  if (value === 'approved' || value === 'closed' || value === 'completed') return 'Completed';
  if (value === 'declined') return 'Closed';
  return 'Under review';
};

const claimStatusClass = (label: string) => {
  if (label === 'Information required') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (label === 'Completed') return 'border-green-200 bg-green-50 text-green-700';
  if (label === 'Closed') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-sky-200 bg-sky-50 text-sky-700';
};

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 py-2 text-sm">
    <dt className="text-gray-500">{label}</dt>
    <dd className="min-w-0 font-semibold text-gray-900 break-words">{value || '—'}</dd>
  </div>
);

const DetailSection = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const RegistrationPlate = ({ value, compact = false }: { value?: string | null; compact?: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center justify-center rounded-md border border-yellow-300 bg-yellow-300 font-mono font-black tracking-wide text-slate-950 shadow-sm',
      compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
    )}
  >
    {displayReg(value)}
  </span>
);

const OverviewBlock = ({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'amber';
}) => (
  <div className={cn('rounded-lg border p-3', tone === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50')}>
    <p className={cn('text-[11px] font-semibold uppercase tracking-wide', tone === 'amber' ? 'text-amber-700' : 'text-gray-500')}>{label}</p>
    <p className="mt-1 truncate text-sm font-extrabold text-gray-900">{value}</p>
  </div>
);

const CustomerDetailDrawer = ({
  customer,
  claims,
  allCustomers,
  open,
  onOpenChange,
  dealerName,
  onPayInvoice,
  paying,
}: {
  customer: CustomerRow | null;
  claims: ClaimRow[];
  allCustomers: CustomerRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealerName?: string | null;
  onPayInvoice: (customerIds: string[]) => void;
  paying: boolean;
}) => {
  const navigate = useNavigate();
  const [showAffected, setShowAffected] = useState(false);

  if (!customer) return null;

  const name = getCustomerName(customer);
  const vehicle = getVehicleName(customer);
  const status = getWarrantyStatus(customer);
  const paymentDue = isPaymentDue(customer);
  const customerClaims = claims.filter((claim) => {
    const sameCustomer = claim.customer_id && claim.customer_id === customer.id;
    const sameReg = normaliseReg(claim.registration_plate || claim.registration_plate_normalized) === normaliseReg(customer.registration_plate);
    return sameCustomer || sameReg;
  });
  const affectedInvoice = allCustomers
    .filter((row) => row.id !== customer.id && isPaymentDue(row))
    .map<AffectedInvoice>((row) => ({
      customerId: row.id,
      customer: getCustomerName(row),
      vehicle: getVehicleName(row),
      registration: displayReg(row.registration_plate),
      amount: Number(row.final_amount || 0),
    }));
  const affectedRows = [
    {
      customerId: customer.id,
      customer: name,
      vehicle,
      registration: displayReg(customer.registration_plate),
      amount: Number(customer.final_amount || 0),
    },
    ...affectedInvoice,
  ];
  const startDate = getStartDate(customer);
  const endDate = getEndDate(customer);
  const duration = Number(customer.payment_type || 0) ? `${Number(customer.payment_type)} months` : '—';
  const canClaim = status === 'Active';
  const canPay = paymentDue;
  const address = [customer.building_name, customer.street, customer.town, customer.county, customer.postcode, customer.country]
    .filter(Boolean)
    .join('\n');
  const upgrades = [
    customer.tyre_cover ? 'Tyre cover' : null,
    customer.breakdown_recovery ? 'Breakdown recovery' : null,
    customer.mot_repair ? 'MOT repair' : null,
    customer.mot_fee ? 'MOT fee' : null,
    customer.wear_tear ? 'Wear and tear' : null,
    customer.europe_cover ? 'Europe cover' : null,
    customer.transfer_cover ? 'Transfer cover' : null,
    customer.consequential ? 'Consequential cover' : null,
  ].filter(Boolean);
  const pdfRow: DealerPdfRow = {
    id: customer.id,
    name,
    email: customer.email,
    registration_plate: customer.registration_plate,
    vehicle_make: customer.vehicle_make,
    vehicle_model: customer.vehicle_model,
    plan_type: customer.plan_type,
    payment_type: customer.payment_type,
    final_amount: customer.final_amount,
    payment_status: customer.payment_status,
    warranty_start_date: startDate,
    policy_end_date: endDate,
    signup_date: customer.signup_date,
    warranty_number: customer.warranty_number,
  };

  const handleMakeClaim = () => {
    const params = new URLSearchParams();
    if (customer.registration_plate) params.set('reg', displayReg(customer.registration_plate));
    if (customer.id) params.set('customerId', customer.id);
    navigate(`/dealer-portal/claims/new?${params.toString()}`);
  };

  const handlePay = () => onPayInvoice(affectedRows.map((row) => row.customerId));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-hidden p-0 sm:max-w-[720px] md:max-w-[740px]" side="right">
        <SheetHeader className="sr-only">
          <SheetTitle>{name}</SheetTitle>
          <SheetDescription>Dealer-facing customer details.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-full">
          <div className="flex min-h-screen flex-col bg-gray-50 sm:min-h-full">
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-[0.2em] text-crm-orange">CUSTOMER</p>
                  <h2 className="mt-1 truncate text-2xl font-black text-crm-navy">{name}</h2>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {vehicle} · <span className="font-mono uppercase">{displayReg(customer.registration_plate)}</span>
                  </p>
                </div>
                <Badge className={cn('mt-1 shrink-0 border font-bold', warrantyBadgeClass(status))}>{status}</Badge>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                {canClaim && (
                  <Button onClick={handleMakeClaim} className="bg-crm-orange text-white hover:bg-crm-orange/90">
                    Make claim <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
                {canPay && (
                  <Button onClick={handlePay} disabled={paying} className="bg-crm-orange text-white hover:bg-crm-orange/90">
                    {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Pay invoice <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
                {status !== 'Active' && !canPay && (
                  <Button variant="outline" onClick={() => downloadWarrantyPdf(pdfRow, dealerName || undefined)}>
                    <FileText className="mr-2 h-4 w-4" /> View warranty
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="More customer actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem onClick={() => downloadWarrantyPdf(pdfRow, dealerName || undefined)}>
                      <FileText className="mr-2 h-4 w-4" /> View warranty
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadInvoicePdf(pdfRow, dealerName || undefined)}>
                      <Download className="mr-2 h-4 w-4" /> View invoice
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex-1 space-y-4 px-4 py-4 pb-24 sm:px-6">
              {paymentDue && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-extrabold text-amber-900">Payment required</h3>
                      <p className="mt-1 text-sm text-amber-800">
                        This warranty is paused because an invoice is outstanding. Claims cannot be submitted until payment is received.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={handlePay} disabled={paying} className="bg-crm-orange text-white hover:bg-crm-orange/90">
                          Pay invoice <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(pdfRow, dealerName || undefined)}>
                          View invoice
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <OverviewBlock label="Warranty" value={planLabel(customer.plan_type)} />
                <OverviewBlock label="Vehicle" value={vehicle} />
                <OverviewBlock label="Payment" value={paymentDue ? 'Overdue' : 'Paid'} tone={paymentDue ? 'amber' : 'default'} />
                <OverviewBlock label="Expiry" value={formatDate(endDate)} />
              </div>

              <DetailSection
                title="Contact details"
                action={
                  <Button variant="ghost" size="sm" className="text-crm-orange hover:text-crm-orange">
                    <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit details
                  </Button>
                }
              >
                <dl className="divide-y divide-gray-100">
                  <DetailRow label="Name" value={name} />
                  <DetailRow label="Email" value={customer.email || '—'} />
                  <DetailRow label="Phone" value={customer.phone || '—'} />
                  <DetailRow label="Address" value={<span className="whitespace-pre-line">{address || '—'}</span>} />
                </dl>
              </DetailSection>

              <DetailSection title="Vehicle">
                <dl className="divide-y divide-gray-100">
                  <DetailRow label="Registration" value={<RegistrationPlate value={customer.registration_plate} />} />
                  <DetailRow label="Make" value={customer.vehicle_make || '—'} />
                  <DetailRow label="Model" value={customer.vehicle_model || '—'} />
                  <DetailRow label="Year" value={customer.vehicle_year || '—'} />
                  <DetailRow label="Fuel" value={customer.vehicle_fuel_type || '—'} />
                  <DetailRow label="Current mileage" value={customer.mileage ? `${formatNumber(customer.mileage)} miles` : '—'} />
                  <DetailRow label="Registration date" value="—" />
                </dl>
              </DetailSection>

              <DetailSection title="Warranty">
                <dl className="divide-y divide-gray-100">
                  <DetailRow label="Warranty type" value={planLabel(customer.plan_type)} />
                  <DetailRow label="Duration" value={duration} />
                  <DetailRow label="Start date" value={formatDate(startDate)} />
                  <DetailRow label="Expiry date" value={formatDate(endDate)} />
                  <DetailRow label="Voluntary excess" value={customer.voluntary_excess !== null ? `£${customer.voluntary_excess}` : '£50'} />
                  <DetailRow label="Claim limit" value={customer.claim_limit ? `£${Number(customer.claim_limit).toLocaleString('en-GB')}` : '£1,000'} />
                  <DetailRow label="Labour rate" value={customer.labour_rate ? `£${customer.labour_rate}/hr` : '£70/hr'} />
                  {upgrades.length > 0 && <DetailRow label="Optional upgrades" value={upgrades.join(', ')} />}
                </dl>
              </DetailSection>

              <DetailSection title="Payment">
                <dl className="divide-y divide-gray-100">
                  <DetailRow label="Status" value={<Badge className={cn('border font-bold', paymentBadgeClass(customer))}>{paymentDue ? 'Overdue' : 'Paid'}</Badge>} />
                  <DetailRow label={paymentDue ? 'Amount due' : 'Price'} value={formatMoney(customer.final_amount)} />
                  <DetailRow label="Invoice" value={invoiceRef(customer.id)} />
                  {paymentDue ? (
                    <>
                      <DetailRow label="Invoice date" value={formatDate(customer.signup_date)} />
                      <DetailRow label="Due date" value={formatDate(customer.payment_due_date)} />
                    </>
                  ) : (
                    <>
                      <DetailRow label="Purchase date" value={formatDate(customer.signup_date)} />
                      <DetailRow label="Payment date" value={formatDate(customer.payment_collected_at || customer.signup_date)} />
                    </>
                  )}
                </dl>

                {paymentDue && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p>This warranty is paused until payment is received.</p>
                    <p>Claims are unavailable while the warranty is paused.</p>
                    {affectedRows.length > 1 && (
                      <div className="mt-3 border-t border-amber-200 pt-3">
                        <p className="font-bold">This invoice affects {affectedRows.length} warranties.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                          onClick={() => setShowAffected((value) => !value)}
                        >
                          View affected warranties
                        </Button>
                        {showAffected && (
                          <div className="mt-3 space-y-2">
                            {affectedRows.map((row) => (
                              <div key={row.customerId} className="rounded-md bg-white px-3 py-2 text-xs text-amber-900">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold">{row.customer}</span>
                                  <span>{formatMoney(row.amount)}</span>
                                </div>
                                <div className="mt-0.5 text-amber-700">
                                  {row.registration} · {row.vehicle}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </DetailSection>

              <DetailSection
                title="Claims"
                action={
                  canClaim ? (
                    <Button variant="ghost" size="sm" onClick={handleMakeClaim} className="text-crm-orange hover:text-crm-orange">
                      Make a claim <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  ) : null
                }
              >
                {paymentDue && (
                  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Claims unavailable while payment is outstanding.
                  </p>
                )}
                {customerClaims.length === 0 ? (
                  <p className="text-sm text-gray-500">No claims submitted</p>
                ) : (
                  <div className="space-y-2">
                    {customerClaims.map((claim) => {
                      const statusLabel = claimStatusLabel(claim.status);
                      return (
                        <div key={claim.id} className="rounded-lg border border-gray-200 p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-mono text-sm font-black text-gray-900">{claim.claim_reference || '—'}</p>
                              <p className="text-xs text-gray-500">Submitted: {formatDate(claim.created_at)}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={cn('border', claimStatusClass(statusLabel))}>{statusLabel}</Badge>
                              {statusLabel === 'Information required' ? (
                                <Button size="sm" variant="outline" onClick={() => navigate('/dealer-portal/claims')}>
                                  <Upload className="mr-1 h-3.5 w-3.5" /> Provide information
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => navigate('/dealer-portal/claims')}>
                                  <Eye className="mr-1 h-3.5 w-3.5" /> View claim
                                </Button>
                              )}
                            </div>
                          </div>
                          {statusLabel === 'Information required' && (
                            <p className="mt-2 text-sm text-amber-700">
                              Our claims team needs some additional information to continue reviewing this claim.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </DetailSection>

              <DetailSection title="Documents">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button variant="outline" className="justify-between" onClick={() => downloadWarrantyPdf(pdfRow, dealerName || undefined)}>
                    Warranty schedule <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="justify-between" onClick={() => downloadWarrantyPdf(pdfRow, dealerName || undefined)}>
                    Warranty terms <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="justify-between" onClick={() => downloadInvoicePdf(pdfRow, dealerName || undefined)}>
                    Invoice <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="justify-between" onClick={() => downloadWarrantyPdf(pdfRow, dealerName || undefined)}>
                    Certificate <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </DetailSection>

              <DetailSection
                title="Dealer notes"
                action={
                  <Button variant="ghost" size="sm" className="text-crm-orange hover:text-crm-orange">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add note
                  </Button>
                }
              >
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">No dealer notes added.</p>
              </DetailSection>
            </div>

            {(canClaim || canPay) && (
              <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-3 shadow-lg sm:hidden">
                {canClaim ? (
                  <Button onClick={handleMakeClaim} className="w-full bg-crm-orange text-white hover:bg-crm-orange/90">
                    Make claim <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handlePay} disabled={paying} className="w-full bg-crm-orange text-white hover:bg-crm-orange/90">
                    {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Pay invoice
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

const DealerCustomersList = () => {
  const { dealer } = useDealerAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [warrantyFilter, setWarrantyFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [paying, setPaying] = useState(false);

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['dealer-customers-warranty-list', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data, error } = await (supabase as any)
        .from('customers')
        .select(SELECTED_CUSTOMER_FIELDS)
        .eq('dealer_id', dealer.id)
        .is('deleted_at', null)
        .order('signup_date', { ascending: false });
      if (error) throw error;
      return (data || []) as CustomerRow[];
    },
    enabled: !!dealer?.id,
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['dealer-customer-claims-summary', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data, error } = await supabase
        .from('dealer_admin_claims')
        .select('id, customer_id, claim_reference, registration_plate, registration_plate_normalized, customer_name, created_at, status')
        .eq('dealer_id', dealer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ClaimRow[];
    },
    enabled: !!dealer?.id,
  });

  const claimCountFor = (customer: CustomerRow) =>
    claims.filter((claim) => {
      const sameCustomer = claim.customer_id && claim.customer_id === customer.id;
      const sameReg = normaliseReg(claim.registration_plate || claim.registration_plate_normalized) === normaliseReg(customer.registration_plate);
      return sameCustomer || sameReg;
    }).length;

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return customers.filter((customer) => {
      const warrantyStatus = getWarrantyStatus(customer);
      const paymentStatus = isPaymentDue(customer) ? 'overdue' : 'paid';
      const plan = planLabel(customer.plan_type).toLowerCase();
      const source = sourceLabel(customer.payment_status).toLowerCase();
      const matchesSearch =
        !q ||
        getCustomerName(customer).toLowerCase().includes(q) ||
        (customer.email || '').toLowerCase().includes(q) ||
        (customer.phone || '').toLowerCase().includes(q) ||
        (customer.registration_plate || '').toLowerCase().includes(q) ||
        getVehicleName(customer).toLowerCase().includes(q);
      const matchesWarranty = warrantyFilter === 'all' || warrantyStatus.toLowerCase().includes(warrantyFilter);
      const matchesPayment = paymentFilter === 'all' || paymentStatus === paymentFilter;
      const matchesType = typeFilter === 'all' || plan.includes(typeFilter);
      const matchesSource = sourceFilter === 'all' || source === sourceFilter;
      return matchesSearch && matchesWarranty && matchesPayment && matchesType && matchesSource;
    });
  }, [customers, paymentFilter, q, sourceFilter, typeFilter, warrantyFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [search, warrantyFilter, paymentFilter, typeFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCount = customers.filter((customer) => getWarrantyStatus(customer) === 'Active').length;
  const pausedCount = customers.filter((customer) => getWarrantyStatus(customer) === 'Paused – Payment Due').length;
  const expiredCount = customers.filter((customer) => ['Expired', 'Cancelled'].includes(getWarrantyStatus(customer))).length;

  const handlePayInvoice = async (customerIds: string[]) => {
    if (!dealer?.id || customerIds.length === 0) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('dealer-pay-invoices', {
        body: { dealer_id: dealer.id, customer_ids: customerIds },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to open invoice payment');
      setPaying(false);
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') {
      toast.success('Payment received — customer warranty status refreshed.');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dealer-customer-claims-summary', dealer?.id] });
    }
  }, [dealer?.id, queryClient, refetch]);

  return (
    <DealerLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.28em] text-crm-orange">CUSTOMERS</p>
            <h1 className="mt-1 text-3xl font-black text-crm-navy sm:text-4xl">Customers</h1>
            <p className="mt-1 text-base text-gray-600">View and manage your customer warranties.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="bg-white">
              <Upload className="mr-2 h-4 w-4" /> Import customers
            </Button>
            <Button className="bg-crm-orange text-white hover:bg-crm-orange/90">
              <Plus className="mr-2 h-4 w-4" /> Add customer
            </Button>
          </div>
        </div>

        <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_180px_180px_150px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, registration, email or phone..."
              className="h-11 bg-white pl-10"
            />
          </div>
          <Select value={warrantyFilter} onValueChange={setWarrantyFilter}>
            <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Warranty status" /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Warranty status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Payment status" /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Payment status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Warranty type" /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Warranty type</SelectItem>
              <SelectItem value="fully">Fully Covered</SelectItem>
              <SelectItem value="dealer">Dealer-Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Source</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Users className="h-6 w-6" /></div>
              <div><p className="text-sm text-gray-500">Total customers</p><p className="text-2xl font-black text-crm-navy">{customers.length.toLocaleString('en-GB')}</p></div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-50 p-3 text-green-600"><CheckCircle2 className="h-6 w-6" /></div>
              <div><p className="text-sm text-gray-500">Active warranties</p><p className="text-2xl font-black text-crm-navy">{activeCount.toLocaleString('en-GB')}</p></div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-orange-50 p-3 text-crm-orange"><AlertTriangle className="h-6 w-6" /></div>
              <div><p className="text-sm text-crm-orange">Paused (payment due)</p><p className="text-2xl font-black text-crm-navy">{pausedCount.toLocaleString('en-GB')}</p></div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-red-50 p-3 text-red-600"><XCircle className="h-6 w-6" /></div>
              <div><p className="text-sm text-gray-500">Expired warranties</p><p className="text-2xl font-black text-crm-navy">{expiredCount.toLocaleString('en-GB')}</p></div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-crm-navy">
                <tr>
                  <th className="w-10 px-4 py-3"><span className="block h-4 w-4 rounded border border-gray-300" /></th>
                  <th className="px-4 py-3 text-left font-bold">Name</th>
                  <th className="px-4 py-3 text-left font-bold">Reg. Number</th>
                  <th className="px-4 py-3 text-left font-bold">Vehicle</th>
                  <th className="px-4 py-3 text-left font-bold">Warranty</th>
                  <th className="px-4 py-3 text-left font-bold">Start Date</th>
                  <th className="px-4 py-3 text-left font-bold">Expiry Date</th>
                  <th className="px-4 py-3 text-left font-bold">Payment Status</th>
                  <th className="px-4 py-3 text-left font-bold">Warranty Status</th>
                  <th className="px-4 py-3 text-center font-bold">Claims</th>
                  <th className="px-4 py-3 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && (
                  <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-crm-orange" />Loading customers...</td></tr>
                )}
                {!isLoading && visible.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-500">No customers found.</td></tr>
                )}
                {visible.map((customer) => {
                  const status = getWarrantyStatus(customer);
                  const paymentDue = isPaymentDue(customer);
                  return (
                    <tr
                      key={customer.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <td className="px-4 py-3"><span className="block h-4 w-4 rounded border border-gray-300" /></td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-crm-navy">{getCustomerName(customer)}</div>
                        <div className="text-xs text-gray-500">{customer.email || '—'}</div>
                        <div className="text-xs text-gray-500">{customer.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3"><RegistrationPlate value={customer.registration_plate} compact /></td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-crm-navy">{getVehicleName(customer)}</div>
                        <div className="text-xs text-gray-500">{[customer.vehicle_year, customer.vehicle_fuel_type].filter(Boolean).join(' · ') || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-crm-navy">{planLabel(customer.plan_type)}</td>
                      <td className="px-4 py-3 text-crm-navy">{formatDate(getStartDate(customer))}</td>
                      <td className="px-4 py-3 text-crm-navy">{formatDate(getEndDate(customer))}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn('border font-bold', paymentBadgeClass(customer))}>
                          {paymentDue ? <AlertTriangle className="mr-1 h-3.5 w-3.5" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                          {paymentDue ? 'Payment due' : 'Paid'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3"><Badge className={cn('border font-bold', warrantyBadgeClass(status))}>{status}</Badge></td>
                      <td className="px-4 py-3 text-center font-bold text-crm-navy">{claimCountFor(customer)}</td>
                      <td className="px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" aria-label={`Actions for ${getCustomerName(customer)}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white">
                            <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                              <Eye className="mr-2 h-4 w-4" /> View customer
                            </DropdownMenuItem>
                            {status === 'Active' && (
                              <DropdownMenuItem onClick={() => {
                                const params = new URLSearchParams();
                                if (customer.registration_plate) params.set('reg', displayReg(customer.registration_plate));
                                params.set('customerId', customer.id);
                                window.location.assign(`/dealer-portal/claims/new?${params.toString()}`);
                              }}>
                                <ShieldCheck className="mr-2 h-4 w-4" /> Make claim
                              </DropdownMenuItem>
                            )}
                            {paymentDue && (
                              <DropdownMenuItem onClick={() => handlePayInvoice([customer.id])}>
                                <CreditCard className="mr-2 h-4 w-4" /> Pay invoice
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString('en-GB')} customers
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={safePage === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="rounded-md bg-crm-orange px-3 py-2 font-bold text-white">{safePage}</span>
              <Button variant="outline" size="icon" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      <CustomerDetailDrawer
        customer={selectedCustomer}
        claims={claims}
        allCustomers={customers}
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
        dealerName={dealer?.name || dealer?.company_name}
        onPayInvoice={handlePayInvoice}
        paying={paying}
      />
    </DealerLayout>
  );
};

export default DealerCustomersList;
