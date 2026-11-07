import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { activePortalAuthScope } from '@/integrations/supabase/client';
import { portalAuthScope } from '@/lib/portalAuthScope';
import { readDealerImpersonation } from '@/hooks/useDealerImpersonation';

/** Remount all auth subscribers and query caches when crossing portal boundaries. */
export function PortalSessionBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const nextScope = portalAuthScope(location.pathname, Boolean(readDealerImpersonation()));
  const changingPortal = nextScope !== activePortalAuthScope;

  useLayoutEffect(() => {
    if (changingPortal) window.location.replace(location.pathname + location.search + location.hash);
  }, [changingPortal, location.pathname, location.search, location.hash]);

  return changingPortal ? null : <>{children}</>;
}