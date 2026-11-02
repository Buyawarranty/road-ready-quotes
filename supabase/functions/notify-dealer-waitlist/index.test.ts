import { test, expect } from 'bun:test';
import { resolveBrand } from '../_shared/brand';

test('trader registration notifications use only the Panda Protect hello mailbox', async () => {
  const source = await Bun.file(new URL('./index.ts', import.meta.url)).text();
  const code = new Bun.Transpiler({ loader: 'ts' }).transformSync(source
    .replace(/^import .*serve.*;\n/m, '')
    .replace(/^import .*resolveBrand.*;\n/m, ''));
  let handler: ((request: Request) => Promise<Response>) | undefined;
  let email: Record<string, unknown> | undefined;
  new Function('serve', 'resolveBrand', 'Deno', 'fetch', code)(
    (callback: typeof handler) => { handler = callback; },
    resolveBrand,
    { env: { get: () => 'test-only' } },
    async (_url: string, options: RequestInit) => {
      email = JSON.parse(String(options.body));
      return new Response('{}', { status: 200 });
    },
  );
  if (!handler) throw new Error('Notification handler not registered');
  const response = await handler(new Request('https://example.test', {
    method: 'POST',
    body: JSON.stringify({ email_address: 'trader@example.test', phone_number: '07123456789' }),
  }));
  expect(response.status).toBe(200);
  expect(email?.to).toEqual(['hello@pandaprotect.co.uk']);
  expect(email?.from).toBe('Panda Protect <hello@pandaprotect.co.uk>');
  expect(email?.reply_to).toBe('trader@example.test');
});