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
import { Download, FileText, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
const ref = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();

const DealerWarrantiesList = () => {
  const { dealer } = useDealerAuth();
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState(false);

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
        .select(
          'id, name, email, registration_plate, vehicle_make, vehicle_model, plan_type, payment_type, final_amount, payment_status, status, warranty_start_date, policy_end_date, signup_date, warranty_number',
        )
        .eq('dealer_id', dealer.id)
        .order('signup_date', { ascending: false });
      return (data || []) as DealerPdfRow[];
    },
    enabled: !!dealer?.id,
  });

  const unpaidIds = useMemo(
    () => rows.filter((r) => r.payment_status !== 'paid').map((r) => r.id),
    [rows],
  );
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
    if (r.payment_status === 'paid') {
      return <Badge className="bg-green-500/20 text-green-300 border border-green-500/40 font-bold">Paid</Badge>;
    }
    if (r.payment_status === 'invoice_pending') {
      return <Badge className="bg-red-500/20 text-red-300 border border-red-500/40 font-bold">Unpaid</Badge>;
    }
    return <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">Pending</Badge>;
  };

  const renderActiveStatus = (r: DealerPdfRow) => {
    if ((r as any).status === 'active') return <Badge className="bg-green-500 text-white">Active</Badge>;
    if ((r as any).status === 'expired') return <Badge className="bg-gray-600 text-gray-200">Expired</Badge>;
    if ((r as any).status === 'cancelled') return <Badge className="bg-red-500/20 text-red-300 border border-red-500/40">Cancelled</Badge>;
    return <Badge className="bg-gray-700 text-gray-300">{(r as any).status || 'Pending'}</Badge>;
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
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 lg:-mt-8 bg-gray-900 border-b border-gray-800 px-4 sm:px-6 lg:px-8 py-8 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-orange-500">DEALER PLANS</h1>
            <span className="text-orange-500 text-2xl">◆</span>
          </div>
          <p className="text-gray-400 text-sm">
            All warranty plans you've issued, plus payment status for outstanding invoices.
          </p>
        </div>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="bg-gray-900 border border-gray-800">
          <TabsTrigger
            value="plans"
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-gray-900 text-gray-300 font-bold tracking-wide"
          >
            Plans ({rows.length})
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-gray-900 text-gray-300 font-bold tracking-wide"
          >
            Payments ({unpaidIds.length} unpaid)
          </TabsTrigger>
        </TabsList>

        {/* PLANS TAB */}
        <TabsContent value="plans">
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            {rows.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-12">
                No plans issued yet. Complete a dealer quote to issue your first warranty.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-transparent bg-gray-800/40">
                      <TableHead className="text-gray-300 font-bold">Customer</TableHead>
                      <TableHead className="text-gray-300 font-bold">Vehicle</TableHead>
                      <TableHead className="text-gray-300 font-bold">Plan</TableHead>
                      <TableHead className="text-gray-300 font-bold">Start</TableHead>
                      <TableHead className="text-gray-300 font-bold">End</TableHead>
                      <TableHead className="text-gray-300 font-bold text-right">Amount</TableHead>
                      <TableHead className="text-gray-300 font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((w) => (
                      <TableRow key={w.id} className="border-gray-800 hover:bg-gray-800/50">
                        <TableCell className="font-medium text-white">
                          <div>{w.name}</div>
                          <div className="text-xs text-gray-500">{w.email}</div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div className="font-mono uppercase">{w.registration_plate}</div>
                          {(w.vehicle_make || w.vehicle_model) && (
                            <div className="text-xs text-gray-500">{w.vehicle_make} {w.vehicle_model}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300 capitalize">
                          {w.plan_type} · {w.payment_type}mo
                        </TableCell>
                        <TableCell className="text-gray-300">{fmt(w.warranty_start_date || w.signup_date)}</TableCell>
                        <TableCell className="text-gray-300">{fmt(w.policy_end_date)}</TableCell>
                        <TableCell className="text-right text-white font-semibold">£{Number(w.final_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{renderActiveStatus(w)}</TableCell>
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
            <div className="text-sm text-gray-400">
              {selectedIds.length > 0 ? (
                <span>
                  <span className="text-white font-bold">{selectedIds.length}</span> selected ·{' '}
                  <span className="text-orange-400 font-bold">£{selectedTotal.toFixed(2)}</span>
                </span>
              ) : (
                <span>Select unpaid plans to pay them in one Stripe checkout.</span>
              )}
            </div>
            <Button
              onClick={handlePaySelected}
              disabled={paying || selectedIds.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-gray-900 font-bold tracking-wide"
            >
              {paying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Pay for Selected
            </Button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            {rows.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-12">
                No plans yet — nothing to pay.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-transparent bg-orange-500">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                          className="border-gray-900 data-[state=checked]:bg-gray-900 data-[state=checked]:text-orange-500"
                        />
                      </TableHead>
                      <TableHead className="text-gray-900 font-extrabold tracking-wider">REF</TableHead>
                      <TableHead className="text-gray-900 font-extrabold tracking-wider">STATUS</TableHead>
                      <TableHead className="text-gray-900 font-extrabold tracking-wider">ACTIVATION</TableHead>
                      <TableHead className="text-gray-900 font-extrabold tracking-wider">EXPIRY</TableHead>
                      <TableHead className="text-gray-900 font-extrabold tracking-wider">VEHICLE</TableHead>
                      <TableHead className="text-gray-900 font-extrabold tracking-wider">CUSTOMER</TableHead>
                      <TableHead className="text-gray-900 font-extrabold tracking-wider">PRODUCT</TableHead>
                      <TableHead className="text-gray-900 font-extrabold tracking-wider text-right">PRICE</TableHead>
                      <TableHead className="text-gray-900 font-extrabold tracking-wider text-right">DOCS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, idx) => {
                      const unpaid = r.payment_status !== 'paid';
                      return (
                        <TableRow
                          key={r.id}
                          className={`border-gray-800 hover:bg-gray-800/50 ${
                            idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/60'
                          }`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={!!selected[r.id]}
                              disabled={!unpaid}
                              onCheckedChange={(v) =>
                                setSelected((s) => ({ ...s, [r.id]: !!v }))
                              }
                              className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:text-gray-900"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-orange-400 font-bold">
                            {ref(r.id)}
                          </TableCell>
                          <TableCell>{renderStatus(r)}</TableCell>
                          <TableCell className="text-gray-300">{fmt(r.warranty_start_date || r.signup_date)}</TableCell>
                          <TableCell className="text-gray-300">{fmt(r.policy_end_date)}</TableCell>
                          <TableCell className="text-gray-300 uppercase">
                            <div className="font-mono text-white">{r.registration_plate || '—'}</div>
                            <div className="text-xs text-gray-500">
                              {[r.vehicle_make, r.vehicle_model].filter(Boolean).join(' ')}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300">{r.name || '—'}</TableCell>
                          <TableCell className="text-gray-300 capitalize">
                            {r.plan_type || '—'}
                          </TableCell>
                          <TableCell className="text-right text-white font-bold">
                            £{Number(r.final_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Download invoice"
                                onClick={() => downloadInvoicePdf(r, dealer?.name)}
                                className="h-8 w-8 text-gray-300 hover:text-orange-400 hover:bg-gray-800"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Download warranty"
                                onClick={() => downloadWarrantyPdf(r, dealer?.name)}
                                className="h-8 w-8 text-gray-300 hover:text-orange-400 hover:bg-gray-800"
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
    </DealerLayout>
  );
};

export default DealerWarrantiesList;
