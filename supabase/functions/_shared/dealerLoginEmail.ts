import type { Brand } from './brand.ts';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return entities[character] ?? character;
});

/** Only a server-verified, authorised caller may receive the login copy. */
export function dealerLoginRecipients(to: string, staffEmail: string | undefined, fallback: string) {
  const staff = staffEmail?.trim().toLowerCase();
  const validStaff = staff && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staff) ? staff : undefined;
  return {
    to: [to],
    ...(validStaff && validStaff !== to.trim().toLowerCase() ? { cc: [validStaff] } : {}),
    reply_to: validStaff ?? fallback,
  };
}

/** Email clients block clipboard scripts; use readable, selectable text instead. */
export function dealerLoginDetailsHtml(brand: Brand, email: string, password: string | null) {
  const url = `${brand.siteUrl}/dealer-portal/login`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
      <tr><td style="padding:18px 0 6px;font-size:12px;font-weight:bold;color:#64748b;">LOGIN EMAIL</td></tr>
      <tr><td style="padding:0 0 18px;font-size:17px;color:#111827;overflow-wrap:anywhere;">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:0 0 6px;font-size:12px;font-weight:bold;color:#64748b;">${password ? 'TEMPORARY PASSWORD' : 'PASSWORD'}</td></tr>
      <tr><td style="padding:0 0 18px;font-size:17px;color:#111827;overflow-wrap:anywhere;">${password ? `<span style="font-family:Consolas,'Courier New',monospace;">${escapeHtml(password)}</span>` : 'Use your existing dealer password.'}</td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:0 0 16px;">
      <a href="${escapeHtml(url)}" style="display:inline-block;background:${brand.accentColor};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:16px 28px;border-radius:6px;">Open dealer portal &rarr;</a>
    </td></tr></table>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#64748b;">${password ? 'Sign in with the details above, then choose your own password in Settings → Change password.' : `Need a new password? <a href="${escapeHtml(brand.siteUrl)}/forgot-password/" style="color:${brand.accentColor};">Reset your password</a>.`}</p>
    <p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:#64748b;">Login address: <a href="${escapeHtml(url)}" style="color:${brand.accentColor};overflow-wrap:anywhere;">${escapeHtml(url)}</a></p>`;
}