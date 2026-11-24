import React, { useEffect, useRef, useState } from 'react';
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

const Step5Confirmation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { reset } = useDealerJourney();
  const method = searchParams.get('method') || 'pay_now';
  const id = searchParams.get('id');
  const sessionId = searchParams.get('session_id');
  const [confirmed, setConfirmed] = useState(method === 'invoice' || method === 'free');
  const [confirmError, setConfirmError] = useState('');
  const [emailWarning, setEmailWarning] = useState(false);
  const [checking, setChecking] = useState(false);
  const mounted = useRef(true);

  const confirmPayment = async () => {
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
    if (method === 'invoice' || method === 'free') reset();
    else void confirmPayment();
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isInvoice = method === 'invoice';
  const isFree = method === 'free';
  const dueRaw = searchParams.get('due');
  const dueDate = dueRaw
    ? new Date(dueRaw).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <DealerJourneyLayout step={5} title={confirmed ? 'Warranty issued' : 'Confirming payment'} subtitle={confirmed ? 'The warranty is now in your dealer account.' : 'Checking your payment with Stripe.'} showBack={false}>
      <Card className="border-border bg-card">
        <CardContent className="pt-8 pb-8 text-center">
          <div className={`mb-4 inline-flex rounded-full p-4 ${confirmed ? 'bg-crm-green-soft text-crm-green-deep' : 'bg-muted text-muted-foreground'}`}>
            {confirmed ? <CheckCircle2 className="h-10 w-10" /> : <Clock3 className="h-10 w-10" />}
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">{confirmed ? (isFree ? 'Free warranty issued' : 'Warranty issued') : 'Payment confirmation'}</h2>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground">
            {!confirmed ? (confirmError || 'Checking your payment…') : emailWarning && !isFree
              ? 'Your warranty is active, but the confirmation email could not be sent. You can resend it from Dealer warranties.'
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
                {isInvoice ? 'Invoice pending' : isFree ? 'Free · active' : confirmed ? 'Paid' : 'Awaiting confirmation'}
              </span>
            </div>
            {isInvoice && dueDate && (
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Due</span>
                <span className="font-semibold text-foreground">{dueDate}</span>
              </div>
            )}
          </div>

          {isInvoice && (
            <p className="mx-auto mb-6 max-w-md text-xs text-muted-foreground">
              {dueDate ? `Payment due ${dueDate}. ` : ''}If this invoice becomes overdue, affected warranties may be
              paused and claims may become unavailable until payment is received.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!confirmed && <Button variant="outline" disabled={checking} onClick={confirmPayment}>{checking ? 'Checking…' : 'Check payment'}</Button>}
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
