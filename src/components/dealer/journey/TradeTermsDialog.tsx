import React, { useState } from 'react';
import { Check, ExternalLink, FileText, Gift, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DealerFieldError from '@/components/dealer/DealerFieldError';
import { supabase } from '@/integrations/supabase/client';
import { DEALER_TRADE_TERMS_SUMMARY, DEALER_TRADE_TERMS_VERSION } from '@/lib/dealerTradeTerms';

interface Props {
  dealerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted: () => void;
}

const icons = [Gift, FileText, Check];

export const TradeTermsDialog: React.FC<Props> = ({ dealerId, open, onOpenChange, onAccepted }) => {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const accept = async () => {
    if (!checked || saving) return;
    setSaving(true);
    setError('');
    const { data, error: fnError } = await supabase.functions.invoke('dealer-credit-authorisation', {
      body: { action: 'accept_terms', dealer_id: dealerId, terms_version: DEALER_TRADE_TERMS_VERSION },
    });
    setSaving(false);
    if (fnError || data?.error) {
      setError(data?.error || 'We could not record your acceptance. Please try again.');
      return;
    }
    onAccepted();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto p-5 sm:p-7">
        <DialogTitle className="text-2xl font-extrabold text-crm-navy sm:text-3xl">Trade Terms & Conditions</DialogTitle>
        <DialogDescription className="text-base">Please review and accept before issuing this warranty.</DialogDescription>
        <div className="mt-3 divide-y divide-border">
          {DEALER_TRADE_TERMS_SUMMARY.map((item, index) => {
            const Icon = icons[index];
            return (
              <div key={item.title} className="flex gap-4 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crm-green-soft text-crm-green-deep"><Icon className="h-5 w-5" /></span>
                <div><h3 className="font-bold text-crm-navy">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p></div>
              </div>
            );
          })}
          <div className="flex gap-4 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-crm-navy"><ExternalLink className="h-5 w-5" /></span>
            <div><h3 className="font-bold text-crm-navy">Full terms</h3><p className="mt-1 text-sm text-muted-foreground">Full Trade Terms & Conditions are available to view in a new tab.</p></div>
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-crm-green/30 bg-crm-green-soft p-4 text-sm font-medium text-crm-navy">
          <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-crm-orange" />
          <span>I confirm I have read and accept the Trade Terms & Conditions, including the 3+3 introductory offer and invoicing terms.</span>
        </label>
        {error && <DealerFieldError>{error}</DealerFieldError>}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <a href="/dealer-portal/trade-terms" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-crm-blue">View full terms in new tab <ExternalLink className="h-4 w-4" /></a>
          <div className="flex gap-2">
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
