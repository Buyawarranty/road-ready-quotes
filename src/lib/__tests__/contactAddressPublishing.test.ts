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

  it('Make a claim page publishes support@, not hello@', () => {
    const source = read('src/pages/MakeAClaim.tsx');
    expect(source).not.toContain('hello@pandaprotect.co.uk');
    expect(source).toContain('support@pandaprotect.co.uk');
  });
});
