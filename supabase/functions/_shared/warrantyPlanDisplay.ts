/** Display-only naming: legacy Gold plan codes remain unchanged in storage and pricing. */
export function displayWarrantyPlanName(value: unknown, fallback = 'Warranty'): string {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  return raw.replace(/\bgold\b/gi, 'Platinum');
}
