import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Check,
  ArrowRight,
  Phone,
  Mail,
  Shield,
  TrendingUp,
  Zap,
  HandshakeIcon,
  PoundSterling,
  Clock,
  Wrench,
  Award,
  Users,
  BarChart3,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/OptimizedImage';
import pandaMechanicImage from '@/assets/panda-mechanic-car.png';

/**
 * Dealer home (/dealer-portal/) — trade-focused landing page.
 * SEO targets: dealer extended warranties, motor trade warranty, dealer programme UK.
 */
const DealerHome = () => {
  const navigate = useNavigate();
  const [reg, setReg] = useState('');

  const handleRegSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = reg.trim().toUpperCase().replace(/\s+/g, ' ');
    if (!cleaned) return;
    navigate(`/dealer-portal/quote/vehicle?reg=${encodeURIComponent(cleaned)}`);
  };

  const pageTitle = 'Dealer Extended Warranties UK | Motor Trade Warranty Programme';
  const pageDescription =
    'Boost dealer profits today. Offer extended warranties from 20p a day, sign up in 60 seconds and start earning with the UK\'s trusted dealer warranty partner.';
  const canonical = 'https://pandaprotect.co.uk/dealer-portal/';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Dealer Extended Warranty Programme',
    provider: {
      '@type': 'Organization',
      name: 'Panda Protect',
      url: 'https://pandaprotect.co.uk',
    },
    areaServed: 'GB',
    audience: { '@type': 'BusinessAudience', audienceType: 'Motor Trade Dealers' },
    description: pageDescription,
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="dealer extended warranties, motor trade warranty, dealer warranty programme UK, trade warranty, dealer warranty deals, used car dealer warranty, dealer partnership, dealer portal warranty, dealer warranty solutions, exclusive trade warranty"
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <DealerPublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <span className="inline-block bg-orange-100 text-[#eb4b00] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full">
                For Motor Trade Dealers
              </span>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                Boost Dealer Profits with{' '}
                <span className="text-[#eb4b00]">Extended Warranties from 20p a day</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Join the UK's trusted dealer warranty partner. Sign up in 60 seconds, sell more cars
                and earn extra revenue on every vehicle with our motor trade warranty programme.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/dealer-portal/signup"
                  className="inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-7 py-4 text-base rounded-lg transition-colors"
                >
                  Free Dealer Sign-Up – 60 Seconds
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/dealer-portal/login"
                  className="inline-flex items-center justify-center px-7 py-4 text-base font-semibold text-gray-900 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  Dealer Login
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  'Sign up in 60 seconds',
                  'Exclusive trade pricing',
                  'Easy claims, fast payouts',
                  'Dedicated dealer support',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:flex items-center justify-center">
              <OptimizedImage
                src={pandaMechanicImage}
                alt="Dealer extended warranty programme – Panda Protect trusted UK partner"
                className="w-full max-w-[420px] h-auto object-contain"
                priority
                width={420}
                height={336}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section id="why-us" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Grow Sales with Dealer Extended Warranties
            </h2>
            <p className="text-lg text-gray-600">
              Unlock extra profit on every car. Our dealer programme is designed to maximise dealer
              margins and drive more sales — easily.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: PoundSterling,
                title: 'Maximise Dealer Margins',
                body: 'Exclusive trade warranty pricing and competitive commissions on every policy you sell.',
              },
              {
                icon: TrendingUp,
                title: 'Sell More Cars Today',
                body: 'Adding a warranty closes deals faster and increases customer confidence at point of sale.',
              },
              {
                icon: Zap,
                title: 'Quick Dealer Sign-Up',
                body: '60-second onboarding via the dealer portal — start selling warranties the same day.',
              },
              {
                icon: Shield,
                title: 'Trusted UK Warranty Partner',
                body: 'Cover for 1,400+ mechanical and electrical parts, backed by a 5-star rated UK provider.',
              },
              {
                icon: HandshakeIcon,
                title: 'Exclusive Trade Warranty',
                body: 'Premium dealer pricing, bulk discounts and a dealer programme that pays.',
              },
              {
                icon: BarChart3,
                title: 'Dealer Dashboard',
                body: 'Manage quotes, warranties and claims in one place. Real-time tracking and analytics.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="bg-gray-50 rounded-2xl p-7 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-[#eb4b00]/10 rounded-xl flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-[#eb4b00]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Join Our Dealer Programme – Start Earning Today
            </h2>
            <p className="text-lg text-gray-600">
              Quick dealer account registration. Three simple steps to start selling extended
              warranties with full dealer support.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Free Dealer Sign-Up',
                body: 'Register your dealership in 60 seconds. No setup fees, no contracts.',
              },
              {
                step: '2',
                title: 'Quote in Seconds',
                body: 'Use the dealer portal to generate instant warranty quotes for any vehicle.',
              },
              {
                step: '3',
                title: 'Start Earning',
                body: 'Sell warranties from 20p a day and grow your dealership profits.',
              },
            ].map(({ step, title, body }) => (
              <div
                key={step}
                className="bg-white rounded-2xl p-7 border border-gray-200 relative"
              >
                <div className="absolute -top-4 left-7 w-9 h-9 bg-[#eb4b00] text-white rounded-full flex items-center justify-center font-bold">
                  {step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 mt-2">{title}</h3>
                <p className="text-gray-600">{body}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/dealer-portal/signup"
              className="inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-8 py-4 text-base rounded-lg transition-colors"
            >
              Quick Dealer Sign-Up
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Claims */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Easy Claims, Fast Payouts
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Claims made easy and quick — keep your customers happy and your reputation strong.
                No hassle, instant payouts to VAT-registered UK garages.
              </p>
              <ul className="space-y-3">
                {[
                  'Quick claims with instant payouts',
                  'Repairs at any VAT-registered UK garage',
                  'Unlimited claims during cover period',
                  '24/7 breakdown assistance',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Clock, label: '60s Sign-Up' },
                { icon: Wrench, label: '1,400+ Parts' },
                { icon: Award, label: '5-Star Rated' },
                { icon: Users, label: '20k+ Customers' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100"
                >
                  <Icon className="w-8 h-8 text-[#eb4b00] mx-auto mb-2" />
                  <div className="font-bold text-gray-900">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Resources / Trust */}
      <section id="resources" className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Dealer Support &amp; Resources
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-10">
            Motor trade warranty solutions tailored for your business. Partner with warranty experts
            for reliable, dealer-friendly automotive cover.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                title: 'Dealer Benefits & Pricing',
                body: 'Premium trade pricing that maximises your margins on every sale.',
              },
              {
                title: 'Dealer Partnership Solutions',
                body: 'Flexible programmes that increase profitability for any size dealership.',
              },
              {
                title: 'Trusted Warranty Provider UK',
                body: 'Backed by a 5-star rated UK warranty provider with proven claims handling.',
              },
            ].map((c) => (
              <div key={c.title} className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-2">{c.title}</h3>
                <p className="text-gray-600 text-sm">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="py-16 bg-[#284185]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Partner with a Trusted UK Warranty Provider
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Talk to our dealer team about exclusive motor trade warranty deals and onboarding.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
            <a
              href="tel:03302295045"
              className="flex items-center gap-2 text-white hover:text-white/80 font-medium text-lg"
            >
              <Phone size={20} />
              0330 229 5045
            </a>
            <a
              href="mailto:dealers@pandaprotect.co.uk"
              className="flex items-center gap-2 text-white hover:text-white/80 font-medium text-lg"
            >
              <Mail size={20} />
              dealers@pandaprotect.co.uk
            </a>
          </div>

          <Link
            to="/dealer-portal/signup"
            className="inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-8 py-4 text-base rounded-lg transition-colors"
          >
            Dealer Programme Sign Up
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default DealerHome;
