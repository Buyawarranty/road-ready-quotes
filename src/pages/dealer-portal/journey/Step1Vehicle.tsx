import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMotMileage } from '@/hooks/useMotMileage';

const Step1Vehicle: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { vehicle, setVehicle } = useDealerJourney();
  const { toast } = useToast();

  const [reg, setReg] = useState(vehicle?.reg || '');
  const [make, setMake] = useState(vehicle?.make || '');
  const [model, setModel] = useState(vehicle?.model || '');
  const [year, setYear] = useState(vehicle?.year || '');
  const [fuelType, setFuelType] = useState(vehicle?.fuel_type || '');
  const [transmission, setTransmission] = useState(vehicle?.transmission || '');
  const [mileage, setMileage] = useState(vehicle?.mileage || '');
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupReg, setLookupReg] = useState<string | null>(null); // last reg we looked up
  const lookupTimer = useRef<number | null>(null);

  const { motMileage, isLoading: isMotLoading } = useMotMileage(reg);

  // Auto-fill mileage from MOT when fetched
  useEffect(() => {
    if (motMileage && !mileage) {
      setMileage(String(motMileage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motMileage]);

  // Keep journey context in sync with form so Save & exit always has latest values
  useEffect(() => {
    if (!reg.trim()) return;
    setVehicle({
      reg: reg.trim().toUpperCase(),
      make: make.trim() || undefined,
      model: model.trim() || undefined,
      year: year.trim() || undefined,
      fuel_type: fuelType.trim() || undefined,
      transmission: transmission.trim() || undefined,
      mileage: mileage.trim(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reg, make, model, year, fuelType, transmission, mileage]);

  const performLookup = async (regToLookup: string) => {
    const cleaned = regToLookup.replace(/\s+/g, '').toUpperCase();
    if (!cleaned || cleaned.length < 4 || cleaned === lookupReg) return;
    setLookupReg(cleaned);
    setIsLookingUp(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('dvla-vehicle-lookup', {
        body: { registration: cleaned },
      });
      if (fnError) throw fnError;
      if (!data || !data.make) {
        toast({
          title: 'Vehicle not found',
          description: 'We could not find this registration. Please enter details manually.',
        });
        return;
      }
      setMake(data.make || '');
      setModel(data.model || '');
      setYear(data.yearOfManufacture ? String(data.yearOfManufacture) : '');
      setFuelType(data.fuelType || '');
      setTransmission(data.transmission || '');
    } catch (err: any) {
      console.error('DVLA lookup failed:', err);
      toast({
        title: 'Lookup failed',
        description: 'Please enter the vehicle details manually.',
        variant: 'destructive',
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  // Pre-fill from ?reg= or localStorage and auto-lookup
  useEffect(() => {
    const fromUrl = searchParams.get('reg');
    const fromStorage = localStorage.getItem('dealerPendingReg');
    const initial = fromUrl || fromStorage;
    if (initial && !reg) {
      const upper = initial.toUpperCase();
      setReg(upper);
      localStorage.removeItem('dealerPendingReg');
      performLookup(upper);
    } else if (reg && !make) {
      performLookup(reg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-lookup as user types
  const handleRegChange = (value: string) => {
    const upper = value.toUpperCase();
    setReg(upper);
    if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    const cleaned = upper.replace(/\s+/g, '');
    if (cleaned.length >= 5 && cleaned.length <= 8) {
      lookupTimer.current = window.setTimeout(() => performLookup(upper), 600);
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.trim()) {
      setError('Vehicle registration is required');
      return;
    }
    if (!mileage.trim() || isNaN(Number(mileage))) {
      setError('Enter a valid mileage');
      return;
    }
    setError(null);
    setVehicle({
      reg: reg.trim().toUpperCase(),
      make: make.trim() || undefined,
      model: model.trim() || undefined,
      year: year.trim() || undefined,
      fuel_type: fuelType.trim() || undefined,
      transmission: transmission.trim() || undefined,
      mileage: mileage.trim(),
    });
    navigate('/dealer-portal/quote/customer');
  };

  const inputClass = 'bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-500 focus-visible:ring-orange-500';

  return (
    <DealerJourneyLayout step={1} title="Vehicle details" subtitle="Enter the registration — we'll fetch the rest." backTo="/dealer-portal/dashboard">
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <form onSubmit={handleNext} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Vehicle registration *</label>
              <div className="relative">
                <Input
                  value={reg}
                  onChange={(e) => handleRegChange(e.target.value)}
                  onBlur={() => reg && performLookup(reg)}
                  placeholder="AB12 CDE"
                  required
                  className={`uppercase pr-10 ${inputClass}`}
                  maxLength={10}
                />
                {isLookingUp && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Make, model and year auto-fill from DVLA.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Make</label>
                <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Ford" className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Model</label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Focus" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Year</label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2020" className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Mileage *</label>
                <div className="relative">
                  <Input value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder={isMotLoading ? 'Fetching from MOT…' : 'e.g. 45000'} className={`${inputClass} pr-10`} />
                  {isMotLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />}
                </div>
                {motMileage && <p className="text-xs text-gray-500 mt-1">Auto-filled from latest MOT.</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Fuel type</label>
                <Input value={fuelType} onChange={(e) => setFuelType(e.target.value)} placeholder="e.g. Petrol" className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Transmission</label>
                <Input value={transmission} onChange={(e) => setTransmission(e.target.value)} placeholder="e.g. Manual" className={inputClass} />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="pt-2">
              <Button type="submit" disabled={isLookingUp} className="bg-orange-500 hover:bg-orange-600 text-gray-900 w-full sm:w-auto">
                Continue → Customer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DealerJourneyLayout>
  );
};

export default Step1Vehicle;
