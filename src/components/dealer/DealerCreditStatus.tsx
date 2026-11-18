import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, FileText, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { functionErrorMessage } from '@/lib/functionError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PayLaterEligibility {
  eligible: boolean;
  reason: 'new' | 'overdue' | 'blocked' | 'pending' | 'approval_required' | null;
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
  const [eligibility, setEligibility] = useState<PayLaterEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const refresh = useCallback(async () => {
    if (!dealer?.id) return;
    const { data, error } = await (supabase.rpc as any)('get_dealer_paylater_eligibility', { p_dealer_id: dealer.id });
    setLoading(false);
    if (!error && data) setEligibility(data as PayLaterEligibility);
  }, [dealer?.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const requestCredit = async () => {
    if (!dealer?.id || requesting) return;
    setRequesting(true);
    const { data, error } = await supabase.functions.invoke('dealer-credit-authorisation', {
      body: { action: 'request_credit', dealer_id: dealer.id },
    });
    setRequesting(false);
    if (error || (data as any)?.error) {
      const description = (data as any)?.error || (error ? await functionErrorMessage(error) : 'Please try again.');
      toast({ title: 'Credit request not sent', description, variant: 'destructive' });
      return;
    }
    toast({ title: 'Request sent', description: 'An Admin or Super Admin can now review it in Dealer billing → Credit authorisations.' });
    await refresh();
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
        <Badge className={available ? 'bg-crm-green-soft text-crm-green-deep' : 'bg-crm-orange-soft text-crm-navy'}>{loading ? 'Checking…' : status}</Badge>
      </div>

      {loading ? <Loader2 className="mx-auto my-5 h-5 w-5 animate-spin text-muted-foreground" /> : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold">{Math.min(paid, required)} of {required} paid warranties</span><span className="text-muted-foreground">{available ? 'Requirement met' : `${Math.max(0, required - paid)} to go`}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full ${available ? 'bg-crm-green' : 'bg-crm-blue'}`} style={{ width: `${Math.min(100, (paid / Math.max(1, required)) * 100)}%` }} /></div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {available
                ? `Choose “${eligibility?.term_days ?? 30}-day invoice” at trade checkout. Each payment is due ${eligibility?.term_days ?? 30} days after issue.`
                : eligibility?.reason === 'pending'
                  ? 'Your request is waiting for an Admin or Super Admin. The invoice option appears at checkout after approval.'
                  : eligibility?.reason === 'overdue'
                    ? `Clear ${eligibility?.overdue_count || 'your'} overdue invoice${eligibility?.overdue_count === 1 ? '' : 's'} to restore account billing.`
                    : eligibility?.reason === 'blocked'
                      ? 'Account billing is paused for your dealership. Contact Panda Protect to review your terms.'
                      : eligibility?.can_request
                        ? 'You meet the paid-warranty requirement. Request authorisation to switch on account billing.'
                        : `Pay by card until you reach ${required} paid warranties, then request Admin or Super Admin authorisation.`}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Approval and a healthy account status are required. Overdue balances pause invoicing.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {available && <Button size="sm" onClick={() => navigate('/dealer-portal/quote/pricing')}>Start a quote <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>}
            {eligibility?.can_request && <Button size="sm" disabled={requesting} onClick={requestCredit}>{requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Request invoicing</Button>}
            {eligibility?.reason === 'pending' && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-crm-navy"><Clock3 className="h-4 w-4" />Request sent</span>}
            {eligibility?.reason === 'overdue' && <Button size="sm" variant="outline" onClick={() => navigate('/dealer-portal/invoicing')}>View invoices <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>}
            {!available && !eligibility?.can_request && eligibility?.reason === 'new' && <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Card payment until eligible</span>}
            {available && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-crm-green-deep"><CheckCircle2 className="h-4 w-4" />Ready at checkout</span>}
          </div>
        </div>
      )}
    </section>
  );
};
