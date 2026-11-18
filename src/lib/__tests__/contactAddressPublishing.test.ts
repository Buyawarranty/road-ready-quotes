import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Published contact addresses', () => {
  it('Contact Us page publishes support@ only', () => {
    const source = read('src/pages/ContactUs.tsx');
    expect(source).toContain('support@pandaprotect.co.uk');
    expect(source).not.toContain('claims@pandaprotect.co.uk');
    expect(source).not.toContain('hello@pandaprotect.co.uk');
  });

  it('dealer portal help card contacts support@', () => {
    const source = read('src/components/dealer/DealerLayout.tsx');
    expect(source).not.toContain('hello@pandaprotect.co.uk');
    expect(source).toContain('mailto:support@pandaprotect.co.uk');
  });

  it('Make a claim page publishes claims@, not hello@ and not a claims phone', () => {
    const source = read('src/pages/MakeAClaim.tsx');
    expect(source).not.toContain('hello@pandaprotect.co.uk');
    expect(source).toContain('claims@pandaprotect.co.uk');
    expect(source).not.toContain('0330 229 6547');
    expect(source).not.toContain('tel:03302296547');
  });

  it('claims contacts across the site use claims@, never a claims phone', () => {
    const files = [
      'src/pages/Claims.tsx',
      'src/pages/CustomerDashboard.tsx',
      'src/pages/WarrantyPlan.tsx',
      'src/pages/FAQ.tsx',
      'src/components/HomepageFAQ.tsx',
      'src/components/brand-pages/BrandPageFAQ.tsx',
      'src/components/WebsiteFooter.tsx',
      'src/components/dealer/DealerPublicFooter.tsx',
      'src/components/dealer/DealerPublicHeader.tsx',
      'src/components/thankYou/TrustSecurityFooter.tsx',
      'src/components/PrintablePolicySummary.tsx',
      'src/components/admin/PrintableWarrantyLetter.tsx',
      'src/components/admin/PolicyDocumentsTab.tsx',
      'src/components/admin/BatchPolicyQueue.tsx',
      'src/components/schema/HowToSchema.tsx',
      'src/components/checkout/StartDatePicker.tsx',
      'src/components/checkout/DesktopPlanHeader.tsx',
      'src/pages/CarExtendedWarranty.tsx',
      'src/pages/MercedesWarranty.tsx',
      'src/pages/warranty-types/EVWarrantyLanding.tsx',
      'src/pages/warranty-types/HybridWarrantyLanding.tsx',
      'src/pages/warranty-types/PHEVWarrantyLanding.tsx',
      'src/pages/warranty-types/VanWarrantyLanding.tsx',
    ];
    for (const file of files) {
      const source = read(file);
      const claimsLines = source.split('\n').filter((line) => /claim/i.test(line));
      for (const line of claimsLines) {
        expect(line).not.toContain('0330 229 6547');
        expect(line).not.toContain('tel:03302296547');
      }
    }
  });
});
