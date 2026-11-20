import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Number of dealer cancellation requests still waiting for a decision, shown on the Cancellations menu item. */
export const PendingCancellationBadge: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { data: n = 0 } = useQuery({
    queryKey: ['dealer-cancellation-pending-count'],
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from('dealer_cancellation_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count || 0;
    },
  });
  if (!n) return null;
  return (
    <span
      aria-label={`${n} cancellation requests waiting`}
      className={`${compact ? 'absolute right-1 top-1' : 'ml-2 self-center'} inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground`}
    >
      {n}
    </span>
  );
};
