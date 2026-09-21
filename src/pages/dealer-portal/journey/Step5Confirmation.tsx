import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, FileText } from 'lucide-react';

const Step5Confirmation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { reset } = useDealerJourney();
  const method = searchParams.get('method') || 'pay_now';
  const id = searchParams.get('id');

  useEffect(() => {
    // Clear journey state — order has been written
    reset();
    // Card payments (Stripe / Worldpay): email warranty details to the dealer's
    // registered account email. The invoice path is emailed server-side already.
    if (id && method !== 'invoice') {
      const key = `dealer_warranty_email_sent_${id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        supabase.functions
          .invoke('dealer-warranty-email', { body: { customer_id: id, kind: 'paid' } })
          .catch((e) => console.error('dealer warranty email failed', e));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isInvoice = method === 'invoice';
  const dueRaw = searchParams.get('due');
  const dueDate = dueRaw
    ? new Date(dueRaw).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <DealerJourneyLayout step={5} title="Warranty issued" subtitle="The warranty is now in your dealer account." showBack={false}>
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="inline-flex p-4 rounded-full bg-green-500/10 mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Warranty issued</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {isInvoice
              ? "We've recorded this warranty against your dealer account and sent the confirmation by email."
              : 'Your customer is now covered. A confirmation email has been sent.'}
          </p>

          <div className="max-w-sm mx-auto text-left text-sm border border-gray-200 rounded-xl divide-y divide-gray-200 mb-6">
            {id && (
              <div className="flex justify-between px-4 py-2">
                <span className="text-gray-600">Warranty reference</span>
                <span className="font-mono font-semibold text-gray-900">{id.slice(0, 8).toUpperCase()}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2">
              <span className="text-gray-600">Payment method</span>
              <span className="font-semibold text-gray-900">{isInvoice ? 'Dealer account' : 'Card'}</span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-gray-600">Payment</span>
              <span className={`font-semibold ${isInvoice ? 'text-amber-700' : 'text-green-600'}`}>
                {isInvoice ? 'Invoice pending' : 'Paid'}
              </span>
            </div>
            {isInvoice && dueDate && (
              <div className="flex justify-between px-4 py-2">
                <span className="text-gray-600">Due</span>
                <span className="font-semibold text-gray-900">{dueDate}</span>
              </div>
            )}
          </div>

          {isInvoice && (
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
              {dueDate ? `Payment due ${dueDate}. ` : ''}If this invoice becomes overdue, affected warranties may be
              paused and claims may become unavailable until payment is received.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate('/dealer-portal/warranties')}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <FileText className="h-4 w-4 mr-2" /> View warranty
            </Button>
            <Button
              onClick={() => navigate('/dealer-portal/quote/vehicle')}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Create another quote
            </Button>
            <Button
              onClick={() => navigate('/dealer-portal/dashboard')}
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
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
