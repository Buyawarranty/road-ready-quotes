import { describe, expect, it } from 'vitest';
import { getDealerInvoiceView, type DealerPdfRow } from '../dealerPdf';

const now = new Date('2026-11-18T12:00:00.000Z');
const sale: DealerPdfRow = {
  id: '38ebd378-0000-0000-0000-000000000000',
  name: 'John Smith',
  registration_plate: 'TH56XXX',
  plan_type: 'gold',
  payment_type: '36',
  final_amount: 299,
  signup_date: '2026-11-18T09:00:00.000Z',
};

describe('dealer invoice payment presentation', () => {
  it('shows an approved unpaid account sale as invoice payment pending with the full balance due', () => {
    const view = getDealerInvoiceView({
      ...sale,
      payment_status: 'invoice_pending',
      payment_due_date: '2026-12-18T00:00:00.000Z',
    }, now);

    expect(view.statusLabel).toBe('PAYMENT PENDING');
    expect(view.statusTitle).toBe('Invoice payment pending');
    expect(view.paymentMethod).toBe('30-day dealer invoice');
    expect(view.amountPaid).toBe(0);
    expect(view.balanceDue).toBe(299);
    expect(view.dueDate).toBe('18/12/2026');
  });

  it('shows a Stripe sale as paid in full with no balance and identifies the card payment', () => {
    const view = getDealerInvoiceView({
      ...sale,
      payment_status: 'paid',
      stripe_session_id: 'cs_test_paid_in_full',
      payment_collected_at: '2026-11-18T09:05:00.000Z',
    }, now);

    expect(view.statusLabel).toBe('PAID IN FULL');
    expect(view.statusTitle).toBe('Paid in full');
    expect(view.paymentMethod).toBe('Card payment via Stripe');
    expect(view.amountPaid).toBe(299);
    expect(view.balanceDue).toBe(0);
    expect(view.paidDate).toBe('18/11/2026');
  });

  it('keeps a confirmed account-invoice payment distinct from a Stripe card payment', () => {
    const view = getDealerInvoiceView({
      ...sale,
      payment_status: 'paid',
      stripe_session_id: 'invoice:38ebd378',
    }, now);

    expect(view.statusLabel).toBe('PAID IN FULL');
    expect(view.paymentMethod).toBe('Dealer account invoice');
    expect(view.balanceDue).toBe(0);
  });

  it('shows an unpaid invoice past its recorded due date as overdue', () => {
    const view = getDealerInvoiceView({
      ...sale,
      payment_status: 'invoice_pending',
      payment_due_date: '2026-11-17T00:00:00.000Z',
    }, now);

    expect(view.statusLabel).toBe('PAYMENT OVERDUE');
    expect(view.statusTitle).toBe('Invoice payment overdue');
    expect(view.balanceDue).toBe(299);
  });
});
