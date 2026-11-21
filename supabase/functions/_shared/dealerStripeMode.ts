/** Payment mode is selected only from the dealer record read by the service. */
export function dealerStripeSecretName(isTest: boolean | null | undefined) {
  return isTest === true ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_SECRET_KEY';
}

export function dealerStripeSecret(isTest: boolean | null | undefined, read: (name: string) => string | undefined) {
  const key = read(dealerStripeSecretName(isTest));
  if (!key) throw new Error(isTest === true ? 'Test card payments are not configured.' : 'Card payments are not configured.');
  // Fail closed if the wrong kind of credential was entered in the secure form.
  if (isTest === true && !key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
    throw new Error('Test card payment configuration needs updating.');
  }
  return key;
}

export function assertDealerStripeMode(isTest: boolean | null | undefined, livemode: boolean | undefined) {
  if (typeof livemode !== 'boolean' || livemode === (isTest === true)) {
    throw new Error('Payment mode does not match this dealer account.');
  }
}

export function dealerUsesEmbeddedStripe(isTest: boolean | null | undefined, requested: boolean) {
  // Hosted test checkout needs only the saved secret, never the live publishable key.
  return isTest !== true && requested;
}