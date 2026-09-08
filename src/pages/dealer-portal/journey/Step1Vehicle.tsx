import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CarFront, Gauge, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMotMileage } from '@/hooks/useMotMileage';

const formatMotDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

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
  const [colour, setColour] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupReg, setLookupReg] = useState<string | null>(null); // last reg we looked up
  const [dvlaMotMileage, setDvlaMotMileage] = useState<number | null>(null);
  const [dvlaMotDate, setDvlaMotDate] = useState<string | null>(null);
  const lookupTimer = useRef<number | null>(null);

  const { motMileage: cachedMotMileage, motDate: cachedMotDate, source: motSource, isLoading: isMotLoading } =
    useMotMileage(reg);

  // Prefer the reading returned with the DVLA/DVSA lookup, fall back to the MOT history record
  const motMileage = dvlaMotMileage ?? cachedMotMileage;
  const motDate = dvlaMotMileage != null ? dvlaMotDate : cachedMotDate;

  // Auto-fill mileage from MOT when fetched
  useEffect(() => {
    if (motMileage && !mileage) {
      setMileage(String(motMileage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motMileage]);

  const recognised = Boolean(make || model);
  const enteredMileage = Number(mileage);
  const mileageBelowMot =
    motMileage != null && mileage.trim() !== '' && !isNaN(enteredMileage) && enteredMileage < motMileage;
  const motDateLabel = formatMotDate(motDate);


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
    setNotFound(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('dvla-vehicle-lookup', {
        body: { registrationNumber: cleaned, skipAgeCheck: true },
      });
      if (fnError) throw fnError;
      if (!data || (!data.make && !data.found)) {
        setNotFound(true);
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
      setColour(data.colour || data.primaryColour || '');

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
              <p className="text-xs text-gray-500 mt-1">
                {isLookingUp ? 'Looking up with DVLA…' : 'Make, model and year auto-fill from DVLA.'}
              </p>
            </div>

            {/* Vehicle recognition panel */}
            {recognised && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <CarFront className="h-5 w-5 text-green-700 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-green-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Vehicle recognised
                    </p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">
                      {[make, model].filter(Boolean).join(' ')}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-700">
                      {year && <span>{year}</span>}
                      {fuelType && <span>{fuelType}</span>}
                      {transmission && <span>{transmission}</span>}
                      {colour && <span>{colour}</span>}
                      {year && !isNaN(Number(year)) && (
                        <span>{Math.max(0, new Date().getFullYear() - Number(year))} years old</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Last recorded mileage */}
                <div className="mt-3 pt-3 border-t border-green-200 flex items-start gap-2 text-sm">
                  <Gauge className="h-4 w-4 text-green-700 mt-0.5 flex-shrink-0" />
                  {isMotLoading ? (
                    <span className="text-gray-600">Checking the DVSA MOT record…</span>
                  ) : motMileage ? (
                    <span className="text-gray-800">
                      <span className="font-semibold">{motMileage.toLocaleString()} miles</span> recorded at MOT
                      {motDateLabel ? ` on ${motDateLabel}` : ''}.
                    </span>
                  ) : (
                    <span className="text-gray-600">No MOT mileage on record — please enter it below.</span>
                  )}
                </div>
              </div>
            )}

            {notFound && !recognised && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>We couldn't find that registration — you can still enter the details manually.</span>
              </div>
            )}

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
                {motMileage != null && (
                  <div className="mt-1 space-y-1">
                    {String(motMileage) !== mileage.trim() && (
                      <button
                        type="button"
                        onClick={() => setMileage(String(motMileage))}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline"
                      >
                        Use last recorded mileage ({motMileage.toLocaleString()})
                      </button>
                    )}
                    {String(motMileage) === mileage.trim() && (
                      <p className="text-xs text-gray-500">
                        Auto-filled from the {motSource === 'live' ? 'latest DVSA MOT' : 'latest MOT'} record.
                      </p>
                    )}
                    {mileageBelowMot && (
                      <p className="text-xs text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Lower than the last MOT reading of{' '}
                        {motMileage.toLocaleString()} miles — please double-check.
                      </p>
                    )}
                  </div>
                )}

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
