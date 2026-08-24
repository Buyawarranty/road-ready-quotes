import React, { useEffect, useMemo, useState } from 'react';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, MapPin, Building2 } from 'lucide-react';
import BillingAddressFields from '@/components/dealer/BillingAddressFields';
import {
  BillingAddress,
  billingErrors,
  billingFromDealer,
  billingToDealerColumns,
  isBillingComplete,
} from '@/lib/dealerBilling';

const DealerProfileSettings: React.FC = () => {
  const { dealer, loading } = useDealerAuth();
  const { toast } = useToast();

  const [billing, setBilling] = useState<BillingAddress>(() => billingFromDealer(dealer));
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dealer && !touched) {
      setBilling(billingFromDealer(dealer));
      setPhone(dealer.phone || '');
    }
  }, [dealer, touched]);

  const errors = useMemo(() => billingErrors(billing), [billing]);

  const save = async () => {
    if (!dealer) return;
    if (!isBillingComplete(billing)) {
      setShowErrors(true);
      toast({ title: 'Check your address', description: 'Some required fields are missing.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('dealers')
      .update({ ...billingToDealerColumns(billing), phone: phone.trim() || null })
      .eq('id', dealer.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    setTouched(false);
    toast({ title: 'Profile updated', description: 'Card payment pages will now be prefilled with these details.' });
  };

  return (
    <DealerLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Account settings</h1>
          <p className="text-sm text-gray-600">
            Keep your billing details up to date — we use them to prefill card payment pages so you don't
            have to type them at checkout.
          </p>
        </div>

        {loading && !dealer ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your profile…
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-500" />
                <h2 className="font-bold text-gray-900">Business</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Company</Label>
                  <Input value={dealer?.company_name || ''} readOnly className="h-10 bg-gray-50 border-gray-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Account email</Label>
                  <Input value={dealer?.email || ''} readOnly className="h-10 bg-gray-50 border-gray-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setTouched(true); }}
                    className="h-10 bg-gray-100 border-gray-300"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Need the company name or email changed? Email hello@pandaprotect.co.uk and we'll update it.
              </p>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                <h2 className="font-bold text-gray-900">Billing address</h2>
              </div>
              <BillingAddressFields
                value={billing}
                onChange={(next) => { setBilling(next); setTouched(true); }}
                errors={showErrors ? errors : {}}
                disabled={saving}
              />
            </section>

            <div className="flex justify-end">
              <Button
                onClick={save}
                disabled={saving || !dealer}
                className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-6"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save changes
              </Button>
            </div>
          </>
        )}
      </div>
    </DealerLayout>
  );
};

export default DealerProfileSettings;
