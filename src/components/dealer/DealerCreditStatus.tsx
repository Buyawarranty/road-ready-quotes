import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, FileText, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { functionErrorMessage } from '@/lib/functionError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DEALER_NEW_QUOTE_URL } from '@/lib/dealerJourneyState';
import { dealerRequest } from '@/lib/dealerRequest';
import DealerFieldError from '@/components/dealer/DealerFieldError';

interface PayLaterEligibility {
  eligible: boolean;
  reason: 'new' | 'cancellations' | 'overdue' | 'blocked' | 'pending' | 'approval_required' | null;
  paid_count: number;
  required: number;
  term_days: number;
  overdue_count: number;
  request_status: 'pending' | 'approved' | 'rejected' | null;
  can_request: boolean;
}

export const DealerCreditStatus: React.FC = () => {
  const { dealer } = useDealerAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');

  const { data: eligibility, isPending: loading, isError, isFetching, refetch: refresh } = useQuery({
    queryKey: ['dealer-credit-status', dealer?.id],
    enabled: !!dealer?.id,
    retry: false,
    queryFn: async () => {
      if (!dealer?.id) return null;
      const { data, error } = await dealerRequest<{ data: PayLaterEligibility | null; error: unknown }>(signal =>
        (supabase.rpc as any)('get_dealer_paylater_eligibility', { p_dealer_id: dealer.id }).abortSignal(signal),
      'Account billing is taking longer to load. Please try again.');
      if (error || !data) throw new Error('Account billing could not be checked.');
      return data;
    },
  });

  const requestCredit = async () => {
    if (!dealer?.id || requesting) return;
    setRequesting(true);
    setRequestError('');
    try {
      const { data, error } = await dealerRequest(signal => supabase.functions.invoke('dealer-credit-authorisation', {
        signal,
        body: { action: 'request_credit', dealer_id: dealer.id },
      }), 'Your request could not be confirmed in time. Check account billing again before resending.');
      if (error) throw new Error(await functionErrorMessage(error));
      if (data?.error || !['pending', 'approved'].includes(data?.status)) throw new Error(data?.error || 'Your credit request could not be confirmed. Check account billing again before resending.');
      toast({ title: 'Request confirmed', description: 'Your account billing status is being updated.' });
      await refresh();
    } catch (cause) {
      const description = cause instanceof Error ? cause.message : 'Your credit request could not be confirmed. Please try again.';
      setRequestError(description);
      toast({ title: 'Credit request not confirmed', description, variant: 'destructive' });
    } finally {
      setRequesting(false);
    }
  };

  const paid = eligibility?.paid_count ?? 0;
  const required = eligibility?.required ?? 10;
  const available = eligibility?.eligible === true;
  const status = available ? 'Authorised' : eligibility?.reason === 'pending' ? 'Awaiting approval' : eligibility?.reason === 'overdue' ? 'Paused — overdue' : 'Locked';

  return (
    <section aria-labelledby="dealer-credit-status" className="rounded-lg border border-crm-line bg-card p-4 crm-panel-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-crm-orange-soft text-crm-orange"><FileText className="h-5 w-5" /></span>
          <div>
            <h2 id="dealer-credit-status" className="text-sm font-bold">{eligibility?.term_days ?? 30}-day invoicing</h2>
            <p className="mt-1 text-xs text-muted-foreground">Activate approved warranties now and pay through your dealer account.</p>
          </div>
        </div>
        <Badge className={available ? 'bg-crm-green-soft text-crm-green-deep' : 'bg-crm-orange-soft text-crm-navy'}>{loading ? 'Checking…' : isError ? 'Check unavailable' : status}</Badge>
      </div>

      {isError ? <div role="alert" className="mt-4 space-y-3"><DealerFieldError>Account billing could not be checked. Your account status has been kept; please try again.</DealerFieldError><Button variant="outline" disabled={isFetching} onClick={() => { void refresh(); }}>{isFetching ? 'Checking…' : 'Check account billing again'}</Button></div> : loading ? <Loader2 className="mx-auto my-5 h-5 w-5 animate-spin text-muted-foreground" /> : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold">{Math.min(paid, required)} of {required} paid warranties</span><span className="text-muted-foreground">{available ? 'Requirement met' : `${Math.max(0, required - paid)} to go`}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full ${available ? 'bg-crm-green' : 'bg-crm-blue'}`} style={{ width: `${Math.min(100, (paid / Math.max(1, required)) * 100)}%` }} /></div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {available
                ? `Choose “${eligibility?.term_days ?? 30}-day invoice” at trade checkout. Each payment is due ${eligibility?.term_days ?? 30} days after issue.`
                : eligibility?.reason === 'pending'
                  ? 'Your request is waiting for approval. The invoice option appears at checkout once it is authorised.'
                  : eligibility?.reason === 'overdue'
                    ? `Clear ${eligibility?.overdue_count || 'your'} overdue invoice${eligibility?.overdue_count === 1 ? '' : 's'} to restore account billing.`
                    : eligibility?.reason === 'blocked'
                      ? 'Account billing is paused for your dealership. Contact Panda Protect to review your terms.'
                      : eligibility?.can_request
                        ? 'You meet the paid-warranty requirement. Request authorisation to switch on account billing.'
                        : `Pay by card until you reach ${required} paid warranties, then request account billing.`}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Approval and a healthy account status are required. Overdue balances pause invoicing.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {available && <Button size="sm" onClick={() => navigate(DEALER_NEW_QUOTE_URL)}>Start a quote <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>}
            {eligibility?.can_request && <Button size="sm" disabled={requesting || isFetching} onClick={requestCredit}>{requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Request invoicing</Button>}
            {eligibility?.reason === 'pending' && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-crm-navy"><Clock3 className="h-4 w-4" />Request sent</span>}
            {eligibility?.reason === 'overdue' && <Button size="sm" variant="outline" onClick={() => navigate('/dealer-portal/invoicing')}>View invoices <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>}
            {!available && !eligibility?.can_request && eligibility?.reason === 'new' && <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Card payment until eligible</span>}
            {available && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-crm-green-deep"><CheckCircle2 className="h-4 w-4" />Ready at checkout</span>}
          </div>
        </div>
      )}
      {requestError && <div role="alert" className="mt-4 space-y-3"><DealerFieldError>{requestError}</DealerFieldError><Button variant="outline" disabled={isFetching || requesting} onClick={() => { void refresh(); }}>Check account billing again</Button></div>}
    </section>
  );
};
