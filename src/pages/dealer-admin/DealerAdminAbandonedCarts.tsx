import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Phone, Car, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Cart {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  vehicle_reg: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  plan_name: string | null;
  payment_type: string | null;
  step_abandoned: number;
  total_price: number | null;
  contact_status: string | null;
  contact_notes: string | null;
  is_converted: boolean | null;
  call_count: number | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  no_answer: 'bg-zinc-100 text-zinc-800',
  not_interested: 'bg-rose-100 text-rose-800',
  converted: 'bg-emerald-100 text-emerald-800',
};

const DealerAdminAbandonedCarts: React.FC = () => {
  const [items, setItems] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stepFilter, setStepFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('abandoned_carts')
      .select('id, full_name, email, phone, vehicle_reg, vehicle_make, vehicle_model, plan_name, payment_type, step_abandoned, total_price, contact_status, contact_notes, is_converted, call_count, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    else setItems((data || []) as Cart[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Cart>) => {
    const { error } = await supabase.from('abandoned_carts').update(patch).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Updated'); load(); }
  };

  const markConverted = (id: string) => update(id, { is_converted: true, contact_status: 'converted' } as any);

  const filtered = items.filter((i) => {
    const status = i.contact_status || 'new';
    const okStatus = statusFilter === 'all' || status === statusFilter;
    const okStep = stepFilter === 'all' || String(i.step_abandoned) === stepFilter;
    const q = search.trim().toLowerCase();
    const okSearch = !q ||
      (i.full_name || '').toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      (i.vehicle_reg || '').toLowerCase().includes(q) ||
      (i.phone || '').toLowerCase().includes(q);
    return okStatus && okStep && okSearch;
  });

  const counts = {
    all: items.length,
    new: items.filter((i) => !i.contact_status || i.contact_status === 'new').length,
    contacted: items.filter((i) => i.contact_status === 'contacted').length,
    converted: items.filter((i) => i.is_converted).length,
    value: items.reduce((s, i) => s + (Number(i.total_price) || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Abandoned Carts</h1>
        <p className="text-muted-foreground text-sm mt-1">Recover quotes that didn't reach checkout.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-2"><CardContent className="pt-4 pb-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p><p className="text-2xl font-bold">{counts.all}</p></CardContent></Card>
        <Card className="border-2"><CardContent className="pt-4 pb-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">New</p><p className="text-2xl font-bold">{counts.new}</p></CardContent></Card>
        <Card className="border-2"><CardContent className="pt-4 pb-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Contacted</p><p className="text-2xl font-bold">{counts.contacted}</p></CardContent></Card>
        <Card className="border-2"><CardContent className="pt-4 pb-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Converted</p><p className="text-2xl font-bold">{counts.converted}</p></CardContent></Card>
        <Card className="border-2"><CardContent className="pt-4 pb-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Cart Value</p><p className="text-2xl font-bold">£{counts.value.toFixed(0)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input placeholder="Search name, email, reg, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="no_answer">No answer</SelectItem>
            <SelectItem value="not_interested">Not interested</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stepFilter} onValueChange={setStepFilter}>
          <SelectTrigger><SelectValue placeholder="Step abandoned" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All steps</SelectItem>
            <SelectItem value="1">Step 1 — Vehicle</SelectItem>
            <SelectItem value="2">Step 2 — Contact</SelectItem>
            <SelectItem value="3">Step 3 — Plan</SelectItem>
            <SelectItem value="4">Step 4 — Checkout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-2"><CardContent className="py-12 text-center text-muted-foreground">No abandoned carts found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const status = c.contact_status || 'new';
            return (
              <Card key={c.id} className="border-2">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[260px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{c.full_name || '(no name)'}</span>
                        <Badge className={STATUS_COLORS[status] || ''}>{status.replace('_', ' ')}</Badge>
                        <Badge variant="outline">Step {c.step_abandoned}</Badge>
                        {c.is_converted && <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" />Converted</Badge>}
                        <span className="text-xs text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString('en-GB')}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>
                        {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
                        {c.vehicle_reg && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {c.vehicle_reg} {c.vehicle_make} {c.vehicle_model}</span>}
                        {c.plan_name && <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {c.plan_name}{c.total_price ? ` · £${Number(c.total_price).toFixed(0)}` : ''}</span>}
                      </div>

                      <div className="mt-3">
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          defaultValue={c.contact_notes || ''}
                          rows={2}
                          onBlur={(e) => { if (e.target.value !== (c.contact_notes || '')) update(c.id, { contact_notes: e.target.value } as any); }}
                          placeholder="Call notes…"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[180px]">
                      <Select value={status} onValueChange={(v) => update(c.id, { contact_status: v } as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="no_answer">No answer</SelectItem>
                          <SelectItem value="not_interested">Not interested</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                        </SelectContent>
                      </Select>
                      {!c.is_converted && (
                        <Button size="sm" variant="outline" onClick={() => markConverted(c.id)}>Mark converted</Button>
                      )}
                      <p className="text-xs text-muted-foreground text-center">Calls: {c.call_count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealerAdminAbandonedCarts;
