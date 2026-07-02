import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Check, TrendingUp, ShieldCheck, FileText, Headphones, Sparkles,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import DealerPublicFooter from '@/components/dealer/DealerPublicFooter';
import DealerFAQSection from '@/components/dealer/DealerFAQSection';
import DealerFAQSchema from '@/components/dealer/DealerFAQSchema';
import qashqaiHero from '@/assets/nissan-qashqai-warranty-cover.png';
import vwId3 from '@/assets/vw-id3-warranty.webp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// UK phone — accepts 07xxxxxxxxx, 01/02/03 landlines, +44, spaces/dashes
const UK_PHONE_RE = /^(\+?44\s?|0)\d{2,5}[\s-]?\d{3,4}[\s-]?\d{3,4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/|www\.)[^\s]+\.[^\s]+/i;

const isValidUKPhone = (v: string) => {
  const digits = v.replace(/\D/g, '');
  if (!UK_PHONE_RE.test(v.trim().replace(/\s+/g, ' '))) return false;
  // 07xxxxxxxxx (11 digits) or 01/02/03 landline (11 digits) or +44 (12 digits)
  return digits.length >= 10 && digits.length <= 13;
};

const initialForm = {
  dealership_name: '',
  contact_name: '',
  email_address: '',
  phone_number: '',
  heard_about_us: '',
  additional_information: '',
};

const PLAN_LABELS: Record<string, string> = {
  'full-warranty': 'Full Warranty',
  'claims-handling': 'Claims Handling',
};

