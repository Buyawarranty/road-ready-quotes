import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Download, Mail, Link2, Copy, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

interface UnpaidRow {
  id: string;
  name: string;
  email: string;
  registration_plate: string | null;
  signup_date: string;
  final_amount: number | null;
  payment_status: string | null;
  plan_type?: string | null;
  payment_type?: string | null;
  dealer_id: string;
  dealer_company?: string;
  dealer_email?: string | null;
}

interface Group {
  dealer_id: string;
  dealer_company: string;
  dealer_email: string | null;
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
      <tr><td style="padding:10px;border-bottom:1px solid #eee">${r.name || ''}</td><td style="padding:10px;border-bottom:1px solid #eee">${r.registration_plate || ''}</td><td style="padding:10px;border-bottom:1px solid #eee">${r.plan_type || 'Warranty'}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${money(Number(r.final_amount ?? 0))}</td></tr>
    </table>
    <p style="margin-top:20px;font-size:13px;color:#666">Please settle this invoice using the payment link provided, or contact hello@pandaprotect.co.uk.</p>
  </body></html>`;

const DealerAdminInvoices: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<UnpaidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<UnpaidRow | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: customers }, { data: dealers }] = await Promise.all([
      supabase
        .from('customers')
        .select('id, name, email, registration_plate, signup_date, final_amount, payment_status, plan_type, payment_type, dealer_id')
        .not('dealer_id', 'is', null)
        .order('signup_date', { ascending: false }),
      supabase.from('dealers').select('id, company_name, email'),
    ]);
    const dealerMap = new Map((dealers || []).map((d: any) => [d.id, d]));
    const unpaid = (customers || [])
      .filter((c: any) => (c.payment_status || '').toLowerCase() !== 'paid')
      .map((c: any) => ({
        ...c,
        dealer_company: dealerMap.get(c.dealer_id)?.company_name || '—',
        dealer_email: dealerMap.get(c.dealer_id)?.email || null,
      }));
    setRows(unpaid);
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
    const { error } = await supabase
      .from('customers')
      .update({ payment_status: 'paid', status: 'Active' })
      .eq('id', row.id);
    setBusy(null);
    setConfirmRow(null);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Payment confirmed', description: `${money(Number(row.final_amount ?? 0))} collected — warranty moved to active plans.` });
    setRows((prev) => prev.filter((r) => r.id !== row.id));
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
          <p className="text-muted-foreground text-sm mt-1">Outstanding "Add to monthly invoice" balances per dealer.</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total outstanding</p>
          <p className="text-2xl font-bold text-amber-600">£{grandTotal.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground">{rows.length} unpaid warranties</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            All caught up — no unpaid invoices.
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
                                <Badge variant="secondary" className="bg-amber-500 text-white">
                                  {r.payment_status || 'Unpaid'}
                                </Badge>
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
