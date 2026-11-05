import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Signup = { id: string; dealership_name: string | null; created_at: string };
const PENDING = ['new', 'pending', 'needs_info', 'contacted', 'qualified'];
const SEEN_KEY = 'pp-signup-alerts-dismissed';

let cache: Signup[] = [];
const listeners = new Set<(s: Signup[]) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const load = async () => {
  const { data, error } = await (supabase as any)
    .from('trade_warranty_signups')
    .select('id, dealership_name, created_at')
    .in('status', PENDING)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return;
  cache = data || [];
  listeners.forEach((l) => l(cache));
};

/** Sign-ups still waiting for a decision. Refreshes every 30 seconds. */
export const usePendingSignups = () => {
  const [items, setItems] = useState<Signup[]>(cache);
  useEffect(() => {
    listeners.add(setItems);
    if (!timer) { load(); timer = setInterval(load, 30000); }
    return () => {
      listeners.delete(setItems);
      if (listeners.size === 0 && timer) { clearInterval(timer); timer = null; }
    };
  }, []);
  return items;
};

export const PendingSignupBadge: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const n = usePendingSignups().length;
  if (n === 0) return null;
  return (
    <span
      aria-label={`${n} sign-ups to authorise`}
      className={`${compact ? 'absolute right-1 top-1' : 'ml-2 self-center'} inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground`}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
};

/** Live alert cards (bottom-left) for sign-ups not yet dismissed on this device. */
export const SignupAlerts: React.FC = () => {
  const navigate = useNavigate();
  const items = usePendingSignups();
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
  });
  const dismiss = (id: string) => {
    const next = [...dismissed, id].slice(-500);
    setDismissed(next);
    localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  };
  const show = items.filter((s) => !dismissed.includes(s.id));
  if (show.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 z-40 grid w-[280px] max-w-[calc(100vw-2rem)] gap-2" style={{ marginBottom: 0 }}>
      {show.slice(0, 3).map((s) => (
        <div key={s.id} className="rounded-lg border-2 border-primary bg-card p-3 shadow-lg">
          <div className="flex items-start gap-2">
            <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground">New sign-up: {s.dealership_name || 'Dealership'}</div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(s.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · waiting to be authorised
              </div>
              <button type="button" className="mt-1 text-xs font-medium text-primary underline"
                onClick={() => { navigate('/admin-dashboard/?tab=dealer-dealers'); dismiss(s.id); }}>
                Review sign-up
              </button>
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(s.id)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
      {show.length > 3 && <div className="text-center text-xs text-muted-foreground">+{show.length - 3} more sign-ups</div>}
    </div>
  );
};

export const SignupsTabLabel: React.FC = () => {
  const n = usePendingSignups().length;
  return <>{n ? `Sign-ups to authorise (${n})` : 'Sign-ups'}</>;
};
