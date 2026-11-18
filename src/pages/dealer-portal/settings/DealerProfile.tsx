import React, { useEffect, useMemo, useState } from 'react';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, MapPin, Building2, Lock } from 'lucide-react';
import DealerChangePassword from '@/components/dealer/DealerChangePassword';
import BillingAddressFields from '@/components/dealer/BillingAddressFields';
import { toAddressRequest, formatAddressValue } from '@/lib/dealerAddressChange';
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
  const [contactName, setContactName] = useState('');
  const [touched, setTouched] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<{ requested_value: string; created_at: string } | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [reason, setReason] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrDraft, setAddrDraft] = useState<BillingAddress>(() => billingFromDealer(dealer));
  const [addrReason, setAddrReason] = useState('');
  const [addrShowErrors, setAddrShowErrors] = useState(false);

  useEffect(() => {
    if (!dealer?.id) return;
    (supabase as any).from('dealer_profile_change_requests').select('field, requested_value, created_at')
      .eq('dealer_id', dealer.id).eq('status', 'pending')
      .then(({ data }: any) => {
        const list = data || [];
        setPending(list.find((r: any) => r.field === 'company_name') || null);
        setPendingAddress(list.find((r: any) => r.field === 'company_address')?.requested_value || null);
      });
  }, [dealer?.id]);

  const submitRequest = async () => {
    if (!dealer || newName.trim().length < 2) return;
    setRequesting(true);
    const { error } = await (supabase as any).from('dealer_profile_change_requests').insert({
      dealer_id: dealer.id, field: 'company_name', current_value: dealer.company_name,
      requested_value: newName.trim(), reason: reason.trim() || null,
    });
    setRequesting(false);
    if (error) { toast({ title: 'Could not send request', description: error.message, variant: 'destructive' }); return; }
    setPending({ requested_value: newName.trim(), created_at: new Date().toISOString() });
    setRequestOpen(false); setNewName(''); setReason('');
    toast({ title: 'Request sent', description: 'We will review your new company name and let you know.' });
  };

  const addrErrors = useMemo(() => billingErrors(addrDraft), [addrDraft]);
  const submitAddress = async () => {
    if (!dealer) return;
    if (!isBillingComplete(addrDraft)) { setAddrShowErrors(true); return; }
    const current = toAddressRequest(billingFromDealer(dealer));
    const next = toAddressRequest(addrDraft);
    if (JSON.stringify(current) === JSON.stringify(next)) {
      toast({ title: 'No change', description: 'The new address is the same as your current one.' });
      return;
    }
    setRequesting(true);
    const value = JSON.stringify(next);
    const { error } = await (supabase as any).from('dealer_profile_change_requests').insert({
      dealer_id: dealer.id, field: 'company_address', current_value: JSON.stringify(current),
      requested_value: value, reason: addrReason.trim() || null,
    });
    setRequesting(false);
    if (error) { toast({ title: 'Could not send request', description: error.message, variant: 'destructive' }); return; }
    setPendingAddress(value); setAddrOpen(false); setAddrReason(''); setAddrShowErrors(false);
    toast({ title: 'Request sent', description: 'We will review your new company address and let you know.' });
  };

  useEffect(() => {
    if (dealer && !touched) {
      setBilling(billingFromDealer(dealer));
      setPhone(dealer.phone || '');
      setContactName(dealer.name || '');
    }
  }, [dealer, touched]);

  const errors = useMemo(() => billingErrors(billing), [billing]);

  const save = async () => {
    if (!dealer) return;
    setSaving(true);
    const { error } = await supabase
      .from('dealers')
      .update({ first_name: billingToDealerColumns(billing).first_name, last_name: billingToDealerColumns(billing).last_name, phone: phone.trim() || null, name: contactName.trim() || dealer.name })
      .eq('id', dealer.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Profile updated', description: 'Card payment pages will now be prefilled with these details.' });
  };

  return (
    <DealerLayout>
      <div className="min-w-0 max-w-3xl mx-auto py-3 sm:py-8 space-y-5 sm:space-y-6">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-extrabold text-gray-900">Account settings</h1>
          <p className="text-sm text-gray-600">
            Keep your phone number and billing address up to date. We use them to fill in card payment
            pages for you at checkout.
          </p>
        </div>

        {loading && !dealer ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your profile…
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-500" />
                <h2 className="font-bold text-gray-900">Business</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1 text-xs font-semibold text-gray-700">Company <Lock className="h-3 w-3 text-gray-500" aria-hidden="true" /><span className="font-normal text-gray-500">(locked)</span></Label>
                  <div className="relative">
                    <Input value={dealer?.company_name || ''} readOnly disabled aria-readonly="true" title="Locked — request a change below" className="h-10 cursor-not-allowed border-gray-200 bg-gray-100 pr-9 text-gray-600 disabled:opacity-100" />
                    <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="main-contact-name" className="text-xs font-semibold text-foreground">Main contact name</Label>
                  <Input
                    id="main-contact-name"
                    value={contactName}
                    placeholder="Preferred name"
                    autoComplete="name"
                    aria-describedby="main-contact-hint"
                    disabled={saving}
                    onChange={(e) => { setContactName(e.target.value); setTouched(true); }}
                    className="h-10 border-input bg-muted"
                  />
                  <p id="main-contact-hint" className="text-xs text-muted-foreground">Preferred name</p>
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
                Your company name and account email were approved when you joined, so they are locked. You can
                change your main contact name and phone number here. To change your company name, send it to us for approval.
              </p>
              {pending ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Company name change to <strong>{pending.requested_value}</strong> is waiting for approval.
                </p>
              ) : requestOpen ? (
                <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                  <Label className="text-xs font-semibold text-gray-700">New company name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Smith Motors Ltd" className="h-10" />
                  <Label className="text-xs font-semibold text-gray-700">Reason (optional)</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. We have rebranded" className="h-10" />
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" className="rounded-full" onClick={() => setRequestOpen(false)}>Cancel</Button>
                    <Button className="rounded-full bg-orange-500 hover:bg-orange-600 text-white" disabled={requesting || newName.trim().length < 2} onClick={submitRequest}>
                      {requesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Send for approval
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="h-auto min-h-11 w-full whitespace-normal rounded-full sm:w-auto" onClick={() => setRequestOpen(true)}>Request company name change</Button>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                <h2 className="font-bold text-gray-900">Company address</h2>
                <span className="ml-1 inline-flex items-center gap-1 text-xs text-gray-500"><Lock className="h-3 w-3" aria-hidden="true" />locked</span>
              </div>
              <BillingAddressFields
                value={billing}
                onChange={(next) => { setBilling(next); setTouched(true); }}
                errors={showErrors ? errors : {}}
                disabled={saving}
                lockAddress
              />
              <p className="text-xs text-gray-500">
                Your company address is locked. You can change the billing first and last name here. To change the address, send it to us for approval.
              </p>
              {pendingAddress ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Company address change to <strong>{formatAddressValue(pendingAddress)}</strong> is waiting for approval.
                </p>
              ) : addrOpen ? (
                <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-semibold text-gray-900">New company address</p>
                  <BillingAddressFields value={addrDraft} onChange={setAddrDraft} errors={addrShowErrors ? addrErrors : {}} disabled={requesting} hideNames />
                  <Label className="text-xs font-semibold text-gray-700">Reason (optional)</Label>
                  <Input value={addrReason} onChange={(e) => setAddrReason(e.target.value)} placeholder="e.g. We have moved premises" className="h-10" />
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" className="rounded-full" onClick={() => setAddrOpen(false)}>Cancel</Button>
                    <Button className="rounded-full bg-orange-500 hover:bg-orange-600 text-white" disabled={requesting} onClick={submitAddress}>
                      {requesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Send for approval
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="h-auto min-h-11 w-full whitespace-normal rounded-full sm:w-auto" onClick={() => { setAddrDraft(billingFromDealer(dealer)); setAddrOpen(true); }}>Request company address change</Button>
              )}
            </section>

            <div className="flex justify-end">
              <Button
                onClick={save}
                disabled={saving || !dealer}
                className="w-full sm:w-auto rounded-full bg-orange-500 hover:bg-orange-600 text-white px-6"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save changes
              </Button>
            </div>
          </>
        )}
        <DealerChangePassword />
      </div>
    </DealerLayout>
  );
};

export default DealerProfileSettings;
