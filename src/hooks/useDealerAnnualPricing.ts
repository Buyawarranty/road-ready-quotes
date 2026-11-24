import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AnnualWarrantyProduct } from '@/lib/dealerAnnualPricing';
import { dealerRequest } from '@/lib/dealerRequest';
export interface DealerAnnualPricing {
  product_id: string;
  version: string;
  terms: AnnualWarrantyProduct[];
  cover: { excess: number; labour: number; claim: number; parts: string };
  boost?: { active: boolean; claim_limit: number; dealer_price: number; retail_price: number; terms?: { months: number; dealer_price: number; retail_price: number }[] };
}
export function useDealerAnnualPricing(dealerId?: string) {
  return useQuery({
    queryKey: ['dealer-annual-pricing', dealerId], enabled: Boolean(dealerId), staleTime: 60000, retry: false,
    queryFn: async (): Promise<DealerAnnualPricing> => {
      const { data, error } = await dealerRequest(signal => supabase.functions.invoke('dealer-annual-pricing', { signal }), 'Warranty prices are taking longer than expected. Please try again.');
      if (error || data?.error) throw new Error(data?.error || 'Warranty prices are unavailable. Please try again.');
      return data;
    },
  });
}