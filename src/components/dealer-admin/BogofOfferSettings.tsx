import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Eye, Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { BogofBannerView, loadBogofSettings, type BogofSettings } from '@/components/dealer/offer/BogofBanner';

/** Super Admin only: switch the buy-one-get-one-free offer on/off and edit its banner. */
export default function BogofOfferSettings() {
  const [isSuper, setIsSuper] = useState(false);
  const [s, setS] = useState<BogofSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<'phone' | 'desktop'>('desktop');
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin');
      if (data?.length) { setIsSuper(true); setS(await loadBogofSettings()); }
    })();
  }, []);
  if (!isSuper || !s) return null;
  const save = async (next: BogofSettings) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from as any)('dealer_bogof_settings').update({ ...next, updated_by: user?.id, updated_at: new Date().toISOString() }).eq('id', 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    setS(next);
    toast.success(next.enabled ? 'Offer is live' : 'Offer saved (switched off)');
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Your current choices appear here before you push them live.</p>
      <BogofBannerView s={s} />
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex flex-wrap items-center gap-2 font-semibold">Buy one, get the next one free
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.enabled ? 'bg-crm-green-soft text-crm-green-deep' : 'bg-muted text-muted-foreground'}`}>{s.enabled ? 'Offer is live' : 'Offer is off'}</span></p>
              <p className="mt-1 text-sm text-muted-foreground">{s.enabled ? 'On: every paid warranty earns the dealer one free warranty (up to 3 years).' : 'Off: dealers pay for every warranty and no banner shows.'}</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">{s.enabled ? 'On' : 'Off'}<Switch checked={s.enabled} disabled={saving} onCheckedChange={v => save({ ...s, enabled: v })} /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><p className="mb-1 text-xs text-muted-foreground">Small heading</p><Input value={s.eyebrow} maxLength={40} onChange={e => setS({ ...s, eyebrow: e.target.value })} /></div>
            <div><p className="mb-1 text-xs text-muted-foreground">Main headline</p><Input value={s.banner_title} maxLength={80} onChange={e => setS({ ...s, banner_title: e.target.value })} /></div>
            <div><p className="mb-1 text-xs text-muted-foreground">Gift tag text</p><Input value={s.banner_text} maxLength={80} onChange={e => setS({ ...s, banner_text: e.target.value })} /></div>
          </div>
          <p className="text-sm text-muted-foreground">Applies to new dealer purchases only. Free warranties already issued stay unchanged.</p>
          <Button onClick={() => save(s)} disabled={saving}>{saving ? 'Saving…' : 'Save banner text'}</Button>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold"><Eye className="h-4 w-4" /> Dealer pricing page preview</p>
        <div className="flex gap-2">
          <Button size="sm" variant={device === 'phone' ? 'default' : 'outline'} onClick={() => setDevice('phone')}><Smartphone className="mr-1 h-4 w-4" />Phone</Button>
          <Button size="sm" variant={device === 'desktop' ? 'default' : 'outline'} onClick={() => setDevice('desktop')}><Monitor className="mr-1 h-4 w-4" />Desktop / iPad</Button>
        </div>
      </div>
      <div className={device === 'phone' ? 'mx-auto max-w-sm' : ''}><BogofBannerView s={s} compact={device === 'phone'} onClose={() => {}} /></div>
    </div>
  );
}
