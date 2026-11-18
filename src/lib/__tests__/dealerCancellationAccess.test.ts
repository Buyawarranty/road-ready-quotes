import { describe, expect, it } from 'vitest';
import { canProcessDealerCancellations } from '../dealerCancellationAccess';

describe('dealer cancellation review access', () => {
  it.each(['admin', 'super_admin', 'accounts', 'accounts_manager'])('allows %s to process requests', (role) => {
    expect(canProcessDealerCancellations(role)).toBe(true);
  });

  it.each(['sales', 'sales_manager', 'bdm', 'manager', 'claims_agent', 'dealer', null])('does not show review tools for %s', (role) => {
    expect(canProcessDealerCancellations(role)).toBe(false);
  });
});
