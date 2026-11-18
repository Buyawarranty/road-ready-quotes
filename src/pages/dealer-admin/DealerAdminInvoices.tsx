import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BillingAddress, billingFromDealer } from '@/lib/dealerBilling';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Download, Mail, Link2, Copy, FileText, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawInvoiceHeader, drawInvoiceFooter, loadInvoiceLogo } from '@/lib/dealerPdf';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DEALER_PAYMENT_OPTIONS, DEALER_PAYMENT_STYLES, getDealerPaymentState } from '@/lib/dealerPaymentStatus';
import { displayWarrantyPlanName } from '@/lib/warrantyPlanDisplay';
import { dealerSaleAmount, dealerSalePaymentLabel, isCompletedDealerSale, isCountedDealerSale, isOutstandingDealerInvoice } from '@/lib/dealerSales';
import { functionErrorMessage } from '@/lib/functionError';

interface UnpaidRow {
  id: string;
  name: string;
  email: string;
  registration_plate: string | null;
  signup_date: string;
  final_amount: number | null;
  payment_status: string | null;
  stripe_session_id?: string | null;
  plan_type?: string | null;
  payment_type?: string | null;
  dealer_id: string;
  dealer_company?: string;
  dealer_email?: string | null;
  dealer_billing?: BillingAddress | null;
}

interface Group {
  dealer_id: string;
  dealer_company: string;
  dealer_email: string | null;
  dealer_billing: BillingAddress | null;
  rows: UnpaidRow[];
  total: number;
}

const money = (n: number) => `£${Number(n || 0).toFixed(2)}`;

const buildInvoiceHtml = (g: Group, r: UnpaidRow, invoiceNumber: string) => `
  <html><body style="font-family:Arial,sans-serif;color:#333;padding:24px;max-width:700px;margin:0 auto">
    <h1 style="color:#f97316;margin:0 0 4px">Invoice ${invoiceNumber}</h1>
    <p style="margin:0 0 16px;font-size:13px;color:#666">Panda Protect · ${new Date().toLocaleDateString('en-GB')}</p>
    <p style="font-size:14px"><strong>Billed to:</strong> ${g.dealer_company}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
      <tr style="background:#f97316;color:#fff"><th style="padding:10px;text-align:left">Customer</th><th style="padding:10px;text-align:left">Vehicle</th><th style="padding:10px;text-align:left">Plan</th><th style="padding:10px;text-align:right">Amount</th></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #eee">${r.name || ''}</td><td style="padding:10px;border-bottom:1px solid #eee">${r.registration_plate || ''}</td><td style="padding:10px;border-bottom:1px solid #eee">${displayWarrantyPlanName(r.plan_type)}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${money(Number(r.final_amount ?? 0))}</td></tr>
    </table>
    <p style="margin-top:20px;font-size:13px;color:#666">Please settle this invoice using the payment link provided, or contact support@pandaprotect.co.uk.</p>
  </body></html>`;

