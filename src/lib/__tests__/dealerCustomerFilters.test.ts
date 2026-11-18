import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CUSTOMER_WARRANTY_FILTER,
  customerMatchesWarrantyFilter,
} from '../dealerCustomerFilters';

describe('dealer customers warranty filter', () => {
  it('opens the customers list on Active cover', () => {
    expect(DEFAULT_CUSTOMER_WARRANTY_FILTER).toBe('active');
  });

  it('keeps only Active warranties under the default filter', () => {
    expect(customerMatchesWarrantyFilter('Active', DEFAULT_CUSTOMER_WARRANTY_FILTER)).toBe(true);
    expect(customerMatchesWarrantyFilter('Paused – Payment Due', DEFAULT_CUSTOMER_WARRANTY_FILTER)).toBe(false);
    expect(customerMatchesWarrantyFilter('Expiring Soon', DEFAULT_CUSTOMER_WARRANTY_FILTER)).toBe(false);
    expect(customerMatchesWarrantyFilter('Expired', DEFAULT_CUSTOMER_WARRANTY_FILTER)).toBe(false);
    expect(customerMatchesWarrantyFilter('Cancelled', DEFAULT_CUSTOMER_WARRANTY_FILTER)).toBe(false);
  });

  it('shows every warranty when the filter is cleared', () => {
    for (const status of ['Active', 'Paused – Payment Due', 'Expiring Soon', 'Expired', 'Cancelled']) {
      expect(customerMatchesWarrantyFilter(status, 'all')).toBe(true);
    }
  });

  it('matches the other status choices case-insensitively', () => {
    expect(customerMatchesWarrantyFilter('Paused – Payment Due', 'paused')).toBe(true);
    expect(customerMatchesWarrantyFilter('Cancelled', 'cancelled')).toBe(true);
    expect(customerMatchesWarrantyFilter('Active', 'cancelled')).toBe(false);
  });
});
