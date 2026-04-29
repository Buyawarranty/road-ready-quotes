import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Search, Pencil, Trash2, FileText, ShoppingCart, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface DealerOption { id: string; name: string }

interface DealerAdminQuote {
  id: string;
  dealer_id: string | null;
  dealer_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  vehicle_reg: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  vehicle_mileage: number | null;
  plan_type: string | null;
  duration_months: number | null;
  retail_price: number | null;
  dealer_price: number | null;
  discount_pct: number | null;
  status: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

interface DealerAdminOrder {
  id: string;
  quote_id: string | null;
  dealer_id: string | null;
  dealer_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  vehicle_reg: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  plan_type: string | null;
  duration_months: number | null;
  amount_paid: number | null;
  payment_method: string | null;
  payment_status: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'expired', 'cancelled'] as const;
const ORDER_STATUSES = ['new', 'processing', 'fulfilled', 'cancelled', 'refunded'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'invoice_pending', 'failed', 'refunded'] as const;
const PLAN_TYPES = ['basic', 'gold', 'platinum'] as const;

const quoteVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'accepted') return 'default';
  if (s === 'expired' || s === 'cancelled') return 'destructive';
  if (s === 'sent') return 'outline';
  return 'secondary';
};

const orderVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'fulfilled') return 'default';
  if (s === 'cancelled' || s === 'refunded') return 'destructive';
  if (s === 'processing') return 'outline';
  return 'secondary';
};

const emptyQuote: Partial<DealerAdminQuote> = {
  dealer_id: null, dealer_name: '', customer_name: '', customer_email: '', customer_phone: '',
  vehicle_reg: '', vehicle_make: '', vehicle_model: '', vehicle_year: '',
  vehicle_mileage: null, plan_type: 'basic', duration_months: 12,
  retail_price: null, dealer_price: null, discount_pct: 20,
  status: 'draft', expires_at: null, notes: '',
};

const emptyOrder: Partial<DealerAdminOrder> = {
  quote_id: null, dealer_id: null, dealer_name: '', customer_name: '', customer_email: '', customer_phone: '',
  vehicle_reg: '', vehicle_make: '', vehicle_model: '',
  plan_type: 'basic', duration_months: 12, amount_paid: null,
  payment_method: 'card', payment_status: 'pending', status: 'new', notes: '',
};

