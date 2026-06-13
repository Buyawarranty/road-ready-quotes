import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check, Sparkles, Zap, TrendingUp, ShieldCheck } from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import DealerFAQSection from '@/components/dealer/DealerFAQSection';
import DealerFAQSchema from '@/components/dealer/DealerFAQSchema';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const quickBenefits = [
  { icon: Zap, text: 'Instant quotes & issuance' },
  { icon: TrendingUp, text: '£180+ extra margin per sale' },
  { icon: ShieldCheck, text: 'We handle every claim' },
];

const DealerComingSoon = () => {
  const [params] = useSearchParams();
  const reg = (params.get('reg') || '').toUpperCase();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', dealership: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.firstName) {
      toast.error('Please add your name and email.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('dealer_leads').insert({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        registration_plate: reg || null,
        notes: form.dealership ? `Dealership: ${form.dealership.trim()}` : null,
        source: 'coming_soon_waitlist',
        status: 'new',
      } as any);
      if (error) throw error;

      // Notify the team (non-blocking — UX shouldn't fail if email errors)
      supabase.functions.invoke('notify-dealer-waitlist', {
        body: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          dealership: form.dealership.trim(),
          reg,
        },
      }).catch((e) => console.error('notify-dealer-waitlist failed', e));

      setSubmitted(true);
      toast.success("You're on the list! We'll be in touch.");
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 flex flex-col">
      <Helmet>
        <title>Dealer Programme – Coming Soon | Join the Waitlist</title>
        <meta name="description" content="Our dealer warranty programme is launching soon. Join the founding-dealer waitlist for exclusive pricing, priority access and free onboarding." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <DealerPublicHeader />

      {/* Above the fold: pitch + form in a single screen */}
      <section className="flex-1 flex items-center">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center">
            {/* Left: pitch (compact) */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eb4b00]/10 text-[#eb4b00] text-xs font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" /> Launching Soon
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.05] tracking-tight text-gray-900">
                Something <span className="text-[#eb4b00]">big</span> is coming for dealers.
              </h1>
              <p className="text-base text-gray-600 leading-relaxed max-w-xl">
                We're putting the finishing touches on the UK's most dealer-friendly warranty programme.
                {reg ? (
                  <> Your reg <span className="font-bold text-gray-900">{reg}</span> is saved — we'll quote you the moment we go live.</>
                ) : (
                  <> Join the waitlist for founding-dealer perks and priority access.</>
                )}
              </p>

              <ul className="space-y-2 pt-1">
                {quickBenefits.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-gray-800">
                    <span className="w-7 h-7 rounded-md bg-[#eb4b00]/10 text-[#eb4b00] inline-flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-medium">{text}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-gray-500 pt-2">
                Founding-dealer perks · Free onboarding · Skip the launch queue
              </p>
            </div>

            {/* Right: form */}
            <div>
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-6">
                {submitted ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center">
                      <Check className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900">You're on the list!</h2>
                    <p className="text-sm text-gray-600">We'll email you the moment we launch — with your founding-dealer offer.</p>
                    <Link to="/dealer-portal" className="inline-flex items-center gap-2 text-[#eb4b00] font-bold hover:underline text-sm">
                      Back to home <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900">Join the founding-dealer waitlist</h2>
                    <p className="text-xs text-gray-600 mt-1">Free to join. No commitment. Limited spots.</p>

                    <form onSubmit={onSubmit} className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input required placeholder="First name" value={form.firstName}
                          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm" />
                        <input placeholder="Last name" value={form.lastName}
                          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm" />
                      </div>
                      <input required type="email" placeholder="Work email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="tel" placeholder="Phone (optional)" value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm" />
                        <input placeholder="Dealership" value={form.dealership}
                          onChange={(e) => setForm({ ...form, dealership: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm" />
                      </div>

                      <button type="submit" disabled={submitting}
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] disabled:opacity-60 text-white font-bold px-5 py-3 rounded-lg text-sm transition-colors">
                        {submitting ? 'Saving your spot…' : (<>Reserve my founding spot <ArrowRight className="w-4 h-4" /></>)}
                      </button>
                      <p className="text-[11px] text-gray-500 text-center">
                        We'll only email you about the dealer programme launch. Unsubscribe anytime.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
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

export default DealerComingSoon;