const DealerAdminInvoices: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<UnpaidRow[]>([]);
  const [paidRows, setPaidRows] = useState<UnpaidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<UnpaidRow | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: customers, error: customersError }, { data: dealers, error: dealersError }] = await Promise.all([
      supabase
        .from('customers')
        .select('id, name, email, registration_plate, signup_date, final_amount, payment_status, stripe_session_id, plan_type, payment_type, dealer_id, status')
        .eq('brand', 'pandaprotect')
        .not('dealer_id', 'is', null)
        .order('signup_date', { ascending: false }),
      supabase
        .from('dealers')
        .select('id, company_name, email, first_name, last_name, address_line1, address_line2, city, county, postcode, country_code'),
    ]);
    if (customersError || dealersError) {
      console.error('Dealer invoices failed to load:', customersError || dealersError);
      setLoadError(true);
      setLoading(false);
      return;
    }
    const dealerMap = new Map((dealers || []).map((d: any) => [d.id, d]));
    const sales = (customers || []).filter(isCountedDealerSale).map((c: any) => ({
      ...c,
      dealer_company: dealerMap.get(c.dealer_id)?.company_name || '—',
      dealer_email: dealerMap.get(c.dealer_id)?.email || null,
      dealer_billing: dealerMap.get(c.dealer_id) ? billingFromDealer(dealerMap.get(c.dealer_id)) : null,
    })) as UnpaidRow[];
    setRows(sales.filter(isOutstandingDealerInvoice));
    setPaidRows(sales.filter(isCompletedDealerSale));
    setLoadError(false);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    rows.forEach((r) => {
      const g = map.get(r.dealer_id) || {
        dealer_id: r.dealer_id,
        dealer_company: r.dealer_company || '—',
        dealer_email: r.dealer_email || null,
        dealer_billing: r.dealer_billing || null,
        rows: [],
        total: 0,
      };
      g.rows.push(r);
      g.total += Number(r.final_amount ?? 0);
      map.set(r.dealer_id, g);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  const confirmPayment = async (row: UnpaidRow) => {
    setBusy(`pay-${row.id}`);
    const { data, error } = await supabase.functions.invoke('dealer-confirm-invoice-payment', { body: { customer_id: row.id } });
    setBusy(null);
    setConfirmRow(null);
    if (error || (data as any)?.error) {
      const description = (data as any)?.error || (error ? await functionErrorMessage(error) : 'Please try again.');
      toast({ title: 'Payment could not be confirmed', description, variant: 'destructive' });
      return;
    }
    const completed = { ...row, payment_status: 'paid' };
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setPaidRows((prev) => [completed, ...prev.filter((r) => r.id !== row.id)]);
    const emailFailed = (data as any)?.email && !(data as any).email.success;
    toast({
      title: 'Payment confirmed',
      description: emailFailed
        ? `${money(dealerSaleAmount(row))} collected and the sale moved to completed sales. Receipt emails need attention.`
        : `${money(dealerSaleAmount(row))} collected — the quote, warranty and completed-sale history are updated.`,
      variant: emailFailed ? 'destructive' : 'default',
    });
  };

  const setStatus = async (row: UnpaidRow, value: string) => {
    if (value === 'paid') { setConfirmRow(row); return; }
    if (!['invoice_pending', 'overdue'].includes(value)) return;
    setBusy(`status-${row.id}`);
    const { error } = await supabase.from('customers').update({ payment_status: value }).eq('id', row.id);
    setBusy(null);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, payment_status: value } : r)));
    toast({ title: 'Status updated', description: 'The dealer will see this on their warranties page.' });
  };

  const emailInvoice = async (g: Group, only?: UnpaidRow) => {
    if (!g.dealer_email) {
      toast({ title: 'No dealer email', description: 'This dealer has no email address on file.', variant: 'destructive' });
      return;
    }
    const target = only ? [only] : g.rows;
    const total = target.reduce((s, r) => s + Number(r.final_amount ?? 0), 0);
    setBusy(only ? `email-${only.id}` : `email-${g.dealer_id}`);
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoices = target.map((r, i) => {
      const invoiceNumber = `PP-${stamp}-${String(i + 1).padStart(3, '0')}`;
      return {
        customerId: r.id,
        customerName: r.name || '',
        customerEmail: r.email || '',
        customerPhone: '',
        customerAddress: '',
        invoiceNumber,
        invoiceDate: new Date().toLocaleDateString('en-GB'),
        purchaseDate: new Date(r.signup_date).toLocaleDateString('en-GB'),
        planType: r.plan_type || 'Warranty',
        vehicleMake: '',
        vehicleModel: '',
        registrationPlate: r.registration_plate || '',
        paymentType: r.payment_type || '',
        amount: Number(r.final_amount ?? 0),
        warrantyNumber: '',
        invoiceHtml: buildInvoiceHtml(g, r, invoiceNumber),
      };
    });

    const { data, error } = await supabase.functions.invoke('send-invoice-email', {
      body: {
        recipientEmail: g.dealer_email,
        subject: `Panda Protect invoice — ${g.dealer_company} (${money(total)} outstanding)`,
        invoices,
      },
    });
    setBusy(null);
    if (error || (data as any)?.success === false) {
      toast({ title: 'Email failed', description: (data as any)?.error || error?.message || 'Could not send invoice', variant: 'destructive' });
      return;
    }
    toast({ title: 'Invoice sent', description: `Emailed to ${g.dealer_email}` });
  };

  const downloadPdf = async (g: Group, only?: UnpaidRow) => {
    const target = only ? [only] : g.rows;
    const total = target.reduce((s, r) => s + Number(r.final_amount ?? 0), 0);
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = only
      ? `PP-${stamp}-${only.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
      : `PP-${stamp}-${g.dealer_company.replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase()}`;

    const logo = await loadInvoiceLogo();
    const doc = new jsPDF();
    drawInvoiceHeader(doc, invoiceNumber, new Date().toLocaleDateString('en-GB'), logo);
    doc.setFillColor(15, 38, 71); doc.rect(16, 66, 178, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    doc.text('BILL TO', 20, 70.8);
    doc.setFillColor(247, 249, 251); doc.rect(16, 73, 178, 18, 'F');
    doc.setTextColor(15, 38, 71); doc.setFontSize(10); doc.text(g.dealer_company || 'Dealer account', 20, 80);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(91, 104, 121);
    if (g.dealer_email) doc.text(g.dealer_email, 20, 86);

    autoTable(doc, {
      startY: 97,
      head: [['Date', 'Customer', 'Registration', 'Plan', 'Amount']],
      body: target.map((r) => [
        new Date(r.signup_date).toLocaleDateString('en-GB'),
        r.name || '—',
        (r.registration_plate || '—').toUpperCase(),
        displayWarrantyPlanName(r.plan_type),
        money(Number(r.final_amount ?? 0)),
      ]),
      theme: 'plain',
      headStyles: { fillColor: [15, 38, 71], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { textColor: [17, 24, 39], fontSize: 9, lineColor: [222, 227, 233], lineWidth: { bottom: 0.3 } },
      styles: { font: 'helvetica', cellPadding: 3.5 },
      columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 16, right: 16 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFillColor(15, 38, 71); doc.rect(16, finalY + 4, 178, 11, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('TOTAL DUE', 20, finalY + 11.3);
    doc.text(money(total), 190, finalY + 11.3, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(91, 104, 121);
    doc.text('Please pay using the secure payment link provided, or contact support@pandaprotect.co.uk.', 16, finalY + 24, { maxWidth: 178 });
    drawInvoiceFooter(doc);
    doc.save(`${invoiceNumber}.pdf`);
  };

  const createPaymentLink = async (g: Group, row?: UnpaidRow) => {
    const key = row ? `link-${row.id}` : `link-${g.dealer_id}`;
    const amount = row ? Number(row.final_amount ?? 0) : g.total;
    if (amount <= 0) {
      toast({ title: 'Nothing to collect', description: 'Amount is zero.', variant: 'destructive' });
      return;
    }
    setBusy(key);
    const { data, error } = await supabase.functions.invoke('worldpay-create-payment-page', {
      body: {
        flow: 'link',
        amount_pence: Math.round(amount * 100),
        currency: 'GBP',
        description: row
          ? `Warranty ${row.registration_plate || ''}`.trim()
          : `Invoice ${g.dealer_company}`,
        customer_id: row?.id || null,
        customer_email: g.dealer_email,
        billing: g.dealer_billing,
      },
    });
    setBusy(null);
    const url = (data as any)?.url || (data as any)?.payment_url || (data as any)?.paymentPageUrl;
    if (error || !url) {
      toast({
        title: 'Could not create payment link',
        description: (data as any)?.error || error?.message || 'Unknown error',
        variant: 'destructive',
      });
      return;
    }
    setLinks((prev) => ({ ...prev, [key]: url }));
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Payment link ready', description: 'Copied to clipboard — share it with the dealer.' });
    } catch {
      toast({ title: 'Payment link ready', description: url });
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Copied', description: 'Payment link copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: url, variant: 'destructive' });
    }
  };

  const exportCsv = (g: Group) => {
    const header = 'Date,Customer,Email,Reg,Amount\n';
    const body = g.rows
      .map(
        (r) =>
          `${new Date(r.signup_date).toLocaleDateString('en-GB')},"${r.name}","${r.email}","${r.registration_plate || ''}",${Number(r.final_amount ?? 0).toFixed(2)}`
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${g.dealer_company.replace(/[^a-z0-9]/gi, '_')}_invoice_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">Approved 30-day account sales awaiting payment, grouped by dealer.</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total outstanding</p>
          <p className="text-2xl font-bold text-amber-600">£{grandTotal.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground">{rows.length} unpaid warranties</p>
        </div>
      </div>

      <Card className="border-crm-orange/30 bg-crm-orange-soft">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-crm-orange" />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-crm-navy">How dealer invoicing works</h2>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <p><strong>1. Build history</strong><br /><span className="text-muted-foreground">The dealer reaches 10 genuine paid Panda warranties. Free, cancelled and refunded sales do not count.</span></p>
                <p><strong>2. Request and approve</strong><br /><span className="text-muted-foreground">The dealer requests invoicing from their dashboard or checkout. Admin or Super Admin approves it under Credit authorisations.</span></p>
                <p><strong>3. Issue and collect</strong><br /><span className="text-muted-foreground">The dealer chooses 30-day invoice at checkout. It appears here as outstanding; overdue balances pause further invoicing.</span></p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild><Link to="/admin-dashboard/?tab=dealer-invoices&sub=authorisations">Review credit requests</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/admin-dashboard/?tab=dealer-invoices&sub=paylater">Control pay later rules</Link></Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Paid card sales appear in completed sales below. Unfinished card checkouts stay in Quotes & orders and are not invoices.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <Card className="border-2"><CardContent className="py-12 text-center text-destructive" role="alert">Invoices could not be loaded. Please refresh to try again.</CardContent></Card>
      ) : groups.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            No approved 30-day invoices are awaiting payment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const groupLink = links[`link-${g.dealer_id}`];
            return (
              <Card key={g.dealer_id} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{g.dealer_company}</h3>
                      <p className="text-xs text-muted-foreground">
                        {g.rows.length} unpaid warranty{g.rows.length === 1 ? '' : 's'}
                        {g.dealer_email ? ` · ${g.dealer_email}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding</p>
                        <p className="text-xl font-bold text-amber-600">{money(g.total)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `email-${g.dealer_id}`}
                        onClick={() => emailInvoice(g)}
                      >
                        {busy === `email-${g.dealer_id}` ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <Mail className="h-3 w-3 mr-1.5" />
                        )}
                        Send invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `link-${g.dealer_id}`}
                        onClick={() => createPaymentLink(g)}
                      >
                        {busy === `link-${g.dealer_id}` ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <Link2 className="h-3 w-3 mr-1.5" />
                        )}
                        Payment link
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadPdf(g)}>
                        <FileText className="h-3 w-3 mr-1.5" /> PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => exportCsv(g)}>
                        <Download className="h-3 w-3 mr-1.5" /> CSV
                      </Button>
                    </div>
                  </div>

                  {groupLink && (
                    <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <a href={groupLink} target="_blank" rel="noreferrer" className="truncate text-xs text-primary underline">
                        {groupLink}
                      </a>
                      <Button size="sm" variant="ghost" onClick={() => copyLink(groupLink)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-y border-border">
                        <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="px-3 py-2 font-medium">Customer</th>
                          <th className="px-3 py-2 font-medium">Vehicle</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium text-right">Amount</th>
                          <th className="px-3 py-2 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map((r) => {
                          const rowLink = links[`link-${r.id}`];
                          return (
                            <tr key={r.id} className="border-b border-border">
                              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                {new Date(r.signup_date).toLocaleDateString('en-GB')}
                              </td>
                              <td className="px-3 py-2">
                                <p className="font-medium text-foreground">{r.name}</p>
                                <p className="text-xs text-muted-foreground">{r.email}</p>
                              </td>
                              <td className="px-3 py-2 font-mono text-xs uppercase">{r.registration_plate || '—'}</td>
                              <td className="px-3 py-2">
                                {(() => {
                                  const st = getDealerPaymentState(r);
                                  const sty = DEALER_PAYMENT_STYLES[st.key];
                                  return (
                                    <div className="space-y-1">
                                      <Badge className={sty.className}>{sty.label}</Badge>
                                      {st.dueDate && (
                                        <p className="text-[11px] text-muted-foreground">Due {st.dueDate.toLocaleDateString('en-GB')}</p>
                                      )}
                                      <select
                                        aria-label="Set payment status"
                                        className="block w-full rounded border border-border bg-background px-1.5 py-1 text-xs"
                                        value={(r.payment_status || 'pending').toLowerCase()}
                                        disabled={busy === `status-${r.id}`}
                                        onChange={(e) => setStatus(r, e.target.value)}
                                      >
                                        {DEALER_PAYMENT_OPTIONS.filter((o) => o.value !== 'pending').map((o) => (
                                          <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">{money(Number(r.final_amount ?? 0))}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                  {rowLink && (
                                    <Button size="sm" variant="ghost" onClick={() => copyLink(rowLink)}>
                                      <Copy className="h-3 w-3 mr-1" /> Copy link
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy === `email-${r.id}`}
                                    onClick={() => emailInvoice(g, r)}
                                  >
                                    {busy === `email-${r.id}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <><Mail className="h-3 w-3 mr-1" /> Send</>
                                    )}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => downloadPdf(g, r)}>
                                    <FileText className="h-3 w-3 mr-1" /> PDF
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy === `link-${r.id}`}
                                    onClick={() => createPaymentLink(g, r)}
                                  >
                                    {busy === `link-${r.id}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <><Link2 className="h-3 w-3 mr-1" /> Share link</>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    disabled={busy === `pay-${r.id}`}
                                    onClick={() => setConfirmRow(r)}
                                  >
                                    {busy === `pay-${r.id}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <><CheckCircle className="h-3 w-3 mr-1" /> Confirm payment</>
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !loadError && (
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div><h2 className="text-lg font-bold text-foreground">Completed sales</h2><p className="text-sm text-muted-foreground">Paid card sales, settled invoices and introductory-offer warranties.</p></div>
              <Badge variant="secondary">{paidRows.length} completed</Badge>
            </div>
            {paidRows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Completed dealer sales will appear here.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y border-border bg-muted/50"><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Customer</th><th className="px-3 py-2 font-medium">Vehicle</th><th className="px-3 py-2 font-medium">Dealer</th><th className="px-3 py-2 font-medium">Payment</th><th className="px-3 py-2 text-right font-medium">Amount</th></tr></thead>
                  <tbody>{paidRows.slice(0, 25).map((r) => <tr key={r.id} className="border-b border-border"><td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{new Date(r.signup_date).toLocaleDateString('en-GB')}</td><td className="px-3 py-2"><p className="font-medium">{r.name}</p><p className="break-all text-xs text-muted-foreground">{r.email}</p></td><td className="px-3 py-2 font-mono text-xs uppercase">{r.registration_plate || '—'}</td><td className="px-3 py-2">{r.dealer_company}</td><td className="px-3 py-2"><Badge className="bg-crm-green-soft text-crm-green-deep">{dealerSalePaymentLabel(r)}</Badge></td><td className="px-3 py-2 text-right font-semibold">{money(dealerSaleAmount(r))}</td></tr>)}</tbody>
                </table>
                {paidRows.length > 25 && <p className="pt-3 text-xs text-muted-foreground">Showing the 25 most recent completed sales.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirmRow} onOpenChange={(o) => !o && setConfirmRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm payment collected?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRow
                ? `Mark ${money(Number(confirmRow.final_amount ?? 0))} for ${confirmRow.name} (${confirmRow.registration_plate || 'no reg'}) as paid. The warranty will move to active plans.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => confirmRow && confirmPayment(confirmRow)}
            >
              Yes, payment received
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>

      </AlertDialog>
    </div>
  );
};

export default DealerAdminInvoices;
