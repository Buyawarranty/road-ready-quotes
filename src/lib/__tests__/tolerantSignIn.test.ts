import { beforeEach, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

let calls: { email: string; password: string }[] = [];
let responses: any[] = [];
const signIn = async (credentials: { email: string; password: string }) => {
  calls.push(credentials);
  return responses.shift() ?? { data: {}, error: null };
};
const source = readFileSync(new URL('../tolerantSignIn.ts', import.meta.url), 'utf8')
  .replace("import { supabase } from '@/integrations/supabase/client';", '')
  .replace('export async function', 'async function');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const signInWithPasswordTolerant = new Function('supabase', `${compiled}; return signInWithPasswordTolerant;`)({ auth: { signInWithPassword: signIn } });

beforeEach(() => {
  calls = [];
  responses = [];
});

test('always trims email and preserves a valid original password', async () => {
  await signInWithPasswordTolerant(' dealer@example.test \n', ' secret ');
  assert.deepEqual(calls, [{ email: 'dealer@example.test', password: ' secret ' }]);
});

test('retries copied whitespace once only after invalid credentials', async () => {
  responses = [{ data: {}, error: { message: 'Invalid login credentials' } }];
  await signInWithPasswordTolerant(' staff@example.test ', ' secret \n');
  assert.deepEqual(calls, [
    { email: 'staff@example.test', password: ' secret \n' },
    { email: 'staff@example.test', password: 'secret' },
  ]);
});

test('does not retry other errors', async () => {
  responses = [{ data: {}, error: { message: 'Email not confirmed' } }];
  await signInWithPasswordTolerant('dealer@example.test', ' secret ');
  assert.equal(calls.length, 1);
});

test('does not retry unchanged or whitespace-only passwords', async () => {
  responses = Array.from({ length: 2 }, () => ({ data: {}, error: { message: 'Invalid login credentials' } }));
  await signInWithPasswordTolerant('dealer@example.test', 'secret');
  await signInWithPasswordTolerant('dealer@example.test', ' \n');
  assert.equal(calls.length, 2);
});

test('a rejected trimmed password is never retried again', async () => {
  responses = Array.from({ length: 2 }, () => ({ data: {}, error: { message: 'Invalid login credentials' } }));
  const result = await signInWithPasswordTolerant('dealer@example.test', ' secret ');
  assert.equal(calls.length, 2);
  assert.equal(result.error?.message, 'Invalid login credentials');
});