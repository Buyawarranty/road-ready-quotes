export interface DealerNotificationResult { sent: boolean; error?: string | null }

/** Issued cover stays successful even if its receipt delivery is slow or fails. */
export async function waitForDealerFreeNotification(
  delivery: Promise<DealerNotificationResult>,
  keepAlive?: (task: Promise<unknown>) => void,
  timeoutMs = 5000,
): Promise<DealerNotificationResult> {
  const work = delivery.catch(() => ({ sent: false, error: 'Confirmation email needs to be checked.' }));
  keepAlive?.(work);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<DealerNotificationResult>(resolve => {
        timer = setTimeout(() => resolve({ sent: false, error: 'Confirmation email is still processing.' }), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}