// Frontend tests import some supabase/functions/_shared helpers; this only
// types Deno.env for the app typecheck and never ships to the browser.
declare const Deno: { env: { get(key: string): string | undefined } };
