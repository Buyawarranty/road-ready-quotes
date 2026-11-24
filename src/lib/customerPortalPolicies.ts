import type { supabase } from '@/integrations/supabase/client';
import { dealerRequest } from './dealerRequest';

type PolicyClient = Pick<typeof supabase, 'from' | 'functions'>;
export interface CustomerPolicyIdentity {
  email?: string | null;
  userId?: string | null;
  customerId?: string | null;
  impersonating?: boolean;
}

/** Fail closed until the linked customer is confirmed to be a direct purchaser. */
export function customerPortalPaymentAmount(policy: {
  payment_amount?: number | null;
  customers?: { dealer_id?: string | null };
}): number | null {
  return policy.customers?.dealer_id === null && typeof policy.payment_amount === 'number'
    ? policy.payment_amount
    : null;
}

/** RLS remains authoritative; combine both ownership links rather than dropping vehicles on fallback. */
export async function loadCustomerPortalPolicies(client: PolicyClient, identity: CustomerPolicyIdentity) {
  const email = identity.email?.trim().toLowerCase();
  const lookups: Array<{ field: 'email' | 'user_id' | 'customer_id'; value: string }> = [];
  if (email) lookups.push({ field: 'email', value: email });
  if (!identity.impersonating && identity.userId) lookups.push({ field: 'user_id', value: identity.userId });
  if (identity.impersonating && identity.customerId) lookups.push({ field: 'customer_id', value: identity.customerId });
  if (lookups.length === 0) return [];

  let recoveryError: Error | null = null;
  if (!identity.impersonating && identity.userId) {
    try {
      const result = await dealerRequest(signal => client.functions.invoke('customer-policy-recovery', {
        body: {}, signal,
      }), 'Your warranty details could not be checked. Please try again.', 15000);
      if (result.error || result.data?.success !== true) {
        recoveryError = new Error('Your warranty details could not be checked. Please try again.');
      }
    } catch {
      recoveryError = new Error('Your warranty details could not be checked. Please try again.');
    }
  }

  const results = await Promise.all(lookups.map(({ field, value }) => dealerRequest(signal => {
    let query = client.from('customer_policies').select('*');
    query = field === 'email'
      ? query.ilike('email', value.replace(/[\\%_]/g, '\\$&'))
      : query.eq(field, value);
    if (!identity.impersonating) query = query.or('is_deleted.is.null,is_deleted.eq.false');
    return query.order('created_at', { ascending: false }).abortSignal(signal);
  }, 'Your warranty details are taking longer than expected. Please try again.')));
  for (const result of results) {
    if (result.error) throw new Error('Your warranty details could not be loaded. Please try again.');
  }
  const policies = [...new Map(results.flatMap(result => result.data || []).map(policy => [policy.id, policy])).values()];
  // A failed recovery must not hide already linked cover or masquerade as an empty account.
  if (policies.length === 0 && recoveryError) throw recoveryError;
  return policies;
}