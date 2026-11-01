import { useState, useEffect, useCallback } from 'react';

export interface DealerImpersonationData {
  dealerId: string;
  dealerName: string;
  dealerEmail: string;
}

const STORAGE_KEY = 'admin_dealer_impersonation';

export const readDealerImpersonation = (): DealerImpersonationData | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DealerImpersonationData;
    if (!data.dealerId) return null;
    return data;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

/**
 * Admin "view as dealer" mode. Stores only UI state in sessionStorage —
 * actual data access is enforced server-side by admin-only RLS policies,
 * so forging this flag grants nothing to non-admins.
 */
export const useDealerImpersonation = () => {
  const [impersonatedDealer, setImpersonatedDealer] = useState<DealerImpersonationData | null>(null);

  useEffect(() => {
    setImpersonatedDealer(readDealerImpersonation());
  }, []);

  const startImpersonation = useCallback((dealerId: string, dealerName: string, dealerEmail: string) => {
    const data: DealerImpersonationData = { dealerId, dealerName, dealerEmail };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setImpersonatedDealer(data);
  }, []);

  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setImpersonatedDealer(null);
  }, []);

  return {
    isImpersonating: impersonatedDealer !== null,
    impersonatedDealer,
    startImpersonation,
    stopImpersonation,
  };
};
