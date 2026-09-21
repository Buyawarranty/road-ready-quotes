import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';

type StepNumber = 1 | 2 | 3 | 4;

const STEPS: { n: StepNumber; label: string }[] = [
  { n: 1, label: 'Contact' },
  { n: 2, label: 'Vehicle' },
  { n: 3, label: 'Fault' },
  { n: 4, label: 'Review' },
];

interface VehicleMatch {
  reg: string;
  make: string | null;
  model: string | null;
  year: number | null;
  customerName: string | null;
  customerId: string | null;
  plan: string | null;
  status: 'active' | 'ineligible';
  reason?: string;
}

interface ClaimFile {
  name: string;
  size: number;
  path: string;
  url: string | null;
}

const MAX_FILES = 10;
const MAX_SIZE = 20 * 1024 * 1024;

const normaliseReg = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const StepDot: React.FC<{ n: StepNumber; label: string; current: StepNumber }> = ({ n, label, current }) => {
  const done = n < current;
  const active = n === current;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
          done
            ? 'bg-crm-orange text-white'
            : active
            ? 'bg-slate-900 text-white ring-4 ring-sky-100'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </div>
      <span className={`text-xs sm:text-sm truncate ${active ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
};

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p className="text-xs text-red-600 mt-1">{message}</p> : null;

const StartClaim: React.FC = () => {
  const navigate = useNavigate();
  const { dealer, user } = useDealerAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<StepNumber>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autosave, setAutosave] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Step 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2
  const [reg, setReg] = useState('');
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'ineligible' | 'error'>('idle');
  const [vehicle, setVehicle] = useState<VehicleMatch | null>(null);
  const [mileage, setMileage] = useState('');

  // Step 3
  const [fault, setFault] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [whenHappens, setWhenHappens] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  const [repairStarted, setRepairStarted] = useState<'yes' | 'no'>('no');
  const [repairDetails, setRepairDetails] = useState('');
  const [driveable, setDriveable] = useState<'yes' | 'no'>('yes');
  const [files, setFiles] = useState<ClaimFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Step 4
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reference, setReference] = useState<string | null>(null);

  // Pre-fill dealer contact
  useEffect(() => {
    if (!dealer) return;
    setName((n) => n || dealer.name || [dealer.first_name, dealer.last_name].filter(Boolean).join(' '));
    setEmail((e) => e || dealer.email || user?.email || '');
    setPhone((p) => p || dealer.phone || '');
  }, [dealer, user]);

  // Restore draft
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('dealerClaimDraft');
      if (!raw) return;
      const d = JSON.parse(raw);
      setReg(d.reg ?? '');
      setMileage(d.mileage ?? '');
      setFault(d.fault ?? '');
      setOccurredOn(d.occurredOn ?? '');
      setWhenHappens(d.whenHappens ?? '');
      setOtherDetails(d.otherDetails ?? '');
      setRepairStarted(d.repairStarted ?? 'no');
      setRepairDetails(d.repairDetails ?? '');
      setDriveable(d.driveable ?? 'yes');
    } catch {
      /* ignore */
    }
  }, []);

  // Autosave draft
  useEffect(() => {
    setAutosave('saving');
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(
          'dealerClaimDraft',
          JSON.stringify({ reg, mileage, fault, occurredOn, whenHappens, otherDetails, repairStarted, repairDetails, driveable }),
        );
      } catch {
        /* ignore */
      }
      setAutosave('saved');
    }, 600);
    return () => window.clearTimeout(t);
  }, [reg, mileage, fault, occurredOn, whenHappens, otherDetails, repairStarted, repairDetails, driveable]);

  const lookupVehicle = useCallback(async () => {
    const normalised = normaliseReg(reg);
    if (!normalised || !dealer?.id) return;
    setLookupState('loading');
    setVehicle(null);
    try {
      const [{ data: warranty }, { data: customer }] = await Promise.all([
        supabase
          .from('dealer_warranties')
          .select('vehicle_reg, customer_name, status, start_date, end_date')
          .eq('dealer_id', dealer.id)
          .ilike('vehicle_reg', `%${normalised}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('dealer_customers')
          .select('id, first_name, last_name, vehicle_make, vehicle_model, vehicle_year, plan_type, registration_plate_normalized')
          .eq('dealer_id', dealer.id)
          .eq('registration_plate_normalized', normalised)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!warranty && !customer) {
        setLookupState('not-found');
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      let status: VehicleMatch['status'] = 'active';
      let reason: string | undefined;
      if (warranty) {
        if (warranty.start_date && warranty.start_date > today) {
          status = 'ineligible';
          reason = 'Cover has not started yet.';
        } else if (warranty.end_date && warranty.end_date < today) {
          status = 'ineligible';
          reason = 'Warranty has expired.';
        } else if (warranty.status && !['active', 'live'].includes(String(warranty.status).toLowerCase())) {
          status = 'ineligible';
          reason = `Warranty status is ${warranty.status}.`;
        }
      }

      setVehicle({
        reg: normalised,
        make: customer?.vehicle_make ?? null,
        model: customer?.vehicle_model ?? null,
        year: customer?.vehicle_year ?? null,
        customerName:
          warranty?.customer_name ?? [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') ?? null,
        customerId: customer?.id ?? null,
        plan: customer?.plan_type ?? 'Fully Covered',
        status,
        reason,
      });
      setLookupState(status === 'active' ? 'found' : 'ineligible');
    } catch {
      setLookupState('error');
    }
  }, [reg, dealer?.id]);

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length || !dealer?.id) return;
    setUploadError('');
    const incoming = Array.from(selected);
    if (files.length + incoming.length > MAX_FILES) {
      setUploadError(`You can upload up to ${MAX_FILES} files.`);
      return;
    }
    setUploading(true);
    const added: ClaimFile[] = [];
    for (const file of incoming) {
      if (file.size > MAX_SIZE) {
        setUploadError(`${file.name} is larger than 20MB.`);
        continue;
      }
      const path = `${dealer.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const { error } = await supabase.storage.from('dealer-admin-claims').upload(path, file);
      if (error) {
        setUploadError("This file couldn't be uploaded. Please try again.");
        continue;
      }
      const { data: signed } = await supabase.storage.from('dealer-admin-claims').createSignedUrl(path, 60 * 60 * 24 * 7);
      added.push({ name: file.name, size: file.size, path, url: signed?.signedUrl ?? null });
    }
    setFiles((f) => [...f, ...added]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = async (path: string) => {
    await supabase.storage.from('dealer-admin-claims').remove([path]);
    setFiles((f) => f.filter((x) => x.path !== path));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Enter a contact name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address.';
    if (phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid phone number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (lookupState !== 'found' || !vehicle) e.reg = "We couldn't find an active warranty for this registration.";
    if (!mileage.trim()) e.mileage = 'Enter the current mileage.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!fault.trim()) e.fault = "Tell us what's wrong with the vehicle.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setErrors({});
    setStep((s) => (s < 4 ? ((s + 1) as StepNumber) : s));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (step === 1) {
      navigate('/dealer-portal/claims');
      return;
    }
    setErrors({});
    setStep((s) => ((s - 1) as StepNumber));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitClaim = async () => {
    if (!declared || submitting || !dealer?.id || !vehicle) return;
    setSubmitting(true);
    setSubmitError('');
    const ref = `CLM-${Math.floor(10000 + Math.random() * 89999)}`;
    const description = [
      fault.trim(),
      occurredOn ? `When it occurred: ${occurredOn}` : '',
      whenHappens.trim() ? `When it happens: ${whenHappens.trim()}` : '',
      otherDetails.trim() ? `Other details: ${otherDetails.trim()}` : '',
      `Repair work started: ${repairStarted === 'yes' ? `Yes — ${repairDetails.trim() || 'no details given'}` : 'No'}`,
      `Vehicle driveable: ${driveable === 'yes' ? 'Yes' : 'No'}`,
      `Current mileage: ${mileage} miles`,
    ]
      .filter(Boolean)
      .join('\n');

    const { error } = await supabase.from('dealer_admin_claims').insert({
      dealer_id: dealer.id,
      customer_id: vehicle.customerId,
      claim_reference: ref,
      customer_name: vehicle.customerName || name,
      customer_email: email.trim(),
      customer_phone: phone.trim(),
      registration_plate: vehicle.reg,
      vehicle_make: vehicle.make,
      vehicle_model: vehicle.model,
      fault_description: description,
      status: 'submitted',
      attachments: files.map((f) => ({ name: f.name, size: f.size, path: f.path, url: f.url })),
    });

    setSubmitting(false);
    if (error) {
      setSubmitError('Something went wrong while submitting the claim. Your information has been saved. Please try again.');
      return;
    }
    sessionStorage.removeItem('dealerClaimDraft');
    setReference(ref);
  };

  const vehicleLine = useMemo(() => {
    if (!vehicle) return '';
    const parts = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
    return `${vehicle.reg}${parts ? ` · ${parts}` : ''}`;
  }, [vehicle]);

  return (
    <DealerLayout>
      <div className="mx-auto w-full max-w-4xl space-y-5">
        {/* Intro */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wider text-crm-orange">CLAIMS</p>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Start a claim</h1>
            <p className="text-sm text-gray-600 mt-1">Submit a warranty claim for one of your customers.</p>
            <p className="text-xs text-gray-400">Takes about 3 minutes.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dealer-portal/claims')} className="w-full sm:w-auto">
            View existing claims
          </Button>
        </div>

        {/* Availability */}
        <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
          <CalendarClock className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
          <div className="text-sm text-sky-900">
            <p className="font-semibold">Claims team hours: Monday–Friday, 9am–5pm.</p>
            <p className="text-xs text-sky-700">Submissions outside these hours will be reviewed on the next working day.</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.n}>
                <StepDot n={s.n} label={s.label} current={step} />
                {i < STEPS.length - 1 && (
                  <div className={`hidden sm:block flex-1 h-px ${s.n < step ? 'bg-crm-orange' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Contact details</h2>
              <p className="text-sm text-gray-500">We'll use these details if we need anything else.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="claim-name">Name *</Label>
                <Input id="claim-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kamran Qureshi" />
                <FieldError message={errors.name} />
              </div>
              <div>
                <Label htmlFor="claim-email">Email *</Label>
                <Input id="claim-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@buyawarranty.co.uk" />
                <FieldError message={errors.email} />
              </div>
              <div>
                <Label htmlFor="claim-phone">Phone *</Label>
                <Input id="claim-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07960111131" />
                <FieldError message={errors.phone} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Vehicle details</h2>
              <p className="text-sm text-gray-500">We'll look up the vehicle and warranty automatically using the registration.</p>
            </div>
            <div>
              <Label htmlFor="claim-reg">Vehicle registration *</Label>
              <div className="flex gap-2">
                <Input
                  id="claim-reg"
                  value={reg}
                  onChange={(e) => {
                    setReg(e.target.value.toUpperCase());
                    setLookupState('idle');
                    setVehicle(null);
                  }}
                  onBlur={() => reg.trim() && lookupState === 'idle' && lookupVehicle()}
                  placeholder="B11CSD"
                  className="uppercase"
                />
                <Button type="button" variant="outline" onClick={lookupVehicle} disabled={!reg.trim() || lookupState === 'loading'}>
                  {lookupState === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look up'}
                </Button>
              </div>
              <FieldError message={errors.reg} />
            </div>

            {lookupState === 'loading' && (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Looking up vehicle...
              </p>
            )}

            {lookupState === 'found' && vehicle && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicle.reg}
                  {vehicle.year ? ` (${vehicle.year})` : ''} · ready to claim
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-green-900">
                  <p><span className="text-green-700">Warranty:</span> {vehicle.plan || 'Fully Covered'}</p>
                  <p><span className="text-green-700">Customer:</span> {vehicle.customerName || '—'}</p>
                  <p><span className="text-green-700">Cover status:</span> Active</p>
                </div>
              </div>
            )}

            {lookupState === 'ineligible' && vehicle && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">This warranty isn't currently eligible for a claim.</p>
                <p className="text-xs mt-1">{vehicle.reason}</p>
              </div>
            )}

            {(lookupState === 'not-found' || lookupState === 'error') && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-semibold">We couldn't find an active warranty for this registration.</p>
                <p className="text-xs mt-1">Check the registration and try again.</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={lookupVehicle}>Try again</Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="mailto:hello@pandaprotect.co.uk">Contact support</a>
                  </Button>
                </div>
              </div>
            )}

            {lookupState === 'found' && (
              <div>
                <Label htmlFor="claim-mileage">Current mileage *</Label>
                <div className="relative">
                  <Input
                    id="claim-mileage"
                    inputMode="numeric"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value.replace(/[^\d,]/g, ''))}
                    placeholder="22,222"
                    className="pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">miles</span>
                </div>
                <FieldError message={errors.mileage} />
              </div>
            )}
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Describe the fault</h2>
                <p className="text-sm text-gray-500">Help our team understand what's happening with the vehicle.</p>
              </div>
              <div>
                <Label htmlFor="claim-fault">Describe the fault / problem *</Label>
                <Textarea
                  id="claim-fault"
                  rows={4}
                  value={fault}
                  onChange={(e) => setFault(e.target.value)}
                  placeholder="Please explain what's wrong with the vehicle, for example unusual engine noise, gearbox slipping or warning lights on the dashboard."
                />
                <FieldError message={errors.fault} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="claim-date">When did the fault occur?</Label>
                  <Input id="claim-date" type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="claim-when">When does the issue happen?</Label>
                  <Textarea
                    id="claim-when"
                    rows={2}
                    value={whenHappens}
                    onChange={(e) => setWhenHappens(e.target.value)}
                    placeholder="For example: on start-up, when braking, after driving for 10 minutes, only when cold..."
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="claim-other">Any other relevant details</Label>
                <Textarea
                  id="claim-other"
                  rows={2}
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                  placeholder="Garage diagnosis, recent repairs, anything else we should know..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Has any repair work already started?</p>
                  <div className="flex gap-2">
                    {(['no', 'yes'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setRepairStarted(v)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          repairStarted === v ? 'bg-crm-orange text-white border-crm-orange' : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {v === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Is the vehicle currently driveable?</p>
                  <div className="flex gap-2">
                    {(['yes', 'no'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDriveable(v)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          driveable === v ? 'bg-crm-orange text-white border-crm-orange' : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {v === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {repairStarted === 'yes' && (
                <div>
                  <Label htmlFor="claim-repair">Tell us briefly what work has already been carried out.</Label>
                  <Textarea id="claim-repair" rows={2} value={repairDetails} onChange={(e) => setRepairDetails(e.target.value)} />
                </div>
              )}
            </div>

            {/* Uploads */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Supporting documents</h2>
                <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">Optional</span>
              </div>
              <p className="text-sm text-gray-500">Upload anything that may help our claims team review the issue.</p>
              <p className="text-xs text-gray-400">Diagnostic reports, garage estimates, photographs or service documents.</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-center hover:border-crm-orange transition-colors"
              >
                {uploading ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-crm-orange" />
                ) : (
                  <Upload className="mx-auto h-5 w-5 text-crm-orange" />
                )}
                <p className="mt-2 text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400">PDF, DOC, DOCX, JPG, PNG or HEIC · up to 10 files · max 20MB each</p>
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <FieldError message={uploadError} />
              {files.map((f) => (
                <div key={f.path} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{f.name}</p>
                      <p className="text-xs text-gray-400">{formatSize(f.size)} · Uploaded</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {f.url && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={f.url} target="_blank" rel="noreferrer">View</a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeFile(f.path)}>
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Review &amp; submit</h2>
              <p className="text-sm text-gray-500">Please double-check the details before submitting.</p>
            </div>

            {[
              {
                title: 'Contact details',
                onEdit: () => setStep(1),
                rows: [
                  ['Name', name],
                  ['Email', email],
                  ['Phone', phone],
                ],
              },
              {
                title: 'Vehicle details',
                onEdit: () => setStep(2),
                rows: [
                  ['Vehicle', vehicleLine],
                  ['Mileage', `${mileage} miles`],
                  ['Warranty', vehicle?.plan || 'Fully Covered'],
                ],
              },
              {
                title: 'Fault details',
                onEdit: () => setStep(3),
                rows: [
                  ['Fault description', fault],
                  ['When it occurred', occurredOn || '—'],
                  ['When it happens', whenHappens || '—'],
                  ['Other details', otherDetails || '—'],
                  ['Repair work started', repairStarted === 'yes' ? 'Yes' : 'No'],
                  ['Vehicle driveable', driveable === 'yes' ? 'Yes' : 'No'],
                  ['Attachments', `${files.length} file${files.length === 1 ? '' : 's'}`],
                ],
              },
            ].map((group) => (
              <div key={group.title} className="rounded-lg border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                  <p className="text-sm font-semibold text-gray-900">{group.title}</p>
                  <button type="button" onClick={group.onEdit} className="flex items-center gap-1 text-xs font-medium text-crm-orange">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
                <dl className="divide-y divide-gray-50">
                  {group.rows.map(([label, value]) => (
                    <div key={label} className="flex gap-4 px-4 py-2">
                      <dt className="w-40 shrink-0 text-xs text-gray-500">{label}</dt>
                      <dd className="text-sm text-gray-900 break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}

            <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-crm-orange mt-0.5 shrink-0" />
              <p className="text-sm text-orange-900">
                Do not begin repair work until the claim has been reviewed and authorised, unless advised otherwise by our claims team.
              </p>
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-700">
              <Checkbox checked={declared} onCheckedChange={(v) => setDeclared(v === true)} className="mt-0.5" />
              <span>I confirm the information provided is accurate and that I am authorised to submit this claim.</span>
            </label>

            {submitError && (
              <p className="flex items-start gap-2 text-sm text-red-600">
                <Info className="h-4 w-4 mt-0.5 shrink-0" /> {submitError}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-6">
          <Button variant="ghost" onClick={goBack} className="text-gray-600">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-3 sm:justify-end">
            <span className="hidden sm:inline text-xs text-gray-400">
              {autosave === 'saving' ? 'Saving...' : autosave === 'saved' ? 'Saved' : ''}
            </span>
            {step < 4 ? (
              <Button onClick={goNext} className="w-full sm:w-auto bg-crm-orange hover:bg-crm-orange/90 text-white">
                {step === 3 ? 'Review claim' : 'Continue'} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={submitClaim}
                disabled={!declared || submitting}
                className="w-full sm:w-auto bg-crm-orange hover:bg-crm-orange/90 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit claim <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Success */}
      <Dialog open={!!reference} onOpenChange={() => undefined}>
        <DialogContent className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Claim submitted</h2>
          <p className="text-sm text-gray-600">
            Thank you. Our claims team will review your claim during working hours: Monday to Friday, 9am–5pm.
          </p>
          <p className="text-sm text-gray-600">We'll contact you if we need anything further.</p>
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <span className="text-gray-500">Reference: </span>
            <span className="font-bold text-gray-900">{reference}</span>
          </div>
          <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white" onClick={() => navigate('/dealer-portal/claims')}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </DealerLayout>
  );
};

export default StartClaim;
