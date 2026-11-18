import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DealerPortalUsage } from '@/lib/dealerPortalProgress';

/** Loads sign-in/quote/warranty usage for the given dealers (server checks the caller may see them). */
export function useDealerPortalUsage(dealerIds: string[]) {
  const [usage, setUsage] = useState<Record<string, DealerPortalUsage>>({});
  const key = [...new Set(dealerIds)].sort().join(',');
  useEffect(() => {
    if (!key) { setUsage({}); return; }
    let cancelled = false;
    (async () => {
      const ids = key.split(',');
      const all: DealerPortalUsage[] = [];
      for (let i = 0; i < ids.length; i += 500) {
        const { data, error } = await supabase.functions.invoke('dealer-portal-usage', { body: { dealer_ids: ids.slice(i, i + 500) } });
        if (error || !data?.usage) return;
        all.push(...data.usage);
      }
      if (!cancelled) setUsage(Object.fromEntries(all.map(u => [u.dealer_id, u])));
    })();
    return () => { cancelled = true; };
  }, [key]);
  return usage;
}
