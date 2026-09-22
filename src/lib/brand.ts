// Which brand this site is running as.
//
// One Supabase backend serves two businesses. Edge functions read the request
// Origin to pick a brand, but preview / staging domains (lovable.app, localhost)
// don't carry a brand domain, so the frontend states it explicitly.
//
// This codebase is the Panda Protect site, so anything that isn't clearly a
// Buy A Warranty domain is treated as Panda Protect.

export type BrandKey = 'buyawarranty' | 'pandaprotect';

export function currentBrandKey(): BrandKey {
  if (typeof window === 'undefined') return 'pandaprotect';
  const host = window.location.hostname.toLowerCase();
  if (host.includes('buyawarranty')) return 'buyawarranty';
  return 'pandaprotect';
}
