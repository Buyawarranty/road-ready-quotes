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
  Lock,
  UserCircle2,
  PoundSterling as PoundIcon,
  Headphones,
  BarChart2,
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
    navigate(`/dealer-portal/quote/pricing?reg=${encodeURIComponent(cleaned)}`);
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
      <section className="bg-white pt-10 pb-12 lg:pt-14 lg:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="text-xs sm:text-sm font-bold tracking-[0.2em] text-[#eb4b00] uppercase">
                Trader Warranty Solutions
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight">
                <span className="text-gray-900">Sell more warranties.</span>
                <br />
                <span className="text-[#eb4b00]">Grow your business.</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                Instant quotes. Flexible cover. Fast issuance. Everything you need to protect your customers and boost your bottom line.
              </p>

              <div className="space-y-3">
                <div className="text-sm font-bold text-gray-900">Get an instant trade quote</div>
                <form onSubmit={handleRegSubmit} aria-label="Vehicle registration lookup">
                  <div className="flex items-stretch rounded-xl overflow-hidden shadow-lg w-full max-w-xl">
                    <div className="flex flex-col items-center justify-center bg-blue-700 text-white px-4 select-none">
                      <span className="text-base leading-none" aria-hidden>🇬🇧</span>
                      <span className="text-[10px] font-bold tracking-wider mt-1">UK</span>
                    </div>
                    <input
                      id="hero-reg"
                      type="text"
                      autoComplete="off"
                      maxLength={10}
                      value={reg}
                      onChange={(e) => setReg(e.target.value.toUpperCase())}
                      placeholder="ENTER REG"
                      aria-label="Vehicle registration"
                      className="flex-1 min-w-0 bg-yellow-400 text-gray-900 placeholder:text-gray-700/60 font-extrabold tracking-[0.2em] text-2xl sm:text-3xl uppercase px-4 py-4 outline-none border-0"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-5 sm:px-7 text-base whitespace-nowrap transition-colors"
                    >
                      Get Quote
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </form>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Lock className="w-4 h-4" />
                  Secure DVLA lookup – no manual data entry
                </div>
              </div>
            </div>

            {/* Dashboard mockup + Panda */}
            <div className="hidden lg:block relative">
              <div className="w-full rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-white">
                <div className="flex">
                  <div className="bg-[#0f1729] text-gray-300 p-3 space-y-1 text-[11px] w-32 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="w-6 h-6 rounded-md bg-[#eb4b00] flex items-center justify-center text-white text-[10px] font-black">P</div>
                    </div>
                    {['Dashboard', 'Quotes', 'Policies', 'Customers', 'Claims', 'Reports', 'Marketing', 'Settings', 'Support'].map((it, i) => (
                      <div key={it} className={`px-2 py-1.5 rounded ${i === 0 ? 'bg-white/10 text-white font-semibold' : ''}`}>{it}</div>
                    ))}
                  </div>
                  <div className="flex-1 p-3 bg-gray-50 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-bold text-gray-900">Dashboard</div>
                      <div className="text-[9px] px-2 py-1 rounded border border-gray-200 bg-white text-gray-600">1 – 31 May 2024</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { l: 'Quotes Today', v: '32', d: '↑ 24%' },
                        { l: 'Policies Sold', v: '21', d: '↑ 18%' },
                        { l: 'Revenue', v: '£5,620', d: '↑ 22%' },
                        { l: 'Conversion Rate', v: '66%', d: '↑ 9%' },
                      ].map((s) => (
                        <div key={s.l} className="bg-white rounded-md p-2 border border-gray-100">
                          <div className="text-[8px] text-gray-500 leading-tight">{s.l}</div>
                          <div className="text-sm font-bold text-gray-900 mt-0.5">{s.v}</div>
                          <div className="text-[8px] text-green-600 font-semibold mt-0.5">{s.d} vs yesterday</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 bg-white rounded-md p-2 border border-gray-100">
                        <div className="text-[10px] font-bold text-gray-900 mb-2">Recent Quotes</div>
                        <div className="space-y-1">
                          {[
                            ['AB12 CDE', 'BMW 320d', '£499', 'Gold'],
                            ['EF21 GHI', 'Audi A4', '£425', 'Silver'],
                            ['GJ71 KLM', 'VW Golf', '£399', 'Silver'],
                            ['MN19 OPQ', 'Ford Focus', '£349', 'Bronze'],
                            ['RS18 TUV', 'Mercedes C200', '£599', 'Gold'],
                          ].map((r) => (
                            <div key={r[0]} className="grid grid-cols-4 text-[8px] text-gray-700 items-center gap-1">
                              <div className="font-semibold">{r[0]}</div>
                              <div>{r[1]}</div>
                              <div>{r[2]}</div>
                              <div className="justify-self-end text-[#eb4b00] font-semibold">Quote Sent</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[8px] text-[#eb4b00] font-semibold mt-2">View all quotes →</div>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-white rounded-md p-2 border border-gray-100">
                          <div className="text-[10px] font-bold text-gray-900 mb-1.5">Quick Quote</div>
                          <div className="text-[8px] text-gray-500 mb-0.5">Registration</div>
                          <div className="bg-yellow-400 rounded text-center text-[9px] font-black text-gray-900 py-1 mb-1.5">ENTER REG</div>
                          <div className="text-[8px] text-gray-500 mb-0.5">Mileage</div>
                          <div className="bg-white border border-gray-200 rounded text-[8px] text-gray-400 px-1.5 py-1 mb-1.5">Enter mileage</div>
                          <div className="bg-[#eb4b00] text-white text-[8px] font-bold rounded text-center py-1">Get Quote →</div>
                        </div>
                        <div className="bg-white rounded-md p-2 border border-gray-100">
                          <div className="text-[10px] font-bold text-gray-900 mb-1.5">Top Cover Levels</div>
                          <div className="space-y-1 text-[8px] text-gray-700">
                            <div className="flex justify-between"><span>● Gold</span><span className="font-semibold">45%</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">● Silver</span><span className="font-semibold">35%</span></div>
                            <div className="flex justify-between"><span className="text-[#eb4b00]">● Bronze</span><span className="font-semibold">20%</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <img
                src={pandaMechanicImage}
                alt="Panda mascot"
                className="hidden xl:block absolute -right-6 -bottom-4 w-40 pointer-events-none select-none"
              />
            </div>
          </div>

          {/* Feature pills */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { icon: PoundIcon, title: 'High Profit Margins', body: 'Competitive rates and great commission' },
              { icon: Zap, title: 'Fast & Simple', body: 'Quote, issue and manage policies in minutes' },
              { icon: Shield, title: 'Flexible Products', body: 'A range of levels to suit every customer' },
              { icon: Headphones, title: 'Dealer Support', body: 'Dedicated account managers' },
              { icon: BarChart2, title: 'Powerful Tools', body: 'Track performance and grow your sales' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-[#eb4b00]" />
                </div>
                <div className="text-sm font-bold text-gray-900 mb-1">{title}</div>
                <div className="text-xs text-gray-600 leading-snug">{body}</div>
              </div>
            ))}
          </div>

          {/* Dealer CTA strip */}
          <div className="mt-10 bg-[#0f1729] rounded-2xl p-6 lg:p-8">
            <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#eb4b00] flex items-center justify-center flex-shrink-0">
                  <UserCircle2 className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-white font-bold">Already a dealer?</div>
                    <div className="text-white/70 text-sm">Log in to manage quotes, policies and customers.</div>
                  </div>
                  <Link
                    to="/dealer-portal/login"
                    className="inline-flex items-center justify-center gap-2 border border-white/40 hover:border-white text-white font-semibold px-5 py-3 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Dealer Login
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-4 md:border-l md:border-white/10 md:pl-10">
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-white font-bold">Not signed up yet?</div>
                    <div className="text-white/70 text-sm">Join our dealer network and start selling warranties today.</div>
                  </div>
                  <Link
                    to="/dealer-portal/signup"
                    className="inline-flex items-center justify-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-5 py-3 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Become a Dealer
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
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
