import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_TRADER_CONFIG } from '@/lib/traderPricingDefaults';

interface Row {
  id: string;
  category: string;
  option_key: string;
  option_label: string | null;
  multiplier: number;
  active: boolean;
}

const CATEGORY_ORDER = ['base', 'term', 'excess', 'labour', 'parts', 'claim', 'dealer_pct', 'vat'];
const CATEGORY_LABEL: Record<string, string> = {
  base: 'Base price (£)',
  term: 'Term multipliers',
  excess: 'Repair excess multipliers',
  labour: 'Labour rate multipliers',
  parts: 'Parts contribution multipliers',
  claim: 'Claim limit multipliers',
  dealer_pct: 'Dealer pay percentage',
  vat: 'VAT multiplier',
};

const DEFAULTS_FLAT: { category: string; option_key: string; multiplier: number }[] = [
  { category: 'base', option_key: 'gold', multiplier: DEFAULT_TRADER_CONFIG.base },
  ...Object.entries(DEFAULT_TRADER_CONFIG.excess).map(([k, v]) => ({ category: 'excess', option_key: k, multiplier: v })),
  ...Object.entries(DEFAULT_TRADER_CONFIG.labour).map(([k, v]) => ({ category: 'labour', option_key: k, multiplier: v })),
  ...Object.entries(DEFAULT_TRADER_CONFIG.parts).map(([k, v]) => ({ category: 'parts', option_key: k, multiplier: v as number })),
  ...Object.entries(DEFAULT_TRADER_CONFIG.claim).map(([k, v]) => ({ category: 'claim', option_key: k, multiplier: v })),
  ...Object.entries(DEFAULT_TRADER_CONFIG.term).map(([k, v]) => ({ category: 'term', option_key: k, multiplier: v })),
  { category: 'dealer_pct', option_key: 'default', multiplier: DEFAULT_TRADER_CONFIG.dealer_pct },
  { category: 'vat', option_key: 'default', multiplier: DEFAULT_TRADER_CONFIG.vat },
];

const DealerAdminTraderPricing: React.FC = () => {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trader_pricing_config')
      .select('*')
      .order('category')
      .order('option_key');
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateMultiplier = (id: string, value: string) => {
    const n = Number(value);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, multiplier: isNaN(n) ? 0 : n } : r)));
  };

  const save = async () => {
    setSaving(true);
    const updates = rows.map((r) =>
      supabase.from('trader_pricing_config').update({ multiplier: r.multiplier }).eq('id', r.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    setSaving(false);
    if (failed?.error) {
      toast({ title: 'Save failed', description: failed.error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['trader_pricing_config'] });
    toast({ title: 'Saved', description: 'Trader pricing updated.' });
  };

  const resetDefaults = async () => {
    if (!confirm('Reset all multipliers to spreadsheet defaults?')) return;
    setSaving(true);
    const updates = DEFAULTS_FLAT.map((d) =>
      supabase
        .from('trader_pricing_config')
        .update({ multiplier: d.multiplier })
        .eq('category', d.category)
        .eq('option_key', d.option_key),
    );
    await Promise.all(updates);
    setSaving(false);
    qc.invalidateQueries({ queryKey: ['trader_pricing_config'] });
    await load();
    toast({ title: 'Reset complete', description: 'All values restored to defaults.' });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: rows.filter((r) => r.category === cat),
  })).filter((g) => g.items.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trader Pricing</h1>
          <p className="text-sm text-muted-foreground">Tune the multipliers used by the dealer portal Step 3 pricing engine. Changes do not affect retail pricing.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetDefaults} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset defaults
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map((g) => (
          <Card key={g.cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABEL[g.cat]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {g.items.map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{r.option_label || r.option_key}</p>
                    <p className="text-xs text-muted-foreground">{r.category} · {r.option_key}</p>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={r.multiplier}
                    onChange={(e) => updateMultiplier(r.id, e.target.value)}
                    className="w-28 text-right font-mono"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DealerAdminTraderPricing;
