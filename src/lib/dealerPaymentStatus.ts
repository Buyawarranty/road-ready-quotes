// Shared payment-state logic for dealer warranties. Admin sets customers.payment_status;
// dealer portal and admin invoices both read it through here so they always agree.
export type DealerPaymentKey = 'paid' | 'due' | 'overdue' | 'awaiting';

export const DEALER_PAYMENT_TERMS_DAYS = 30;

export const DEALER_PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'invoice_pending', label: 'Invoice outstanding' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'pending', label: 'Awaiting payment' },
];

export const DEALER_PAYMENT_STYLES: Record<DealerPaymentKey, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-green-600 text-white border-transparent' },
  due: { label: 'Invoice outstanding', className: 'bg-amber-500 text-white border-transparent' },
  overdue: { label: 'Overdue', className: 'bg-red-600 text-white border-transparent' },
  awaiting: { label: 'Awaiting payment', className: 'bg-slate-500 text-white border-transparent' },
};

export interface DealerPaymentDateRow {
  payment_status?: string | null;
  signup_date?: string | null;
  payment_due_date?: string | null;
}

const validDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

/** The recorded due date wins; older invoices fall back to 30 days after issue. */
export function getDealerInvoiceDueDate(row: DealerPaymentDateRow): Date | null {
  const recorded = validDate(row.payment_due_date);
  if (recorded) return recorded;
  const issued = validDate(row.signup_date);
  return issued ? new Date(issued.getTime() + DEALER_PAYMENT_TERMS_DAYS * 86400000) : null;
}

/** Soonest due first; records without a usable due date stay at the end. */
export function compareDealerInvoiceDueDates(a: DealerPaymentDateRow, b: DealerPaymentDateRow): number {
  return (getDealerInvoiceDueDate(a)?.getTime() ?? Number.POSITIVE_INFINITY)
    - (getDealerInvoiceDueDate(b)?.getTime() ?? Number.POSITIVE_INFINITY);
}

export function getDealerPaymentState(
  row: DealerPaymentDateRow,
  now: Date = new Date(),
): { key: DealerPaymentKey; dueDate: Date | null } {
  const s = String(row.payment_status || '').toLowerCase();
  if (s === 'paid') return { key: 'paid', dueDate: null };
  const dueDate = getDealerInvoiceDueDate(row);
  if (s === 'overdue') return { key: 'overdue', dueDate };
  if (s === 'invoice_pending') {
    return { key: dueDate && dueDate < now ? 'overdue' : 'due', dueDate };
  }
  return { key: 'awaiting', dueDate };
}
