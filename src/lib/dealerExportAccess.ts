export const DEALER_EXPORT_PERMISSION = 'tab_dealer-dealers_export';

/** Super Admin always; anyone else only when granted "Export" on Dealers in User permissions. */
export function canExportDealers(roles: string[], permissions: Record<string, unknown> | null | undefined): boolean {
  if (roles.includes('super_admin')) return true;
  return permissions?.[DEALER_EXPORT_PERMISSION] === true;
}
