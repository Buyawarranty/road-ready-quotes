import { describe, expect, it } from 'vitest';
import { canEditDealerWarrantyEmailTemplate } from '../dealerWarrantyEmail';

describe('dealer warranty email template access', () => {
  it.each(['admin', 'super_admin'])('allows %s to edit the wording', role => {
    expect(canEditDealerWarrantyEmailTemplate(role)).toBe(true);
  });

  it.each(['dealer', 'bdm', 'manager', 'accounts', 'member', null, undefined])('does not allow %s to edit the wording', role => {
    expect(canEditDealerWarrantyEmailTemplate(role)).toBe(false);
  });
});
