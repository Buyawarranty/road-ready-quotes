import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, Check, TrendingUp, Users, ShieldCheck, Headphones,
  Lock, AlertCircle,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import DealerFAQSection from '@/components/dealer/DealerFAQSection';
import DealerFAQSchema from '@/components/dealer/DealerFAQSchema';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// UK phone — accepts 07xxxxxxxxx, 02..., +44..., spaces/dashes allowed
const UK_PHONE_RE = /^(\+?44\s?|0)\d{2,5}[\s-]?\d{3,4}[\s-]?\d{3,4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accept https://, http://, or www. prefixed URLs with at least one dot in the host
const URL_RE = /^(https?:\/\/|www\.)[^\s.]+\.[^\s]+$/i;

const benefits = [
  { icon: TrendingUp, title: 'Increase profit per vehicle sale', text: 'Add high-margin warranty cover to every deal.' },
  { icon: Users, title: 'Simple dealer onboarding', text: 'Quick and easy to set up — we handle the rest.' },
  { icon: ShieldCheck, title: 'Flexible cover options', text: 'Dealer-paid, fully covered, or both — your choice.' },
  { icon: Headphones, title: 'Dedicated UK claims support', text: 'Real humans, real support, when you need it.' },
];

const initialForm = {
  dealership_name: '',
  contact_name: '',
  email_address: '',
  phone_number: '',
  monthly_vehicle_sales: '',
  current_warranty_provider: '',
  website_url: '',
  additional_information: '',
};

type FormKey = keyof typeof initialForm;
type ErrorKey = 'dealership_name' | 'contact_name' | 'email_address' | 'phone_number' | 'monthly_vehicle_sales' | 'current_warranty_provider' | 'website_url';
type Errors = Partial<Record<ErrorKey, string>>;

const VALIDATABLE_KEYS: ErrorKey[] = [
  'dealership_name', 'contact_name', 'email_address', 'phone_number',
  'monthly_vehicle_sales', 'current_warranty_provider', 'website_url',
];

const getFieldErrorFor = (form: typeof initialForm, key: ErrorKey): string | undefined => {
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
      if (!UK_PHONE_RE.test(v.replace(/\s+/g, ' '))) return 'Please enter a valid UK phone number.';
      return;
    case 'monthly_vehicle_sales':
      if (!v) return 'Please select your monthly vehicle sales.';
      return;
    case 'current_warranty_provider':
      if (!v) return 'Please select your current warranty provider.';
      return;
    case 'website_url':
      if (!v) return 'A website or listing URL is required.';
      if (!URL_RE.test(v)) return 'Please enter a valid URL starting with https://, http:// or www.';
      return;
  }
};

const isFieldValid = (form: typeof initialForm, key: FormKey): boolean => {
  if (key === 'additional_information') return false;
  return !getFieldErrorFor(form, key as ErrorKey);
};

