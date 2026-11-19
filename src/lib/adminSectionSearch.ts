// Search helper for the admin sidebar's section picker.
//
// The picker used to match on the section name only, so typing what a section
// actually does ("refund", "town access", "invoice") found nothing. Matching on
// the description as well means one short word is enough to land on the right
// section instead of scrolling the whole list.

export interface SearchableSection {
  id: string;
  label: string;
  description: string;
}

/**
 * Keeps sections whose name, description or id contain every word typed.
 * An empty query keeps the list exactly as it was given.
 */
export const filterSectionsBySearch = <T extends SearchableSection>(
  sections: T[],
  query: string,
): T[] => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return sections;

  return sections.filter((section) => {
    const haystack = `${section.label} ${section.description} ${section.id}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
};
