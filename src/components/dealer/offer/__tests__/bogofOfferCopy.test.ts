import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const DETAIL = "Buy one, get the next one free on your first three warranties";

describe('Buy one get one free offer copy', () => {
  it('lives in the offer module as one short label and one detail sentence', () => {
    const source = read('src/components/dealer/offer/BogofBanner.tsx');
    expect(source).toContain("export const BOGOF_SHORT_LABEL = 'Buy one get one free'");
    expect(source).toContain(DETAIL);
    expect(source).toContain("3 years' cover");
  });

  it('pricing page shows the short label plus the hover tip, never the full sentence', () => {
    const source = read('src/pages/dealer-portal/journey/Step3Pricing.tsx');
    expect(source).toContain('BOGOF_SHORT_LABEL');
    expect(source).toContain('<OfferDetailTip');
    expect(source).not.toContain(DETAIL);
    expect(source).not.toContain('Buy one get one free');
    const body = source.split('\n').filter((line) => !line.startsWith('import ')).join('\n');
    expect(body.match(/BOGOF_SHORT_LABEL/g)).toHaveLength(1);
  });

  it('full sentence is written down once, in the offer module only', () => {
    const files = [
      'src/components/dealer/offer/BogofBanner.tsx',
      'src/pages/dealer-portal/journey/Step3Pricing.tsx',
      'src/pages/dealer-portal/journey/Step4Checkout.tsx',
      'src/pages/dealer-portal/journey/Step5Confirmation.tsx',
      'src/lib/dealerTradeTerms.ts',
      'src/components/dealer-admin/BogofOfferSettings.tsx',
    ];
    const holders = files.filter((file) => read(file).includes(DETAIL));
    expect(holders).toEqual(['src/components/dealer/offer/BogofBanner.tsx']);
  });
});
