import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const STEPS = ['Vehicle', 'Customer', 'Finance', 'Documents', 'Submit'];

const FinanceApplicationNew: React.FC = () => {
  const { dealer } = useDealerAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [vehicle, setVehicle] = useState({ vrm: '', make: '', model: '', derivative: '', year: '', mileage: '', valuation: '' });
  const [customer, setCustomer] = useState({ first_name: '', last_name: '', dob: '', email: '', phone: '', address_line1: '', postcode: '', employment_status: '', annual_income: '', marital_status: '', dependants: '' });
  const [finance, setFinance] = useState({ product: 'HP', cash_price: '', deposit: '', term_months: '60', balloon: '', apr: '', monthly: '', commission: '' });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!dealer?.id) return;
    setSaving(true);
    try {
      const { data: app, error: e1 } = await (supabase as any)
        .from('finance_applications')
        .insert({ dealer_id: dealer.id, status: 'submitted', customer, submitted_at: new Date().toISOString() })
        .select('id, reference')
        .single();
      if (e1) throw e1;

      const toNum = (v: string) => (v === '' ? null : Number(v));

      await (supabase as any).from('finance_application_vehicle').insert({
        application_id: app.id,
        vrm: vehicle.vrm || null, make: vehicle.make || null, model: vehicle.model || null,
        derivative: vehicle.derivative || null,
        year: toNum(vehicle.year), mileage: toNum(vehicle.mileage), valuation: toNum(vehicle.valuation),
      });
      await (supabase as any).from('finance_application_finance').insert({
        application_id: app.id, product: finance.product,
        cash_price: toNum(finance.cash_price), deposit: toNum(finance.deposit),
        term_months: toNum(finance.term_months), balloon: toNum(finance.balloon),
        apr: toNum(finance.apr), monthly: toNum(finance.monthly), commission: toNum(finance.commission),
      });
      await (supabase as any).from('finance_application_events').insert({
        application_id: app.id, event_type: 'submitted', to_status: 'submitted',
      });

      toast.success(`Application ${app.reference} submitted`);
      navigate(`/dealer-portal/applications/${app.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not submit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DealerLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New finance application</h1>
          <p className="text-sm text-gray-600">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>

        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded ${i <= step ? 'bg-orange-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white border rounded-lg p-6 space-y-4">
          {step === 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Registration (VRM)</Label><Input value={vehicle.vrm} onChange={(e) => setVehicle({ ...vehicle, vrm: e.target.value.toUpperCase() })} /></div>
              <div><Label>Make</Label><Input value={vehicle.make} onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })} /></div>
              <div><Label>Model</Label><Input value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} /></div>
              <div><Label>Derivative</Label><Input value={vehicle.derivative} onChange={(e) => setVehicle({ ...vehicle, derivative: e.target.value })} /></div>
              <div><Label>Year</Label><Input type="number" value={vehicle.year} onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })} /></div>
              <div><Label>Mileage</Label><Input type="number" value={vehicle.mileage} onChange={(e) => setVehicle({ ...vehicle, mileage: e.target.value })} /></div>
              <div><Label>Valuation (£)</Label><Input type="number" value={vehicle.valuation} onChange={(e) => setVehicle({ ...vehicle, valuation: e.target.value })} /></div>
            </div>
          )}
          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>First name</Label><Input value={customer.first_name} onChange={(e) => setCustomer({ ...customer, first_name: e.target.value })} /></div>
              <div><Label>Last name</Label><Input value={customer.last_name} onChange={(e) => setCustomer({ ...customer, last_name: e.target.value })} /></div>
              <div><Label>Date of birth</Label><Input type="date" value={customer.dob} onChange={(e) => setCustomer({ ...customer, dob: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
              <div><Label>Postcode</Label><Input value={customer.postcode} onChange={(e) => setCustomer({ ...customer, postcode: e.target.value.toUpperCase() })} /></div>
              <div className="sm:col-span-2"><Label>Address line 1</Label><Input value={customer.address_line1} onChange={(e) => setCustomer({ ...customer, address_line1: e.target.value })} /></div>
              <div><Label>Employment status</Label><Input value={customer.employment_status} onChange={(e) => setCustomer({ ...customer, employment_status: e.target.value })} /></div>
              <div><Label>Annual income (£)</Label><Input type="number" value={customer.annual_income} onChange={(e) => setCustomer({ ...customer, annual_income: e.target.value })} /></div>
              <div><Label>Marital status</Label><Input value={customer.marital_status} onChange={(e) => setCustomer({ ...customer, marital_status: e.target.value })} /></div>
              <div><Label>Dependants</Label><Input type="number" value={customer.dependants} onChange={(e) => setCustomer({ ...customer, dependants: e.target.value })} /></div>
            </div>
          )}
          {step === 2 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Product</Label>
                <Select value={finance.product} onValueChange={(v) => setFinance({ ...finance, product: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HP">Hire Purchase (HP)</SelectItem>
                    <SelectItem value="PCP">Personal Contract Purchase (PCP)</SelectItem>
                    <SelectItem value="Lease">Personal Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Cash price (£)</Label><Input type="number" value={finance.cash_price} onChange={(e) => setFinance({ ...finance, cash_price: e.target.value })} /></div>
              <div><Label>Deposit (£)</Label><Input type="number" value={finance.deposit} onChange={(e) => setFinance({ ...finance, deposit: e.target.value })} /></div>
              <div><Label>Term (months)</Label><Input type="number" value={finance.term_months} onChange={(e) => setFinance({ ...finance, term_months: e.target.value })} /></div>
              <div><Label>Balloon / GFV (£)</Label><Input type="number" value={finance.balloon} onChange={(e) => setFinance({ ...finance, balloon: e.target.value })} /></div>
              <div><Label>APR (%)</Label><Input type="number" step="0.1" value={finance.apr} onChange={(e) => setFinance({ ...finance, apr: e.target.value })} /></div>
              <div><Label>Monthly (£)</Label><Input type="number" value={finance.monthly} onChange={(e) => setFinance({ ...finance, monthly: e.target.value })} /></div>
              <div><Label>Commission (£)</Label><Input type="number" value={finance.commission} onChange={(e) => setFinance({ ...finance, commission: e.target.value })} /></div>
            </div>
          )}
          {step === 3 && (
            <div className="text-sm text-gray-600">
              Document upload (proof of ID, address, income, bank statements, V5C, invoice) will be available after submission from the application detail page.
            </div>
          )}
          {step === 4 && (
            <div className="text-sm text-gray-700 space-y-3">
              <p>Please confirm the information is accurate. By submitting you confirm the customer has consented to a credit search and the use of their data for finance underwriting.</p>
              <ul className="list-disc pl-5 text-gray-600 text-sm">
                <li>Vehicle: {vehicle.vrm || '—'} {vehicle.make} {vehicle.model}</li>
                <li>Customer: {customer.first_name} {customer.last_name}</li>
                <li>Finance: {finance.product} · £{finance.cash_price || 0} over {finance.term_months}m</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={prev} disabled={step === 0}>Back</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} className="bg-orange-500 hover:bg-orange-600 text-white">Continue</Button>
          ) : (
            <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Submitting…' : 'Submit application'}
            </Button>
          )}
        </div>
      </div>
    </DealerLayout>
  );
};

export default FinanceApplicationNew;
