import { useState, useEffect, useCallback } from 'react';

export interface DealerImpersonationData {
  dealerId: string;
  dealerName: string;
  dealerEmail: string;
}

const STORAGE_KEY = 'admin_dealer_impersonation';

const URL_PARAM = 'view_as_dealer';

/** Link that opens "view as dealer" in a new tab (sessionStorage is per tab). */
export const dealerImpersonationUrl = (path: string, data: DealerImpersonationData) =>
  `${path}?${URL_PARAM}=${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(data)))))}`;

const adoptFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get(URL_PARAM);
    if (!v) return;
    const data = JSON.parse(decodeURIComponent(escape(atob(v))));
    if (data?.dealerId) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    params.delete(URL_PARAM);
    const q = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : '') + window.location.hash);
  } catch { /* ignore bad links */ }
};

export const readDealerImpersonation = (): DealerImpersonationData | null => {
  adoptFromUrl();
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
