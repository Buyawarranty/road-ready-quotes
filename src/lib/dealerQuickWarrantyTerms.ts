import { warrantyTerms } from './fullWarrantyConfiguration';

// Four-year cover is visible, but cannot be charged without approved pricing.
export const dealerQuickWarrantyTerms = [12, 24, 36, 48].map(months => ({
  value: String(months),
  months,
  label: `${months / 12} ${months === 12 ? 'year' : 'years'}`,
  disabled: !warrantyTerms.some(term => term.months === months),
}));