import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_TRADE_TERMS, fetchCurrentTradeTerms, type TradeTerms } from '@/lib/dealerTradeTerms';

export function useTradeTerms() {
  const [terms, setTerms] = useState<TradeTerms>(DEFAULT_TRADE_TERMS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchCurrentTradeTerms(supabase).then((t) => { if (!cancelled) { setTerms(t); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);
  return { terms, loaded };
}