const DealerComingSoon = () => {
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan')?.trim().toLowerCase() || '';
  const initialInterestedIn = PLAN_LABELS[selectedPlan] ? selectedPlan : '';
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; phone?: string; url?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; phone?: boolean; url?: boolean }>({});
  const formRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof typeof initialForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const emailValid = EMAIL_RE.test(form.email_address.trim());
  const phoneValid = isValidUKPhone(form.phone_number);
  const urlValid = URL_RE.test(form.heard_about_us.trim());

  const scrollFormIntoView = () => {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!emailValid) e.email = 'Please enter a valid email address.';
    if (!phoneValid) e.phone = 'Please enter a valid UK phone number.';
    if (!urlValid) e.url = 'Please paste a valid website or listing URL.';
    setErrors(e);
    setTouched({ email: true, phone: true, url: true });
    if (Object.keys(e).length > 0) scrollFormIntoView();
    return Object.keys(e).length === 0;
  };


  const submitViaDatabaseFallback = async (payload: any) => {
    const { data, error } = await supabase
      .from('trade_warranty_signups')
      .insert(payload)
      .select('id, created_at')
      .single();
    if (error) throw error;
    supabase.functions.invoke('notify-dealer-waitlist', {
      body: { ...payload, id: data?.id, created_at: data?.created_at },
    }).catch((err) => console.error('notify-dealer-waitlist failed', err));
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        dealership_name: form.dealership_name.trim() || null,
        contact_name: form.contact_name.trim() || null,
        email_address: form.email_address.trim(),
        phone_number: form.phone_number.trim(),
        monthly_vehicle_sales: null,
        current_warranty_provider: null,
        interested_in: initialInterestedIn || null,
        heard_about_us: form.heard_about_us.trim() || null,
        additional_information: form.additional_information.trim() || null,
      };

      const response = await supabase.functions.invoke('submit-trade-warranty-signup', { body: payload });
      if (response.error) {
        const message = response.error.message || 'Failed to submit';
        const shouldFallback = /edge function|failed to send|failed to fetch|network/i.test(message);
        if (shouldFallback) await submitViaDatabaseFallback(payload);
        else throw new Error(message);
      }

      setSubmitted(true);
      setForm(initialForm);
      scrollFormIntoView();
      toast.success('Thank you — a member of our team will be in touch shortly.');

    } catch (err: any) {
      const message = err?.message || 'Something went wrong. Please try again.';
      const shouldFallback = /edge function|failed to send|failed to fetch|network/i.test(message);
      if (shouldFallback) {
        try {
          await submitViaDatabaseFallback({
            dealership_name: form.dealership_name.trim() || null,
            contact_name: form.contact_name.trim() || null,
            email_address: form.email_address.trim(),
            phone_number: form.phone_number.trim(),
            monthly_vehicle_sales: null,
            current_warranty_provider: null,
            interested_in: initialInterestedIn || null,
            heard_about_us: form.heard_about_us.trim() || null,
            additional_information: form.additional_information.trim() || null,
          });
          setSubmitted(true);
          setForm(initialForm);
          scrollFormIntoView();
          toast.success('Thank you — a member of our team will be in touch shortly.');

          return;
        } catch (e: any) {
          toast.error(e?.message || message);
          return;
        }
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Register Your Interest – Trade Warranty | Panda Protect</title>
        <meta name="description" content="Offer trade warranties to your customers without the paperwork. Register for early dealer access to Panda Protect — UK motor trade warranty for cars, vans, EVs and motorcycles." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <DealerPublicHeader />

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-14 items-start">
            {/* Left */}
            <div>
              <span className="inline-block text-[11px] font-bold tracking-[0.18em] text-[#eb4b00] bg-[#eb4b00]/10 px-2.5 py-1 rounded uppercase mb-5">
                Early dealer access now open
              </span>
              <h1 className="text-[2rem] sm:text-5xl lg:text-[3.25rem] font-black leading-[1.1] tracking-tight text-slate-900">
                Offer Trade Warranties{' '}
                <span className="text-[#eb4b00]">Without the Paperwork</span>
              </h1>
              <p className="text-slate-600 mt-4 sm:mt-5 text-base sm:text-lg leading-relaxed max-w-xl">
                Add extra profit to every sale and give your customers the confidence of flexible warranty cover. Panda Protect handles claims, documents and support.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={scrollToForm}
                  className="animate-breathing inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-6 py-3.5 rounded-lg text-base"
                  style={{ minHeight: 52 }}
                >
                  Register My Interest <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" /> No obligation</li>
                <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" /> Takes less than 30 seconds</li>
                <li className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" /> UK dealer support</li>
              </ul>

              <div className="mt-8 max-w-[220px] sm:max-w-[270px] mx-auto lg:mx-0">
                <img src={qashqaiHero} alt="Nissan Qashqai under trade warranty cover" className="w-full h-auto" />
              </div>
            </div>

            {/* Right — Form */}
            <div ref={formRef} className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-8">
              {submitted ? (
                <div className="text-center space-y-3 py-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center">
                    <Check className="w-9 h-9" strokeWidth={3} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">Thank you — form received.</h3>
                  <p className="text-slate-600">Once we go live, a member of our team will be in touch with you shortly.</p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="text-sm font-semibold text-[#eb4b00] hover:underline mt-2"
                  >
                    Submit another response
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900">Request dealer access</h2>
                  <p className="text-sm text-slate-500 mt-1">Five quick details — no obligation.</p>

                  <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                    <Field label="Dealership name">
                      <input
                        type="text"
                        value={form.dealership_name}
                        onChange={(e) => set('dealership_name', e.target.value)}
                        placeholder="Enter dealership name"
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Contact name">
                      <input
                        type="text"
                        value={form.contact_name}
                        onChange={(e) => set('contact_name', e.target.value)}
                        placeholder="Enter your full name"
                        className={inputCls}
                      />
                    </Field>

                    <Field
                      label="Email address"
                      required
                      error={touched.email ? errors.email : undefined}
                      valid={emailValid}
                    >
                      <input
                        type="text"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={form.email_address}
                        onChange={(e) => set('email_address', e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                        placeholder="you@dealership.co.uk"
                        className={`${inputCls} pr-12 ${touched.email && errors.email ? 'border-rose-500' : ''}`}
                      />
                    </Field>

                    <Field
                      label="Phone number"
                      required
                      error={touched.phone ? errors.phone : undefined}
                      valid={phoneValid}
                    >
                      <input
                        type="text"
                        inputMode="tel"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={form.phone_number}
                        onChange={(e) => set('phone_number', e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                        placeholder="07700 900000"
                        className={`${inputCls} pr-12 ${touched.phone && errors.phone ? 'border-rose-500' : ''}`}
                      />
                    </Field>

                    <Field
                      label="Where do you sell vehicles?"
                      required
                      hint="(Website or listing URL)"
                      error={touched.url ? errors.url : undefined}
                      valid={urlValid}
                    >
                      <input
                        type="text"
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={form.heard_about_us}
                        onChange={(e) => set('heard_about_us', e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, url: true }))}
                        placeholder="https://www.autotrader.co.uk/dealers/..."
                        className={`${inputCls} pr-12 ${touched.url && errors.url ? 'border-rose-500' : ''}`}
                      />
                    </Field>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="animate-breathing w-full inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] disabled:opacity-60 text-white font-bold px-5 py-3.5 rounded-lg text-base"
                      style={{ minHeight: 52 }}
                    >
                      {submitting ? 'Submitting…' : (<>Register My Interest <ArrowRight className="w-5 h-5" /></>)}
                    </button>


                    <p className="text-center text-xs text-slate-500">
                      We'll only contact you about Trade Warranty.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">How it works</h2>
            <p className="text-slate-600 mt-3">Three simple steps to start offering trade warranties.</p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-8">
            {/* dashed connector (desktop) */}
            <div className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] border-t-2 border-dashed border-slate-300 -z-0" />
            {[
              { n: 1, t: 'Register interest', d: 'Tell us a few details about your dealership.' },
              { n: 2, t: 'Our team contacts you', d: "We'll be in touch to confirm your needs." },
              { n: 3, t: 'Get early access', d: 'Be first to offer Trade Warranty to your customers.' },
            ].map((s) => (
              <div key={s.n} className="relative text-center">
                <div className="w-14 h-14 rounded-full bg-[#eb4b00] text-white text-xl font-black flex items-center justify-center mx-auto relative z-10 shadow-md">
                  {s.n}
                </div>
                <h3 className="font-bold text-slate-900 mt-5">{s.t}</h3>
                <p className="text-sm text-slate-600 mt-2 max-w-xs mx-auto">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY DEALERS CHOOSE */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Why dealers choose Panda Protect</h2>
            <ul className="mt-7 space-y-4">
              {[
                'High profit warranty products with flexible options',
                'Quick and simple dealer onboarding',
                'Claims handled by our UK-based support team',
                'Digital documents and instant policy issuance',
                'Marketing support to help you sell more',
              ].map((b) => (
                <li key={b} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </span>
                  <span className="text-slate-700">{b}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={scrollToForm}
              className="mt-8 inline-flex items-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-6 py-3 rounded-lg"
            >
              Register My Interest <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-center">
            <img src={vwId3} alt="Volkswagen ID.3 trade warranty cover" className="w-full max-w-md h-auto" />
          </div>
        </div>
      </section>

      {/* BENEFIT CARDS */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          {[
            { icon: TrendingUp, t: 'Increase profit per vehicle', d: 'Earn more on every eligible sale with high-margin warranty products.' },
            { icon: FileText, t: 'No claims admin', d: 'We handle claims, documents and customer support for you.' },
            { icon: ShieldCheck, t: 'Flexible cover options', d: 'Car, van, EV and motorcycle warranty options to suit your customers.' },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-orange-100 text-[#eb4b00] flex items-center justify-center mb-4">
                <b.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900">{b.t}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <DealerFAQSection
        bgClassName="bg-slate-50"
        intro="Quick answers for UK motor trade dealers about our partner programme, portal, claims and support."
      />
      <DealerFAQSchema />

      <DealerPublicFooter />
    </div>
  );
};

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm bg-white text-slate-900 placeholder:text-slate-400';

const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  valid?: boolean;
  children: React.ReactNode;
}> = ({ label, required, hint, error, valid, children }) => (
  <label className="block">
    <div className="flex items-center gap-1 mb-1.5">
      <span className="text-sm font-semibold text-slate-800">
        {label}{required && <span className="text-[#eb4b00] ml-0.5">*</span>}
      </span>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
    <div className="relative">
      {children}
      {valid && !error && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 pointer-events-none">
          <Check className="w-5 h-5" strokeWidth={3} />
        </span>
      )}
    </div>
    {error && (
      <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>
    )}
  </label>
);

export default DealerComingSoon;
