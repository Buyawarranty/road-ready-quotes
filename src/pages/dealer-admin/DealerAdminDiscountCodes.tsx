import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Copy, Trash2, Percent, PoundSterling, Pencil, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Code {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  usage_limit: number | null;
  times_used: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  min_order_amount: number;
  campaign_source: string | null;
}

const empty = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: 10,
  usage_limit: '' as string | number,
  valid_from: '',
  valid_until: '',
  is_active: true,
  min_order_amount: 0,
  campaign_source: '',
};

const DealerAdminDiscountCodes: React.FC = () => {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dealer_admin_discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setCodes((data || []) as Code[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) { toast.error('Code is required'); return; }
    if (Number(form.discount_value) <= 0) { toast.error('Discount value must be > 0'); return; }
    if (form.discount_type === 'percent' && Number(form.discount_value) > 100) { toast.error('Percentage must be 100 or less'); return; }
    if (saving) return;
    setSaving(true);
    const dateUtc = (value: string, end = false) => {
      if (!value) return null;
      const [year, month, day] = value.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day + (end ? 1 : 0))).toISOString();
    };
    const payload = {
      code,
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
      valid_from: dateUtc(form.valid_from),
      valid_until: dateUtc(form.valid_until, true),
      is_active: form.is_active,
      min_order_amount: form.discount_type === 'fixed' ? Math.max(350, form.min_order_amount) : form.min_order_amount,
      campaign_source: form.campaign_source || null,
    };
    const { error } = editingId ? await supabase.from('dealer_admin_discount_codes').update(payload).eq('id', editingId) : await supabase.from('dealer_admin_discount_codes').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? 'Discount code saved' : 'Discount code created');
    setOpen(false);
    setForm({ ...empty });
    setEditingId(null);
    load();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from('dealer_admin_discount_codes').update({ is_active }).eq('id', id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this code?')) return;
    const { error } = await supabase.from('dealer_admin_discount_codes').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); load(); }
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code}`);
  };

  const generateCode = () => {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setForm({ ...form, code: `DEAL-${random}` });
  };

  const isExpired = (c: Code) => c.valid_until && new Date(c.valid_until) < new Date();
  const isExhausted = (c: Code) => c.usage_limit && c.times_used >= c.usage_limit;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Discount codes</h1>
        </div>
        <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) { setEditingId(null); setForm({ ...empty }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New code</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? 'Edit discount code' : 'Create discount code'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Code</Label>
                <div className="flex gap-2">
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DEAL-ABC123" />
                  <Button type="button" variant="outline" onClick={generateCode}>Generate</Button>
                </div>
              </div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Campaign source</Label><Select value={form.campaign_source || 'GENERAL'} onValueChange={value => setForm({ ...form, campaign_source: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['GENERAL', 'SALESTEAM', 'WELCOME', 'EMAIL', 'INSTA', 'AFFILIATE', 'RETARGETING'].map(value => <SelectItem key={value} value={value}>{({ GENERAL: 'General campaign', SALESTEAM: 'Sales team', WELCOME: 'New dealers', EMAIL: 'Email campaign', INSTA: 'Instagram', AFFILIATE: 'Affiliate', RETARGETING: 'Retargeting' } as Record<string, string>)[value]}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v, min_order_amount: v === 'fixed' ? Math.max(350, form.min_order_amount) : form.min_order_amount })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="fixed">Fixed (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Value</Label><Input type="number" min={0} step={0.01} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Minimum spend (£)</Label><Input type="number" min={form.discount_type === 'fixed' ? 350 : 0} step={1} value={form.min_order_amount} onChange={event => setForm({ ...form, min_order_amount: Number(event.target.value) })} />{form.discount_type === 'fixed' && <p className="mt-1 text-xs text-muted-foreground">Fixed discounts require at least £350 spend.</p>}</div>
              <div><Label>Usage limit (blank = unlimited)</Label><Input type="number" min={1} value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valid from</Label><Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></div>
                <div><Label>Valid until</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? 'Save changes' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3"><Input aria-label="Search discount codes" placeholder="Search codes or campaign" value={search} onChange={event => setSearch(event.target.value)} className="w-full sm:max-w-xs" /><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All codes</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive / expired</SelectItem></SelectContent></Select><Button variant="outline" size="icon" title="Refresh codes" onClick={load}><RefreshCw className="h-4 w-4" /></Button></div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : codes.length === 0 ? (
        <Card className="border-2"><CardContent className="py-12 text-center text-muted-foreground">No discount codes yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {codes.filter(c => `${c.code} ${c.description || ''} ${c.campaign_source || ''}`.toLowerCase().includes(search.toLowerCase()) && (status === 'all' || (status === 'active' ? c.is_active && !isExpired(c) && !isExhausted(c) : !c.is_active || isExpired(c) || isExhausted(c)))).map((c) => {
            const expired = isExpired(c);
            const exhausted = isExhausted(c);
            return (
              <Card key={c.id} className="border-2">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <code className="font-mono font-bold text-foreground bg-muted px-2 py-1 rounded">{c.code}</code>
                      <Button size="sm" variant="ghost" onClick={() => copy(c.code)}><Copy className="h-3.5 w-3.5" /></Button>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {c.discount_type === 'percent' ? <Percent className="h-3 w-3" /> : <PoundSterling className="h-3 w-3" />}
                        {c.discount_value}{c.discount_type === 'percent' ? '%' : ''}
                      </Badge>
                      {!c.is_active && <Badge className="bg-muted text-muted-foreground">Inactive</Badge>}
                      {expired && <Badge variant="destructive">Expired</Badge>}
                      {exhausted && <Badge variant="secondary">Limit reached</Badge>}
                      {c.min_order_amount > 0 && <span className="text-xs text-muted-foreground">Min £{c.min_order_amount}</span>}
                      {c.campaign_source && <Badge variant="outline">{c.campaign_source}</Badge>}
                      {c.description && <span className="text-sm text-muted-foreground">— {c.description}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Used {c.times_used}{c.usage_limit ? `/${c.usage_limit}` : ''}</span>
                      {c.valid_until && <span>Until {new Date(c.valid_until).toLocaleDateString('en-GB')}</span>}
                      <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                      <Button size="sm" variant="ghost" title="Edit code" onClick={() => { setEditingId(c.id); setForm({ code: c.code, description: c.description || '', discount_type: c.discount_type, discount_value: c.discount_value, usage_limit: c.usage_limit ?? '', valid_from: c.valid_from?.slice(0, 10) || '', valid_until: c.valid_until ? new Date(Date.parse(c.valid_until) - 86400000).toISOString().slice(0, 10) : '', is_active: c.is_active, min_order_amount: c.min_order_amount, campaign_source: c.campaign_source || '' }); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Delete unused code" disabled={c.times_used > 0} onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

export default DealerAdminDiscountCodes;
