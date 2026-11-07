/** Hard restriction: explicit tab grants never widen promo management access. */
export const canManageDealerPromos = (role: string | null | undefined) =>
  role === 'super_admin' || role === 'admin';