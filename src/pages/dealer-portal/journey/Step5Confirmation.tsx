import React, { useEffect, useRef, useState } from 'react';
import FreeWarrantyStatus from '@/components/dealer/offer/FreeWarrantyStatus';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock3, FileText } from 'lucide-react';
import { fireDealerConfetti } from '@/lib/dealerConfetti';
import { DEALER_NEW_QUOTE_URL } from '@/lib/dealerJourneyState';
import { dealerRequest } from '@/lib/dealerRequest';
import { functionErrorMessage } from '@/lib/functionError';
import { useQueryClient } from '@tanstack/react-query';
import { useDealerAuth } from '@/hooks/useDealerAuth';

const Step5Confirmation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { reset } = useDealerJourney();
  const queryClient = useQueryClient();
  const { dealer } = useDealerAuth();
  const method = searchParams.get('method') || 'pay_now';
  const id = searchParams.get('id');
  const sessionId = searchParams.get('session_id');
  const [confirmed, setConfirmed] = useState(method === 'invoice');
  const [confirmError, setConfirmError] = useState('');
  const [emailWarning, setEmailWarning] = useState(method === 'free' && searchParams.get('email') !== 'sent');
  const [checking, setChecking] = useState(false);
  const mounted = useRef(true);

  const refreshSaleLists = () => {
    for (const key of ['dealer-quotes-list', 'dealer-dashboard', 'dealer-analytics-quotes', 'dealer-analytics-warranties', 'dealer-plans', 'dealer-warranties-list', 'dealer-free-remaining']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const confirmPayment = async () => {
    if (method === 'free') {
      if (!id || !dealer?.id) { setConfirmError('Open your warranties to check whether the free warranty was issued.'); return; }
      setChecking(true);
      setConfirmError('');
      try {
        const { data, error } = await dealerRequest(signal => supabase.from('customers')
          .select('id').eq('id', id).eq('dealer_id', dealer.id).eq('brand', 'pandaprotect')
          .eq('payment_status', 'paid').eq('payment_verified', true).eq('final_amount', 0)
          .eq('discount_code', 'BOGOF FREE').eq('status', 'Active').abortSignal(signal).maybeSingle(), 'The free warranty could not be checked. Open your warranties before trying again.');
        if (!mounted.current) return;
        if (error || !data) { setConfirmError('The free warranty is not yet confirmed. Open your warranties before trying again.'); return; }
        setConfirmed(true);
        refreshSaleLists();
        reset();
      } catch (error) {
        if (mounted.current) setConfirmError(error instanceof Error ? error.message : 'The free warranty could not be checked.');
      } finally { if (mounted.current) setChecking(false); }
      return;
    }
    if (!id || !sessionId) { setConfirmError('Open your warranties to check the payment status.'); return; }
    setChecking(true);
    setConfirmError('');
    try {
      const { data, error } = await dealerRequest(signal => supabase.functions.invoke('dealer-confirm-payment', { body: { customer_id: id, session_id: sessionId }, signal }), 'Payment confirmation is taking longer than expected. Check your warranties before making another payment.');
      if (!mounted.current) return;
      if (error || !data?.confirmed) {
        setConfirmError(data?.error || (error ? await functionErrorMessage(error) : 'Payment confirmation is pending. Please check again shortly.'));
        return;
      }
      setEmailWarning(Boolean(data.email && !data.email.sent));
      setConfirmed(true);
      refreshSaleLists();
      reset();
      fireDealerConfetti(1);
    } catch (error) {
      if (mounted.current) setConfirmError(error instanceof Error ? error.message : 'Payment confirmation needs to be checked. Open your warranties before making another payment.');
    } finally {
      if (mounted.current) setChecking(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    if (method === 'free' && !dealer?.id) return () => { mounted.current = false; };
    if (method === 'invoice') { reset(); refreshSaleLists(); }
    else void confirmPayment();
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, id, sessionId, dealer?.id]);

  const isInvoice = method === 'invoice';
  const isFree = method === 'free';
  const dueRaw = searchParams.get('due');
  const dueDate = dueRaw
    ? new Date(dueRaw).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <DealerJourneyLayout step={5} title={confirmed ? 'Warranty issued' : isFree ? 'Confirming free warranty' : 'Confirming payment'} subtitle={confirmed ? 'The warranty is now in your dealer account.' : isFree ? 'Checking that your free warranty is active.' : 'Checking your payment with Stripe.'} showBack={false}>
      <Card className="border-border bg-card">
        <CardContent className="pt-8 pb-8 text-center">
          <div className={`mb-4 inline-flex rounded-full p-4 ${confirmed ? 'bg-crm-green-soft text-crm-green-deep' : 'bg-muted text-muted-foreground'}`}>
            {confirmed ? <CheckCircle2 className="h-10 w-10" /> : <Clock3 className="h-10 w-10" />}
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">{confirmed ? (isFree ? 'Free warranty issued' : 'Warranty issued') : isFree ? 'Free warranty confirmation' : 'Payment confirmation'}</h2>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground">
            {!confirmed ? (confirmError || (isFree ? 'Checking your free warranty…' : 'Checking your payment…')) : emailWarning
              ? 'Your warranty is active. Email delivery has not yet been confirmed; you can resend it from Dealer warranties.'
              : isInvoice
              ? "We've recorded this warranty against your dealer account and sent the confirmation by email."
              : isFree
                ? 'Your free warranty (buy one, get the next one free) is now active and confirmation emails have been sent.'
                : 'Your customer is now covered. A confirmation email has been sent.'}
          </p>

          <div className="mx-auto mb-6 max-w-sm divide-y divide-border rounded-lg border border-border text-left text-sm">
            {id && (
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Warranty reference</span>
                <span className="font-mono font-semibold text-foreground">{id.slice(0, 8).toUpperCase()}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2">
              <span className="text-muted-foreground">Payment method</span>
              <span className="font-semibold text-foreground">{isInvoice ? 'Dealer account' : isFree ? 'Buy one get one free' : 'Card'}</span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-muted-foreground">Payment</span>
              <span className={`font-semibold ${isInvoice ? 'text-crm-gold-deep' : confirmed ? 'text-crm-green-deep' : 'text-muted-foreground'}`}>
                {isInvoice ? 'Invoice pending' : isFree && confirmed ? 'Free · active' : confirmed ? 'Paid' : 'Awaiting confirmation'}
              </span>
            </div>
            {isInvoice && dueDate && (
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Due</span>
                <span className="font-semibold text-foreground">{dueDate}</span>
              </div>
            )}
          </div>

          {confirmed && <FreeWarrantyStatus dealerId={dealer?.id} className="mx-auto mb-6 max-w-md text-left" />}

          {isInvoice && (
            <p className="mx-auto mb-6 max-w-md text-xs text-muted-foreground">
              {dueDate ? `Payment due ${dueDate}. ` : ''}If this invoice becomes overdue, affected warranties may be
              paused and claims may become unavailable until payment is received.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!confirmed && <Button variant="outline" disabled={checking} onClick={confirmPayment}>{checking ? 'Checking…' : isFree ? 'Check free warranty' : 'Check payment'}</Button>}
            <Button
              onClick={() => navigate('/dealer-portal/warranties')}
              className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90"
            >
              <FileText className="h-4 w-4 mr-2" /> View warranty
            </Button>
            <Button
              onClick={() => navigate(DEALER_NEW_QUOTE_URL)}
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
            >
              Create another quote
            </Button>
            <Button
              onClick={() => navigate('/dealer-portal/dashboard')}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              Back to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </DealerJourneyLayout>
  );
};

export default Step5Confirmation;
