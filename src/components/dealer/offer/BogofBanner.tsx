import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export type BogofSettings = { enabled: boolean; banner_title: string; banner_text: string };

export async function loadBogofSettings(): Promise<BogofSettings | null> {
  const { data } = await (supabase.from as any)('dealer_bogof_settings').select('enabled, banner_title, banner_text').eq('id', 1).maybeSingle();
  return data ?? null;
}

/** Buy one get one free banner; only shows while Super Admin has the offer switched on. */
export default function BogofBanner() {
  const [s, setS] = useState<BogofSettings | null>(null);
  useEffect(() => { let live = true; loadBogofSettings().then(d => live && setS(d)); return () => { live = false; }; }, []);
  if (!s?.enabled) return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border-2 border-crm-green/40 bg-crm-green-soft px-4 py-3 text-crm-navy">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card"><Gift className="h-5 w-5 text-crm-green-deep" /></span>
      <div className="min-w-0"><p className="text-base font-extrabold leading-5">{s.banner_title}</p><p className="mt-0.5 text-sm leading-5 text-muted-foreground">{s.banner_text}</p></div>
    </div>
  );
}
