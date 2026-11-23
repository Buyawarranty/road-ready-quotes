import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const SALES_PHONE = '0330 229 6547';
const SALES_PHONE_TEL = 'tel:03302296547';
const CLAIMS_PHONE = '0330 229 7311';
const CLAIMS_PHONE_TEL = 'tel:03302297311';

const RETIRED_NUMBERS = [
  '0330 229 5040',
  '03302295040',
  '0330 229 1111',
  '03302291111',
  '0300 456 576',
  '0300456576',
];

/** A page shows the claims helpline either through the shared constant or the literal. */
const usesClaimsPhone = (source: string) =>
  /CLAIMS_PHONE/.test(source) || source.includes(CLAIMS_PHONE) || source.includes(CLAIMS_PHONE_TEL);

/** Every source file under src/ that could publish a contact number. */
const sourceFiles = (dir = 'src'): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(resolve(process.cwd(), dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') found.push(...sourceFiles(path));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      found.push(path);
    }
  }
  return found;
};

describe('Published contact numbers and addresses', () => {
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

  it('Make a claim page publishes claims@ and the claims helpline, never the sales number', () => {
    const source = read('src/pages/MakeAClaim.tsx');
    expect(source).not.toContain('hello@pandaprotect.co.uk');
    expect(source).toContain('claims@pandaprotect.co.uk');
    expect(usesClaimsPhone(source)).toBe(true);
    expect(source).not.toContain(SALES_PHONE);
    expect(source).not.toContain(SALES_PHONE_TEL);
  });

  it('claims contacts across the site never use the sales number', () => {
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
        expect(line).not.toContain(SALES_PHONE);
        expect(line).not.toContain(SALES_PHONE_TEL);
      }
    }
  });

  it('the claims helpline is published on the main claims surfaces', () => {
    for (const file of [
      'src/pages/ContactUs.tsx',
      'src/pages/MakeAClaim.tsx',
      'src/pages/Claims.tsx',
      'src/pages/CustomerDashboard.tsx',
      'src/pages/WarrantyPlan.tsx',
      'src/components/WebsiteFooter.tsx',
      'src/components/dealer/DealerPublicFooter.tsx',
      'src/components/thankYou/TrustSecurityFooter.tsx',
      'src/components/PrintablePolicySummary.tsx',
    ]) {
      const source = read(file);
      expect(usesClaimsPhone(source), file).toBe(true);
    }
  });

  it('no retired phone number is published anywhere in the app', () => {
    for (const file of sourceFiles()) {
      const source = read(file);
      for (const retired of RETIRED_NUMBERS) {
        expect(source, `${file} still contains ${retired}`).not.toContain(retired);
      }
    }
  });
});
