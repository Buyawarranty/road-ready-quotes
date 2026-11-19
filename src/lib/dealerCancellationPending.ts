export function buildPendingCancellationUpdate(requestId: string, progress: string, workNote: string, note: string) {
  return {
    p_request_id: requestId,
    p_progress: progress,
    p_note: [workNote.trim(), note.trim()].filter(Boolean).join('\n\n') || null,
  };
}