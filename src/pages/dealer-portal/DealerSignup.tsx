import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { CheckCircle2, Phone, Clock } from 'lucide-react';
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

    // Block free/personal email providers — dealers must use an official dealership domain
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

        if (dealerError) {
          console.error('Dealer profile error:', dealerError);
        }

        setSubmitted(true);
      }
    } catch (error: any) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SEOHead title="Dealer Signup | BuyAWarranty" description="Create your dealer account in 60 seconds." />
      <DealerPublicHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-[#fff8ef]">
        {submitted ? (
          <Card className="w-full max-w-xl bg-white border-2 border-orange-200 shadow-xl">
            <CardContent className="p-8 sm:p-10 text-center">
              <img
                src={pandaThumbsUp}
                alt="BuyAWarranty panda mascot"
                className="w-32 h-auto mx-auto mb-4 drop-shadow-lg"
              />
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-bold tracking-wide mb-4">
                <CheckCircle2 className="h-3.5 w-3.5" /> APPLICATION RECEIVED
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
                Thanks, {form.name.split(' ')[0] || 'partner'}! 🎉
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                Your dealer application is in. Our team will review and approve your account within{' '}
                <strong className="text-gray-900">1–2 working days</strong>. We'll email you as soon as you're set up.
              </p>

              <div className="bg-[#fff8ef] border border-orange-200 rounded-2xl p-5 mb-6 text-left">
                <div className="flex items-start gap-3 mb-3">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Approval window</p>
                    <p className="text-sm text-gray-700">1–2 working days</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Need it faster? Give us a call</p>
                    <a
                      href="tel:03302295045"
                      className="text-lg font-black text-orange-600 hover:text-orange-700 tracking-tight"
                    >
                      0330 229 5045
                    </a>
                    <p className="text-xs text-gray-600 mt-0.5">Mon–Fri, 9am–5:30pm</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap justify-center">
                <Link to="/dealer-portal/">
                  <Button variant="outline" className="border-gray-300">Back to Home</Button>
                </Link>
                <Link to="/dealer-portal/login">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
                    Go to Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md bg-white border-2 border-gray-200 shadow-xl relative">
            <img
              src={pandaThumbsUp}
              alt="BuyAWarranty panda mascot"
              className="hidden sm:block w-28 h-auto absolute -top-16 -right-10 drop-shadow-lg pointer-events-none"
            />
            <CardHeader className="text-center">
              <Link to="/dealer-portal/" className="inline-block mb-4">
                <img src="/lovable-uploads/53652a24-3961-4346-bf9d-6588ef727aeb.png" alt="Buy a Warranty" className="h-8 mx-auto" />
              </Link>
              <span className="inline-block text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded mb-2 tracking-wider">DEALER PORTAL</span>
              <CardTitle className="text-2xl font-black text-gray-900">Create Dealer Account</CardTitle>
              <CardDescription className="text-gray-600">Get started in 60 seconds</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Full Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" required className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Email *</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="dealer@example.com" required className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Phone</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07700 900000" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Company Name *</label>
                  <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="ABC Motors Ltd" required className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Password *</label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" required className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-5 p-3 bg-[#fff8ef] border border-orange-200 rounded-lg text-xs text-gray-700 text-center">
                Accounts are reviewed and approved within <strong>1–2 working days</strong>.
                <br />
                Need it sooner? Call <a href="tel:03302295045" className="font-bold text-orange-600">0330 229 5045</a>
              </div>

              <p className="text-center text-sm text-gray-600 mt-6">
                Already have an account?{' '}
                <Link to="/dealer-portal/login" className="text-orange-600 hover:underline font-bold">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DealerSignup;
