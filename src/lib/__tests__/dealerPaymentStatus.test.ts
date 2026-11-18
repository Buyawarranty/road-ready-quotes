import { describe, expect, it } from 'vitest';
import { compareDealerInvoiceDueDates, getDealerInvoiceDueDate, getDealerPaymentState } from '../dealerPaymentStatus';

describe('dealer invoice due dates', () => {
  it('uses the recorded due date instead of assuming 30 days', () => {
    const due = getDealerInvoiceDueDate({ signup_date: '2026-11-01T00:00:00.000Z', payment_due_date: '2026-12-15T00:00:00.000Z' });
    expect(due?.toISOString()).toBe('2026-12-15T00:00:00.000Z');
  });

  it('falls back to 30 days after issue when no due date is recorded', () => {
    const due = getDealerInvoiceDueDate({ signup_date: '2026-11-18T09:00:00.000Z' });
    expect(due?.toISOString()).toBe('2026-12-18T09:00:00.000Z');
  });

  it('marks an invoice pending beyond its recorded due date as overdue', () => {
    const state = getDealerPaymentState({ payment_status: 'invoice_pending', payment_due_date: '2026-11-17T00:00:00.000Z' }, new Date('2026-11-18T12:00:00.000Z'));
    expect(state.key).toBe('overdue');
  });

  it('sorts overdue and soonest-due invoices first, with missing dates last', () => {
    const rows = [
      { id: 'missing', payment_due_date: null },
      { id: 'later', payment_due_date: '2026-12-18T00:00:00.000Z' },
      { id: 'first', payment_due_date: '2026-11-17T00:00:00.000Z' },
    ];
    expect(rows.sort(compareDealerInvoiceDueDates).map(row => row.id)).toEqual(['first', 'later', 'missing']);
  });
});
