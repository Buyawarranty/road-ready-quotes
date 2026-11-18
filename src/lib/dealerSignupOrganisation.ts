export interface DealerSignupListItem {
  id: string;
  dealership_name: string | null;
  status: string;
  created_at: string;
  dealer_id?: string | null;
  approved_at?: string | null;
}

export const normaliseDealershipName = (name?: string | null) =>
  (name ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

/** Approved applications are account history and must never be bulk-deleted. */
export const isProtectedDealerSignup = (signup: Pick<DealerSignupListItem, 'dealer_id' | 'approved_at' | 'status'>) =>
  Boolean(signup.dealer_id || signup.approved_at || signup.status === 'approved');

const timestamp = (value: string) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const canonicalRank = (signup: DealerSignupListItem) => {
  if (isProtectedDealerSignup(signup)) return 0;
  if (signup.status === 'rejected') return 2;
  return 1;
};

/**
 * Mark repeat applications for the same dealership. The original active
 * application stays in the main list; an approved account always wins.
 */
export function duplicateDealerSignupIds<T extends DealerSignupListItem>(rows: readonly T[]): Set<string> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const name = normaliseDealershipName(row.dealership_name);
    if (!name) continue;
    const group = groups.get(name) ?? [];
    group.push(row);
    groups.set(name, group);
  }

  const duplicates = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((a, b) =>
      canonicalRank(a) - canonicalRank(b)
      || timestamp(a.created_at) - timestamp(b.created_at)
      || a.id.localeCompare(b.id));
    ordered.slice(1).forEach(row => duplicates.add(row.id));
  }
  return duplicates;
}

export const isDealerSignupSetAside = (
  signup: Pick<DealerSignupListItem, 'id' | 'status'>,
  duplicateIds: ReadonlySet<string>,
) => signup.status === 'rejected' || duplicateIds.has(signup.id);

/** Fresh applications first, then possible duplicates, then declined entries. */
export function organiseDealerSignups<T extends DealerSignupListItem>(
  rows: readonly T[],
  duplicateIds: ReadonlySet<string> = duplicateDealerSignupIds(rows),
): T[] {
  const groupRank = (row: T) => row.status === 'rejected' ? 2 : duplicateIds.has(row.id) ? 1 : 0;
  return [...rows].sort((a, b) =>
    groupRank(a) - groupRank(b)
    || timestamp(b.created_at) - timestamp(a.created_at)
    || a.id.localeCompare(b.id));
}
