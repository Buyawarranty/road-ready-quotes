import { beforeEach, expect, mock, test } from 'bun:test';

const signIn = mock(async (_credentials: { email: string; password: string }): Promise<any> => ({ data: {}, error: null }));
mock.module('@/integrations/supabase/client', () => ({ supabase: { auth: { signInWithPassword: signIn } } }));
const { signInWithPasswordTolerant } = await import('../tolerantSignIn');

beforeEach(() => {
  signIn.mockReset();
  signIn.mockResolvedValue({ data: {}, error: null });
});

test('always trims email and preserves a valid original password', async () => {
  await signInWithPasswordTolerant(' dealer@example.test \n', ' secret ');
  expect(signIn.mock.calls).toEqual([[{ email: 'dealer@example.test', password: ' secret ' }]]);
});

test('retries copied whitespace once only after invalid credentials', async () => {
  signIn.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid login credentials' } });
  await signInWithPasswordTolerant(' staff@example.test ', ' secret \n');
  expect(signIn.mock.calls).toEqual([
    [{ email: 'staff@example.test', password: ' secret \n' }],
    [{ email: 'staff@example.test', password: 'secret' }],
  ]);
});

test('does not retry other errors', async () => {
  signIn.mockResolvedValue({ data: {}, error: { message: 'Email not confirmed' } });
  await signInWithPasswordTolerant('dealer@example.test', ' secret ');
  expect(signIn).toHaveBeenCalledTimes(1);
});

test('does not retry unchanged or whitespace-only passwords', async () => {
  signIn.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } });
  await signInWithPasswordTolerant('dealer@example.test', 'secret');
  await signInWithPasswordTolerant('dealer@example.test', ' \n');
  expect(signIn).toHaveBeenCalledTimes(2);
});

test('a rejected trimmed password is never retried again', async () => {
  signIn.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } });
  const result = await signInWithPasswordTolerant('dealer@example.test', ' secret ');
  expect(signIn).toHaveBeenCalledTimes(2);
  expect(result.error?.message).toBe('Invalid login credentials');
});