import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { canExportDealers } from '@/lib/dealerExportAccess';

export function useDealerExportAccess(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: roles }, { data: admin }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('admin_users').select('permissions').eq('user_id', user.id).maybeSingle(),
      ]);
      if (!cancelled) setAllowed(canExportDealers((roles || []).map((r: any) => r.role), (admin as any)?.permissions));
    })();
    return () => { cancelled = true; };
  }, []);
  return allowed;
}
