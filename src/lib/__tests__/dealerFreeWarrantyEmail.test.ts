import { describe, expect, it, vi } from 'vitest';
import { BRANDS } from '../../../supabase/functions/_shared/brand';
import { buildDealerFreeWarrantyEmail, dealerFreeOfferProgress, loadDealerFreeOfferProgress } from '../../../supabase/functions/_shared/dealerFreeWarrantyEmail';

const approved = (count: number) => Array.from({ length: count }, () => ({ status: 'approved' }));

describe('dealership free-warranty email balances', () => {
  it.each([[1, 2], [2, 1], [3, 0]])('after paid/free pair %i shows zero ready and %i still to earn', (issued, stillToEarn) => {
    expect(dealerFreeOfferProgress({ enabled: true, availableNow: 0, redemptions: approved(issued) })).toEqual({
      enabled: true, availableNow: 0, issued, reserved: 0, stillToEarn, total: 3,
    });
  });
  it('after three paid and one free shows two ready, not two still to earn', () => {
    expect(dealerFreeOfferProgress({ enabled: true, availableNow: 2, redemptions: approved(1) })).toMatchObject({
      availableNow: 2, issued: 1, stillToEarn: 0, total: 3,
    });
  });
  it('caps the introductory allowance at three without advertising a fourth place', () => {
    expect(dealerFreeOfferProgress({ enabled: true, availableNow: 1, redemptions: approved(3) })).toBeNull();
  });
  it('keeps existing issued cover while a paused offer has zero ready and no earning promise', () => {
    expect(dealerFreeOfferProgress({ enabled: false, availableNow: 0, redemptions: approved(1) })).toMatchObject({
      enabled: false, availableNow: 0, issued: 1, stillToEarn: null,
    });
  });
  it('accounts for a legacy reserved slot separately from issued cover and ignores rejected requests', () => {
    expect(dealerFreeOfferProgress({ enabled: true, availableNow: 0, redemptions: [...approved(1), { status: 'pending' }, { status: 'rejected' }] })).toMatchObject({
      issued: 1, reserved: 1, availableNow: 0, stillToEarn: 1,
    });
  });
  it.each([-1, 4, NaN, 0.5])('rejects an invalid available balance %s rather than showing a misleading count', availableNow => {
    expect(dealerFreeOfferProgress({ enabled: true, availableNow, redemptions: approved(1) })).toBeNull();
  });
  it('reads all post-issuance balances and returns their concrete values', async () => {
    const reads = {
      available: vi.fn().mockResolvedValue(1), redemptions: vi.fn().mockResolvedValue(approved(1)), enabled: vi.fn().mockResolvedValue(true),
    };
    expect(await loadDealerFreeOfferProgress(reads)).toMatchObject({ availableNow: 1, issued: 1, stillToEarn: 1 });
    Object.values(reads).forEach(read => expect(read).toHaveBeenCalledOnce());
  });
  it.each(['available', 'redemptions', 'enabled'] as const)('a failed %s read does not invent a zero or block the receipt', async failed => {
    const reads = {
      available: vi.fn().mockResolvedValue(0), redemptions: vi.fn().mockResolvedValue(approved(1)), enabled: vi.fn().mockResolvedValue(true),
    };
    reads[failed].mockRejectedValue(new Error('Read unavailable'));
    expect(await loadDealerFreeOfferProgress(reads)).toBeNull();
  });
});

describe('free receipt delivery identity', () => {
  it('addresses only the dealership using Panda support as sender and reply-to', () => {
    const email = buildDealerFreeWarrantyEmail({
      brand: BRANDS.pandaprotect, customer: { id: 'fixture', email: 'customer@example.com' },
      dealer: { id: 'dealer-fixture' }, to: 'dealer@example.com', progress: null,
    });
    expect(email.to).toEqual(['dealer@example.com']);
    expect(email.reply_to).toBe('support@pandaprotect.co.uk');
    expect(email.from).toBe('Panda Protect Customer Care <support@pandaprotect.co.uk>');
  });
});