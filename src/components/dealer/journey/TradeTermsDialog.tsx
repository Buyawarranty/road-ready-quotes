import React, { useState } from 'react';
import { Check, ExternalLink, FileText, Gift, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DealerFieldError from '@/components/dealer/DealerFieldError';
import { supabase } from '@/integrations/supabase/client';
import { useTradeTerms } from '@/hooks/useTradeTerms';

interface Props {
  dealerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted: (version: string) => void;
}

const icons = [Gift, FileText, Check];

export const TradeTermsDialog: React.FC<Props> = ({ dealerId, open, onOpenChange, onAccepted }) => {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { terms } = useTradeTerms();

  const accept = async () => {
    if (!checked || saving) return;
    setSaving(true);
    setError('');
    const { data, error: fnError } = await supabase.functions.invoke('dealer-credit-authorisation', {
      body: { action: 'accept_terms', dealer_id: dealerId, terms_version: terms.version },
    });
    setSaving(false);
    if (fnError || data?.error) {
      setError(data?.error || 'We could not record your acceptance. Please try again.');
      return;
    }
    onAccepted(terms.version);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dealer-crm max-h-[90vh] max-w-lg overflow-y-auto p-5 sm:p-6">
        <div className="pr-6">
          <DialogTitle className="!text-xl font-bold leading-tight text-crm-navy">Trade Terms & Conditions</DialogTitle>
          <DialogDescription className="mt-1 !text-sm text-muted-foreground">Please review and accept before issuing this warranty.</DialogDescription>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {terms.summary.map((item, index) => {
            const Icon = icons[index % icons.length];
            return (
              <li key={item.title} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-crm-green-soft text-crm-green-deep"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="!text-sm font-semibold leading-snug text-crm-navy">{item.title}</p>
                  <p className="mt-0.5 !text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-crm-green/30 bg-crm-green-soft px-4 py-3 !text-sm font-medium leading-snug text-crm-navy">
          <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-crm-orange" />
          <span>I confirm I have read and accept the Trade Terms & Conditions, including the buy one, get the next one free offer and invoicing terms.</span>
        </label>
        {error && <DealerFieldError>{error}</DealerFieldError>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a href="/dealer-portal/trade-terms" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 !text-sm font-semibold text-crm-blue">View full terms <ExternalLink className="h-3.5 w-3.5" /></a>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={!checked || saving} onClick={accept} className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Accept & continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
