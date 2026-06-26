import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, TrendingUp, Headphones, ShieldCheck, ClipboardList, Phone,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import DealerPublicFooter from '@/components/dealer/DealerPublicFooter';
import DealerFAQSection from '@/components/dealer/DealerFAQSection';
import DealerFAQSchema from '@/components/dealer/DealerFAQSchema';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import qashqaiHero from '@/assets/qashqai-hero.webp.asset.json';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidUKPhone = (raw: string): boolean => {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (!/^(\+?44|0)\d{9,11}$/.test(cleaned)) return false;
  const digits = cleaned.replace(/^\+?44/, '0').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
};

const heroBenefits = [
  { icon: TrendingUp, title: 'Increase profit per vehicle', text: 'Earn more on every eligible sale with high-margin warranty products.' },
  { icon: Headphones, title: 'No claims admin', text: 'We handle claims, documents and customer support for you.' },
  { icon: ShieldCheck, title: 'Flexible cover options', text: 'Car, van, EV and motorcycle warranty options to suit your customers.' },
];

const whyChoose = [
  'High profit warranty products with flexible options',
  'Quick and simple dealer onboarding',
  'Claims handled by our UK-based support team',
  'Digital documents and instant policy issuance',
  'Marketing support to help you sell more',
];

const howItWorks = [
  { icon: ClipboardList, n: 1, title: 'Register', text: 'Complete the short form to tell us about your dealership.' },
  { icon: Phone, n: 2, title: 'Quick call', text: 'Our trade team will call to confirm your needs and answer questions.' },
  { icon: ShieldCheck, n: 3, title: 'Start selling', text: 'Get access to warranty options, documents and ongoing support.' },
];

const formTrust = ['No obligation', 'Takes less than 30 seconds', 'UK dealer support'];

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

