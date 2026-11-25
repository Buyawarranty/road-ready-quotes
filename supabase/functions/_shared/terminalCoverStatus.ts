/** Terminal cover must never be described or processed as a new activation. */
export function isTerminalCoverStatus(status?: string | null): boolean {
  return ['cancelled', 'refunded', 'expired'].includes(String(status || '').trim().toLowerCase());
}