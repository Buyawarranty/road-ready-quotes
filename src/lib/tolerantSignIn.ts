import { supabase } from '@/integrations/supabase/client';

/**
 * Sign in with email + password, forgiving stray spaces/line breaks that come
 * along when a temporary password or email address is copied out of an email.
 *
 * The email is always trimmed (addresses never contain spaces). The password
 * is tried exactly as typed first; only if Supabase rejects it as invalid and
 * trimming would change it is the trimmed version tried once.
 */
export async function signInWithPasswordTolerant(rawEmail: string, rawPassword: string) {
  const email = rawEmail.trim();
  const first = await supabase.auth.signInWithPassword({ email, password: rawPassword });
  const trimmed = rawPassword.trim();
  if (
    first.error &&
    trimmed !== rawPassword &&
    trimmed.length > 0 &&
    /invalid login credentials/i.test(first.error.message || '')
  ) {
    return supabase.auth.signInWithPassword({ email, password: trimmed });
  }
  return first;
}