// Warranty-status filter behaviour for the dealer Customers list.
// The list opens on Active cover so dealers see sellable/claimable customers first.
export const DEFAULT_CUSTOMER_WARRANTY_FILTER = 'active';

export const customerMatchesWarrantyFilter = (status: string, filter: string) =>
  filter === 'all' || status.toLowerCase().includes(filter);
