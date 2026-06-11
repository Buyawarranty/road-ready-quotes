import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check, Sparkles, Zap, TrendingUp, ShieldCheck, Clock, Gift } from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const benefits = [
  { icon: Gift, title: 'Founding dealer perks', text: 'Lock in launch pricing and exclusive commission rates — for life.' },
  { icon: Zap, title: 'Instant quotes & issuance', text: 'Sell warranties in under 60 seconds from any device.' },
  { icon: TrendingUp, title: 'Boost profit per sale', text: 'Average dealers add £180+ margin per vehicle with our cover.' },
  { icon: ShieldCheck, title: 'We handle the claims', text: 'Your customers protected, repairs paid directly to UK garages.' },
  { icon: Clock, title: 'Skip the queue', text: 'Early access dealers go live the day we launch — ahead of competitors.' },
  { icon: Sparkles, title: 'Free onboarding', text: 'Dedicated account manager and marketing pack on us.' },
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50">
      <Helmet>
        <title>Dealer Programme – Coming Soon | Join the Waitlist</title>
        <meta name="description" content="Our dealer warranty programme is launching soon. Join the founding-dealer waitlist for exclusive pricing, priority access and free onboarding." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <DealerPublicHeader />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: pitch */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eb4b00]/10 text-[#eb4b00] text-xs font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Launching Soon
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-gray-900">
              Something <span className="text-[#eb4b00]">big</span> is coming for dealers.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
              We're putting the finishing touches on the UK's most dealer-friendly warranty programme.
              {reg ? (
                <> Your reg <span className="font-bold text-gray-900">{reg}</span> is saved — join the waitlist and we'll quote you the moment we go live.</>
              ) : (
                <> Join the waitlist to be first in line with founding-dealer perks.</>
              )}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              {benefits.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-[#eb4b00]/10 text-[#eb4b00] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{title}</div>
                    <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8">
              {submitted ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center">
                    <Check className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">You're on the list!</h2>
                  <p className="text-gray-600">We'll email you the moment we launch — with your founding-dealer offer.</p>
                  <Link to="/dealer-portal" className="inline-flex items-center gap-2 text-[#eb4b00] font-bold hover:underline">
                    Back to home <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-gray-900">Join the founding-dealer waitlist</h2>
                  <p className="text-sm text-gray-600 mt-1">Free to join. No commitment. Limited spots.</p>

                  <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input required placeholder="First name" value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm" />
                      <input placeholder="Last name" value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm" />
                    </div>
                    <input required type="email" placeholder="Work email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm" />
                    <input type="tel" placeholder="Phone (optional)" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm" />
                    <input placeholder="Dealership name (optional)" value={form.dealership}
                      onChange={(e) => setForm({ ...form, dealership: e.target.value })}
                      className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:border-[#eb4b00] focus:ring-1 focus:ring-[#eb4b00] outline-none text-sm" />

                    <button type="submit" disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] disabled:opacity-60 text-white font-bold px-5 py-4 rounded-lg text-base transition-colors">
                      {submitting ? 'Saving your spot…' : (<>Reserve my founding spot <ArrowRight className="w-5 h-5" /></>)}
                    </button>
                    <p className="text-xs text-gray-500 text-center">
                      We'll only email you about the dealer programme launch. Unsubscribe anytime.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DealerComingSoon;
