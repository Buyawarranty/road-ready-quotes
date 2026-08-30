// Worldpay Access Checkout (embedded card fields) client configuration.
//
// The Access Checkout ID is a public, client-side identifier (an
// AccessCheckoutIdentity UUID from the Worldpay dashboard) — it is not a
// secret. Set VITE_WORLDPAY_CHECKOUT_ID to switch accounts/environments.
export const WORLDPAY_ENVIRONMENT: 'sandbox' | 'live' =
  (import.meta.env.VITE_WORLDPAY_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox';

export const WORLDPAY_CHECKOUT_ID: string =
  (import.meta.env.VITE_WORLDPAY_CHECKOUT_ID as string) || '';

export const WORLDPAY_SDK_URL =
  WORLDPAY_ENVIRONMENT === 'live'
    ? 'https://access.worldpay.com/access-checkout/v2/checkout.js'
    : 'https://try.access.worldpay.com/access-checkout/v2/checkout.js';
