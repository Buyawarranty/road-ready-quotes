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

export function getDealerPaymentState(
  row: { payment_status?: string | null; signup_date?: string | null },
  now: Date = new Date(),
): { key: DealerPaymentKey; dueDate: Date | null } {
  const s = String(row.payment_status || '').toLowerCase();
  if (s === 'paid') return { key: 'paid', dueDate: null };
  const dueDate = row.signup_date ? new Date(row.signup_date) : null;
  if (dueDate) dueDate.setDate(dueDate.getDate() + DEALER_PAYMENT_TERMS_DAYS);
  if (s === 'overdue') return { key: 'overdue', dueDate };
  if (s === 'invoice_pending') {
    return { key: dueDate && dueDate < now ? 'overdue' : 'due', dueDate };
  }
  return { key: 'awaiting', dueDate };
}
