import { useCallback, useEffect, useState } from 'react';
import { quickLinksStorageKey, readQuickLinks, saveQuickLinks } from '@/lib/adminQuickLinks';

const EVENT = 'pandaprotect:admin-quick-links-change';

export function useAdminQuickLinks(userId: string | null | undefined) {
  const [links, setLinks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setLinks(userId ? readQuickLinks(localStorage, userId) : []);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || (userId && event.key === quickLinksStorageKey(userId))) refresh();
    };
    refresh();
    setError(null);
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [userId]);

  const save = useCallback((ids: string[]) => {
    if (!userId) return false;
    try {
      setLinks(saveQuickLinks(localStorage, userId, ids));
      setError(null);
      window.dispatchEvent(new Event(EVENT));
      return true;
    } catch {
      setError('Quick links could not be saved. Please allow browser storage and try again.');
      return false;
    }
  }, [userId]);

  return { links, save, error };
}