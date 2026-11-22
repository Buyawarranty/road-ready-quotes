import { trackDealerSaleKlaviyo } from './klaviyoDealer.ts';

export type DealerSaleMethod = 'pay_now' | 'worldpay' | 'invoice' | 'intro_free';

export function dealerQuoteStatusForMethod(method: DealerSaleMethod): 'paid' | 'invoiced' {
  return method === 'invoice' ? 'invoiced' : 'paid';
}

export function dealerPurchaseRecipients(dealerEmail?: string | null, customerEmail?: string | null) {
  const clean = (value?: string | null) => {
    const email = String(value || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
  };
  return { dealer: clean(dealerEmail), customer: clean(customerEmail) };
}

export async function syncDealerSale(
  admin: any,
  input: { customerId: string; quoteId?: string | null; stripeSessionId?: string | null; quoteStatus: 'paid' | 'invoiced' },
) {
  const { data, error } = await admin.rpc('complete_dealer_sale', {
    p_customer_id: input.customerId,
    p_dealer_quote_id: input.quoteId || null,
    p_stripe_session_id: input.stripeSessionId || null,
    p_quote_status: input.quoteStatus,
  });
  if (error) throw new Error(`Unable to complete the dealer sale: ${error.message}`);
  return data;
}

export async function notifyDealerSale(admin: any, customerId: string, kind: 'invoice' | 'paid') {
  // Klaviyo "Placed Order" (fire-and-forget; never affects the sale or email).
  await trackDealerSaleKlaviyo(admin, customerId, kind);
  const { data, error } = await admin.functions.invoke('dealer-warranty-email', {
    body: { customer_id: customerId, kind },
  });
  const message = error?.message || data?.error;
  if (message) console.error('dealer-warranty-email notify failed', message);
  return { sent: !message && data?.success === true, error: message || null, data };
}
