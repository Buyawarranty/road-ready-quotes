import { describe, expect, it } from 'vitest';
import { DEFAULT_TRADE_TERMS, fetchCurrentTradeTerms, isRecordedTradeTermsAcceptance } from '../dealerTradeTerms';

function clientWith(response: unknown) {
  const query = { select: () => query, order: () => query, limit: () => query, abortSignal: () => query, maybeSingle: async () => response };
  return { from: () => query };
}

describe('current trade terms and recorded acceptance', () => {
  it('uses built-in terms only when the successful lookup has no published version', async () => {
    expect(await fetchCurrentTradeTerms(clientWith({ data: null, error: null }))).toEqual(DEFAULT_TRADE_TERMS);
  });
  it('surfaces a failed read instead of treating it as current default terms', async () => {
    await expect(fetchCurrentTradeTerms(clientWith({ data: null, error: new Error('Network interrupted') }))).rejects.toThrow('Network interrupted');
  });
  it('loads the published version unchanged', async () => {
    const published = { ...DEFAULT_TRADE_TERMS, version: 'published-v2' };
    expect(await fetchCurrentTradeTerms(clientWith({ data: published, error: null }))).toEqual(published);
  });
  it('permits continuation only after acceptance of the displayed terms is confirmed', () => {
    expect(isRecordedTradeTermsAcceptance({ accepted: true, terms_version: '2026-11-15-v1' }, '2026-11-15-v1')).toBe(true);
    for (const response of [null, {}, { accepted: false, terms_version: '2026-11-15-v1' }, { accepted: true, terms_version: 'old-version' }, { accepted: true, terms_version: '2026-11-15-v1', error: 'Not saved' }]) {
      expect(isRecordedTradeTermsAcceptance(response, '2026-11-15-v1')).toBe(false);
    }
  });
});