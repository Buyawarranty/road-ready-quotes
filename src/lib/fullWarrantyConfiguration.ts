export const warrantyTerms = [
  { value: '3', label: '3 months', months: 3 },
  { value: '6', label: '6 months', months: 6 },
  { value: '12', label: '1 year', months: 12 },
  { value: '24', label: '2 years', months: 24 },
  { value: '36', label: '3 years', months: 36 },
];
export const warrantyExcess = [
  { value: '0', label: '£0', factor: 1.22 }, { value: '50', label: '£50', factor: 1 },
  { value: '100', label: '£100', factor: 0.93 }, { value: '250', label: '£250', factor: 0.86 },
  { value: '500', label: '£500', factor: 0.78 },
];
export const warrantyLabour = [
  { value: '40', label: '£40/hr', factor: 0.9 }, { value: '70', label: '£70/hr', factor: 1 },
  { value: '100', label: '£100/hr', factor: 1.12 }, { value: '150', label: '£150/hr', factor: 1.26 },
];
export const warrantyParts = [
  { value: 'age-mileage', label: 'Age & mileage contribution', factor: 1 },
  { value: 'none', label: '100% full cover', factor: 1.15 },
];
export const warrantyClaims = [
  { value: '1000', label: '£1,000', factor: 1 },
  { value: '2000', label: '£2,000', factor: 1.18 }, { value: '3000', label: '£3,000', factor: 1.32 },
];
// Visible to dealers but excluded from charging and customer-adjustable quotes until approved.
export const pendingWarrantyClaims = [{ value: '5000', label: '£5,000 — price pending', disabled: true }];
export const liveWarrantyAddOns = [
  { key: 'wear-extension', label: 'Wear & tear extension', price: 20, description: 'Specified wear-related components.' },
  { key: 'emissions', label: 'Emissions system cover', price: 15, description: 'DPF, EGR and emissions components.' },
  { key: 'air-suspension', label: 'Air & adaptive suspension', price: 25, description: 'Air springs, compressors and controls.' },
  { key: 'wet-belt', label: 'Wet belt / timing belt', price: 12, description: 'Subject to servicing and eligibility.' },
  { key: 'rental', label: 'Vehicle rental / courtesy car', price: 10, description: 'Replacement transport during repair.' },
  { key: 'aircon', label: 'Air conditioning / climate', price: 8, description: 'Climate-control components.' },
  { key: 'infotainment', label: 'Infotainment / multimedia', price: 8, description: 'Navigation, audio and screens.' },
  { key: 'adas', label: 'ADAS / driver assistance', price: 12, description: 'Driver-assistance sensors and systems.' },
  { key: 'ev-battery', label: 'Hybrid / EV battery', price: 25, description: 'Subject to battery-specific eligibility.' },
  { key: 'suspension', label: 'Enhanced suspension / steering', price: 10, description: 'Additional suspension and steering cover.' },
];

export function calculateFullWarranty(excess: string, labour: string, parts: string, claim: string, addOns: string[]) {
  if (!warrantyClaims.some(option => option.value === claim)) throw new Error('Claim limit requires approved pricing.');
  const factor = (options: { value: string; factor: number }[], value: string) => options.find(o => o.value === value)?.factor ?? 1;
  const extras = liveWarrantyAddOns.filter(a => addOns.includes(a.key)).reduce((sum, a) => sum + a.price, 0);
  const monthly = +(118 * factor(warrantyExcess, excess) * factor(warrantyLabour, labour) * factor(warrantyParts, parts) * factor(warrantyClaims, claim) + extras).toFixed(2);
  return { wholesale: monthly, total: +(monthly * 12).toFixed(2), recommended: +(monthly * 1.5).toFixed(2), myPrice: +(monthly * 1.687).toFixed(2) };
}