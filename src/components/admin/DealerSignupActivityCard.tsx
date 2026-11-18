import { useState } from 'react';
import { Activity, Building2, Clock3, FileText, Loader2, LogIn, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dealerActivityStage, DEALER_ACTIVITY_LABEL, type DealerSignupActivity } from '@/lib/dealerSignupActivity';

interface Props {
  activity: DealerSignupActivity | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const date = (value: string | null) => value ? format(new Date(value), 'd MMM yyyy, HH:mm') : null;

export function DealerSignupActivityCard({ activity, loading, error, onRetry }: Props) {
  const stage = activity ? dealerActivityStage(activity) : 'not_created';
  return (
    <section aria-label="Dealer account activity" className="rounded-xl border border-crm-line bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Activity className="h-4 w-4 text-crm-orange" /> Account activity
        </h3>
        {activity && (
          <Badge variant="outline" className={stage === 'active' ? 'border-crm-green/30 bg-crm-green-soft text-crm-green' : stage === 'signed_up' ? 'border-crm-orange/30 bg-crm-orange-soft text-crm-orange' : 'bg-muted text-muted-foreground'}>
            {DEALER_ACTIVITY_LABEL[stage]}
          </Badge>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking dealer activity…</div>
      ) : error ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry</Button>
        </div>
      ) : activity ? (
        <div className="mt-4 space-y-3">
          <ActivityRow icon={Building2} label="Dealer account" value={activity.dealer_account_created ? `Created ${date(activity.dealer_created_at) || '—'}` : 'Not created yet'} complete={activity.dealer_account_created} />
          <ActivityRow icon={LogIn} label="Sign-in" value={date(activity.last_sign_in_at) || 'No sign-in recorded'} complete={Boolean(activity.last_sign_in_at)} />
          <LoginHistory items={activity.login_history || []} />
          <ActivityRow icon={FileText} label="Portal use" value={`${activity.quote_count} quote${activity.quote_count === 1 ? '' : 's'} · ${activity.warranty_count} warrant${activity.warranty_count === 1 ? 'y' : 'ies'}`} complete={activity.quote_count + activity.warranty_count > 0} />
          <div className="flex items-start gap-3 border-t border-border pt-3 text-sm">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div><div className="font-medium text-foreground">Last recorded activity</div><div className="mt-0.5 text-xs text-muted-foreground">{date(activity.last_activity_at) || 'No portal activity recorded yet'}</div></div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">Active user means a sign-in, quote update or warranty update in the last 30 days.</p>
        </div>
      ) : null}
    </section>
  );
}

function ActivityRow({ icon: Icon, label, value, complete }: { icon: typeof Building2; label: string; value: string; complete: boolean }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-crm-green-soft text-crm-green' : 'bg-muted text-muted-foreground'}`}><Icon className="h-3.5 w-3.5" /></span>
      <div><div className="font-medium text-foreground">{label}</div><div className="mt-0.5 text-xs text-muted-foreground">{value}</div></div>
    </div>
  );
}

function LoginHistory({ items }: { items: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;
  const shown = expanded ? items : items.slice(0, 6);
  return (
    <div className="ml-9 rounded-lg border border-border bg-muted/30 p-2">
      <div className="mb-1 text-xs font-semibold text-foreground">Sign-in history ({items.length})</div>
      <ol className="space-y-0.5 text-xs text-muted-foreground">
        {shown.map((t, i) => <li key={t + i} className="tabular-nums">{i === 0 ? <strong className="text-foreground">{date(t)} · most recent</strong> : date(t)}</li>)}
      </ol>
      {items.length > 6 && (
        <button type="button" onClick={() => setExpanded(e => !e)} className="mt-1 text-xs font-semibold text-crm-orange hover:underline">
          {expanded ? 'Show fewer' : `Show ${items.length - 6} more`}
        </button>
      )}
    </div>
  );
}
