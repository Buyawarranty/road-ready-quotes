import { describe, expect, it } from 'vitest';
import { buildPendingCancellationUpdate } from '../dealerCancellationPending';

describe('saving a cancellation without a decision', () => {
  it('saves pending progress and both notes without approval or refund instructions', () => {
    expect(buildPendingCancellationUpdate('request-1', 'new', ' Called dealer ', ' Awaiting decision ')).toEqual({
      p_request_id: 'request-1', p_progress: 'new', p_note: 'Called dealer\n\nAwaiting decision',
    });
  });
  it('keeps the selected waiting stage when no note is entered', () => {
    expect(buildPendingCancellationUpdate('request-2', 'waiting_customer', ' ', '')).toEqual({
      p_request_id: 'request-2', p_progress: 'waiting_customer', p_note: null,
    });
  });
});