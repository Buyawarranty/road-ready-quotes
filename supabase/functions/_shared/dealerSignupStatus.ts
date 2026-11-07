export const SIGNUP_STATUSES = ['new', 'pending', 'needs_info', 'contacted', 'qualified', 'closed', 'approved', 'rejected'];
export function validateSignupStatus(value: unknown): string {
  if (typeof value !== 'string' || !SIGNUP_STATUSES.includes(value)) throw new Error('Choose a valid signup status.');
  return value;
}
export const approvalWithdrawn = (previous: string, approvedAt: unknown, next: string) =>
  (previous === 'approved' || Boolean(approvedAt)) && next !== 'approved';