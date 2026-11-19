import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { HistoryItem } from '@/components/shared/StampedNotesHistory';

let staffCache: Promise<Record<string, string>> | null = null;
const staffNames = () => (staffCache ??= (supabase as any).rpc('bdm_staff_list').then(({ data }: any) =>
  Object.fromEntries((data || []).map((s: any) => [s.user_id, s.name]))));

/** Date-stamped note and call history for a dealership, newest first, with who wrote it. */
export const useBdmNoteHistory = (dealershipId: string, enabled = true) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const reload = useCallback(async () => {
    const [{ data }, names] = await Promise.all([
      (supabase as any).from('bdm_activities').select('id, notes, created_at, activity_type, outcome, bdm_user_id')
        .eq('dealership_id', dealershipId).not('notes', 'is', null).order('created_at', { ascending: false }).limit(100),
      staffNames(),
    ]);
    setItems((data || []).map((n: any) => ({
      id: n.id, at: n.created_at, author: n.bdm_user_id ? names[n.bdm_user_id] ?? null : null,
      tag: n.activity_type === 'note' ? null : n.activity_type, text: n.notes,
    })));
  }, [dealershipId]);
  useEffect(() => { if (enabled) reload(); }, [enabled, reload]);
  return { items, reload };
};
