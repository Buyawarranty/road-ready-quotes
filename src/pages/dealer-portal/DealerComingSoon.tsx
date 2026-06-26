import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, TrendingUp, ShieldCheck, Car, AlertCircle,
  Phone,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import DealerFAQSection from '@/components/dealer/DealerFAQSection';
import DealerFAQSchema from '@/components/dealer/DealerFAQSchema';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Forgiving UK phone validator: strip non-digits, allow optional +44/0 prefix.
const isValidUKPhone = (raw: string): boolean => {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  // Accept +44... or 0...
  if (!/^(\+?44|0)\d{9,11}$/.test(cleaned)) return false;
  const digits = cleaned.replace(/^\+?44/, '0').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
};

const heroBenefits = [
  { icon: TrendingUp, title: 'Increase profit per vehicle', text: 'Add warranty revenue to every eligible sale.' },
  { icon: ShieldCheck, title: 'No claims admin', text: 'Panda Protect handles claims and customer support.' },
  { icon: Car, title: 'Flexible cover options', text: 'Cars, vans, EVs and motorcycles — dealer or customer paid.' },
];

const initialForm = {
  dealership_name: '',
  contact_name: '',
  email_address: '',
  phone_number: '',
  monthly_vehicle_sales: '',
};

type FormKey = keyof typeof initialForm;
type Errors = Partial<Record<FormKey, string>>;

const getFieldErrorFor = (form: typeof initialForm, key: FormKey): string | undefined => {
  const v = form[key].trim();
  switch (key) {
    case 'dealership_name':
      if (!v) return 'Dealership name is required.';
      if (v.length < 2) return 'Please enter your dealership name.';
      return;
    case 'contact_name':
      if (!v) return 'Contact name is required.';
      if (v.length < 2) return 'Please enter your full name.';
      return;
    case 'email_address':
      if (!v) return 'Email address is required.';
      if (!EMAIL_RE.test(v)) return 'Please enter a valid email address.';
      return;
    case 'phone_number':
      if (!v) return 'Phone number is required.';
      if (!isValidUKPhone(v)) return 'Please enter a valid UK phone number.';
      return;
    case 'monthly_vehicle_sales':
      if (!v) return 'Please select your monthly vehicle sales.';
      return;
  }
};

const isFieldValid = (form: typeof initialForm, key: FormKey): boolean =>
  !getFieldErrorFor(form, key);

const blankBoolMap = (): Record<FormKey, boolean> => ({
  dealership_name: false, contact_name: false, email_address: false,
  phone_number: false, monthly_vehicle_sales: false,
});

