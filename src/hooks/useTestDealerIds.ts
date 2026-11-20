import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Read only linked accounts visible to the current caller; never infer test status from names. */
export function useTestDealerIds(dealerIds: (string | null | undefined)[]) {
  const [testIds, setTestIds] = useState<Set<string>>(new Set());
  const key = [...new Set(dealerIds.filter((id): id is string => Boolean(id)))].sort().join(',');
  useEffect(() => {
    let cancelled = false;
    setTestIds(new Set());
    if (!key) return;
    void (async () => {
      const ids = key.split(',');
      const found: string[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase.from('dealers').select('id').in('id', ids.slice(i, i + 200)).eq('is_test', true);
        if (error) return;
        found.push(...(data || []).map(row => row.id));
      }
      if (!cancelled) setTestIds(new Set(found));
    })();
    return () => { cancelled = true; };
  }, [key]);
  return testIds;
}