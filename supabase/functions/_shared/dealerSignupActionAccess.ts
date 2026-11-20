export const BULK_APPROVE_PERMISSION = 'tab_dealer-dealers_bulk-approve';
export const TEST_DEALER_PERMISSION = 'tab_dealer-dealers_test-account';

export function canManageSignupAction(roles: string[], permissions: Record<string, unknown> | null | undefined, permission: string): boolean {
  return roles.includes('super_admin') || (roles.includes('admin') && permissions?.[permission] === true);
}

export function pendingApprovalRows<T extends { id: string; status: string }>(rows: T[], selected: Set<string>): T[] {
  return rows.filter(row => selected.has(row.id) && row.status !== 'approved');
}