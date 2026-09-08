import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertTriangle, CarFront } from 'lucide-react';

const DealerCreateQuote = () => {
  const { dealer } = useDealerAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupNotice, setLookupNotice] = useState<string | null>(null);
  const [recognised, setRecognised] = useState<{ year?: string; fuel?: string; colour?: string } | null>(null);
  const [motInfo, setMotInfo] = useState<{ mileage: number; date: string | null } | null>(null);
  const lastLookedUp = useRef<string | null>(null);
  const lookupTimer = useRef<number | null>(null);
  const [form, setForm] = useState({
    customer_name: '',
    vehicle_reg: '',
    vehicle_make: '',
    vehicle_model: '',
    mileage: '',
    warranty_duration: '',
    plan_type: '',
    price: '',
  });

  const performLookup = async (regRaw: string) => {
    const cleaned = regRaw.replace(/\s+/g, '').toUpperCase();
    if (!cleaned || cleaned.length < 5 || cleaned === lastLookedUp.current) return;
    lastLookedUp.current = cleaned;
    setIsLookingUp(true);
    setLookupNotice(null);
    setRecognised(null);
    setMotInfo(null);
    try {
      const { data, error } = await supabase.functions.invoke('dvla-vehicle-lookup', {
        body: { registrationNumber: cleaned, skipAgeCheck: true },
      });
      if (error) throw error;
      const isPlaceholder = /premium vehicle/i.test(String(data?.make || ''));
      if (!data || (!data.make && !data.found) || isPlaceholder) {
        setLookupNotice("We couldn't find that registration — you can still enter the details manually.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        vehicle_make: data.make || prev.vehicle_make,
        vehicle_model: data.model || prev.vehicle_model,
        mileage: prev.mileage || (data.motMileage ? String(data.motMileage) : prev.mileage),
      }));
      setRecognised({
        year: data.yearOfManufacture ? String(data.yearOfManufacture) : undefined,
        fuel: data.fuelType || undefined,
        colour: data.colour || undefined,
      });
      if (data.motMileage && Number(data.motMileage) > 0) {
        setMotInfo({ mileage: Number(data.motMileage), date: data.motMileageDate || null });
      }
      if (data.blocked && data.blockReason) setLookupNotice(data.blockReason);
    } catch (err) {
      console.error('DVLA lookup failed:', err);
      setLookupNotice('Lookup failed — please enter the vehicle details manually.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleRegChange = (value: string) => {
    const upper = value.toUpperCase();
    setForm((prev) => ({ ...prev, vehicle_reg: upper }));
    if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    const cleaned = upper.replace(/\s+/g, '');
    if (cleaned.length >= 5 && cleaned.length <= 8) {
      lookupTimer.current = window.setTimeout(() => performLookup(upper), 600);
    }
  };

  // Pre-fill reg from hero handoff (?reg= or localStorage)
  useEffect(() => {
    const regParam = searchParams.get('reg') || localStorage.getItem('dealerPendingReg');
    if (regParam) {
      setForm((prev) => ({ ...prev, vehicle_reg: regParam.toUpperCase() }));
      localStorage.removeItem('dealerPendingReg');
      performLookup(regParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const motDateLabel = motInfo?.date
    ? new Date(motInfo.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealer?.id) {
      toast({ title: 'Your dealer profile could not be loaded', description: 'Please sign in again and retry.', variant: 'destructive' });
      return;
    }
    if (!form.customer_name || !form.vehicle_reg || !form.warranty_duration || !form.plan_type) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('dealer_quotes').insert({
        dealer_id: dealer.id,
        customer_name: form.customer_name,
        vehicle_reg: form.vehicle_reg.toUpperCase(),
        vehicle_make: form.vehicle_make || null,
        vehicle_model: form.vehicle_model || null,
        mileage: form.mileage || null,
        warranty_duration: form.warranty_duration,
        plan_type: form.plan_type,
        price: form.price ? parseFloat(form.price) : null,
        status: 'pending',
      });

      if (error) throw error;
      toast({ title: 'Quote created successfully!' });
      navigate('/dealer-portal/quotes');
    } catch (error: any) {
      toast({ title: 'Failed to create quote', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const inputClass = "bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-500";

  return (
    <DealerLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Quote</h1>
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Vehicle & Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Customer Name *</label>
                <Input value={form.customer_name} onChange={(e) => update('customer_name', e.target.value)} placeholder="Customer full name" required className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Vehicle Registration *</label>
                <Input value={form.vehicle_reg} onChange={(e) => update('vehicle_reg', e.target.value)} placeholder="AB12 CDE" required className={`uppercase ${inputClass}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Make</label>
                  <Input value={form.vehicle_make} onChange={(e) => update('vehicle_make', e.target.value)} placeholder="e.g. Ford" className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Model</label>
                  <Input value={form.vehicle_model} onChange={(e) => update('vehicle_model', e.target.value)} placeholder="e.g. Focus" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mileage</label>
                <Input value={form.mileage} onChange={(e) => update('mileage', e.target.value)} placeholder="e.g. 45000" className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Warranty Duration *</label>
                <Select value={form.warranty_duration} onValueChange={(v) => update('warranty_duration', v)}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Select duration" /></SelectTrigger>
                  <SelectContent className="bg-gray-100 border-gray-300">
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">12 Months</SelectItem>
                    <SelectItem value="24">24 Months</SelectItem>
                    <SelectItem value="36">36 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Plan Type *</label>
                <Select value={form.plan_type} onValueChange={(v) => update('plan_type', v)}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent className="bg-gray-100 border-gray-300">
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Price (£)</label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => update('price', e.target.value)} placeholder="e.g. 299.99" className={inputClass} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-gray-900" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Quote'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/dealer-portal/quotes')} className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DealerLayout>
  );
};

export default DealerCreateQuote;