const TrustpilotBadge = () => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <svg key={i} className="w-5 h-5 text-[#00b67a]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <svg className="w-5 h-5 text-[#00b67a]" viewBox="0 0 24 24" fill="currentColor">
        <defs>
          <linearGradient id="halfStar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="#00b67a" />
            <stop offset="50%" stopColor="#d4d4d4" />
          </linearGradient>
        </defs>
        <path fill="url(#halfStar)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </div>
    <div className="text-sm text-gray-700">
      <span className="font-bold text-[#0f1b3d]">4.8/5</span> on Trustpilot
    </div>
  </div>
);

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
                Offer Trade Warranty Without the Admin
              </h1>
              <p className="text-gray-600 mt-5 text-base sm:text-lg leading-relaxed max-w-xl">
                Add extra profit to every sale and give your customers the confidence of flexible warranty cover. Panda Protect handles claims, documents and support.
              </p>

              <ul className="mt-8 space-y-5 max-w-xl">
                {heroBenefits.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-4">
                    <span className="w-11 h-11 rounded-xl bg-orange-50 text-[#eb4b00] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="font-bold text-[#0f1b3d]">{title}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{text}</div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <div className="text-sm font-semibold text-[#0f1b3d] mb-2">Trusted by UK motor trade professionals</div>
                <TrustpilotBadge />
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
                      Complete the short form and our trade team will contact you within 1 working day.
                    </p>

                    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                      <Field label="Dealership name" required valid={blurValidity.dealership_name} touched={touched.dealership_name} error={errors.dealership_name}>
                        <input value={form.dealership_name} onChange={(e) => set('dealership_name', e.target.value)}
                          onBlur={() => handleBlur('dealership_name')}
                          placeholder="e.g. ABC Motors"
                          className={`${inputCls} ${errors.dealership_name && touched.dealership_name ? 'border-red-400' : ''}`} />
                      </Field>

                      <Field label="Contact name" required valid={blurValidity.contact_name} touched={touched.contact_name} error={errors.contact_name}>
                        <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)}
                          onBlur={() => handleBlur('contact_name')}
                          placeholder="e.g. James Smith"
                          className={`${inputCls} ${errors.contact_name && touched.contact_name ? 'border-red-400' : ''}`} />
                      </Field>

                      <Field label="Email address" required valid={blurValidity.email_address} touched={touched.email_address} error={errors.email_address}>
                        <input type="text" inputMode="email" autoComplete="email" maxLength={255}
                          value={form.email_address}
                          onChange={(e) => set('email_address', e.target.value)}
                          onBlur={() => handleBlur('email_address')}
                          placeholder="e.g. james@abcmotors.co.uk"
                          className={`${inputCls} ${errors.email_address && touched.email_address ? 'border-red-400' : ''}`} />
                      </Field>

                      <Field label="Phone number" required valid={blurValidity.phone_number} touched={touched.phone_number} error={errors.phone_number}>
                        <input type="text" inputMode="tel" autoComplete="tel" maxLength={20}
                          value={form.phone_number}
                          onChange={(e) => set('phone_number', e.target.value)}
                          onBlur={() => handleBlur('phone_number')}
                          placeholder="e.g. 07123 456 789"
                          className={`${inputCls} ${errors.phone_number && touched.phone_number ? 'border-red-400' : ''}`} />
                      </Field>

                      <Field label="Monthly vehicle sales" required valid={blurValidity.monthly_vehicle_sales} touched={touched.monthly_vehicle_sales} error={errors.monthly_vehicle_sales}>
                        <select value={form.monthly_vehicle_sales} onChange={(e) => set('monthly_vehicle_sales', e.target.value)}
                          onBlur={() => handleBlur('monthly_vehicle_sales')}
                          className={`${inputCls} ${errors.monthly_vehicle_sales && touched.monthly_vehicle_sales ? 'border-red-400' : ''}`}>
                          <option value="">Select your range</option>
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

                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-gray-600 mt-1">
                        {formTrust.map((t) => (
                          <div key={t} className="flex items-center justify-center gap-1">
                            <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" strokeWidth={3} />
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>

                      <p className="text-center text-xs text-gray-500 leading-relaxed flex items-center justify-center gap-1.5">
                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        We'll only contact you about Trade Warranty.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-[#0f1b3d] mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {howItWorks.map((s, idx) => (
              <div key={s.n} className="relative">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-full border-l-4 border-l-[#eb4b00]">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-orange-50 text-[#eb4b00] flex items-center justify-center">
                        <s.icon className="w-5 h-5" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#eb4b00] text-white text-[10px] font-black flex items-center justify-center">
                        {s.n}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-[#0f1b3d] text-lg">{s.title}</div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{s.text}</p>
                    </div>
                  </div>
                </div>
                {idx < howItWorks.length - 1 && (
                  <div className="hidden sm:block absolute top-1/2 -right-3 w-6 border-t-2 border-dashed border-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY DEALERS CHOOSE + FAQ */}
      <section className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12">
            {/* Why choose */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0f1b3d] mb-6">Why dealers choose Panda Protect</h2>
              <ul className="space-y-4">
                {whyChoose.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#eb4b00] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    <span className="text-gray-700 text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0f1b3d] mb-6">Frequently asked questions</h2>
              <DealerFAQSection
                bgClassName="bg-gray-50"
                compact
                heading=""
                intro=""
                viewAllHref="/faq/traders"
              />
            </div>
          </div>
        </div>
      </section>

      <DealerFAQSchema />

      {/* CONTACT STRIP */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-xl p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#eb4b00] text-white flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#0f1b3d] text-lg">Prefer to speak to our team?</div>
                <p className="text-sm text-gray-700 mt-1">
                  Call <a href="tel:03302295045" className="font-bold text-[#0f1b3d] hover:underline">0330 229 5045</a> or{' '}
                  <a href="https://wa.me/message/SPQPJ6O3UBF5B1" target="_blank" rel="noopener noreferrer" className="font-bold text-[#eb4b00] hover:underline">WhatsApp us</a>
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 text-[#0f1b3d] flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#0f1b3d] text-lg">Panda Protect — UK warranty specialists</div>
                <p className="text-sm text-gray-600 mt-1">
                  Cover for cars, vans, EVs and motorcycles. Claims handled. Dealers supported.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DealerPublicFooter />
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
          <span className="absolute right-3 top-3 pointer-events-none text-green-500">
            <Check className="w-5 h-5" strokeWidth={3} />
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
