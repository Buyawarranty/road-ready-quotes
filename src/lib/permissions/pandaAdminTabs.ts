// Sections that can be granted to a staff member as permissions.
//
// This is exactly the Panda Protect admin menu (src/lib/pandaAdminSections.ts),
// so the access screens can never offer a section the dashboard doesn't
// actually show. Retired Buy A Warranty consumer sections (leads, calls,
// marketing, testing tools) stay out of the list.
import { PANDA_SECTION_ORDER } from '@/lib/pandaAdminSections';

export interface GrantableTab {
  id: string;
  label: string;
  description: string;
  hasGranular: boolean;
}

export const PANDA_GRANTABLE_TABS: GrantableTab[] = PANDA_SECTION_ORDER.map((s) => ({
  id: s.id,
  label: s.label,
  description: s.description,
  hasGranular: s.id === 'customers',
}));
