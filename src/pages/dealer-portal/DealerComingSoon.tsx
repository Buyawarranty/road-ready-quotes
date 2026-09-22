import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Check, TrendingUp, ShieldCheck, FileText, UserPlus, LogIn, Eye, EyeOff,
  Building2, User, Mail, Phone, Globe, HelpCircle, Headphones, Info,
} from 'lucide-react';
import { isAdminRole } from '@/lib/adminRoles';
import DealerPublicFooter from '@/components/dealer/DealerPublicFooter';
import DealerFAQSection from '@/components/dealer/DealerFAQSection';
import DealerFAQSchema from '@/components/dealer/DealerFAQSchema';
import whyDealersPanda from '@/assets/car-warranty-panda-vehicles.png';
import pandaProtectLogo from '@/assets/panda-protect-logo.webp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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
  const pendingReg =
    searchParams.get('reg')?.trim() ||
    (typeof window !== 'undefined' ? localStorage.getItem('dealerPendingReg') || '' : '');
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

  const [showForm, setShowForm] = useState(false);

  const revealForm = () => {
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // Inline login — no navigation away from this page
  const [showLogin, setShowLogin] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const revealLogin = () => {
    setShowLogin(true);
    setTimeout(() => {
      loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setUnconfirmedEmail(null);
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) {
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          setUnconfirmedEmail(loginEmail);
          toast.error('Please click the confirmation link we emailed you, then sign in.');
          return;
        }
        throw error;
      }

      const userId = signInData.session?.user?.id;
      if (userId) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        if ((roles || []).some((r: any) => isAdminRole(r.role as string))) {
          const redirect = searchParams.get('redirect');
          navigate(redirect && redirect.startsWith('/dealer') ? redirect : '/dealer-portal/dashboard');
          return;
        }
      }

      const { data: dealer } = await supabase
        .from('dealers')
        .select('id')
        .eq('user_id', userId as string)
        .maybeSingle();
      if (!dealer) {
        await supabase.auth.signOut();
        toast.error('No dealer account found for this email.');
        return;
      }

      const redirect = searchParams.get('redirect');
      if (redirect) {
        navigate(pendingReg ? `${redirect}?reg=${encodeURIComponent(pendingReg)}` : redirect);
      } else {
        navigate('/dealer-portal/dashboard');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Login failed. Please check your details and try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: unconfirmedEmail,
      options: { emailRedirectTo: `${window.location.origin}/dealer-portal/login` },
    });
    if (error) toast.error(error.message);
    else toast.success('Confirmation email sent — check your inbox (and spam folder).');
  };

  return (
    <div className="dealer-crm public-marketing-page public-dealer-signup min-h-screen bg-background">
      <Helmet>
        <title>Register Your Interest – Trade Warranty | Panda Protect</title>
        <meta name="description" content="Offer trade warranties to your customers without the paperwork. Register for early dealer access to Panda Protect — UK motor trade warranty for cars, vans, EVs and motorcycles." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-4" aria-label="Panda Protect home">
            <img src={pandaProtectLogo} alt="Panda Protect" className="h-10 w-auto sm:h-12" />
            <span className="rounded-md border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">Dealer</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-5 text-sm font-semibold text-crm-navy">
            <Link to="/faq/traders/" className="hidden sm:inline-flex items-center gap-2 hover:text-primary"><HelpCircle className="h-5 w-5" /> Help</Link>
            <span className="hidden h-6 w-px bg-border sm:block" />
            <a href="tel:03309122535" className="inline-flex items-center gap-2 hover:text-primary"><Headphones className="h-5 w-5" /> Contact us</a>
          </div>
        </div>
      </header>

      {/* HERO — simple log in / register choice */}
      <section className="relative bg-gradient-to-b from-crm-blue-soft via-background to-background">
        <div className="mx-auto max-w-4xl px-4 py-9 text-center sm:px-6 sm:py-12 lg:py-14">
          <span className="inline-flex rounded-md bg-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Dealer portal
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-black leading-tight tracking-normal text-crm-navy sm:text-5xl">
            Trade warranties for UK motor dealers
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Already a dealer? Log in to your portal — or register your dealership and start quoting in minutes.
          </p>

          {pendingReg && (
            <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center justify-center gap-3 rounded-lg border border-crm-amber/40 bg-crm-amber-soft px-4 py-3 text-sm text-crm-navy sm:flex-row">
              <Info className="h-5 w-5 shrink-0 text-primary" />
              <span>
                Registration <span className="font-bold text-crm-navy">{pendingReg.toUpperCase()}</span> is saved for your quote.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={revealLogin}
                className="text-primary hover:bg-primary/10 hover:text-primary"
              >
                <LogIn className="h-4 w-4" /> Log in to continue
              </Button>
            </div>
          )}

          <div className="mx-auto mt-6 grid max-w-3xl gap-4 text-left sm:grid-cols-2">
            {/* Register */}
            <button
              type="button"
              onClick={revealForm}
              className="signup-choice signup-choice-primary group rounded-lg border-2 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
            >
              <div className="signup-choice-icon flex h-12 w-12 items-center justify-center rounded-lg">
                <UserPlus className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-black text-crm-navy">Register</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                New here? Register your dealership in 60 seconds — free.
              </p>
              <span className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors group-hover:bg-primary/90">
                Register your dealership <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>

            {/* Log in */}
            <button
              type="button"
              onClick={revealLogin}
              className="signup-choice group rounded-lg border-2 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
            >
              <div className="signup-choice-icon flex h-12 w-12 items-center justify-center rounded-lg">
                <LogIn className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-black text-crm-navy">Log in</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                I already have a dealer account — take me to my portal.
              </p>
              <span className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-bold text-primary transition-colors group-hover:border-primary group-hover:bg-primary/5">
                Log in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </div>

          <ul className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-crm-navy">
            <li className="flex items-center gap-2"><Check className="h-4 w-4 rounded-full bg-crm-green-soft p-0.5 text-crm-green" /> Free dealer sign-up</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 rounded-full bg-crm-green-soft p-0.5 text-crm-green" /> No setup fees, no contracts</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 rounded-full bg-crm-green-soft p-0.5 text-crm-green" /> Quote in seconds</li>
          </ul>

          {showLogin && (
            <div
              ref={loginRef}
              className="signup-form-panel mx-auto mt-8 w-full max-w-md scroll-mt-24 rounded-lg border border-border bg-card p-5 text-left shadow-sm sm:p-7"
            >
              <h2 className="text-xl font-bold text-crm-navy">Log in to your portal</h2>
              <p className="text-sm text-muted-foreground mt-1">Welcome back — enter your dealer sign-in details.</p>

              <form onSubmit={handleLogin} className="mt-5 space-y-4" noValidate>
                <label className="block">
                  <span className="block text-sm font-semibold text-crm-navy mb-1.5">Email address</span>
                  <input
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@dealership.co.uk"
                    className={inputCls}
                  />
                </label>

                <label className="block">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-crm-navy">Password</span>
                    <Link
                      to="/forgot-password/"
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-muted-foreground"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                {unconfirmedEmail && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="mb-2">
                      Your email <strong>{unconfirmedEmail}</strong> hasn't been confirmed yet. Check your inbox for
                      the confirmation link.
                    </p>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      className="font-medium underline hover:text-amber-700"
                    >
                      Resend confirmation email
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md bg-primary px-5 py-3.5 text-base font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loggingIn ? 'Signing in…' : (<>Log in to my portal <ArrowRight className="w-5 h-5" /></>)}
                </button>

                <p className="text-center text-sm text-muted-foreground pt-1 border-t border-border">
                  New dealer?{' '}
                  <button
                    type="button"
                    onClick={revealForm}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    Register instead <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </p>
              </form>
            </div>
          )}

          {showForm && (
            <div ref={formRef} className="signup-form-panel mx-auto mt-8 w-full max-w-2xl scroll-mt-24 rounded-lg border border-border bg-card p-5 text-left shadow-sm sm:p-7">
              {submitted ? (
                <div className="text-center space-y-3 py-6">
                  <div className="w-16 h-16 rounded-full bg-crm-green-soft text-crm-green mx-auto flex items-center justify-center">
                    <Check className="w-9 h-9" strokeWidth={3} />
                  </div>
                  <h3 className="text-2xl font-black text-crm-navy">Thank you — form received.</h3>
                  <p className="text-muted-foreground">Once we go live, a member of our team will be in touch with you shortly.</p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="text-sm font-semibold text-primary hover:underline mt-2"
                  >
                    Submit another response
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <h2 className="inline-flex items-center justify-center gap-2.5 text-2xl sm:text-[1.75rem] font-black text-crm-navy leading-tight">
                      <span aria-hidden="true" className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl shadow-md shrink-0">🚀</span>
                      Request dealer access
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">⚡ Five quick details — no obligation</p>
                  </div>

                  {pendingReg && (
                    <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted border border-border px-4 py-3">
                      <span className="bg-crm-amber-soft text-crm-navy font-black text-sm tracking-[0.08em] px-2.5 py-1 rounded-md border border-border shrink-0">
                        {pendingReg.toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-crm-navy">Your saved registration</p>
                        <p className="text-xs text-muted-foreground">Your quote picks up right where you left off.</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                    <Field label="Dealership name" icon={Building2}>
                      <input
                        type="text"
                        value={form.dealership_name}
                        onChange={(e) => set('dealership_name', e.target.value)}
                        placeholder="e.g. ABC Motors Ltd"
                        className={regInputCls}
                      />
                    </Field>

                    <Field label="Contact name" icon={User}>
                      <input
                        type="text"
                        value={form.contact_name}
                        onChange={(e) => set('contact_name', e.target.value)}
                        placeholder="e.g. John Smith"
                        className={regInputCls}
                      />
                    </Field>

                    <Field
                      label="Email address"
                      required
                      icon={Mail}
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
                        placeholder="e.g. you@dealership.co.uk"
                        className={`${regInputCls} ${touched.email && errors.email ? 'border-rose-400' : ''}`}
                      />
                    </Field>

                    <Field
                      label="Phone number"
                      required
                      icon={Phone}
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
                        placeholder="UK mobile or landline"
                        className={`${regInputCls} ${touched.phone && errors.phone ? 'border-rose-400' : ''}`}
                      />
                    </Field>
                    <p className="text-xs text-muted-foreground -mt-2 pl-1">Unlock exclusive trade pricing and expert advice</p>

                    <Field
                      label="Where do you sell vehicles?"
                      required
                      hint="(Website or listing URL)"
                      icon={Globe}
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
                        className={`${regInputCls} ${touched.url && errors.url ? 'border-rose-400' : ''}`}
                      />
                    </Field>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="animate-breathing w-full inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-primary px-5 py-4 text-base font-extrabold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60 sm:text-lg"
                    >
                      {submitting ? 'Submitting…' : (<>Register My Interest <ArrowRight className="w-5 h-5" /></>)}
                    </button>

                    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 pt-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">⚡ Quote in seconds</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">🚗 Sell more per vehicle</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">✅ No obligation</span>
                    </div>

                    <p className="text-center text-xs text-muted-foreground">🔒 We'll only contact you about Trade Warranty.</p>

                    <div className="text-center text-sm text-muted-foreground pt-3 border-t border-border">
                      Already a dealer?{' '}
                      <button
                        type="button"
                        onClick={revealLogin}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        Log in instead <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-card py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-black text-crm-navy">How it works</h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">Three simple steps to start offering trade warranties.</p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-10 md:gap-8">
            {/* dashed connector (desktop) */}
            <div className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] border-t-2 border-dashed border-input -z-0" />
            {[
              { n: 1, t: 'Register interest', d: 'Tell us a few details about your dealership.' },
              { n: 2, t: 'Our team contacts you', d: "We'll be in touch to confirm your needs." },
              { n: 3, t: 'Get early access', d: 'Be first to offer Trade Warranty to your customers.' },
            ].map((s) => (
              <div key={s.n} className="relative text-center">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-xl font-black flex items-center justify-center mx-auto relative z-10 shadow-md">
                  {s.n}
                </div>
                <h3 className="font-bold text-crm-navy mt-5">{s.t}</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY DEALERS CHOOSE */}
      <section className="bg-muted py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div>
            <h2 className="text-2xl sm:text-4xl font-black text-crm-navy">Why dealers choose Panda Protect</h2>
            <ul className="mt-7 space-y-4">
              {[
                'High profit warranty products with flexible options',
                'Quick and simple dealer onboarding',
                'Claims handled by our UK-based support team',
                'Digital documents and instant policy issuance',
                'Marketing support to help you sell more',
              ].map((b) => (
                <li key={b} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-crm-green-soft text-crm-green flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </span>
                  <span className="text-muted-foreground">{b}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={revealForm}
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90"
            >
              Register your interest <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-center">
            <img src={whyDealersPanda} alt="Panda Protect mascot with protected vehicles" className="w-full max-w-xs sm:max-w-md h-auto" />
          </div>
        </div>
      </section>

      {/* BENEFIT CARDS */}
      <section className="bg-card py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
          {[
            { icon: TrendingUp, t: 'Increase profit per vehicle', d: 'Earn more on every eligible sale with high-margin warranty products.' },
            { icon: FileText, t: 'No claims admin', d: 'We handle claims, documents and customer support for you.' },
            { icon: ShieldCheck, t: 'Flexible cover options', d: 'Car, van, EV and motorcycle warranty options to suit your customers.' },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <b.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-crm-navy">{b.t}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <DealerFAQSection
        bgClassName="bg-muted"
        intro="Quick answers for UK motor trade dealers about our partner programme, portal, claims and support."
      />
      <DealerFAQSchema />

      <DealerPublicFooter />
    </div>
  );
};

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-input focus:border-primary focus:ring-1 focus:ring-ring outline-none text-sm bg-card text-crm-navy placeholder:text-muted-foreground/70';

const regInputCls =
  'w-full pl-11 pr-12 py-3 rounded-xl border border-border bg-muted focus:bg-card focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none text-sm text-crm-navy placeholder:text-muted-foreground/70 transition-colors';

const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  valid?: boolean;
  icon?: React.ElementType;
  children: React.ReactNode;
}> = ({ label, required, hint, error, valid, icon: Icon, children }) => (
  <label className="block">
    <div className="flex items-baseline gap-1 mb-1.5">
      <span className="text-[15px] font-bold text-crm-navy">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
    <div className="relative">
      {Icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Icon className="w-5 h-5" />
        </span>
      )}
      {children}
      {valid && !error && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-crm-green pointer-events-none">
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
