export const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'member',
  'viewer',
  'guest',
  'sales',
  'sales_lead',
  'sales_manager',
  'performance_manager',
  'blog_writer',
  'dev_tester',
  'accounts_manager',
  'accounts_payroll',
  'lead_gen',
  'accounts',
  'claims_agent',
  'claims_manager',
  'bdm',
  'manager',
];

export const isAdminRole = (role: string | null | undefined) => Boolean(role && ADMIN_ROLES.includes(role));