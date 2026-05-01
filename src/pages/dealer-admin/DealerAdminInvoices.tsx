import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UnpaidRow {
  id: string;
  name: string;
  email: string;
  registration_plate: string | null;
  signup_date: string;
  final_amount: number | null;
  payment_status: string | null;
  dealer_id: string;
  dealer_company?: string;
}

interface Group {
  dealer_id: string;
  dealer_company: string;
  rows: UnpaidRow[];
  total: number;
}

const DealerAdminInvoices: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<UnpaidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: customers }, { data: dealers }] = await Promise.all([
      supabase
        .from('customers')
        .select('id, name, email, registration_plate, signup_date, final_amount, payment_status, dealer_id')
        .not('dealer_id', 'is', null)
        .order('signup_date', { ascending: false }),
      supabase.from('dealers').select('id, company_name'),
    ]);
    const dealerMap = new Map((dealers || []).map((d: any) => [d.id, d.company_name]));
    const unpaid = (customers || [])
      .filter((c: any) => (c.payment_status || '').toLowerCase() !== 'paid')
      .map((c: any) => ({ ...c, dealer_company: dealerMap.get(c.dealer_id) || '—' }));
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

  const markPaid = async (id: string) => {
    setMarking(id);
    const { error } = await supabase
      .from('customers')
      .update({ payment_status: 'paid', status: 'Active' })
      .eq('id', id);
    setMarking(null);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Marked as paid', description: 'Warranty moved to active plans.' });
    setRows((prev) => prev.filter((r) => r.id !== id));
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
          {groups.map((g) => (
            <Card key={g.dealer_id} className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{g.dealer_company}</h3>
                    <p className="text-xs text-muted-foreground">{g.rows.length} unpaid warranty{g.rows.length === 1 ? '' : 's'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding</p>
                      <p className="text-xl font-bold text-amber-600">£{g.total.toFixed(2)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => exportCsv(g)}>
                      <Download className="h-3 w-3 mr-1.5" /> CSV
                    </Button>
                  </div>
                </div>

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
                      {g.rows.map((r) => (
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
                          <td className="px-3 py-2 text-right font-semibold">£{Number(r.final_amount ?? 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={marking === r.id}
                              onClick={() => markPaid(r.id)}
                            >
                              {marking === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><CheckCircle className="h-3 w-3 mr-1" /> Mark paid</>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealerAdminInvoices;
