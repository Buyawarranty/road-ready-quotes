import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_TRADER_CONFIG, TraderConfig } from '@/lib/traderPricingDefaults';

interface Row {
  category: string;
  option_key: string;
  multiplier: number;
  active: boolean;
}

function buildConfig(rows: Row[]): TraderConfig {
  const cfg: TraderConfig = JSON.parse(JSON.stringify(DEFAULT_TRADER_CONFIG));
  for (const r of rows) {
    if (!r.active) continue;
    const m = Number(r.multiplier);
    switch (r.category) {
      case 'base':
        if (r.option_key === 'gold') cfg.base = m;
        break;
      case 'excess':
        cfg.excess[Number(r.option_key)] = m;
        break;
      case 'labour':
        cfg.labour[Number(r.option_key)] = m;
        break;
      case 'parts':
        if (r.option_key === 'age_mileage' || r.option_key === 'none') cfg.parts[r.option_key] = m;
        break;
      case 'claim':
        cfg.claim[Number(r.option_key)] = m;
        break;
      case 'term':
        cfg.term[Number(r.option_key)] = m;
        break;
      case 'dealer_pct':
        cfg.dealer_pct = m;
        break;
      case 'vat':
        cfg.vat = m;
        break;
    }
  }
  return cfg;
}

export function useTraderPricingConfig() {
  return useQuery({
    queryKey: ['trader_pricing_config'],
    queryFn: async (): Promise<TraderConfig> => {
      const { data, error } = await supabase
        .from('trader_pricing_config')
        .select('category, option_key, multiplier, active');
      if (error || !data) return DEFAULT_TRADER_CONFIG;
      return buildConfig(data as Row[]);
    },
    staleTime: 5 * 60 * 1000,
  });
}
