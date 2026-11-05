import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const SLOT_ID = 'admin-live-alerts-slot';

/** Placeholder inside the admin sidebar where live alert cards appear. */
export const SidebarAlertSlotTarget: React.FC = () => (
  <div id={SLOT_ID} className="grid gap-2 px-3 empty:hidden" />
);

/** Renders children into the sidebar's live alerts area (never over the CRM). */
export const SidebarAlertPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [el, setEl] = useState<HTMLElement | null>(() => document.getElementById(SLOT_ID));
  useEffect(() => {
    if (el && document.body.contains(el)) return;
    const find = () => setEl(document.getElementById(SLOT_ID));
    find();
    const obs = new MutationObserver(find);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [el]);
  if (!el) return null;
  return createPortal(children, el);
};
