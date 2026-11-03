import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Term = { months: number; dealer_price: number; retail_price: number };
const EDIT_ROLES = ['admin', 'super_admin'];

/** Annual warranty cost and recommended retail price per length; only admin and super admin may save (enforced in the database too). */
export function AnnualPriceEditor() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: plan }, { data: me }] = await Promise.all([
        supabase.from('dealer_admin_plans').select('pricing_matrix').eq('is_active', true)
          .contains('pricing_matrix', { brand: 'pandaprotect', version: 'annual-v1' }).maybeSingle(),
        user ? supabase.from('admin_users').select('role, is_active').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const list = ((plan?.pricing_matrix as { terms?: Term[] } | null)?.terms || [])
        .map(t => ({ months: t.months, dealer_price: Number(t.dealer_price), retail_price: Number(t.retail_price) }))
        .sort((a, b) => a.months - b.months);
      setTerms(list);
      setCanEdit(!!me?.is_active && EDIT_ROLES.includes(String(me.role)));
      setLoading(false);
    })();
  }, []);

  const set = (months: number, key: 'dealer_price' | 'retail_price', value: string) =>
    setTerms(ts => ts.map(t => t.months === months ? { ...t, [key]: Number(value) } : t));

  const invalid = terms.some(t => !Number.isInteger(t.dealer_price) || !Number.isInteger(t.retail_price) || t.dealer_price <= 0 || t.retail_price < t.dealer_price);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc('update_annual_dealer_prices' as never, { _terms: terms } as never);
    setSaving(false);
    toast(error ? { title: 'Prices not saved', description: error.message, variant: 'destructive' } : { title: 'Prices saved', description: 'Dealers see the new prices next time they open the pricing page.' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual warranty prices</CardTitle>
        <CardDescription>Dealer cost and recommended retail price (RRP) for each length, in whole pounds inc. VAT. Dealers can still set their own selling price.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : terms.length === 0 ? <p className="text-sm text-muted-foreground">The annual price list could not be loaded.</p> : <>
          <div className="grid grid-cols-4 gap-3 text-xs font-semibold uppercase text-muted-foreground"><span>Length</span><span>Dealer cost £</span><span>RRP £</span><span>Dealer profit at RRP</span></div>
          {terms.map(t => (
            <div key={t.months} className="grid grid-cols-4 items-center gap-3">
              <span className="font-semibold">{t.months / 12} year{t.months > 12 ? 's' : ''}</span>
              <Input type="number" step={1} min={1} value={t.dealer_price} disabled={!canEdit} onChange={e => set(t.months, 'dealer_price', e.target.value)} aria-label={`${t.months / 12} year dealer cost`} />
              <Input type="number" step={1} min={1} value={t.retail_price} disabled={!canEdit} onChange={e => set(t.months, 'retail_price', e.target.value)} aria-label={`${t.months / 12} year recommended retail price`} />
              <span className="font-semibold">£{(t.retail_price - t.dealer_price).toLocaleString('en-GB')}</span>
            </div>
          ))}
          {invalid && <p className="text-sm font-semibold text-destructive">Use whole pounds, and keep the RRP at or above the dealer cost.</p>}
          {canEdit ? <Button onClick={save} disabled={saving || invalid}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save prices</Button>
            : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" />Only admins and super admins can change these prices.</p>}
        </>}
      </CardContent>
    </Card>
  );
}
