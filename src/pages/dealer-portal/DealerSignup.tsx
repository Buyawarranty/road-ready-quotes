import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import {
  CheckCircle2, Phone, Clock, ArrowLeft, Zap, Rocket, User, Mail, Building2, Lock, ArrowRight, ShieldCheck,
} from 'lucide-react';
import pandaThumbsUp from '@/assets/panda-thumbs-up.png';

const DealerSignup = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company_name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.company_name || !form.password) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'aol.com', 'msn.com', 'protonmail.com', 'gmx.com', 'mail.com', 'yandex.com'];
    const emailDomain = form.email.split('@')[1]?.toLowerCase();
    if (!emailDomain || personalDomains.includes(emailDomain)) {
      toast({
        title: 'Use your dealership email',
        description: 'Please sign up with your official dealership email address (not a personal Gmail/Yahoo/etc).',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dealer-portal/login`,
          data: { dealer_name: form.name, company_name: form.company_name },
        },
      });

      if (error) {
        if (error.message?.toLowerCase().includes('already')) {
          throw new Error('This email is already in use. Dealers must sign up with a different official dealership email address.');
        }
        throw error;
      }

      if (data.user) {
        const { error: dealerError } = await supabase.from('dealers').insert({
          user_id: data.user.id,
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          company_name: form.company_name,
        });
        if (dealerError) console.error('Dealer profile error:', dealerError);
        setSubmitted(true);
      }
    } catch (error: any) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fieldWrap = 'relative';
  const iconClass = 'absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400';
  const inputClass = 'w-full bg-gray-100 border border-gray-200 rounded-xl pl-12 pr-4 h-14 text-base text-gray-900 placeholder:text-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SEOHead title="Dealer Signup | Panda Protect" description="Create your dealer account in 60 seconds." />
      <DealerPublicHeader />

      <div className="flex-1 px-4 py-10 sm:py-14">
        {submitted ? (
          <Card className="w-full max-w-xl mx-auto bg-white border-2 border-orange-200 shadow-xl">
            <CardContent className="p-8 sm:p-10 text-center">
              <img src={pandaThumbsUp} alt="Panda Protect" className="w-32 h-auto mx-auto mb-4 drop-shadow-lg" />
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-bold tracking-wide mb-4">
                <CheckCircle2 className="h-3.5 w-3.5" /> APPLICATION RECEIVED
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
                Thanks, {form.name.split(' ')[0] || 'partner'}! 🎉
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your dealer application has been received.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Panda Protect hasn't officially launched yet, but we're getting everything ready behind the scenes. We're hoping to go live within the next couple of months, and as soon as we're ready, you'll be one of the first to know.
              </p>
              <p className="text-gray-700 leading-relaxed mb-6">
                Our team will keep your details on file and email you as soon as dealer accounts are available.
              </p>
              <div className="bg-[#fff8ef] border border-orange-200 rounded-2xl p-5 mb-4 text-left">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Coming soon</p>
                    <p className="text-sm text-gray-700">We'll be in touch as soon as Panda Protect launches.</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Need to contact us?</p>
                    <a href="mailto:hello@andyproject.co.dk" className="text-base font-black text-orange-600 hover:text-orange-700 tracking-tight">hello@andyproject.co.dk</a>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <Link to="/dealer-portal/"><Button variant="outline" className="border-gray-300">Back to Home</Button></Link>
                <Link to="/dealer-portal/login"><Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold">Go to Sign In</Button></Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full max-w-2xl mx-auto">
            {/* Heading */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="bg-orange-500 rounded-full p-2.5 shadow-md">
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                  Become a Panda Protect dealer
                </h1>
              </div>
              <div className="flex items-center justify-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-full px-3 py-1.5 transition"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="inline-flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                  <Zap className="h-4 w-4 text-orange-500" />
                  Set up your account in 60 seconds
                </div>
              </div>
            </div>

            {/* Form card */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">Your full name</label>
                <div className={fieldWrap}>
                  <User className={iconClass} />
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Smith" className={inputClass} required />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">Dealership email</label>
                <div className={fieldWrap}>
                  <Mail className={iconClass} />
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. you@yourdealership.co.uk" className={inputClass} required />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Use your official dealership email — personal Gmail / Yahoo are not accepted.</p>
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">Mobile number</label>
                <div className={fieldWrap}>
                  <Phone className={iconClass} />
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="UK mobile number" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">Company name</label>
                <div className={fieldWrap}>
                  <Building2 className={iconClass} />
                  <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="e.g. ABC Motors Ltd" className={inputClass} required />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">Choose a password</label>
                <div className={fieldWrap}>
                  <Lock className={iconClass} />
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className={inputClass} required />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Unlock dealer pricing, instant quotes & customer warranties.</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-orange-500 hover:bg-orange-600 text-white text-lg font-black rounded-2xl shadow-lg shadow-orange-500/20 transition"
              >
                {loading ? 'Creating account...' : (
                  <span className="inline-flex items-center gap-2">Create my dealer account <ArrowRight className="h-5 w-5" /></span>
                )}
              </Button>

              <div className="flex items-center justify-center gap-6 flex-wrap pt-2 text-sm text-gray-700">
                <div className="inline-flex items-center gap-1.5"><Rocket className="h-4 w-4 text-orange-500" /> Instant setup</div>
                <div className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-orange-500" /> Approved in 1–2 days</div>
                <div className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-orange-500" /> No obligation</div>
              </div>

              <p className="text-center text-sm text-gray-700">
                🔒 We never share your details. <span className="font-semibold text-gray-900">100% privacy guaranteed</span>
              </p>

              <p className="text-center text-sm text-gray-600 pt-2">
                Already have an account?{' '}
                <Link to="/dealer-portal/login" className="text-orange-600 hover:underline font-bold">Sign in</Link>
              </p>
            </form>

            {/* Footer help strip */}
            <div className="mt-10 pt-6 border-t border-gray-200 text-center">
              <p className="font-bold text-gray-900 mb-2">Need advice? We're here to help.</p>
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <a href="tel:03302295045" className="inline-flex items-center gap-2 text-orange-600 font-bold">
                  <Phone className="h-4 w-4" /> 0330 229 5045
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealerSignup;
