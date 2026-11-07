/** Card warranties remain unissued until payment confirmation; approved account billing issues immediately. */
export function dealerCheckoutState(method: 'pay_now' | 'invoice' | 'worldpay') {
  return method === 'invoice'
    ? { status: 'Active', payment_status: 'invoice_pending', payment_verified: true } as const
    : { status: 'Pending', payment_status: 'pending', payment_verified: false } as const;
}