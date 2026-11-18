export const canEditDealerWarrantyEmailTemplate = (role?: string | null) =>
  role === 'admin' || role === 'super_admin';
