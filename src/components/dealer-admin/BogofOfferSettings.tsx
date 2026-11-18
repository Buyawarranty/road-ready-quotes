import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Gift } from 'lucide-react';
import { toast } from 'sonner';
import { loadBogofSettings, type BogofSettings } from '@/components/dealer/offer/BogofBanner';

/** Super Admin only: switch the buy-one-get-one-free offer on/off and edit its banner. */
export default function BogofOfferSettings() {
  const [isSuper, setIsSuper] = useState(false);
  const [s, setS] = useState<BogofSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin');
      if (data?.length) { setIsSuper(true); setS(await loadBogofSettings()); }
    })();
  }, []);
  if (!isSuper || !s) return null;
  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from as any)('dealer_bogof_settings').update({ ...s, updated_by: user?.id, updated_at: new Date().toISOString() }).eq('id', 1);
    setSaving(false);
    error ? toast.error(error.message) : toast.success('Offer saved');
  };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Gift className="h-5 w-5" /> Buy one, get the next one free</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center gap-3 text-sm font-semibold"><Switch checked={s.enabled} onCheckedChange={v => setS({ ...s, enabled: v })} /> {s.enabled ? 'Offer is on' : 'Offer is off'}</label>
        <div><p className="mb-1 text-xs text-muted-foreground">Banner heading</p><Input value={s.banner_title} maxLength={80} onChange={e => setS({ ...s, banner_title: e.target.value })} /></div>
        <div><p className="mb-1 text-xs text-muted-foreground">Banner text</p><Input value={s.banner_text} maxLength={200} onChange={e => setS({ ...s, banner_text: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">Each paid warranty earns the dealer one free warranty (up to 3 years), live straight away. Switching off stops new free warranties.</p>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save offer'}</Button>
      </CardContent>
    </Card>
  );
}
