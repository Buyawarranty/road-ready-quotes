export type PortalAuthScope = 'staff' | 'dealer' | 'recovery';

/** Navigation selects a session namespace, never a permission or role. */
export function portalAuthScope(pathname: string, viewingDealer = false): PortalAuthScope {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/reset-password') return 'recovery';
  if (path === '/dealer-admin' || path.startsWith('/dealer-admin/')) return 'dealer';
  if (path === '/dealer-portal' || path.startsWith('/dealer-portal/')) {
    const publicEntry = ['/dealer-portal/login', '/dealer-portal/signup', '/dealer-portal/coming-soon'];
    return viewingDealer && !publicEntry.includes(path) ? 'staff' : 'dealer';
  }
  return 'staff';
}

export function portalAuthStorageKey(projectRef: string, scope: PortalAuthScope): string {
  const legacyKey = `sb-${projectRef}-auth-token`;
  // Keep existing staff sessions; dealers explicitly sign in to their own namespace.
  return scope === 'staff' ? legacyKey : `${legacyKey}-${scope}`;
}