import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { isAdminRole } from '@/lib/adminRoles';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  Zap,
  PoundSterling,
  Shield,
  Phone,
  HelpCircle,
} from 'lucide-react';

const DealerLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUnconfirmedEmail(null);
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          setUnconfirmedEmail(email);
          toast({
            title: 'Email not confirmed',
            description: 'Please click the confirmation link we emailed you, then sign in.',
            variant: 'destructive',
          });
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
        const isAdmin = (roles || []).some((r: any) => isAdminRole(r.role as string));
        if (isAdmin) {
          const redirect = searchParams.get('redirect');
          navigate(redirect && redirect.startsWith('/dealer') ? redirect : '/dealer-admin');
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
        toast({ title: 'Access denied', description: 'No dealer account found for this email.', variant: 'destructive' });
        return;
      }

      const redirect = searchParams.get('redirect');
      const reg = searchParams.get('reg') || localStorage.getItem('dealerPendingReg');
      if (redirect) {
        const target = reg ? `${redirect}?reg=${encodeURIComponent(reg)}` : redirect;
        navigate(target);
      } else {
        navigate('/dealer-portal/dashboard');
      }
    } catch (error: any) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: unconfirmedEmail,
      options: { emailRedirectTo: `${window.location.origin}/dealer-portal/login` },
    });
    if (error) {
      toast({ title: 'Could not resend', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Confirmation email sent', description: 'Check your inbox (and spam folder).' });
    }
  };

  const benefits = [
    { icon: Zap, title: 'Sign up in 60 seconds', body: 'No setup fees, no contracts.' },
    { icon: PoundSterling, title: 'Earn from 20p a day', body: 'Exclusive trade pricing on every policy.' },
    { icon: Shield, title: 'Trusted UK partner', body: 'Easy claims, fast payouts to any UK garage.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEOHead title="Dealer Login | Panda Protect" description="Sign in to your dealer portal — or create a free dealer account in 60 seconds." />
      <DealerPublicHeader />

      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.05fr] gap-8 items-stretch">
          {/* Left — Login Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7 sm:p-9 order-2 lg:order-1">
            <div className="mb-6">
              <span className="inline-block text-[11px] font-bold tracking-[0.18em] text-orange-600 bg-orange-100 px-2.5 py-1 rounded uppercase mb-3">
                Dealer Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-600 mt-1">Sign in to manage quotes, warranties and claims.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourdealership.co.uk"
                  required
                  className="h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-800">
                    Password
                  </label>
                  <Link to="/forgot-password/" className="text-xs font-medium text-orange-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-11 pr-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {unconfirmedEmail && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="mb-2">
                    Your email <strong>{unconfirmedEmail}</strong> hasn't been confirmed yet. Check your inbox for the confirmation link.
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

              <Button
                type="submit"
                className="w-full h-12 text-base bg-[#eb4b00] hover:bg-[#d63f00] text-white font-semibold"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in to dealer portal'}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs uppercase tracking-wider text-gray-500">New here?</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Link
              to="/dealer-portal/signup"
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-md border-2 border-[#eb4b00] text-[#eb4b00] font-semibold hover:bg-orange-50 transition-colors"
            >
              Create your free dealer account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-center text-xs text-gray-500 mt-2">Takes less than 60 seconds. No card required.</p>

            <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
              <a href="tel:03302295045" className="inline-flex items-center gap-1.5 text-gray-700 hover:text-gray-900">
                <Phone className="w-4 h-4 text-orange-500" />
                Dealer support · 0330 229 5045
              </a>
              <Link to="/dealer-portal/" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800">
                <HelpCircle className="w-4 h-4" />
                What is the dealer portal?
              </Link>
            </div>
          </div>

          {/* Right — Benefits / First-time visitor panel */}
          <aside className="rounded-2xl bg-gradient-to-br from-[#1e3a5f] via-[#284185] to-[#1e3a5f] text-white p-7 sm:p-10 order-1 lg:order-2 flex flex-col justify-between">
            <div>
              <span className="inline-block text-[11px] font-bold tracking-[0.18em] bg-white/10 backdrop-blur px-2.5 py-1 rounded uppercase mb-4">
                For Motor Trade Dealers
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-3" style={{ color: '#ffffff' }}>
                Sell more cars with extended warranties from{' '}
                <span style={{ color: '#fdba74' }}>20p a day</span>
              </h2>
              <p className="mb-7" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Join hundreds of UK dealers boosting margins with Panda Protect. Quote, sell and manage warranties from one simple portal.
              </p>

              <ul className="space-y-4 mb-8">
                {benefits.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-orange-300" />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: '#ffffff' }}>{title}</p>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Free dealer sign-up',
                  'Exclusive trade pricing',
                  'Easy claims, fast payouts',
                  'Dedicated UK support',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-white/90">
                    <Check className="w-4 h-4 text-orange-300 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <Link
                to="/dealer-portal/signup"
                className="block w-full text-center bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold py-3.5 rounded-lg transition-colors"
              >
                Get started — Free dealer sign-up
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default DealerLogin;
