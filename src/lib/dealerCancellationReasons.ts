export const DEALER_CANCELLATION_REASONS = [
  'Customer returned the vehicle',
  'Sold the vehicle',
  'Too expensive',
  'No longer needed',
  'Not using the vehicle',
  'Found a better deal elsewhere',
  'Financial hardship',
  'Moving abroad',
  'Other reason',
] as const;

export function formatDealerCancellationReason(reason: string, details: string) {
  if (!DEALER_CANCELLATION_REASONS.some(option => option === reason)) return null;
  const extra = details.trim();
  if (reason === 'Other reason' && extra.length < 3) return null;
  return extra ? `${reason}: ${extra}` : reason;
}

export function dealerCancellationReasonMatches(reason: string, filter: string) {
  return filter === 'all' || reason === filter || reason.startsWith(`${filter}: `);
}

export function showDealerProfileReminder(tab: string) {
  return !['dealer-cancellations', 'cancellations'].includes(tab);
}