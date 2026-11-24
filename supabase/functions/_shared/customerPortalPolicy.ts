/** Creates only missing customer-safe portal records; existing sales and policies stay untouched. */
export function assertCustomerPolicySaved(error: { message?: string } | null) {
  if (error) throw new Error('The customer warranty could not be saved. Payment must be checked before retrying.');
}

export async function ensureDealerCustomerPortalPolicy(admin: any, customerId: string) {
  const { data, error } = await admin.rpc('ensure_dealer_customer_portal_policy', { p_customer_id: customerId });
  if (error) throw new Error('Customer warranty details could not be linked to the portal.');
  return data as string | null;
}

/** Used only after successful authentication; email must come from the authenticated user. */
export async function ensureSignedInCustomerPortalPolicies(admin: any, email: string) {
  const normalized = email.trim().toLowerCase().replace(/[\\%_]/g, '\\$&');
  let offset = 0;
  while (true) {
    const { data, error } = await admin.from('customers').select('id')
      .eq('brand', 'pandaprotect').not('dealer_id', 'is', null)
      .ilike('email', normalized).or('is_deleted.is.null,is_deleted.eq.false')
      .order('id').range(offset, offset + 99);
    if (error) throw new Error('Customer warranty details could not be loaded.');
    for (const row of data || []) await ensureDealerCustomerPortalPolicy(admin, row.id);
    if (!data || data.length < 100) return;
    offset += 100;
  }
}