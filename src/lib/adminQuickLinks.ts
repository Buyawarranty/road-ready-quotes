import { PANDA_SECTION_IDS } from './pandaAdminSections';

export const quickLinksStorageKey = (userId: string) => `pandaprotect:admin-quick-links:${userId}`;

export const normalizeQuickLinks = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string' && PANDA_SECTION_IDS.has(id)))]
    : [];

export const readQuickLinks = (storage: Pick<Storage, 'getItem'>, userId: string): string[] => {
  try {
    return normalizeQuickLinks(JSON.parse(storage.getItem(quickLinksStorageKey(userId)) || '[]'));
  } catch {
    return [];
  }
};

export const saveQuickLinks = (storage: Pick<Storage, 'setItem'>, userId: string, ids: string[]): string[] => {
  const links = normalizeQuickLinks(ids);
  storage.setItem(quickLinksStorageKey(userId), JSON.stringify(links));
  return links;
};