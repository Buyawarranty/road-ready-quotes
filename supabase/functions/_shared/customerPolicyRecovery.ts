interface VerifiedCustomer {
  email?: string | null;
  email_confirmed_at?: string | null;
}

interface RecoveryDependencies {
  authenticate: (token: string) => Promise<VerifiedCustomer | null>;
  recover: (email: string) => Promise<void>;
}

export function customerPolicyRecoveryHandler(dependencies: RecoveryDependencies) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Content-Type': 'application/json',
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Please sign in to view your warranties.' }, 401);
    try {
      const user = await dependencies.authenticate(token);
      if (!user?.email) return json({ error: 'Please sign in to view your warranties.' }, 401);
      if (!user.email_confirmed_at) return json({ error: 'Please confirm your account email to view your warranties.' }, 403);
      // Never read an email, customer ID or price from the request body.
      await dependencies.recover(user.email);
      return json({ success: true });
    } catch {
      return json({ error: 'Your warranty details could not be checked. Please try again.' }, 503);
    }
  };
}