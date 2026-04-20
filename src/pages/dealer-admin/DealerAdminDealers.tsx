import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DealerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string;
  discount_pct: number;
  created_at: string;
  sales_count?: number;
  revenue?: number;
}

const DealerAdminDealers: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<DealerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: dealers }, { data: customers }] = await Promise.all([
      supabase.from('dealers').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('dealer_id, final_amount, total_amount_paid').not('dealer_id', 'is', null),
    ]);
    const stats = new Map<string, { count: number; revenue: number }>();
    (customers || []).forEach((c: any) => {
      const existing = stats.get(c.dealer_id) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += Number(c.total_amount_paid ?? c.final_amount ?? 0);
      stats.set(c.dealer_id, existing);
    });
    setRows(
      (dealers || []).map((d: any) => ({
        ...d,
        sales_count: stats.get(d.id)?.count || 0,
        revenue: stats.get(d.id)?.revenue || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.company_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
    );
  }, [rows, search]);

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dealers</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage dealer accounts and their discount tier.</p>
      </div>

      <Card className="border-2">
        <CardContent className="pt-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dealer, company, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

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
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">Joined</th>
                    <th className="px-3 py-2 font-medium text-right">Sales</th>
                    <th className="px-3 py-2 font-medium text-right">Revenue</th>
                    <th className="px-3 py-2 font-medium">Discount %</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const editVal = edits[r.id];
                    const dirty = editVal !== undefined && editVal !== r.discount_pct;
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <p className="font-semibold text-foreground">{r.company_name}</p>
                          <p className="text-xs text-muted-foreground">{r.name}</p>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-foreground">{r.email}</p>
                          <p className="text-xs text-muted-foreground">{r.phone || '—'}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString('en-GB')}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerAdminDealers;
