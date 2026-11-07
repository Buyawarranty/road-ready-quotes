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

/** Derive checkbox options from the menu; never maintain a second section list. */
export const buildGrantableTabs = (
  sections: ReadonlyArray<{ id: string; label: string; description: string }>,
): GrantableTab[] => sections.map((section) => ({
  ...section,
  hasGranular: section.id === 'customers',
}));

export const PANDA_GRANTABLE_TABS = buildGrantableTabs(PANDA_SECTION_ORDER);
