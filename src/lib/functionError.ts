/** Read the real message from a failed supabase.functions.invoke call. */
export async function functionErrorMessage(error: any): Promise<string> {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.clone().json().catch(async () => ({ error: await ctx.text() }));
      if (body?.error) return String(body.error);
    }
  } catch { /* fall through */ }
  return error?.message || 'Request failed';
}
