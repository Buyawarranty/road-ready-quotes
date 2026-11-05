// Panda Protect admin menu: which sections exist, their order and names.
// Sections copied from the Buy A Warranty consumer CRM are retired here so
// they never show; old links to them land on the nearest Panda Protect section.

export const PANDA_SECTION_ORDER: { id: string; label: string; description: string }[] = [
  { id: 'bdm-contacts', label: 'BDM contacts', description: 'Dealership prospects, calls, follow-ups and pipeline' },
  { id: 'bdm-allocation', label: 'BDM allocation', description: 'Give town access and block leads per person' },
  { id: 'dealer-overview', label: 'Overview', description: 'Dealer sales, warranties and money owed at a glance' },
  { id: 'dealer-dealers', label: 'Dealers', description: 'Sign-ups, approved dealers and traders in one place' },
  { id: 'dealer-sales', label: 'Dealer sales', description: 'Warranties sold by each dealer' },
  { id: 'customers', label: 'Customers', description: "Dealers' end customers" },
  // 'claims' is retired: warranty claims are worked by the Buy A Warranty
  // claims desk, so this dashboard must not offer its own claims queue.
  { id: 'dealer-cancellations', label: 'Cancellations & refunds', description: 'Requests, processed cancellations and refunds' },
  { id: 'dealer-invoices', label: 'Dealer billing', description: 'Invoices, pay later rules and dealer finance' },
  { id: 'trader-pricing', label: 'Pricing', description: 'Trade warranty pricing' },
  { id: 'dealer-profile-changes', label: 'Profile changes', description: 'Dealer company name change requests' },
  { id: 'complaints', label: 'Support inbox', description: 'Complaints, contact messages and staff feedback' },
  { id: 'policy-documents', label: 'Policy letters', description: 'Printed and posted warranty letters' },
  { id: 'document-mapping', label: 'Document mapping', description: 'Which documents go with each plan' },
  { id: 'plans', label: 'Terms & conditions', description: 'Warranty terms versions' },
  { id: 'emails', label: 'Email hub', description: 'Emails sent to dealers and customers' },
  { id: 'feature-flags', label: 'Feature switches', description: 'Turn features such as Manage My Claim on or off' },
  { id: 'user-permissions', label: 'User permissions', description: 'Staff access' },
  { id: 'staff-hub', label: 'Staff hub', description: 'Staff documents and notices' },
  { id: 'timesheets', label: 'Timesheets', description: 'Staff hours' },
  { id: 'attendance', label: 'Attendance', description: 'Staff attendance and rota' },
  { id: 'hr', label: 'HR', description: 'Staff records' },
  { id: 'account', label: 'Account settings', description: 'Your account and password' },
];

export const PANDA_SECTION_IDS = new Set(PANDA_SECTION_ORDER.map((s) => s.id));

// Ids folded into a merged section, and where old links should land.
export const PANDA_SECTION_ALIASES: Record<string, string> = {
  'dealer-signups': 'dealer-dealers',
  'dealer-traders': 'dealer-dealers',
  claims: 'dealer-overview',
  cancellations: 'dealer-cancellations',
  'refunds-paid': 'dealer-cancellations',
  'dealer-paylater': 'dealer-invoices',
  'dealer-finance': 'dealer-invoices',
  contact: 'complaints',
  'agent-feedback': 'complaints',
};

/** Map any requested tab id to the Panda Protect section that should show. */
export const resolvePandaSection = (tab: string): string => {
  if (PANDA_SECTION_IDS.has(tab)) return tab;
  if (PANDA_SECTION_ALIASES[tab]) return PANDA_SECTION_ALIASES[tab];
  return 'dealer-overview';
};

export const PANDA_BRAND = 'pandaprotect';

/** Default sections for the BDM job: work the contact list only. */
export const BDM_ROLE_TABS = ['bdm-contacts', 'staff-hub', 'timesheets', 'account'];
/** Default sections for the Manager job: most CRM views, but no staff access, pricing or system settings. */
export const MANAGER_ROLE_TABS = PANDA_SECTION_ORDER.map((s) => s.id).filter(
  (id) => !['user-permissions', 'bdm-allocation', 'trader-pricing', 'feature-flags', 'plans', 'document-mapping'].includes(id),
);
