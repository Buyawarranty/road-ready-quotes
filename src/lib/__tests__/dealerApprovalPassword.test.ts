import { it as test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Execute the actual approval branch without changing any live account.
const source = readFileSync(new URL('../../../supabase/functions/dealer-signup-decision/index.ts', import.meta.url), 'utf8');
const start = source.indexOf('      const { data: priorDealer }');
const end = source.indexOf('\n    } else {\n      userId = created.user', start);
if (start < 0 || end < 0) throw new Error('Approval password branch missing');
const runBranch = new Function('admin', 'existing', 'isResend', 'password', `return (async () => {${source.slice(start, end)}\nreturn password;})()`);

for (const scenario of [
  { name: 're-approval preserves an existing dealer password', resend: false, prior: { id: 'dealer' }, updates: 0, password: null },
  { name: 'explicit Resend login replaces an existing dealer password', resend: true, prior: { id: 'dealer' }, updates: 1, password: 'Temporary!7' },
  { name: 'first approval without a dealer profile sets a temporary password', resend: false, prior: null, updates: 1, password: 'Temporary!7' },
]) {
  test(scenario.name, async () => {
    const updates: any[] = [];
    const admin = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: scenario.prior }) }) }) }),
      auth: { admin: { updateUserById: async (...args: any[]) => { updates.push(args); } } },
    };
    assert.equal(await runBranch(admin, { id: 'account', user_metadata: { retained: true } }, scenario.resend, 'Temporary!7'), scenario.password);
    assert.equal(updates.length, scenario.updates);
    if (scenario.updates) assert.deepEqual(updates[0], ['account', { password: 'Temporary!7', user_metadata: { retained: true, must_change_password: true } }]);
  });
}