/**
 * What should happen when an email entry box receives focus.
 *
 * Staff and dealers routinely paste a different address into a box that still
 * holds the one they just tried, so clicking or tapping into the box wipes it
 * ready for the new address. Keyboard focus (tabbing through a form) leaves the
 * text alone, because tabbing in is rarely an intention to throw the address
 * away — and browsers cannot highlight the contents of an email field anyway.
 */
export type EmailBoxFocusAction = 'clear' | 'keep';

export function emailBoxFocusAction(input: {
  /** Does the box already hold an address? */
  hasValue: boolean;
  /** Did focus arrive from a click or tap rather than from the keyboard? */
  fromPointer: boolean;
}): EmailBoxFocusAction {
  if (!input.hasValue) return 'keep';
  return input.fromPointer ? 'clear' : 'keep';
}
