import { describe, expect, it } from 'vitest';
import { BRANDS, transactionalEmailIdentity } from '../../../supabase/functions/_shared/brand';

describe('Panda transactional email routing', () => {
  it('uses SUPPORT@ for warranty purchase and receipt emails', () => {
    expect(transactionalEmailIdentity(BRANDS.pandaprotect, 'warranty_purchase')).toEqual({
      from: 'Panda Protect Customer Care <support@pandaprotect.co.uk>',
      reply_to: 'support@pandaprotect.co.uk',
    });
  });

  it('uses CLAIMS@ for every claims email', () => {
    expect(transactionalEmailIdentity(BRANDS.pandaprotect, 'claim')).toEqual({
      from: 'Panda Protect Claims Team <claims@pandaprotect.co.uk>',
      reply_to: 'claims@pandaprotect.co.uk',
    });
  });
});
