/** Bound dealer requests without automatically retrying a sale or assuming payment failed. */
export async function dealerRequest<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMessage: string,
  timeoutMs = 30000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request(controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}