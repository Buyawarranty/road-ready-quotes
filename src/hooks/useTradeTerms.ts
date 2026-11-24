import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_TRADE_TERMS, fetchCurrentTradeTerms, type TradeTerms } from '@/lib/dealerTradeTerms';
import { dealerRequest } from '@/lib/dealerRequest';

export function useTradeTerms() {
  const [terms, setTerms] = useState<TradeTerms>(DEFAULT_TRADE_TERMS);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError('');
    dealerRequest(signal => fetchCurrentTradeTerms(supabase, signal), 'Trade terms are taking longer to load. Please try again.')
      .then((t) => { if (!cancelled) { setTerms(t); setLoaded(true); } })
      .catch(() => { if (!cancelled) { setError('The current trade terms could not be loaded. Please try again.'); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [attempt]);
  return { terms, loaded, error, retry };
}
