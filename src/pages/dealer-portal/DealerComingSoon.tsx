import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, Check, TrendingUp, Users, ShieldCheck, Headphones,
  ShieldQuestion, Sparkles, Lock,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import DealerFAQSection from '@/components/dealer/DealerFAQSection';
import DealerFAQSchema from '@/components/dealer/DealerFAQSchema';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// UK phone — accepts 07xxxxxxxxx, 02..., +44..., spaces/dashes allowed
const UK_PHONE_RE = /^(\+?44\s?|0)\d{2,5}[\s-]?\d{3,4}[\s-]?\d{3,4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

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


const DealerComingSoon = () => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; phone?: string; website_url?: string }>({});

  const set = (k: keyof typeof initialForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.email_address.trim() || !EMAIL_RE.test(form.email_address.trim())) {
      e.email = 'Please enter a valid email address.';
    }
    if (!form.phone_number.trim() || !UK_PHONE_RE.test(form.phone_number.trim().replace(/\s+/g, ' '))) {
      e.phone = 'Please enter a valid UK phone number.';
    }
    if (!form.website_url.trim() || !URL_RE.test(form.website_url.trim())) {
      e.website_url = 'Please enter a valid URL (e.g. https://…).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
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

      // Notify the team (non-blocking)
      supabase.functions.invoke('notify-dealer-waitlist', {
        body: { ...payload, id: data?.id, created_at: data?.created_at },
      }).catch((e) => console.error('notify-dealer-waitlist failed', e));

      setSubmitted(true);
      setForm(initialForm);
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

              {/* What happens next */}
              <div className="mt-8 rounded-xl bg-gray-50 border border-gray-200 p-5">
                <div className="font-bold text-gray-900 mb-4">What happens next</div>
                <div className="grid grid-cols-3 gap-3">
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
            </div>

            {/* Right — Form */}
            <div>
              <div className="bg-white">
                <h2 className="text-lg font-bold text-gray-900">Tell us a bit about your dealership</h2>

                {submitted ? (
                  <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 mx-auto flex items-center justify-center">
                      <Check className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900">Thank you for registering your interest.</h3>
                    <p className="text-sm text-gray-700">A member of our team will contact you shortly.</p>
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
                      <Field label="Dealership Name">
                        <input value={form.dealership_name} onChange={(e) => set('dealership_name', e.target.value)}
                          placeholder="Enter dealership name" className={inputCls} />
                      </Field>
                      <Field label="Contact Name">
                        <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)}
                          placeholder="Enter your full name" className={inputCls} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Email Address" required error={errors.email}>
                        <input type="email" required value={form.email_address}
                          onChange={(e) => set('email_address', e.target.value)}
                          placeholder="Enter email address"
                          className={`${inputCls} ${errors.email ? 'border-red-400' : ''}`} />
                      </Field>
                      <Field label="Phone Number" required error={errors.phone}>
                        <input type="tel" required value={form.phone_number}
                          onChange={(e) => set('phone_number', e.target.value)}
                          placeholder="Enter phone number"
                          className={`${inputCls} ${errors.phone ? 'border-red-400' : ''}`} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Monthly vehicle sales">
                        <select value={form.monthly_vehicle_sales} onChange={(e) => set('monthly_vehicle_sales', e.target.value)}
                          className={inputCls}>
                          <option value="">Select range</option>
                          <option value="1-10">1 – 10</option>
                          <option value="11-25">11 – 25</option>
                          <option value="26-50">26 – 50</option>
                          <option value="51-100">51 – 100</option>
                          <option value="100+">100+</option>
                        </select>
                      </Field>
                      <Field label="Current warranty provider">
                        <select value={form.current_warranty_provider} onChange={(e) => set('current_warranty_provider', e.target.value)}
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
                      error={errors.website_url}
                    >
                      <input
                        type="url"
                        required
                        value={form.website_url}
                        onChange={(e) => set('website_url', e.target.value)}
                        placeholder="e.g. https://www.autotrader.co.uk/dealers/... or your website URL"
                        className={`${inputCls} ${errors.website_url ? 'border-red-400' : ''}`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Paste your dealership website, AutoTrader / Motors.co.uk / eBay Motors listing page, or social shop URL.
                      </p>
                    </Field>



                    <Field label="Anything else we should know?" hint="(Optional)">
                      <textarea rows={3} value={form.additional_information}
                        onChange={(e) => set('additional_information', e.target.value)}
                        placeholder="Add any additional information…"
                        className={`${inputCls} resize-none`} />
                    </Field>

                    <button type="submit" disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] disabled:opacity-60 text-white font-bold px-5 py-3.5 rounded-lg text-base transition-colors">
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

        {/* Footer mini-trust strip */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TrustItem icon={ShieldCheck} title="No obligation" text="Register with zero commitment." />
          <TrustItem icon={Sparkles} title="Early access for dealers" text="Be first in line for exclusive access." />
          <TrustItem icon={ShieldQuestion} title="Built for UK motor trade" text="Designed around your business." />
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

const Field: React.FC<{ label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }> =
  ({ label, required, hint, error, children }) => (
    <label className="block">
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-sm font-semibold text-gray-800">{label}{required && <span className="text-[#eb4b00] ml-0.5">*</span>}</span>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </label>
  );

const TrustItem: React.FC<{ icon: React.ComponentType<any>; title: string; text: string }> = ({ icon: Icon, title, text }) => (
  <div className="flex items-center gap-3">
    <span className="w-10 h-10 rounded-lg bg-orange-100 text-[#eb4b00] flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5" />
    </span>
    <div>
      <div className="font-bold text-gray-900 text-sm">{title}</div>
      <div className="text-xs text-gray-600">{text}</div>
    </div>
  </div>
);

export default DealerComingSoon;
