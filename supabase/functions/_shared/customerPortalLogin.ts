// Gives a dealer-sold customer a customer-dashboard login and records sent emails.
// Existing accounts are never given a new password (the address may belong to a dealer or staff member).
import { ensureDealerCustomerPortalPolicy } from './customerPortalPolicy.ts';
function tempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

export async function ensureCustomerPortalLogin(admin: any, email: string, meta: Record<string, unknown> = {}) {
  if (typeof meta.customer_id === 'string') await ensureDealerCustomerPortalPolicy(admin, meta.customer_id);
  const address = email.trim().toLowerCase();
  const { data: existing } = await admin.from('welcome_emails')
    .select('temporary_password, password_reset_by_user')
    .ilike('email', address).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (existing?.temporary_password && !existing.password_reset_by_user) {
    return { email: address, password: existing.temporary_password as string };
  }
  if (existing) return { email: address, password: null };

  const password = tempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: address, password, email_confirm: true, user_metadata: { ...meta, brand: 'pandaprotect' },
  });
  if (error || !data?.user) {
    // Account already exists: keep its password untouched.
    return { email: address, password: null };
  }
  await admin.from('welcome_emails').insert({
    user_id: data.user.id, email: address, temporary_password: password,
    email_sent_at: new Date().toISOString(), password_reset_by_user: false,
  });
  return { email: address, password };
}

export async function logCustomerEmail(admin: any, row: {
  to: string; subject: string; customerId?: string | null; ok: boolean; providerId?: string | null; error?: string | null; kind: string;
}) {
  const now = new Date().toISOString();
  const { error } = await admin.from('email_logs').insert({
    recipient_email: row.to, customer_id: row.customerId || null, subject: row.subject,
    status: row.ok ? 'sent' : 'failed', delivery_status: row.ok ? 'sent' : 'failed',
    sent_at: row.ok ? now : null, error_message: row.error || null,
    metadata: { resend_id: row.providerId || null, kind: row.kind, brand: 'pandaprotect' },
  });
  if (error) console.error('email_logs insert failed', error.message);
}
