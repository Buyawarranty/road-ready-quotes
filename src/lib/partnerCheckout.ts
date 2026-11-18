// Shared rules for partner (CRM supplier) sales: customers pay the standard retail price.
export interface PartnerTerm { months: number; price: number; boost_price: number | null }

export const PARTNER_SITE = 'https://pandaprotect.co.uk';

export function partnerCheckoutUrl(slug: string, dealerId: string, reg?: string, site = PARTNER_SITE) {
  const q = new URLSearchParams({ p: slug, d: dealerId });
  if (reg) q.set('reg', reg.replace(/\s+/g, '').toUpperCase());
  return `${site}/partner/checkout?${q.toString()}`;
}

export function partnerButtonHtml(slug: string, dealerId: string) {
  const url = partnerCheckoutUrl(slug, dealerId);
  return `<a href="${url}" target="_blank" rel="noopener" style="display:inline-block;background:#f97316;color:#fff;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none;font-family:sans-serif">Add Panda Protect Warranty</a>`;
}

export function partnerTotal(term: PartnerTerm | undefined, boost: boolean) {
  if (!term) return 0;
  return Math.round((term.price + (boost && term.boost_price ? term.boost_price : 0)) * 100) / 100;
}

export function partnerSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export const PARTNERS_TAB = 'partners';
/** Partners is limited to Admin and Super Admin; an Admin can still be unticked in User permissions. */
export const canManagePartners = (role: string | null | undefined, permissions?: Record<string, boolean> | null) =>
  role === 'super_admin' || (role === 'admin' && permissions?.tab_partners !== false);
