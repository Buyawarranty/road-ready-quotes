import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Ban, FlaskConical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { displayWarrantyPlanName } from '@/lib/warrantyPlanDisplay';
import { dealerSaleAmount, isCountedDealerSale } from '@/lib/dealerSales';
import { SortableHeader } from '@/components/admin/SortableHeader';

interface SaleRow {
  id: string;
  name: string;
  email: string;
  registration_plate: string | null;
  plan_type: string;
  payment_type: string | null;
  payment_status: string | null;
  status: string;
  signup_date: string;
  final_amount: number | null;
  dealer_id: string;
  is_test?: boolean;
  dealer_name?: string;
  dealer_company?: string;
}

const DealerAdminSales: React.FC = () => {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [dealerFilter, setDealerFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [canManage, setCanManage] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['super_admin']);
      setCanManage(!!data?.length);
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      const [{ data: customers, error: customersError }, { data: dealers, error: dealersError }] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, email, registration_plate, plan_type, payment_type, payment_status, status, signup_date, final_amount, dealer_id, is_test')
          .eq('brand', 'pandaprotect')
          .not('dealer_id', 'is', null)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('signup_date', { ascending: false })
          .limit(1000),
        supabase.from('dealers').select('id, name, company_name'),
      ]);

      if (customersError || dealersError) {
        console.error('Dealer sales failed to load:', customersError || dealersError);
        setRows([]);
        setLoadError(true);
        setLoading(false);
        return;
      }

      const dealerMap = new Map((dealers || []).map((d: any) => [d.id, d]));
      const merged = ((customers as any[]) || []).filter(isCountedDealerSale).map((c: any) => ({
        ...c,
        dealer_name: dealerMap.get(c.dealer_id)?.name,
        dealer_company: dealerMap.get(c.dealer_id)?.company_name,
      })) as SaleRow[];

      setRows(merged);
      setLoadError(false);
      setLoading(false);
    };
    load();
  }, [reload]);

  const dealerOptions = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      if (r.dealer_id) m.set(r.dealer_id, r.dealer_company || r.dealer_name || r.dealer_id);
    });
    return Array.from(m.entries());
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (dealerFilter !== 'all' && r.dealer_id !== dealerFilter) return false;
      if (paymentFilter === 'paid' && (r.payment_status || '').toLowerCase() !== 'paid') return false;
      if (paymentFilter === 'unpaid' && (r.payment_status || '').toLowerCase() === 'paid') return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.registration_plate?.toLowerCase().includes(q) ||
        r.dealer_company?.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      const diff = new Date(b.signup_date).getTime() - new Date(a.signup_date).getTime();
      return newestFirst ? diff : -diff;
    });
  }, [rows, search, paymentFilter, dealerFilter, newestFirst]);

  const totalRevenue = filtered.filter(r => !r.is_test).reduce((sum, r) => sum + dealerSaleAmount(r), 0);
  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));
  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const act = async (kind: 'cancel' | 'test' | 'untest' | 'delete', ids: string[]) => {
    if (!ids.length) return;
    const label = { cancel: 'cancel', test: 'mark as test', untest: 'unmark as test', delete: 'delete' }[kind];
    if (!window.confirm(`Are you sure you want to ${label} ${ids.length} sale${ids.length > 1 ? 's' : ''}?`)) return;
    setBusy(true);
    const patch = kind === 'cancel' ? { status: 'Cancelled' } : kind === 'test' ? { is_test: true } : kind === 'untest' ? { is_test: false } : { is_deleted: true, deleted_at: new Date().toISOString() };
    const { error } = await supabase.from('customers').update(patch as any).in('id', ids);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Updated');
    setSelected(new Set());
    setReload(x => x + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dealer sales</h1>
          <p className="text-muted-foreground text-sm mt-1">All warranty sales originated by dealers.</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Filtered total</p>
          <p className="text-2xl font-bold text-foreground">£{totalRevenue.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} sales</p>
        </div>
      </div>

      <Card className="border-2">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, reg, dealer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={paymentFilter} onValueChange={(v: any) => setPaymentFilter(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="paid">Paid only</SelectItem>
                <SelectItem value="unpaid">Unpaid only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dealerFilter} onValueChange={setDealerFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dealers</SelectItem>
                {dealerOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canManage && selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 text-sm">
              <span className="font-semibold">{selected.size} selected</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act('cancel', [...selected])}><Ban className="mr-1 h-4 w-4" /> Cancel</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act('test', [...selected])}><FlaskConical className="mr-1 h-4 w-4" /> Mark as test</Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => act('delete', [...selected])}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <p role="alert" className="text-center py-12 text-destructive text-sm">Dealer sales could not be loaded. Please refresh to try again.</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No sales found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-y border-border">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    {canManage && <th className="px-3 py-2"><Checkbox aria-label="Select all" checked={allSelected} onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map(r => r.id)))} /></th>}
                    <th className="px-3 py-2 font-medium"><SortableHeader label="Date" active newestFirst={newestFirst} onToggle={() => setNewestFirst((v) => !v)} /></th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Vehicle</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Dealer</th>
                    <th className="px-3 py-2 font-medium">Payment</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Amount</th>
                    {canManage && <th className="px-3 py-2 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const paid = (r.payment_status || '').toLowerCase() === 'paid';
                    const active = (r.status || '').toLowerCase() === 'active';
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                        {canManage && <td className="px-3 py-2"><Checkbox aria-label="Select sale" checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} /></td>}
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {new Date(r.signup_date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs uppercase">{r.registration_plate || '—'}</td>
                        <td className="px-3 py-2 capitalize">{displayWarrantyPlanName(r.plan_type)} · {r.payment_type}m</td>
                        <td className="px-3 py-2 text-foreground">{r.dealer_company || r.dealer_name || '—'}</td>
                        <td className="px-3 py-2">
                          <Badge variant={paid ? 'default' : 'secondary'} className={paid ? 'bg-green-600' : 'bg-amber-500'}>
                            {paid ? 'Paid' : (r.payment_status || 'Unpaid')}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={active ? 'border-green-500 text-green-700' : ''}>
                            {r.status || '—'}
                          </Badge>
                          {r.is_test && <Badge variant="secondary" className="ml-1">Test</Badge>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          £{dealerSaleAmount(r).toFixed(2)}
                        </td>
                        {canManage && <td className="px-3 py-2 text-right whitespace-nowrap">
                          {!['cancelled','refunded'].includes((r.status||'').toLowerCase()) && <Button size="icon" variant="ghost" title="Cancel sale" disabled={busy} onClick={() => act('cancel', [r.id])}><Ban className="h-4 w-4" /></Button>}
                          <Button size="icon" variant="ghost" title={r.is_test ? 'Unmark as test' : 'Mark as test'} disabled={busy} onClick={() => act(r.is_test ? 'untest' : 'test', [r.id])}><FlaskConical className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Delete sale" disabled={busy} onClick={() => act('delete', [r.id])}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </td>}
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

export default DealerAdminSales;
