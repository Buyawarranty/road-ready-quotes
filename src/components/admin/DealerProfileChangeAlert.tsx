import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatAddressValue } from '@/lib/dealerAddressChange';

const ADMIN_ROLES = ['admin', 'super_admin'];

type Req = { id: string; field: string; current_value: string | null; requested_value: string; created_at: string; dealers?: { company_name: string | null } | null };

const DealerProfileChangeAlert: React.FC<{ userRole: string | null }> = ({ userRole }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const enabled = !!userRole && ADMIN_ROLES.includes(userRole);
  const { data: rows = [] } = useQuery({
    queryKey: ['dealer-profile-change-alerts'],
    enabled,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('dealer_profile_change_requests')
        .select('id, field, current_value, requested_value, created_at, dealers(company_name)')
        .eq('status', 'pending').order('created_at', { ascending: true }).limit(50);
      if (error) throw error;
      return (data || []) as Req[];
    },
  });
  const r = rows.find((x) => !dismissed.includes(x.id));
  if (!enabled || !r) return null;
  const isAddr = r.field === 'company_address';
  const fmt = (v: string | null) => (isAddr ? formatAddressValue(v) : v || '—');
  const dismiss = () => setDismissed((c) => [...c, r.id]);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle>{isAddr ? 'Company address change pending' : 'Company name change pending'}</DialogTitle>
          <DialogDescription>A dealer is waiting for approval. Closing this reminder leaves the request pending.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="font-semibold text-foreground">{r.dealers?.company_name || 'Dealership'}</p>
          <p className="mt-2 text-muted-foreground"><span className="font-medium text-foreground">Current:</span> {fmt(r.current_value)}</p>
          <p className="mt-1 text-foreground"><span className="font-medium">Requested:</span> {fmt(r.requested_value)}</p>
          <p className="mt-3 text-xs text-muted-foreground">Requested {new Date(r.created_at).toLocaleString('en-GB')}</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={dismiss}>Close</Button>
          <Button onClick={() => { dismiss(); navigate('/admin-dashboard/?tab=dealer-profile-changes'); }}>Review request <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DealerProfileChangeAlert;