const DealerComingSoon = () => {
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState<Record<FormKey, boolean>>(blankBoolMap);
  const [blurValidity, setBlurValidity] = useState<Record<FormKey, boolean>>(blankBoolMap);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const set = (k: FormKey, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const handleBlur = (k: FormKey) => {
    setTouched((t) => ({ ...t, [k]: true }));
    setBlurValidity((b) => ({ ...b, [k]: isFieldValid(form, k) }));
    setErrors((e) => ({ ...e, [k]: getFieldErrorFor(form, k) }));
  };

  const validate = useCallback((): boolean => {
    const e: Errors = {};
    (Object.keys(initialForm) as FormKey[]).forEach((k) => {
      const err = getFieldErrorFor(form, k);
      if (err) e[k] = err;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setTouched({
      dealership_name: true, contact_name: true, email_address: true,
      phone_number: true, monthly_vehicle_sales: true,
    });
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        dealership_name: form.dealership_name.trim(),
        contact_name: form.contact_name.trim(),
        email_address: form.email_address.trim(),
        phone_number: form.phone_number.trim(),
        monthly_vehicle_sales: form.monthly_vehicle_sales,
        current_warranty_provider: null as string | null,
        heard_about_us: null as string | null,
        additional_information: null as string | null,
      };

      const { data, error } = await supabase
        .from('trade_warranty_signups')
        .insert(payload as any)
        .select('id, created_at')
        .single();
      if (error) throw error;

      supabase.functions.invoke('notify-dealer-waitlist', {
        body: { ...payload, id: data?.id, created_at: data?.created_at },
      }).catch((e) => console.error('notify-dealer-waitlist failed', e));

      setSubmitted(true);
      setForm(initialForm);
      setTouched(blankBoolMap());
      setBlurValidity(blankBoolMap());
      setErrors({});
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById('dealer-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Get Early Dealer Access | Panda Protect Trade Warranty</title>
        <meta name="description" content="UK motor trade dealers — offer flexible warranty cover to your customers while Panda Protect handles claims, documents and support. Register interest today." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <DealerPublicHeader variant="minimal" ctaTargetId="dealer-form" />

      {/* HERO */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-orange-50/40 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-start">
            {/* LEFT — message + benefits */}
            <div>
              <span className="inline-block text-[11px] font-bold tracking-[0.18em] text-[#eb4b00] uppercase mb-4">
                Early dealer access now open
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.08] tracking-tight text-[#0f1b3d]">
                Offer Trade Warranty to Your Customers — We Handle the Paperwork
              </h1>
              <p className="text-gray-600 mt-5 text-base sm:text-lg leading-relaxed max-w-xl">
                Panda Protect helps UK motor trade dealers sell flexible warranties, handle claims, and give customers extra confidence.
              </p>

              <ul className="mt-8 space-y-5 max-w-xl">
                {heroBenefits.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-4">
                    <span className="w-10 h-10 rounded-lg bg-orange-100 text-[#eb4b00] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="font-bold text-[#0f1b3d]">{title}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{text}</div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <button onClick={scrollToForm} className="inline-flex items-center gap-2 text-[#eb4b00] font-bold hover:underline">
                  Register Your Interest <ArrowRight className="w-4 h-4" />
                </button>
                <a href="tel:03302295045" className="inline-flex items-center gap-2 text-slate-700 font-semibold hover:text-slate-900">
                  <Phone className="w-4 h-4" /> Speak to our team · 0330 229 5045
                </a>
              </div>
            </div>

            {/* RIGHT — Form card */}
            <div id="dealer-form" className="lg:sticky lg:top-24">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
                {submitted ? (
                  <div className="text-center space-y-4 py-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center">
                      <Check className="w-8 h-8" strokeWidth={3} />
                    </div>
                    <h3 className="text-xl font-black text-[#0f1b3d]">Thank you — form received</h3>
                    <p className="text-sm text-gray-700 max-w-sm mx-auto leading-relaxed">
                      Your details are with our trade team. Once Trade Warranty goes live, we'll be in touch within 1 working day to set up your account.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="text-sm font-semibold text-[#eb4b00] hover:underline"
                    >
                      Register another interest
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0f1b3d]">Get early dealer access</h2>
                    <p className="text-sm text-gray-600 mt-1.5">
                      Leave your details and our trade team will contact you within 1 working day.
                    </p>

                    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                      <Field label="Dealership Name" required valid={blurValidity.dealership_name} touched={touched.dealership_name} error={errors.dealership_name}>
                        <input value={form.dealership_name} onChange={(e) => set('dealership_name', e.target.value)}
                          onBlur={() => handleBlur('dealership_name')}
                          placeholder="Enter dealership name"
                          className={`${inputCls} ${errors.dealership_name && touched.dealership_name ? 'border-red-400' : ''}`} />
                      </Field>

                      <Field label="Contact Name" required valid={blurValidity.contact_name} touched={touched.contact_name} error={errors.contact_name}>
                        <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)}
                          onBlur={() => handleBlur('contact_name')}
                          placeholder="Enter your full name"
                          className={`${inputCls} ${errors.contact_name && touched.contact_name ? 'border-red-400' : ''}`} />
                      </Field>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Email" required valid={blurValidity.email_address} touched={touched.email_address} error={errors.email_address}>
                          <input type="email" value={form.email_address}
                            onChange={(e) => set('email_address', e.target.value)}
                            onBlur={() => handleBlur('email_address')}
                            placeholder="you@dealership.co.uk"
                            className={`${inputCls} ${errors.email_address && touched.email_address ? 'border-red-400' : ''}`} />
                        </Field>
                        <Field label="Phone" required valid={blurValidity.phone_number} touched={touched.phone_number} error={errors.phone_number}>
                          <input type="tel" value={form.phone_number}
                            onChange={(e) => set('phone_number', e.target.value)}
                            onBlur={() => handleBlur('phone_number')}
                            placeholder="07123 456 789"
                            className={`${inputCls} ${errors.phone_number && touched.phone_number ? 'border-red-400' : ''}`} />
                        </Field>
                      </div>

                      <Field label="Monthly vehicle sales" required valid={blurValidity.monthly_vehicle_sales} touched={touched.monthly_vehicle_sales} error={errors.monthly_vehicle_sales}>
                        <select value={form.monthly_vehicle_sales} onChange={(e) => set('monthly_vehicle_sales', e.target.value)}
                          onBlur={() => handleBlur('monthly_vehicle_sales')}
                          className={`${inputCls} ${errors.monthly_vehicle_sales && touched.monthly_vehicle_sales ? 'border-red-400' : ''}`}>
                          <option value="">Select range</option>
                          <option value="1-10">1 – 10</option>
                          <option value="11-25">11 – 25</option>
                          <option value="26-50">26 – 50</option>
                          <option value="51-100">51 – 100</option>
                          <option value="100+">100+</option>
                        </select>
                      </Field>

                      <button type="submit" disabled={submitting}
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] disabled:opacity-60 text-white font-bold px-5 py-3.5 rounded-lg text-base animate-breathing">
                        {submitting ? 'Submitting…' : (<>Request Dealer Access <ArrowRight className="w-5 h-5" /></>)}
                      </button>

                      <p className="text-center text-xs text-gray-500 leading-relaxed">
                        No obligation. Takes less than 30 seconds. We'll only contact you about Trade Warranty.
                      </p>
                    </form>
                  </>
                )}
              </div>

              {/* Trust strip */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] sm:text-xs text-gray-600">
                {['No obligation', 'Takes <30s', 'UK trade support', 'Claims handled for you'].map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" strokeWidth={3} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-[#0f1b3d] mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { n: 1, t: 'Register', d: 'Tell us about your dealership.' },
              { n: 2, t: 'Quick call', d: 'Our trade team confirms your needs.' },
              { n: 3, t: 'Start selling', d: 'Get access to warranty options and support.' },
            ].map((s) => (
              <div key={s.n} className="text-center sm:text-left">
                <div className="w-10 h-10 rounded-full bg-[#eb4b00] text-white text-base font-black flex items-center justify-center mx-auto sm:mx-0 mb-3">
                  {s.n}
                </div>
                <div className="font-bold text-[#0f1b3d] text-lg">{s.t}</div>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY DEALERS CHOOSE */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f1b3d]">Why dealers choose Panda Protect</h2>
            <p className="text-gray-600 mt-2 max-w-2xl mx-auto">A simple, trusted warranty solution built for UK motor trade.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { t: 'Trusted by UK dealers', d: 'A growing network of independent and franchise dealers across the UK.' },
              { t: 'Cars, vans, EVs & motorcycles', d: 'Flexible cover options for every type of vehicle on your forecourt.' },
              { t: 'UK claims hotline included', d: 'Customers and garages get direct support from our UK-based team.' },
            ].map((b) => (
              <div key={b.t} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="font-bold text-[#0f1b3d] text-lg">{b.t}</div>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPACT FAQ */}
      <DealerFAQSection
        bgClassName="bg-gray-50"
        compact
        intro="Short answers to the questions dealers ask most."
      />
      <DealerFAQSchema />

      {/* FINAL CTA */}
      <section className="bg-[#0f1b3d] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-black">Ready to add Trade Warranty to your forecourt?</h2>
          <p className="text-white/80 mt-3 max-w-2xl mx-auto">
            Get early dealer access — leave your details and our trade team will be in touch within 1 working day.
          </p>
          <button
            onClick={scrollToForm}
            className="mt-6 inline-flex items-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-6 py-3.5 rounded-lg"
          >
            Request Dealer Access <ArrowRight className="w-5 h-5" />
          </button>
          <div className="mt-4 text-sm">
            <Link to="/dealer-portal/login" className="text-white/70 hover:text-white underline-offset-4 hover:underline">
              Already a dealer? Sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm bg-gray-50 text-gray-900 placeholder:text-gray-500';

const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  valid?: boolean;
  touched?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, hint, valid, touched, error, children }) => {
  const showTick = valid && touched && !error;
  const showError = error && touched;
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement, {
        className: `${(children as React.ReactElement).props.className || ''}${showTick ? ' pr-12' : ''}`,
      })
    : children;
  return (
    <label className="block">
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-sm font-semibold text-gray-800">{label}{required && <span className="text-[#eb4b00] ml-0.5">*</span>}</span>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      <div className="relative">
        {child}
        {showTick && (
          <span className="absolute right-3 top-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm pointer-events-none">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </span>
        )}
      </div>
      {showError && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-red-50 border border-red-200 px-2 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700 leading-snug">{error}</p>
        </div>
      )}
    </label>
  );
};

export default DealerComingSoon;
