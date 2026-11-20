import { useEffect, useState } from 'react';
import { Check, ChevronDown, Gift, Info, Tag, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

/** The offer wording lives here once, so every dealer page says the same thing. */
export const BOGOF_SHORT_LABEL = 'Buy one get one free';
export const BOGOF_DETAIL = "Buy one, get one free — then buy one, get one free again, up to 3 free warranties in total (up to 3 years' cover each). Then monthly invoicing after six paid warranties.";

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

/**
 * Short offer label with the full wording in a hover bubble, so the pricing row
 * stays compact. Hovering reveals the detail on a desktop; a tap shows it on a
 * phone, because a hover-only tip is useless there. The bubble is kept inside
 * the screen edge by the tooltip's collision handling.
 */
export function OfferDetailTip({ detail = BOGOF_DETAIL }: { detail?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button type="button" aria-label="Offer details" aria-expanded={open}
          onPointerDown={event => { if (event.pointerType === 'touch') setOpen(true); }}
          onClick={event => event.preventDefault()}
          className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-crm-orange/40 bg-card text-crm-orange hover:bg-crm-orange-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange sm:h-5 sm:w-5 !min-h-0 !min-w-0 after:absolute after:-inset-3 after:content-['']">
          <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" collisionPadding={12} className="max-w-[16rem] text-center text-xs font-semibold leading-snug text-crm-navy">
        {detail}
      </TooltipContent>
    </Tooltip>
  );
}

/** Visual banner; shared by the dealer pages and the Super Admin preview. */
export function BogofBannerView({ s, compact = false, onClose }: { s: BogofSettings; compact?: boolean; onClose?: () => void }) {
  return (
    <div role="status" className={`relative overflow-hidden rounded-xl border border-border bg-white p-4 text-foreground shadow-sm sm:p-5 ${compact ? '' : 'md:flex md:items-center md:gap-6'}`}>
      {onClose && <button type="button" aria-label="Close offer" onClick={onClose} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/70"><X className="h-4 w-4" /></button>}
      <div className="flex items-center gap-4 md:flex-1">
        <Tag className="h-10 w-10 shrink-0 text-crm-orange" aria-hidden="true" />
        <div className={`min-w-0 border-l border-border pl-4 ${onClose ? 'pr-12' : ''}`}>
          <p className="text-xs font-extrabold uppercase tracking-wide text-crm-orange">{s.eyebrow}</p>
          <p className="text-xl font-black leading-tight text-crm-navy sm:text-2xl"><span className="text-crm-navy">{s.banner_title}</span></p>
          {s.banner_text && <span className="mt-2 inline-flex items-start gap-1.5 rounded-md border border-crm-orange/30 bg-crm-orange-soft px-2.5 py-1 text-sm font-bold leading-snug text-balance text-crm-orange"><Gift className="mt-0.5 h-4 w-4 shrink-0" />{s.banner_text}</span>}
        </div>
      </div>
      <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-crm-green-deep ${compact ? '' : 'md:mt-0 md:flex-col md:border-l md:border-border md:pl-6 md:pr-8'}`}>
        <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" />No code needed</span>
        <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" />Applied automatically at checkout</span>
        <span className="flex w-full gap-1.5 pl-[22px] text-xs font-medium leading-snug text-muted-foreground"><span aria-hidden="true">*</span><span>Applies to your first three<br />warranties: buy 3, get 3 free</span></span>
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

/** Compact collapsible version of the offer for the pricing page — one line until opened. */
export function BogofCollapsible({ dealerId }: { dealerId?: string | null }) {
  const [s, setS] = useState<BogofSettings | null>(null);
  const [eligible, setEligible] = useState(true);
  const [open, setOpen] = useState(false);
  useEffect(() => { let live = true; loadBogofSettings().then(d => live && setS(d)); return () => { live = false; }; }, []);
  useEffect(() => { let live = true; loadBogofEligibility(dealerId).then(ok => live && setEligible(ok)); return () => { live = false; }; }, [dealerId]);
  if (!s?.enabled || !eligible) return null;
  return (
    <section aria-label={s.eyebrow} className="rounded-xl border border-border bg-card shadow-sm">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <Gift className="h-5 w-5 shrink-0 text-crm-orange" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-extrabold uppercase tracking-wide text-crm-orange">{s.eyebrow}</span>
          <span className="block truncate text-sm font-black text-crm-navy">{s.banner_title}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          {s.banner_text && <p className="text-sm font-bold text-crm-orange">{s.banner_text}</p>}
          <div className="space-y-1 text-sm font-bold text-crm-green-deep">
            <p className="flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0" />No code needed</p>
            <p className="flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0" />Applied automatically at checkout</p>
            <p className="flex gap-1.5 pl-[22px] text-xs font-medium leading-snug text-muted-foreground"><span aria-hidden="true">*</span><span>Applies to your first three warranties: buy 3, get 3 free</span></p>
          </div>
        </div>
      )}
    </section>
  );
}
