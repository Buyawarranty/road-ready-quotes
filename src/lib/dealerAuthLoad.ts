export const DEALER_AUTH_TIMEOUT_MS = 15000;

/** Keep a slow session/profile request from trapping a dealer on a spinner. */
export async function boundedDealerAuth<T>(request: PromiseLike<T>, timeoutMs = DEALER_AUTH_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Your dealer account is taking longer to load. Please try again.')), timeoutMs); }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}