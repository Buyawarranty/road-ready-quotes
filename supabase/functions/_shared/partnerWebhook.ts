// Partner (CRM supplier) automatic updates. Each partner's signing secret is derived
// from PARTNER_WEBHOOK_MASTER_KEY + partner id, so no per-partner secret is stored.
const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hmacHex(key: string, message: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(message)));
}
export async function sha256Hex(s: string) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}
export async function partnerSigningSecret(partnerId: string) {
  const master = (globalThis as any).Deno?.env.get('PARTNER_WEBHOOK_MASTER_KEY');
  if (!master) throw new Error('Partner signing is not configured.');
  return `whsec_pp_${(await hmacHex(master, `partner:${partnerId}`)).slice(0, 48)}`;
}

/** Sends one signed update to the partner and records the outcome. Never throws. */
export async function sendPartnerWebhook(admin: any, partnerId: string, event: string, data: Record<string, unknown>) {
  try {
    const { data: partner } = await admin.from('partners').select('id, webhook_url, mode, status').eq('id', partnerId).maybeSingle();
    if (!partner?.webhook_url) return;
    const payload = { id: crypto.randomUUID(), event, mode: partner.mode, created_at: new Date().toISOString(), data };
    const body = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = await hmacHex(await partnerSigningSecret(partnerId), `${ts}.${body}`);
    let status: number | null = null; let error: string | null = null;
    try {
      const res = await fetch(partner.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-PandaProtect-Event': event, 'X-PandaProtect-Timestamp': ts, 'X-PandaProtect-Signature': `sha256=${sig}` },
        body, signal: AbortSignal.timeout(10000),
      });
      status = res.status;
      if (!res.ok) error = `Partner replied ${res.status}`;
    } catch (e) { error = e instanceof Error ? e.message : 'Delivery failed'; }
    await admin.from('partner_webhook_deliveries').insert({ partner_id: partnerId, event, payload, status_code: status, success: !error, error });
  } catch (e) {
    console.error('partner webhook failed', e);
  }
}

/** Customer-safe warranty summary sent to partners: no trade cost or profit. */
export async function partnerWarrantySummary(admin: any, customerId: string) {
  const { data } = await admin.from('customers')
    .select('id, name, email, registration_plate, vehicle_make, vehicle_model, payment_type, final_amount, status, payment_status, signup_date, dealer_id, partner_id')
    .eq('id', customerId).maybeSingle();
  if (!data) return null;
  return {
    warranty_id: data.id, customer_name: data.name, customer_email: data.email, registration: data.registration_plate,
    vehicle: [data.vehicle_make, data.vehicle_model].filter(Boolean).join(' ') || null,
    term_months: Number(data.payment_type) || null, amount_paid: Number(data.final_amount), currency: 'GBP',
    status: data.status, payment_status: data.payment_status, start_date: data.signup_date, dealer_id: data.dealer_id,
  };
}
