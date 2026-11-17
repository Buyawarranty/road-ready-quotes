import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { emailBoxFocusAction } from '../emailBoxFocus';

describe('email box focus', () => {
  it('clears a box that already holds an address when it is clicked', () => {
    assert.equal(emailBoxFocusAction({ hasValue: true, fromPointer: true }), 'clear');
  });
  it('leaves the address in place when focus arrives from the keyboard', () => {
    assert.equal(emailBoxFocusAction({ hasValue: true, fromPointer: false }), 'keep');
  });
  it('leaves an empty box empty when it is clicked', () => {
    assert.equal(emailBoxFocusAction({ hasValue: false, fromPointer: true }), 'keep');
  });
});
