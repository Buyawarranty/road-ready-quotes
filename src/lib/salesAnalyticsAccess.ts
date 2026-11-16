export const SALES_ANALYTICS_TAB = 'analytics';

/** Sales analytics is deliberately limited to Admin and Super Admin for its initial release. */
export function canAccessSalesAnalytics(
  role: string | null | undefined,
  permissions?: Record<string, boolean> | null,
): boolean {
  if (role === 'super_admin') return true;
  if (role === 'admin') return permissions?.tab_analytics !== false;
  return false;
}

export function canEditSalesAnalyticsPermission(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}
