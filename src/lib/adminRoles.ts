export const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'member',
  'viewer',
  'guest',
  'sales',
  'sales_lead',
  'blog_writer',
  'dev_tester',
  'accounts_manager',
  'accounts_payroll',
  'lead_gen',
  'accounts',
];

export const isAdminRole = (role: string | null | undefined) => Boolean(role && ADMIN_ROLES.includes(role));