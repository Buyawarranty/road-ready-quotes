import React, { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shouldShowFollowUpBar } from '@/lib/dealerPortalProgress';

interface Props { storageKey: string; count: number; newestSignIn: string | null; onView: () => void }

/** Dismissible bar; reappears only when a dealer signs in after it was closed. */
export const DealerFollowUpBar: React.FC<Props> = ({ storageKey, count, newestSignIn, onView }) => {
  const [dismissed, setDismissed] = useState<string | null>(() => localStorage.getItem(storageKey));
  if (!count || !shouldShowFollowUpBar(newestSignIn, dismissed)) return null;
  const close = () => { const now = new Date().toISOString(); localStorage.setItem(storageKey, now); setDismissed(now); };
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
      <BellRing className="h-5 w-5 text-primary" />
      <span className="flex-1 text-sm font-semibold">
        {count} dealer{count === 1 ? ' has' : 's have'} signed in to the portal and {count === 1 ? 'is' : 'are'} ready for follow-up.
      </span>
      <Button size="sm" onClick={onView}>View them</Button>
      <Button size="icon" variant="ghost" aria-label="Close" onClick={close}><X className="h-4 w-4" /></Button>
    </div>
  );
};