const DealerComingSoon = () => {
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState<Record<FormKey, boolean>>({
    dealership_name: false, contact_name: false, email_address: false,
    phone_number: false, monthly_vehicle_sales: false,
    current_warranty_provider: false, website_url: false, additional_information: false,
  });
  const [blurValidity, setBlurValidity] = useState<Record<FormKey, boolean>>({
    dealership_name: false, contact_name: false, email_address: false,
    phone_number: false, monthly_vehicle_sales: false,
    current_warranty_provider: false, website_url: false, additional_information: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const set = (k: FormKey, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k !== 'additional_information') {
      setErrors((e) => ({ ...e, [k as ErrorKey]: undefined }));
    }
  };

  const handleBlur = (k: FormKey) => {
    setTouched((t) => ({ ...t, [k]: true }));
    setBlurValidity((b) => ({ ...b, [k]: isFieldValid(form, k) }));
    if (k !== 'additional_information') {
      const err = getFieldErrorFor(form, k as ErrorKey);
      setErrors((e) => ({ ...e, [k as ErrorKey]: err }));
    }
  };

  const validate = useCallback((): boolean => {
    const e: Errors = {};
    VALIDATABLE_KEYS.forEach((k) => {
      const err = getFieldErrorFor(form, k);
      if (err) e[k] = err;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    // Mark all as touched so errors show
    setTouched({
      dealership_name: true, contact_name: true, email_address: true,
      phone_number: true, monthly_vehicle_sales: true,
      current_warranty_provider: true, website_url: true, additional_information: true,
    });
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        dealership_name: form.dealership_name.trim() || null,
        contact_name: form.contact_name.trim() || null,
        email_address: form.email_address.trim(),
        phone_number: form.phone_number.trim(),
        monthly_vehicle_sales: form.monthly_vehicle_sales || null,
        current_warranty_provider: form.current_warranty_provider || null,
        heard_about_us: form.website_url.trim() || null,
        additional_information: form.additional_information.trim() || null,
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
      setTouched({
        dealership_name: false, contact_name: false, email_address: false,
        phone_number: false, monthly_vehicle_sales: false,
        current_warranty_provider: false, website_url: false, additional_information: false,
      });
      setBlurValidity({
        dealership_name: false, contact_name: false, email_address: false,
        phone_number: false, monthly_vehicle_sales: false,
        current_warranty_provider: false, website_url: false, additional_information: false,
      });
      setErrors({});
      toast.success('Thank you for registering your interest. A member of our team will contact you shortly.');
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50">
      <Helmet>
        <title>Dealer Portal Registration | Panda Protect</title>
        <meta name="description" content="Register interest in Panda Protect dealer portal access for warranty management, trade account setup and motor dealer support tools." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <DealerPublicHeader />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left */}
            <div>
              <span className="inline-block text-[11px] font-bold tracking-[0.18em] text-[#eb4b00] bg-[#eb4b00]/10 px-2.5 py-1 rounded uppercase mb-4">
                Coming Soon
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black leading-[1.1] tracking-tight text-gray-900">
                Register Your Interest<br />in Trade Warranty
              </h1>
              <p className="text-gray-600 mt-4 leading-relaxed">
                Be first to offer our new trade warranty solution to your customers and unlock extra revenue for your dealership.
              </p>

              <ul className="mt-7 space-y-5">
                {benefits.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-4">
                    <span className="w-10 h-10 rounded-lg bg-orange-100 text-[#eb4b00] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">{title}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{text}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — Form */}
            <div>
              <div className="bg-white">
                <h2 className="text-lg font-bold text-gray-900">Tell us a bit about your dealership</h2>

                {submitted ? (
                  <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center">
                      <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Thank you — form received</h3>
                    <p className="text-sm text-gray-700 max-w-sm mx-auto leading-relaxed">
                      Your interest is registered. Once Trade Warranty goes live, our team will be in touch to set up your account.
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
                  <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Dealership Name" valid={blurValidity.dealership_name} touched={touched.dealership_name}>
                        <input value={form.dealership_name} onChange={(e) => set('dealership_name', e.target.value)}
                          onBlur={() => handleBlur('dealership_name')}
                          placeholder="Enter dealership name" className={inputCls} />
                      </Field>
                      <Field label="Contact Name" valid={blurValidity.contact_name} touched={touched.contact_name}>
                        <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)}
                          onBlur={() => handleBlur('contact_name')}
                          placeholder="Enter your full name" className={inputCls} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Email Address" required valid={blurValidity.email_address} touched={touched.email_address} error={errors.email}>
                        <input type="email" required value={form.email_address}
                          onChange={(e) => set('email_address', e.target.value)}
                          onBlur={() => handleBlur('email_address')}
                          placeholder="Enter email address"
                          className={`${inputCls} ${errors.email ? 'border-red-400' : ''}`} />
                      </Field>
                      <Field label="Phone Number" required valid={blurValidity.phone_number} touched={touched.phone_number} error={errors.phone}>
                        <input type="tel" required value={form.phone_number}
                          onChange={(e) => set('phone_number', e.target.value)}
                          onBlur={() => handleBlur('phone_number')}
                          placeholder="Enter phone number"
                          className={`${inputCls} ${errors.phone ? 'border-red-400' : ''}`} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Monthly vehicle sales" valid={blurValidity.monthly_vehicle_sales} touched={touched.monthly_vehicle_sales}>
                        <select value={form.monthly_vehicle_sales} onChange={(e) => set('monthly_vehicle_sales', e.target.value)}
                          onBlur={() => handleBlur('monthly_vehicle_sales')}
                          className={inputCls}>
                          <option value="">Select range</option>
                          <option value="1-10">1 – 10</option>
                          <option value="11-25">11 – 25</option>
                          <option value="26-50">26 – 50</option>
                          <option value="51-100">51 – 100</option>
                          <option value="100+">100+</option>
                        </select>
                      </Field>
                      <Field label="Current warranty provider" valid={blurValidity.current_warranty_provider} touched={touched.current_warranty_provider}>
                        <select value={form.current_warranty_provider} onChange={(e) => set('current_warranty_provider', e.target.value)}
                          onBlur={() => handleBlur('current_warranty_provider')}
                          className={inputCls}>
                          <option value="">Select provider</option>
                          <option value="None">None</option>
                          <option value="Warrantywise">Warrantywise</option>
                          <option value="WMS">WMS</option>
                          <option value="MotorEasy">MotorEasy</option>
                          <option value="AutoProtect">AutoProtect</option>
                          <option value="In-house">In-house</option>
                          <option value="Other">Other</option>
                        </select>
                      </Field>
                    </div>

                    <Field
                      label="Where do you sell vehicles?"
                      required
                      hint="(Link to verify your business)"
                      valid={blurValidity.website_url}
                      touched={touched.website_url}
                      error={errors.website_url}
                    >
                      <input
                        type="text"
                        inputMode="url"
                        required
                        value={form.website_url}
                        onChange={(e) => set('website_url', e.target.value)}
                        onBlur={() => handleBlur('website_url')}
                        placeholder="e.g. https://www.autotrader.co.uk/... or www.yourdealership.co.uk"
                        className={`${inputCls} ${errors.website_url ? 'border-red-400' : ''}`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Paste your dealership website, AutoTrader / Motors.co.uk / eBay Motors listing page, or social shop URL.
                      </p>
                    </Field>

                    <Field label="Anything else we should know?" hint="(Optional)" valid={blurValidity.additional_information} touched={touched.additional_information}>
                      <textarea rows={3} value={form.additional_information}
                        onChange={(e) => set('additional_information', e.target.value)}
                        onBlur={() => handleBlur('additional_information')}
                        placeholder="Add any additional information…"
                        className={`${inputCls} resize-none`} />
                    </Field>

                    <button type="submit" disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] disabled:opacity-60 text-white font-bold px-5 py-3.5 rounded-lg text-base animate-breathing">
                      {submitting ? 'Submitting…' : (<>Register My Interest <ArrowRight className="w-5 h-5" /></>)}
                    </button>

                    <p className="text-center text-xs text-gray-500">
                      No obligation · Takes less than 30 seconds
                    </p>
                    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
                      <Lock className="w-3 h-3" /> We'll only contact you about Trade Warranty.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
          <div className="font-bold text-gray-900 mb-4">What happens next</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: 1, t: 'Register interest', d: 'Tell us a few details about your dealership.' },
              { n: 2, t: 'Our team contacts you', d: "We'll be in touch to confirm your needs." },
              { n: 3, t: 'Get early access', d: 'Be first to offer Trade Warranty to customers.' },
            ].map((s) => (
              <div key={s.n} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center">{s.n}</span>
                  <span className="text-sm font-bold text-gray-900">{s.t}</span>
                </div>
                <p className="text-xs text-gray-600 leading-snug">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DealerFAQSection
        bgClassName="bg-gray-50"
        intro="Quick answers for UK motor trade dealers about our partner programme, portal, claims and support."
      />
      <DealerFAQSchema />
    </div>
  );
};

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm bg-gray-100 text-gray-900 placeholder:text-gray-500';

const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  valid?: boolean;
  touched?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, hint, valid, touched, error, children }) => {
  const showTick = valid && touched;
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
