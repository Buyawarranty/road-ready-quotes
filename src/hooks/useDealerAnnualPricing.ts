import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AnnualWarrantyProduct } from '@/lib/dealerAnnualPricing';
export interface DealerAnnualPricing {
  product_id: string;
  version: string;
  terms: AnnualWarrantyProduct[];
  cover: { excess: number; labour: number; claim: number; parts: string };
}
export function useDealerAnnualPricing(dealerId?: string) {
  return useQuery({
    queryKey: ['dealer-annual-pricing', dealerId], enabled: Boolean(dealerId), staleTime: 60000,
    queryFn: async (): Promise<DealerAnnualPricing> => {
      const { data, error } = await supabase.functions.invoke('dealer-annual-pricing');
      if (error || data?.error) throw new Error(data?.error || 'Warranty prices are unavailable. Please try again.');
      return data;
    },
  });
}