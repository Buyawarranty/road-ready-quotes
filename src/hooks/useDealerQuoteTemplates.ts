import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import type { TraderClaim, TraderExcess, TraderLabour, TraderParts, TraderTerm } from '@/lib/traderPricingDefaults';

export interface DealerQuoteTemplate {
  id: string;
  name: string;
  term_months: number;
  excess: number;
  labour: number;
  parts: string;
  claim_limit: number;
  plan_type: string;
  price: number | null;
  created_at: string;
}

export interface DealerQuoteTemplateInput {
  name: string;
  term: TraderTerm | number;
  excess: TraderExcess | number;
  labour: TraderLabour | number;
  parts: TraderParts | string;
  claim: TraderClaim | number;
  plan_type?: string;
  price?: number | null;
}

export interface DealerLastQuote {
  warranty_duration: string | null;
  plan_type: string | null;
  price: number | null;
  created_at: string;
}

export function describeTemplate(t: DealerQuoteTemplate) {
  const claim = t.claim_limit >= 1000 ? `£${t.claim_limit / 1000}k` : `£${t.claim_limit}`;
  const parts = t.parts === 'none' ? 'no parts contribution' : 'age & mileage parts';
  const price = typeof t.price === 'number' ? ` · £${t.price.toFixed(2)}` : '';
  return `${t.term_months}m · £${t.excess} excess · £${t.labour}/hr · ${claim} claim limit · ${parts}${price}`;
}

export function useDealerQuoteTemplates() {
  const { dealer } = useDealerAuth();
  const [templates, setTemplates] = useState<DealerQuoteTemplate[]>([]);
  const [lastQuote, setLastQuote] = useState<DealerLastQuote | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!dealer?.id) return;
    setLoading(true);
    try {
      const [tplRes, lastRes] = await Promise.all([
        supabase
          .from('dealer_quote_templates')
          .select('id, name, term_months, excess, labour, parts, claim_limit, plan_type, price, created_at')
          .eq('dealer_id', dealer.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('dealer_quotes')
          .select('warranty_duration, plan_type, price, created_at')
          .eq('dealer_id', dealer.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      if (tplRes.data) setTemplates(tplRes.data as unknown as DealerQuoteTemplate[]);
      const last = (lastRes.data || [])[0] as any;
      setLastQuote(last ? (last as DealerLastQuote) : null);
    } finally {
      setLoading(false);
    }
  }, [dealer?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveTemplate = useCallback(
    async (input: DealerQuoteTemplateInput) => {
      if (!dealer?.id) throw new Error('Your trader profile could not be found — please sign in again.');
      const { data, error } = await supabase
        .from('dealer_quote_templates')
        .insert({
          dealer_id: dealer.id,
          name: input.name,
          term_months: Number(input.term),
          excess: Number(input.excess),
          labour: Number(input.labour),
          parts: String(input.parts),
          claim_limit: Number(input.claim),
          plan_type: input.plan_type || 'gold',
          price: typeof input.price === 'number' && input.price > 0 ? +input.price.toFixed(2) : null,
        })
        .select('id, name, term_months, excess, labour, parts, claim_limit, plan_type, price, created_at')
        .single();
      if (error) throw error;
      setTemplates((prev) => [data as unknown as DealerQuoteTemplate, ...prev]);
      return data as unknown as DealerQuoteTemplate;
    },
    [dealer?.id],
  );

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from('dealer_quote_templates').delete().eq('id', id);
    if (error) throw error;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { templates, lastQuote, loading, saveTemplate, deleteTemplate, reload: load };
}
