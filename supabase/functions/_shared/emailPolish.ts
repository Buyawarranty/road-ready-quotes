// Shared finishing step for every outgoing email.
// - Adds the brand logo header when the email has none.
// - Adds a plain-text version (missing text parts push mail toward spam).
// - Sets a reply-to on the sending brand so replies reach a real inbox.
// The brand is taken from the sender address, so Panda and Buy A Warranty never mix.
import { BRANDS, type Brand } from "./brand.ts";

function brandFromSender(from: unknown): Brand | null {
  const s = String(from ?? "").toLowerCase();
  for (const b of Object.values(BRANDS)) if (s.includes(`@${b.domain}`)) return b;
  return null;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&pound;/g, "£")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function withLogo(html: string, brand: Brand): string {
  if (html.includes(brand.logoUrl) || /<img[^>]+(logo|alt="[^"]*(panda|buy a warranty))/i.test(html)) return html;
  const header = `<div style="text-align:center;padding:20px 0 12px;"><img src="${brand.logoUrl}" alt="${brand.name}" width="170" style="display:inline-block;max-width:170px;height:auto;border:0;" /></div>`;
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, (m) => `${m}${header}`);
  return header + html;
}

// deno-lint-ignore no-explicit-any
export function polishEmailPayload<T extends Record<string, any>>(payload: T): T {
  if (!payload || typeof payload !== "object") return payload;
  const brand = brandFromSender(payload.from);
  // deno-lint-ignore no-explicit-any
  const out: any = { ...payload };
  if (brand && typeof out.html === "string") out.html = withLogo(out.html, brand);
  if (typeof out.html === "string" && !out.text) out.text = htmlToText(out.html);
  if (brand && !out.reply_to && !out.replyTo) out.reply_to = brand.helloEmail;
  return out;
}

/** Drop-in for fetch() calls to the Resend REST API. */
export function resendFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (typeof init.body === "string") {
    try {
      const parsed = JSON.parse(init.body);
      const polished = Array.isArray(parsed) ? parsed.map(polishEmailPayload) : polishEmailPayload(parsed);
      init = { ...init, body: JSON.stringify(polished) };
    } catch { /* leave body unchanged */ }
  }
  return fetch(url, init);
}

/** Wrap a Resend SDK client so every send is finished the same way. */
// deno-lint-ignore no-explicit-any
export function polishResend<R extends { emails: any; batch?: any }>(client: R): R {
  const send = client.emails.send.bind(client.emails);
  // deno-lint-ignore no-explicit-any
  client.emails.send = (p: any, ...rest: any[]) => send(polishEmailPayload(p), ...rest);
  if (client.batch?.send) {
    const bsend = client.batch.send.bind(client.batch);
    // deno-lint-ignore no-explicit-any
    client.batch.send = (ps: any[], ...rest: any[]) => bsend(ps.map(polishEmailPayload), ...rest);
  }
  return client;
}
