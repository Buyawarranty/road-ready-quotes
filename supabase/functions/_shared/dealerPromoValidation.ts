export interface DealerPromo {
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  is_active: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  usage_limit?: number | null;
  times_used: number;
}

export function calculateDealerPromo(base: number, promo: DealerPromo, now = Date.now()) {
  if (!Number.isFinite(base) || base <= 0) throw new Error('Invalid warranty amount.');
  if (!promo.is_active) throw new Error('Promo code is unavailable.');
  if ((promo.valid_from && Date.parse(promo.valid_from) > now) || (promo.valid_until && Date.parse(promo.valid_until) <= now)) throw new Error('Promo code is outside its valid dates.');
  if (promo.usage_limit != null && promo.times_used >= promo.usage_limit) throw new Error('Promo code has reached its usage limit.');
  const minimum = Math.max(promo.min_order_amount, promo.discount_type === 'fixed' ? 350 : 0);
  if (base < minimum) throw new Error(`This code requires a minimum spend of £${minimum}.`);
  if (!['percent', 'fixed'].includes(promo.discount_type) || !Number.isFinite(promo.discount_value) || promo.discount_value <= 0 || (promo.discount_type === 'percent' && promo.discount_value > 100)) throw new Error('Invalid promo discount.');
  const discount = Math.round((promo.discount_type === 'percent' ? base * promo.discount_value / 100 : promo.discount_value) * 100) / 100;
  const total = Math.round((base - discount) * 100) / 100;
  if (total < Math.max(50, base / 2)) throw new Error('This code exceeds the permitted discount for this warranty.');
  return { code: promo.code, discount_amount: discount, total };
}