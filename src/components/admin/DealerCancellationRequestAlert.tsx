import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { canProcessDealerCancellations } from '@/lib/dealerCancellationAccess';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type CancellationAlert = {
  id: string;
  customer_id: string;
  reason: string;
  created_at: string;
  dealers?: { company_name: string | null } | null;
  customer?: { name: string | null; registration_plate: string | null } | null;
};

const DealerCancellationRequestAlert: React.FC<{ userRole: string | null }> = ({ userRole }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const enabled = canProcessDealerCancellations(userRole);
  const { data: requests = [] } = useQuery({
    queryKey: ['dealer-cancellation-request-alerts'],
    enabled,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('dealer_cancellation_requests')
        .select('id, customer_id, reason, created_at, dealers(company_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      const requests = (data || []) as CancellationAlert[];
      const customerIds = [...new Set(requests.map((request) => request.customer_id))];
      if (customerIds.length) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, registration_plate')
          .in('id', customerIds);
        const byId = new Map((customers || []).map((customer) => [customer.id, customer]));
        requests.forEach((request) => { request.customer = byId.get(request.customer_id) || null; });
      }
      return requests;
    },
  });

  const request = requests.find((item) => !dismissed.includes(item.id));
  if (!enabled || !request) return null;

  const dismiss = () => setDismissed((current) => [...current, request.id]);
  const process = () => {
    dismiss();
    navigate(`/admin-dashboard/?tab=dealer-cancellations&request=${encodeURIComponent(request.id)}`);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle>Cancellation request needs processing</DialogTitle>
          <DialogDescription>
            A dealer is waiting for a decision. Closing this reminder leaves the request pending.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="font-semibold text-foreground">{request.dealers?.company_name || 'Dealership'}</p>
          <p className="mt-1 text-muted-foreground">
            {request.customer?.registration_plate || 'Registration unavailable'} · {request.customer?.name || 'Customer unavailable'}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-foreground"><span className="font-medium">Reason:</span> {request.reason}</p>
          <p className="mt-3 text-xs text-muted-foreground">Requested {new Date(request.created_at).toLocaleString('en-GB')}</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={dismiss}>Close</Button>
          <Button onClick={process}>Process request <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DealerCancellationRequestAlert;