const DealerAdminQuotesOrders: React.FC = () => {
  const [tab, setTab] = useState<'quotes' | 'orders'>('quotes');

  // Shared
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Quotes
  const [quotes, setQuotes] = useState<DealerAdminQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<DealerAdminQuote | null>(null);
  const [quoteForm, setQuoteForm] = useState<Partial<DealerAdminQuote>>(emptyQuote);

  // Orders
  const [orders, setOrders] = useState<DealerAdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DealerAdminOrder | null>(null);
  const [orderForm, setOrderForm] = useState<Partial<DealerAdminOrder>>(emptyOrder);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDealers();
    loadQuotes();
    loadOrders();
  }, []);

  const loadDealers = async () => {
    const { data } = await supabase.from('dealers').select('id, name').order('name');
    setDealers((data as DealerOption[]) || []);
  };

  const loadQuotes = async () => {
    setLoadingQuotes(true);
    const { data, error } = await supabase
      .from('dealer_admin_quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) toast.error('Failed to load quotes');
    setQuotes((data as DealerAdminQuote[]) || []);
    setLoadingQuotes(false);
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from('dealer_admin_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) toast.error('Failed to load orders');
    setOrders((data as DealerAdminOrder[]) || []);
    setLoadingOrders(false);
  };

  // Filtering
  const filteredQuotes = useMemo(() => {
    const q = search.toLowerCase().trim();
    return quotes.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.customer_name, r.customer_email, r.customer_phone, r.vehicle_reg, r.dealer_name]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [quotes, search, statusFilter]);

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.customer_name, r.customer_email, r.customer_phone, r.vehicle_reg, r.dealer_name]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [orders, search, statusFilter]);

  // Counters
  const quoteCounts = useMemo(() => {
    const c: Record<string, number> = { all: quotes.length };
    QUOTE_STATUSES.forEach((s) => { c[s] = quotes.filter((r) => r.status === s).length; });
    return c;
  }, [quotes]);

  const orderCounts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    ORDER_STATUSES.forEach((s) => { c[s] = orders.filter((r) => r.status === s).length; });
    return c;
  }, [orders]);

  // Quote handlers
  const openNewQuote = () => { setEditingQuote(null); setQuoteForm(emptyQuote); setQuoteDialogOpen(true); };
  const openEditQuote = (r: DealerAdminQuote) => { setEditingQuote(r); setQuoteForm(r); setQuoteDialogOpen(true); };

  const saveQuote = async () => {
    setSaving(true);
    try {
      const dealerName = quoteForm.dealer_id
        ? dealers.find((d) => d.id === quoteForm.dealer_id)?.name || quoteForm.dealer_name
        : quoteForm.dealer_name;
      const payload = { ...quoteForm, dealer_name: dealerName };
      delete (payload as any).id;
      delete (payload as any).created_at;

      if (editingQuote) {
        const { error } = await supabase.from('dealer_admin_quotes').update(payload as any).eq('id', editingQuote.id);
        if (error) throw error;
        toast.success('Quote updated');
      } else {
        const { error } = await supabase.from('dealer_admin_quotes').insert(payload as any);
        if (error) throw error;
        toast.success('Quote created');
      }
      setQuoteDialogOpen(false);
      loadQuotes();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save quote');
    } finally { setSaving(false); }
  };

  const deleteQuote = async (id: string) => {
    if (!confirm('Delete this quote?')) return;
    const { error } = await supabase.from('dealer_admin_quotes').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Quote deleted'); loadQuotes(); }
  };

  const updateQuoteStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('dealer_admin_quotes').update({ status }).eq('id', id);
    if (error) toast.error(error.message); else loadQuotes();
  };

  // Convert quote to order
  const convertToOrder = async (q: DealerAdminQuote) => {
    if (!confirm(`Convert this quote to an order for ${q.customer_name || 'customer'}?`)) return;
    setSaving(true);
    try {
      const orderPayload: any = {
        quote_id: q.id,
        dealer_id: q.dealer_id,
        dealer_name: q.dealer_name,
        customer_name: q.customer_name,
        customer_email: q.customer_email,
        customer_phone: q.customer_phone,
        vehicle_reg: q.vehicle_reg,
        vehicle_make: q.vehicle_make,
        vehicle_model: q.vehicle_model,
        plan_type: q.plan_type,
        duration_months: q.duration_months,
        amount_paid: q.dealer_price,
        payment_method: 'card',
        payment_status: 'pending',
        status: 'new',
        notes: q.notes,
      };
      const { error: orderErr } = await supabase.from('dealer_admin_orders').insert(orderPayload);
      if (orderErr) throw orderErr;
      await supabase.from('dealer_admin_quotes').update({ status: 'accepted' }).eq('id', q.id);
      toast.success('Order created from quote');
      loadOrders();
      loadQuotes();
      setTab('orders');
    } catch (e: any) {
      toast.error(e.message || 'Failed to convert');
    } finally { setSaving(false); }
  };

  // Order handlers
  const openNewOrder = () => { setEditingOrder(null); setOrderForm(emptyOrder); setOrderDialogOpen(true); };
  const openEditOrder = (r: DealerAdminOrder) => { setEditingOrder(r); setOrderForm(r); setOrderDialogOpen(true); };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const dealerName = orderForm.dealer_id
        ? dealers.find((d) => d.id === orderForm.dealer_id)?.name || orderForm.dealer_name
        : orderForm.dealer_name;
      const payload = { ...orderForm, dealer_name: dealerName };
      delete (payload as any).id;
      delete (payload as any).created_at;

      if (editingOrder) {
        const { error } = await supabase.from('dealer_admin_orders').update(payload as any).eq('id', editingOrder.id);
        if (error) throw error;
        toast.success('Order updated');
      } else {
        const { error } = await supabase.from('dealer_admin_orders').insert(payload as any);
        if (error) throw error;
        toast.success('Order created');
      }
      setOrderDialogOpen(false);
      loadOrders();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save order');
    } finally { setSaving(false); }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    const { error } = await supabase.from('dealer_admin_orders').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Order deleted'); loadOrders(); }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('dealer_admin_orders').update({ status }).eq('id', id);
    if (error) toast.error(error.message); else loadOrders();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotes & Orders</h1>
          <p className="text-muted-foreground text-sm">Create dealer quotes and confirm paid orders</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setStatusFilter('all'); }}>
        <TabsList>
          <TabsTrigger value="quotes" className="gap-2"><FileText className="h-4 w-4" /> Quotes ({quotes.length})</TabsTrigger>
          <TabsTrigger value="orders" className="gap-2"><ShoppingCart className="h-4 w-4" /> Orders ({orders.length})</TabsTrigger>
        </TabsList>

        {/* QUOTES TAB */}
        <TabsContent value="quotes" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {(['all', ...QUOTE_STATUSES] as const).map((s) => (
              <Card key={s} className={`cursor-pointer ${statusFilter === s ? 'ring-2 ring-primary' : ''}`} onClick={() => setStatusFilter(s)}>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground capitalize">{s}</div>
                  <div className="text-2xl font-bold">{quoteCounts[s] ?? 0}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone, reg, dealer…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={openNewQuote}><Plus className="h-4 w-4 mr-2" /> New Quote</Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Quotes ({filteredQuotes.length})</CardTitle></CardHeader>
            <CardContent>
              {loadingQuotes ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : filteredQuotes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No quotes found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-2">Customer</th>
                        <th className="p-2">Vehicle</th>
                        <th className="p-2">Dealer</th>
                        <th className="p-2">Plan</th>
                        <th className="p-2">Dealer £</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Created</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuotes.map((r) => (
                        <tr key={r.id} className="border-b hover:bg-muted/30">
                          <td className="p-2">
                            <div className="font-medium">{r.customer_name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{r.customer_email || r.customer_phone || ''}</div>
                          </td>
                          <td className="p-2">
                            <div className="font-mono">{r.vehicle_reg || '—'}</div>
                            <div className="text-xs text-muted-foreground">{[r.vehicle_make, r.vehicle_model].filter(Boolean).join(' ')}</div>
                          </td>
                          <td className="p-2">{r.dealer_name || '—'}</td>
                          <td className="p-2 capitalize">{r.plan_type || '—'} {r.duration_months ? `· ${r.duration_months}mo` : ''}</td>
                          <td className="p-2">{r.dealer_price != null ? `£${Number(r.dealer_price).toFixed(2)}` : '—'}</td>
                          <td className="p-2">
                            <Select value={r.status} onValueChange={(v) => updateQuoteStatus(r.id, v)}>
                              <SelectTrigger className="h-7 w-32"><Badge variant={quoteVariant(r.status)}>{r.status}</Badge></SelectTrigger>
                              <SelectContent>{QUOTE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="p-2 text-right space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => convertToOrder(r)} title="Convert to order"><ArrowRight className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditQuote(r)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteQuote(r.id)}><Trash2 className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {(['all', ...ORDER_STATUSES] as const).map((s) => (
              <Card key={s} className={`cursor-pointer ${statusFilter === s ? 'ring-2 ring-primary' : ''}`} onClick={() => setStatusFilter(s)}>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground capitalize">{s}</div>
                  <div className="text-2xl font-bold">{orderCounts[s] ?? 0}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone, reg, dealer…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={openNewOrder}><Plus className="h-4 w-4 mr-2" /> New Order</Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Orders ({filteredOrders.length})</CardTitle></CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No orders found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-2">Customer</th>
                        <th className="p-2">Vehicle</th>
                        <th className="p-2">Dealer</th>
                        <th className="p-2">Plan</th>
                        <th className="p-2">Paid £</th>
                        <th className="p-2">Payment</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Created</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((r) => (
                        <tr key={r.id} className="border-b hover:bg-muted/30">
                          <td className="p-2">
                            <div className="font-medium">{r.customer_name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{r.customer_email || r.customer_phone || ''}</div>
                          </td>
                          <td className="p-2">
                            <div className="font-mono">{r.vehicle_reg || '—'}</div>
                            <div className="text-xs text-muted-foreground">{[r.vehicle_make, r.vehicle_model].filter(Boolean).join(' ')}</div>
                          </td>
                          <td className="p-2">{r.dealer_name || '—'}</td>
                          <td className="p-2 capitalize">{r.plan_type || '—'} {r.duration_months ? `· ${r.duration_months}mo` : ''}</td>
                          <td className="p-2">{r.amount_paid != null ? `£${Number(r.amount_paid).toFixed(2)}` : '—'}</td>
                          <td className="p-2"><Badge variant="outline">{r.payment_status}</Badge></td>
                          <td className="p-2">
                            <Select value={r.status} onValueChange={(v) => updateOrderStatus(r.id, v)}>
                              <SelectTrigger className="h-7 w-32"><Badge variant={orderVariant(r.status)}>{r.status}</Badge></SelectTrigger>
                              <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="p-2 text-right space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditOrder(r)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteOrder(r.id)}><Trash2 className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QUOTE DIALOG */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingQuote ? 'Edit Quote' : 'New Quote'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Dealer</Label>
              <Select value={quoteForm.dealer_id || 'none'} onValueChange={(v) => setQuoteForm({ ...quoteForm, dealer_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {dealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Customer name</Label><Input value={quoteForm.customer_name || ''} onChange={(e) => setQuoteForm({ ...quoteForm, customer_name: e.target.value })} /></div>
            <div><Label>Customer email</Label><Input type="email" value={quoteForm.customer_email || ''} onChange={(e) => setQuoteForm({ ...quoteForm, customer_email: e.target.value })} /></div>
            <div><Label>Customer phone</Label><Input value={quoteForm.customer_phone || ''} onChange={(e) => setQuoteForm({ ...quoteForm, customer_phone: e.target.value })} /></div>
            <div><Label>Vehicle reg</Label><Input value={quoteForm.vehicle_reg || ''} onChange={(e) => setQuoteForm({ ...quoteForm, vehicle_reg: e.target.value })} /></div>
            <div><Label>Make</Label><Input value={quoteForm.vehicle_make || ''} onChange={(e) => setQuoteForm({ ...quoteForm, vehicle_make: e.target.value })} /></div>
            <div><Label>Model</Label><Input value={quoteForm.vehicle_model || ''} onChange={(e) => setQuoteForm({ ...quoteForm, vehicle_model: e.target.value })} /></div>
            <div><Label>Year</Label><Input value={quoteForm.vehicle_year || ''} onChange={(e) => setQuoteForm({ ...quoteForm, vehicle_year: e.target.value })} /></div>
            <div><Label>Mileage</Label><Input type="number" value={quoteForm.vehicle_mileage ?? ''} onChange={(e) => setQuoteForm({ ...quoteForm, vehicle_mileage: e.target.value ? +e.target.value : null })} /></div>
            <div>
              <Label>Plan</Label>
              <Select value={quoteForm.plan_type || 'basic'} onValueChange={(v) => setQuoteForm({ ...quoteForm, plan_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLAN_TYPES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (mo)</Label>
              <Select value={String(quoteForm.duration_months || 12)} onValueChange={(v) => setQuoteForm({ ...quoteForm, duration_months: +v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[3, 12, 24, 36].map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Retail price (£)</Label><Input type="number" step="0.01" value={quoteForm.retail_price ?? ''} onChange={(e) => setQuoteForm({ ...quoteForm, retail_price: e.target.value ? +e.target.value : null })} /></div>
            <div><Label>Dealer price (£)</Label><Input type="number" step="0.01" value={quoteForm.dealer_price ?? ''} onChange={(e) => setQuoteForm({ ...quoteForm, dealer_price: e.target.value ? +e.target.value : null })} /></div>
            <div><Label>Discount %</Label><Input type="number" step="0.01" value={quoteForm.discount_pct ?? ''} onChange={(e) => setQuoteForm({ ...quoteForm, discount_pct: e.target.value ? +e.target.value : null })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={quoteForm.status || 'draft'} onValueChange={(v) => setQuoteForm({ ...quoteForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QUOTE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={quoteForm.notes || ''} onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveQuote} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ORDER DIALOG */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingOrder ? 'Edit Order' : 'New Order'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Dealer</Label>
              <Select value={orderForm.dealer_id || 'none'} onValueChange={(v) => setOrderForm({ ...orderForm, dealer_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {dealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Customer name</Label><Input value={orderForm.customer_name || ''} onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })} /></div>
            <div><Label>Customer email</Label><Input type="email" value={orderForm.customer_email || ''} onChange={(e) => setOrderForm({ ...orderForm, customer_email: e.target.value })} /></div>
            <div><Label>Customer phone</Label><Input value={orderForm.customer_phone || ''} onChange={(e) => setOrderForm({ ...orderForm, customer_phone: e.target.value })} /></div>
            <div><Label>Vehicle reg</Label><Input value={orderForm.vehicle_reg || ''} onChange={(e) => setOrderForm({ ...orderForm, vehicle_reg: e.target.value })} /></div>
            <div><Label>Make</Label><Input value={orderForm.vehicle_make || ''} onChange={(e) => setOrderForm({ ...orderForm, vehicle_make: e.target.value })} /></div>
            <div><Label>Model</Label><Input value={orderForm.vehicle_model || ''} onChange={(e) => setOrderForm({ ...orderForm, vehicle_model: e.target.value })} /></div>
            <div>
              <Label>Plan</Label>
              <Select value={orderForm.plan_type || 'basic'} onValueChange={(v) => setOrderForm({ ...orderForm, plan_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLAN_TYPES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (mo)</Label>
              <Select value={String(orderForm.duration_months || 12)} onValueChange={(v) => setOrderForm({ ...orderForm, duration_months: +v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[3, 12, 24, 36].map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount paid (£)</Label><Input type="number" step="0.01" value={orderForm.amount_paid ?? ''} onChange={(e) => setOrderForm({ ...orderForm, amount_paid: e.target.value ? +e.target.value : null })} /></div>
            <div>
              <Label>Payment method</Label>
              <Select value={orderForm.payment_method || 'card'} onValueChange={(v) => setOrderForm({ ...orderForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment status</Label>
              <Select value={orderForm.payment_status || 'pending'} onValueChange={(v) => setOrderForm({ ...orderForm, payment_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order status</Label>
              <Select value={orderForm.status || 'new'} onValueChange={(v) => setOrderForm({ ...orderForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={orderForm.notes || ''} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveOrder} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealerAdminQuotesOrders;
