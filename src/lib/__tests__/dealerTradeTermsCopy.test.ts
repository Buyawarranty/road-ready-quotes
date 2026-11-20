import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { DEALER_FULL_TRADE_TERMS, DEALER_TRADE_TERMS_SUMMARY } from '../dealerTradeTerms';

describe('Dealer-facing trade terms copy', () => {
  const allCopy = [
    ...DEALER_TRADE_TERMS_SUMMARY.flatMap(item => [item.title, item.description]),
    ...DEALER_FULL_TRADE_TERMS.flatMap(section => [section.title, ...section.paragraphs]),
  ].join('\n');

  test('never names staff roles such as Admin or Super Admin', () => {
    for (const role of ['Admin or Super Admin', 'Super Admin', 'admin dashboard']) {
      assert.ok(!allCopy.includes(role), `trade terms copy should not mention "${role}"`);
    }
  });

  test('still tells the dealer invoicing needs approval and healthy account status', () => {
    const invoicing = DEALER_TRADE_TERMS_SUMMARY.find(item => item.title === '30-day invoicing');
    assert.ok(invoicing, 'the 30-day invoicing summary line should exist');
    assert.match(invoicing.description, /subject to approval and account status/i);
    const detail = DEALER_FULL_TRADE_TERMS.find(section => section.title.includes('invoicing'));
    assert.ok(detail.paragraphs.some(p => /Panda Protect must authorise the request/i.test(p)));
  });
});
