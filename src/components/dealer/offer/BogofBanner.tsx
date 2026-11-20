import { useEffect, useState } from 'react';
import { Check, Gift, Tag, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export type BogofSettings = { enabled: boolean; eyebrow: string; banner_title: string; banner_text: string };

export async function loadBogofSettings(): Promise<BogofSettings | null> {
  const { data } = await (supabase.from as any)('dealer_bogof_settings').select('enabled, eyebrow, banner_title, banner_text').eq('id', 1).maybeSingle();
  return data ?? null;
}

/**
 * Whether the buy-one-get-one-free offer still applies to this dealer:
 * they are still earning their free warranties (fewer than 3 paid) or have
 * free warranties left to use. Once all free warranties are used, the offer
 * messaging hides. Defaults to true when the check cannot run, so a temporary
 * read failure never wrongly hides a live offer.
 */
export async function loadBogofEligibility(dealerId?: string | null): Promise<boolean> {
  if (!dealerId) return true;
  const { data, error } = await (supabase.rpc as any)('get_dealer_paylater_eligibility', { p_dealer_id: dealerId });
  if (error || !data) return true;
  const e = data as { paid_count?: number; intro_free_remaining?: number };
  return (e.intro_free_remaining ?? 0) > 0 || (e.paid_count ?? 0) < 3;
}

/** Visual banner; shared by the dealer pages and the Super Admin preview. */
export function BogofBannerView({ s, compact = false, onClose }: { s: BogofSettings; compact?: boolean; onClose?: () => void }) {
  return (
    <div role="status" className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-crm-orange to-crm-red p-4 text-primary-foreground shadow-md sm:p-5 ${compact ? '' : 'md:flex md:items-center md:gap-6'}`}>
      {onClose && <button type="button" aria-label="Close offer" onClick={onClose} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/20 hover:bg-background/30"><X className="h-4 w-4" /></button>}
      <div className="flex items-center gap-4 md:flex-1">
        <Tag className="h-10 w-10 shrink-0 text-crm-gold-pure" aria-hidden="true" />
        <div className="min-w-0 border-l border-background/30 pl-4">
          <p className="text-xs font-extrabold uppercase tracking-wide">{s.eyebrow}</p>
          <p className="text-xl font-black leading-tight sm:text-2xl"><span className="text-crm-gold-pure">{s.banner_title}</span></p>
          {s.banner_text && <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-background/60 px-2.5 py-1 text-sm font-bold"><Gift className="h-4 w-4" />{s.banner_text}</span>}
        </div>
      </div>
      <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold ${compact ? '' : 'md:mt-0 md:flex-col md:border-l md:border-background/30 md:pl-6 md:pr-8'}`}>
        <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" />No code needed</span>
        <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" />Applied automatically at checkout</span>
      </div>
    </div>
  );
}

/** Buy one get one free banner; only shows while Super Admin has the offer switched on and the dealer is still eligible. */
export default function BogofBanner({ dealerId }: { dealerId?: string | null }) {
  const [s, setS] = useState<BogofSettings | null>(null);
  const [eligible, setEligible] = useState(true);
  const [closed, setClosed] = useState(false);
  useEffect(() => { let live = true; loadBogofSettings().then(d => live && setS(d)); return () => { live = false; }; }, []);
  useEffect(() => { let live = true; loadBogofEligibility(dealerId).then(ok => live && setEligible(ok)); return () => { live = false; }; }, [dealerId]);
  if (!s?.enabled || !eligible || closed) return null;
  return <BogofBannerView s={s} onClose={() => setClosed(true)} />;
}
