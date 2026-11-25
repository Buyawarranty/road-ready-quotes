import { Gift } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { dealerRequest } from '@/lib/dealerRequest';
import { dealerFreeOfferStatus, type FreeOfferFigures } from '@/lib/dealerFreeOfferStatus';

/** How many free warranties the dealer has ready and has used; hidden while the offer is off or unknown. */
export function FreeWarrantyStatusView({ figures, className = '' }: { figures: FreeOfferFigures | null | undefined; className?: string }) {
  const status = dealerFreeOfferStatus(figures);
  if (!status) return null;
  return (
    <div role="status" className={`flex min-w-0 items-start gap-3 rounded-xl border border-crm-green/30 bg-crm-green-soft p-3 sm:p-4 ${className}`}>
      <Gift className="mt-0.5 h-5 w-5 shrink-0 text-crm-green-deep" aria-hidden="true" />
      <div className="min-w-0">
        <p className="break-words text-sm font-bold text-crm-navy">{status.headline}</p>
        <p className="mt-0.5 break-words text-sm text-muted-foreground">{status.detail}</p>
      </div>
    </div>
  );
}

/** Self-loading version for pages that do not already hold the dealer's eligibility figures. */
export default function FreeWarrantyStatus({ dealerId, className }: { dealerId?: string | null; className?: string }) {
  const { data } = useQuery({
    queryKey: ['dealer-free-remaining', 'status', dealerId],
    enabled: !!dealerId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: false,
    queryFn: async () => {
      const { data, error } = await dealerRequest<{ data: FreeOfferFigures | null; error: unknown }>(signal => (supabase.rpc as any)('get_dealer_paylater_eligibility', { p_dealer_id: dealerId }).abortSignal(signal), 'Free-offer availability could not be checked.');
      if (error || !data) throw new Error('Free-offer availability could not be checked.');
      return data;
    },
  });
  return <FreeWarrantyStatusView figures={data} className={className} />;
}
