import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { customerPolicyRecoveryHandler } from '../_shared/customerPolicyRecovery.ts';
import { ensureSignedInCustomerPortalPolicies } from '../_shared/customerPortalPolicy.ts';

Deno.serve(customerPolicyRecoveryHandler({
  authenticate: async token => {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !anonKey) throw new Error('Service configuration unavailable');
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    return error ? null : data.user;
  },
  recover: async email => {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Service configuration unavailable');
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    await ensureSignedInCustomerPortalPolicies(admin, email);
  },
}));