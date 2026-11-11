import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
import { Download, FileText, CreditCard, Loader2, Mail, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const ref = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();

const DealerWarrantiesList = () => {
  const { dealer } = useDealerAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = ['payments', 'cancellations'].includes(searchParams.get('tab') || '')
    ? searchParams.get('tab') || 'plans' : 'plans';
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState(false);
  const [emailRow, setEmailRow] = useState<DealerPdfRow | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [sending, setSending] = useState(false);

  const [emailTarget, setEmailTarget] = useState<'customer' | 'me'>('customer');
  const [cancelRow, setCancelRow] = useState<DealerPdfRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const { data: pendingCancelIds = [], refetch: refetchCancels } = useQuery({
    queryKey: ['dealer-cancel-requests', dealer?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from('dealer_cancellation_requests').select('customer_id').eq('status', 'pending');
      return ((data || []) as { customer_id: string }[]).map((r) => r.customer_id);
    },
    enabled: !!dealer?.id,
  });
  const pendingCancel = useMemo(() => new Set(pendingCancelIds), [pendingCancelIds]);

  const submitCancellation = async () => {
    if (!cancelRow || !dealer?.id) return;
    if (cancelReason.trim().length < 3) { toast.error('Please give a reason for the cancellation'); return; }
    setCancelling(true);
    const { error } = await (supabase as any).from('dealer_cancellation_requests')
      .insert({ dealer_id: dealer.id, customer_id: cancelRow.id, reason: cancelReason.trim() });
    setCancelling(false);
    if (error) { toast.error(error.code === '23505' ? 'A cancellation request is already pending for this warranty' : error.message); return; }
    toast.success('Cancellation request sent to Panda Protect');
    setCancelRow(null);
    refetchCancels();
  };

  const openEmailDialog = (r: DealerPdfRow) => {
    setEmailRow(r);
    setEmailTarget('customer');
    setEmailTo(r.email || '');
    setEmailNote('');
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
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to send warranty email');
    } finally {
      setSending(false);
    }
  };


  // Toast on Stripe redirect back
  React.useEffect(() => {
    if (searchParams.get('paid') === '1') {
      toast.success('Payment received — your invoices are now marked paid.');
    } else if (searchParams.get('paid') === '0') {
      toast.info('Payment cancelled.');
    }
  }, [searchParams]);

  const { data: rows = [], refetch } = useQuery({
    queryKey: ['dealer-plans', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('dealer_id', dealer.id)
        .order('signup_date', { ascending: false });
      return ((data || []) as unknown) as DealerPdfRow[];
    },
    enabled: !!dealer?.id,
  });

  const isPaid = (r: DealerPdfRow) => r.payment_status === 'paid';
  const cancellationRows = useMemo(() => rows.filter((r) =>
    ['cancelled', 'refunded'].includes(String((r as any).status || '').trim().toLowerCase())), [rows]);
  const visiblePlans = activeTab === 'cancellations' ? cancellationRows : rows;
  const paidRows = useMemo(() => rows.filter(isPaid), [rows]);
  const unpaidRows = useMemo(() => rows.filter((r) => !isPaid(r)), [rows]);
  const unpaidIds = useMemo(() => unpaidRows.map((r) => r.id), [unpaidRows]);

  // Compute expiry from start + payment_type (months) when policy_end_date is missing
  const computeEnd = (r: DealerPdfRow): string | null => {
    if (r.policy_end_date) return r.policy_end_date;
    const start = r.warranty_start_date || r.signup_date;
    const months = parseInt(String(r.payment_type || '0'), 10);
    if (!start || !months) return null;
    const d = new Date(start);
    d.setMonth(d.getMonth() + months);
    return d.toISOString();
  };
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedTotal = useMemo(
    () =>
      rows
        .filter((r) => selected[r.id] && r.payment_status !== 'paid')
        .reduce((sum, r) => sum + Number(r.final_amount || 0), 0),
    [rows, selected],
  );

  const allSelected = unpaidIds.length > 0 && unpaidIds.every((id) => selected[id]);
  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      unpaidIds.forEach((id) => (next[id] = true));
      setSelected(next);
    }
  };

  const renderStatus = (r: DealerPdfRow) => {
    const st = getDealerPaymentState(r);
    const sty = DEALER_PAYMENT_STYLES[st.key];
    return (
      <div>
        <Badge className={`${sty.className} font-bold whitespace-nowrap`}>{sty.label}</Badge>
        {st.dueDate && <div className="text-[11px] text-gray-500 mt-1 whitespace-nowrap">Due {st.dueDate.toLocaleDateString('en-GB')}</div>}
      </div>
    );
  };

  const counts = useMemo(() => {
    const c = { paid: 0, due: 0, overdue: 0, awaiting: 0 } as Record<DealerPaymentKey, number>;
    const owed = { due: 0, overdue: 0 };
    rows.forEach((r) => {
      const k = getDealerPaymentState(r).key;
      c[k]++;
      if (k === 'due' || k === 'overdue') owed[k] += Number(r.final_amount || 0);
    });
    return { c, owed };
  }, [rows]);

  const renderActiveStatus = (r: DealerPdfRow) => {
    const s = String((r as any).status || '').toLowerCase();
    if (s === 'active') return <Badge className="bg-green-500 text-white">Active</Badge>;
    if (s === 'expired') return <Badge className="bg-gray-600 text-gray-800">Expired</Badge>;
    if (s === 'cancelled') return <Badge className="bg-red-500/20 text-red-300 border border-red-500/40">Cancelled</Badge>;
    return <Badge className="bg-gray-700 text-gray-700">{(r as any).status || 'Pending'}</Badge>;
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
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to start payment');
      setPaying(false);
    }
  };

  return (
    <DealerLayout>
      {/* Dark header band */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-5 lg:px-6 py-5 sm:py-8 mb-5 sm:mb-6 text-center sm:text-left">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-orange-500">DEALER PLANS</h1>
            <span className="text-orange-500 text-2xl">◆</span>
          </div>
          <p className="text-gray-600 text-sm">
            All warranty plans you've issued, plus payment status for outstanding invoices.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {(['paid', 'due', 'overdue', 'awaiting'] as DealerPaymentKey[]).map((k) => (
          <div key={k} className="bg-white border border-gray-200 rounded-lg p-4">
            <Badge className={`${DEALER_PAYMENT_STYLES[k].className} font-bold`}>{DEALER_PAYMENT_STYLES[k].label}</Badge>
            <div className="text-2xl font-extrabold text-gray-900 mt-2">{counts.c[k]}</div>
            {(k === 'due' || k === 'overdue') && (
              <div className="text-xs text-gray-500">£{counts.owed[k].toFixed(2)} owed</div>
            )}
          </div>
        ))}
      </div>
      {counts.c.overdue > 0 && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>{counts.c.overdue} overdue invoice{counts.c.overdue === 1 ? '' : 's'}.</strong> Warranties linked to an unpaid invoice may be paused and claims unavailable until payment is received.
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(tab) => {
        setSearchParams((previous) => {
          const next = new URLSearchParams(previous);
          if (tab === 'plans') next.delete('tab');
          else next.set('tab', tab);
          return next;
        });
      }} className="space-y-6">
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
        <TabsList className="min-w-full w-max h-auto bg-white border border-gray-200">
          <TabsTrigger
            value="plans"
            className="min-h-11 shrink-0 data-[state=active]:bg-orange-500 data-[state=active]:text-white text-gray-700 font-bold tracking-wide"
          >
            All plans ({rows.length})
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="min-h-11 shrink-0 data-[state=active]:bg-orange-500 data-[state=active]:text-white text-gray-700 font-bold tracking-wide"
          >
            Payments ({unpaidIds.length} unpaid)
          </TabsTrigger>
          <TabsTrigger value="cancellations" className="min-h-11 shrink-0 font-bold text-foreground data-[state=active]:bg-crm-orange data-[state=active]:text-primary-foreground">
            Cancellations ({cancellationRows.length})
          </TabsTrigger>
        </TabsList>
        </div>

        {/* PLANS TAB */}
        <TabsContent value={activeTab === 'cancellations' ? 'cancellations' : 'plans'}>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {visiblePlans.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-12">
                {activeTab === 'cancellations' ? 'No cancellations yet.' : 'No plans yet.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 hover:bg-transparent bg-gray-100/40">
                      <TableHead className="text-gray-700 font-bold">Customer</TableHead>
                      <TableHead className="text-gray-700 font-bold">Vehicle</TableHead>
                      <TableHead className="text-gray-700 font-bold">Plan</TableHead>
                      <TableHead className="text-gray-700 font-bold">Start</TableHead>
                      <TableHead className="text-gray-700 font-bold">End</TableHead>
                      <TableHead className="text-gray-700 font-bold text-right">Amount</TableHead>
                      <TableHead className="text-gray-700 font-bold">Payment</TableHead>
                      <TableHead className="text-gray-700 font-bold">Status</TableHead>
                      <TableHead className="text-gray-700 font-bold text-right">Send to customer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePlans.map((w) => (
                      <TableRow key={w.id} className="border-gray-200 hover:bg-gray-100">
                        <TableCell className="font-medium text-gray-900">
                          <div>{w.name}</div>
                          <div className="text-xs text-gray-500">{w.email}</div>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          <div className="font-mono uppercase">{w.registration_plate}</div>
                          {(w.vehicle_make || w.vehicle_model) && (
                            <div className="text-xs text-gray-500">{w.vehicle_make} {w.vehicle_model}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-700 min-w-[190px]">
                          <div className="font-semibold text-gray-900">
                            {String(w.plan_type).toLowerCase() === 'basic' ? 'Manage My Claim' : 'Comprehensive Warranty'}
                          </div>
                          <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-xs text-gray-600">
                            <span>Duration</span><span className="font-medium text-gray-800">{w.payment_type ? `${w.payment_type} months` : '—'}</span>
                            <span>Claim limit</span><span className="font-medium text-gray-800">{(w as any).claim_limit ? `£${Number((w as any).claim_limit).toLocaleString('en-GB')}` : '—'}</span>
                            <span>Excess</span><span className="font-medium text-gray-800">{(w as any).voluntary_excess != null ? `£${Number((w as any).voluntary_excess)}` : '—'}</span>
                            <span>Labour rate</span><span className="font-medium text-gray-800">{(w as any).labour_rate ? `£${Number((w as any).labour_rate)}/hr` : '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">{fmt(w.warranty_start_date || w.signup_date)}</TableCell>
                        <TableCell className="text-gray-700">{fmt(computeEnd(w))}</TableCell>
                        <TableCell className="text-right text-gray-900 font-semibold">£{Number(w.final_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{renderStatus(w)}</TableCell>
                        <TableCell>{renderActiveStatus(w)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEmailDialog(w)}
                            className="border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {w.payment_status === 'paid' ? 'Resend documents' : 'Email warranty'}
                          </Button>
                          {pendingCancel.has(w.id) ? (
                            <span className="text-xs font-semibold text-orange-700">Cancellation requested</span>
                          ) : !['cancelled', 'refunded'].includes(String((w as any).status || '').toLowerCase()) && (
                            <Button size="sm" variant="ghost" className="text-gray-600 hover:text-red-600 text-xs h-7" onClick={() => { setCancelRow(w); setCancelReason(''); }}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />Request cancellation
                            </Button>
                          )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="text-sm text-gray-600">
              {selectedIds.length > 0 ? (
                <span>
                  <span className="text-gray-900 font-bold">{selectedIds.length}</span> selected ·{' '}
                  <span className="text-orange-600 font-bold">£{selectedTotal.toFixed(2)}</span>
                </span>
              ) : (
                <span>Select unpaid plans to pay them in one Stripe checkout.</span>
              )}
            </div>
            <Button
              onClick={handlePaySelected}
              disabled={paying || selectedIds.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold tracking-wide"
            >
              {paying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Pay for Selected
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {unpaidRows.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-12">
                No unpaid invoices — all dealer plans are paid.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 hover:bg-transparent bg-orange-500">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                          className="border-white data-[state=checked]:bg-white data-[state=checked]:text-orange-500"
                        />
                      </TableHead>
                      <TableHead className="!text-white font-extrabold tracking-wider">REF</TableHead>
                      <TableHead className="!text-white font-extrabold tracking-wider">STATUS</TableHead>
                      <TableHead className="!text-white font-extrabold tracking-wider">ACTIVATION</TableHead>
                      <TableHead className="!text-white font-extrabold tracking-wider">EXPIRY</TableHead>
                      <TableHead className="!text-white font-extrabold tracking-wider">VEHICLE</TableHead>
                      <TableHead className="!text-white font-extrabold tracking-wider">CUSTOMER</TableHead>
                      <TableHead className="!text-white font-extrabold tracking-wider">PRODUCT</TableHead>
                      <TableHead className="!text-white font-extrabold tracking-wider text-right">PRICE</TableHead>
                      <TableHead className="!text-white font-extrabold tracking-wider text-right">DOCS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidRows.map((r, idx) => {
                      const unpaid = r.payment_status !== 'paid';
                      return (
                        <TableRow
                          key={r.id}
                          className={`border-gray-200 hover:bg-gray-100 ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-white/60'
                          }`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={!!selected[r.id]}
                              disabled={!unpaid}
                              onCheckedChange={(v) =>
                                setSelected((s) => ({ ...s, [r.id]: !!v }))
                              }
                              className="border-gray-300 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-orange-600 font-bold">
                            {ref(r.id)}
                          </TableCell>
                          <TableCell>{renderStatus(r)}</TableCell>
                          <TableCell className="text-gray-700">{fmt(r.warranty_start_date || r.signup_date)}</TableCell>
                          <TableCell className="text-gray-700">{fmt(computeEnd(r))}</TableCell>
                          <TableCell className="text-gray-700 uppercase">
                            <div className="font-mono text-gray-900">{r.registration_plate || '—'}</div>
                            <div className="text-xs text-gray-500">
                              {[r.vehicle_make, r.vehicle_model].filter(Boolean).join(' ')}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700">{r.name || '—'}</TableCell>
                          <TableCell className="text-gray-700 capitalize">
                            {r.plan_type || '—'}
                          </TableCell>
                          <TableCell className="text-right text-gray-900 font-bold">
                            £{Number(r.final_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Download invoice"
                                onClick={() => downloadInvoicePdf(r, dealer?.name)}
                                className="h-8 w-8 text-gray-700 hover:text-orange-600 hover:bg-gray-100"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Download warranty"
                                onClick={() => downloadWarrantyPdf(r, dealer?.name)}
                                className="h-8 w-8 text-gray-700 hover:text-orange-600 hover:bg-gray-100"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!emailRow} onOpenChange={(o) => !o && setEmailRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email warranty</DialogTitle>
            <DialogDescription>
              Sends the warranty details for{' '}
              <span className="font-semibold uppercase">{emailRow?.registration_plate}</span> to your customer or to yourself.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Send to">
              {(['customer', 'me'] as const).map((k) => (
                <Button key={k} type="button" variant="outline" role="radio" aria-checked={emailTarget === k}
                  onClick={() => { setEmailTarget(k); setEmailTo(k === 'me' ? (dealer as any)?.email || '' : emailRow?.email || ''); }}
                  className={emailTarget === k ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold' : ''}>
                  {k === 'customer' ? 'Email customer' : 'Email myself'}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">{emailTarget === 'me' ? 'Your email' : 'Customer email'}</Label>
              <Input
                id="customer-email"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="name@example.com"
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-note">Personal message (optional)</Label>
              <Textarea
                id="customer-note"
                value={emailNote}
                onChange={(e) => setEmailNote(e.target.value)}
                rows={3}
                placeholder="Thanks for your purchase — here are your warranty details."
                className="bg-gray-100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailRow(null)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={sendWarrantyToCustomer} disabled={sending} className="bg-orange-500 hover:bg-orange-600 text-white">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Send warranty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelRow} onOpenChange={(o) => !o && setCancelRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request cancellation</DialogTitle>
            <DialogDescription>
              For <span className="font-semibold uppercase">{cancelRow?.registration_plate}</span>. Panda Protect will review it, work out any cancellation fee or refund, and update the warranty.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancelling</Label>
            <Textarea id="cancel-reason" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Customer returned the vehicle" className="bg-gray-100" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelRow(null)} disabled={cancelling}>Back</Button>
            <Button onClick={submitCancellation} disabled={cancelling} className="bg-orange-500 hover:bg-orange-600 text-white">
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DealerLayout>
  );
};

export default DealerWarrantiesList;
