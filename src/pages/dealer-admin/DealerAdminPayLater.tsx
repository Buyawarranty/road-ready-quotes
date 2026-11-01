import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;

interface Settings {
  unlock_rule: 'paid_warranties' | 'immediate' | 'disabled';
  required_paid_warranties: number;
  payment_term_days: number;
  block_on_overdue: boolean;
}
interface DealerRow {
  id: string;
  company_name: string;
  email: string;
}

const DealerAdminPayLater: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dealers, setDealers] = useState<DealerRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [paidCounts, setPaidCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [s, d, o, c] = await Promise.all([
        db.from('dealer_paylater_settings').select('*').eq('id', 1).maybeSingle(),
        db.from('dealers').select('id, company_name, email').order('company_name'),
        db.from('dealer_paylater_overrides').select('dealer_id, mode'),
        db.from('customers').select('dealer_id').eq('payment_status', 'paid').not('dealer_id', 'is', null).limit(5000),
      ]);
      setSettings(
        s.data || { unlock_rule: 'paid_warranties', required_paid_warranties: 1, payment_term_days: 30, block_on_overdue: true },
      );
      setDealers(d.data || []);
      setOverrides(Object.fromEntries((o.data || []).map((r: any) => [r.dealer_id, r.mode])));
      const counts: Record<string, number> = {};
      (c.data || []).forEach((r: any) => (counts[r.dealer_id] = (counts[r.dealer_id] || 0) + 1));
      setPaidCounts(counts);
    })();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await db
      .from('dealer_paylater_settings')
      .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    setSaving(false);
    toast(error ? { title: 'Could not save', description: error.message, variant: 'destructive' } : { title: 'Pay later rules saved' });
  };

  const setOverride = async (dealerId: string, mode: string) => {
    setOverrides((p) => ({ ...p, [dealerId]: mode }));
    const { error } = await db
      .from('dealer_paylater_overrides')
      .upsert({ dealer_id: dealerId, mode, updated_at: new Date().toISOString() });
    if (error) toast({ title: 'Could not update dealer', description: error.message, variant: 'destructive' });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return dealers.filter((d) => !q || d.company_name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q));
  }, [dealers, search]);

  if (!settings) return <Loader2 className="w-6 h-6 animate-spin m-8" />;

  const statusFor = (id: string) => {
    const mode = overrides[id] || 'auto';
    if (mode === 'allow') return 'Allowed (override)';
    if (mode === 'block') return 'Blocked (override)';
    if (settings.unlock_rule === 'disabled') return 'Off for everyone';
    if (settings.unlock_rule === 'immediate') return 'Unlocked';
    const paid = paidCounts[id] || 0;
    return paid >= settings.required_paid_warranties ? 'Unlocked' : `New: ${paid} of ${settings.required_paid_warranties} paid`;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Pay later rules</h1>
        <p className="text-sm text-muted-foreground">
          Decide when dealers can choose "Invoice me" at checkout. Overdue balances are checked automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rules for all dealers</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>When does Invoice me unlock?</Label>
            <Select value={settings.unlock_rule} onValueChange={(v) => setSettings({ ...settings, unlock_rule: v as Settings['unlock_rule'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid_warranties">After a number of paid warranties</SelectItem>
                <SelectItem value="immediate">Straight away for approved dealers</SelectItem>
                <SelectItem value="disabled">Off for everyone (overrides still apply)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Paid warranties needed (1 = first payment)</Label>
            <Input
              type="number"
              min={1}
              disabled={settings.unlock_rule !== 'paid_warranties'}
              value={settings.required_paid_warranties}
              onChange={(e) => setSettings({ ...settings, required_paid_warranties: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Payment terms (days)</Label>
            <Input
              type="number"
              min={1}
              value={settings.payment_term_days}
              onChange={(e) => setSettings({ ...settings, payment_term_days: Math.max(1, Number(e.target.value) || 30) })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Block when a balance is overdue</Label>
              <p className="text-xs text-muted-foreground">Unpaid warranties older than the payment terms</p>
            </div>
            <Switch checked={settings.block_on_overdue} onCheckedChange={(v) => setSettings({ ...settings, block_on_overdue: v })} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save rules
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-lg">Per dealer</CardTitle>
          <Input placeholder="Search dealer or email" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent className="divide-y">
          {filtered.map((d) => (
            <div key={d.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{d.company_name}</p>
                <p className="text-xs text-muted-foreground truncate">{d.email} · {statusFor(d.id)}</p>
              </div>
              <Select value={overrides[d.id] || 'auto'} onValueChange={(v) => setOverride(d.id, v)}>
                <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Follow the rules</SelectItem>
                  <SelectItem value="allow">Always allow</SelectItem>
                  <SelectItem value="block">Block pay later</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
          {filtered.length === 0 && <p className="py-6 text-sm text-muted-foreground">No dealers found.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerAdminPayLater;
