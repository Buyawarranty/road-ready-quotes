import { notifyDealerSale, syncDealerSale } from './dealerSaleFulfilment.ts';
import { partnerWarrantySummary, sendPartnerWebhook } from './partnerWebhook.ts';

interface DealerStripeSession {
  id: string;
  payment_status: string;
  currency: string | null;
  amount_total: number | null;
  metadata?: Record<string, string> | null;
}

/** Shared by the signed Stripe webhook and the dealer's return-page confirmation. */
export async function finaliseDealerCardPayment(admin: any, session: DealerStripeSession, expectedDealerId?: string) {
  if (session.payment_status !== 'paid') throw new Error('Payment is still awaiting confirmation. Please check again shortly.');
  const metadata = session.metadata || {};
  const customerId = metadata.customer_id;
  const dealerId = metadata.dealer_id;
  if (!customerId || !dealerId) throw new Error('Dealer sale details are missing from this payment.');
  if (expectedDealerId && dealerId !== expectedDealerId) throw new Error('Payment does not belong to this dealer.');

  const { data: customer, error: customerError } = await admin
    .from('customers')
    .select('id, dealer_id, final_amount, stripe_session_id, payment_verified')
    .eq('id', customerId)
    .eq('dealer_id', dealerId)
    .eq('brand', 'pandaprotect')
    .maybeSingle();
  if (customerError || !customer) throw new Error('Dealer warranty not found for this payment.');
  if (customer.stripe_session_id !== session.id) throw new Error('Payment does not match this warranty.');
  if (session.currency !== 'gbp' || session.amount_total !== Math.round(Number(customer.final_amount) * 100)) {
    throw new Error('Payment does not match the warranty amount.');
  }

  if (metadata.promo_redemption_id) {
    const { error } = await admin.rpc('complete_dealer_promo', {
      p_redemption_id: metadata.promo_redemption_id,
      p_session_id: session.id,
      p_amount: Number(customer.final_amount),
    });
    if (error) throw new Error(error.message);
  }

  // Only the process that changes verification from false to true sends the automatic emails.
  const { data: confirmed, error: updateError } = await admin
    .from('customers')
    .update({
      payment_status: 'paid',
      payment_verified: true,
      payment_verified_at: new Date().toISOString(),
      payment_verification_status: 'verified',
      payment_verification_source: 'stripe',
      status: 'Active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', customer.id)
    .eq('payment_verified', false)
    .select('id')
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);

  const sale = await syncDealerSale(admin, {
    customerId: customer.id,
    quoteId: metadata.dealer_quote_id || null,
    stripeSessionId: session.id,
    quoteStatus: 'paid',
  });
  const email = confirmed ? await notifyDealerSale(admin, customer.id, 'paid') : null;
  if (confirmed && metadata.partner_id) {
    const summary = await partnerWarrantySummary(admin, customer.id);
    if (summary) await sendPartnerWebhook(admin, metadata.partner_id, 'warranty.paid', { ...summary, reference: metadata.partner_reference || null });
  }
  return { confirmed: true, alreadyConfirmed: !confirmed, sale, email };
}
