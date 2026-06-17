import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight,
  Check,
  Headphones,
  PoundSterling,
  Sliders,
  Award,
  FileText,
  Tag,
  LayoutDashboard,
  Package,
  Image as ImageIcon,
  UserCheck,
  Clock,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import DealerFAQSection from '@/components/dealer/DealerFAQSection';
import DealerFAQSchema from '@/components/dealer/DealerFAQSchema';

const ClaimsHandlingService = () => {
  const pageTitle = 'Dealer Warranty Claims Handling | Panda Protect';
  const pageDescription =
    'Streamline dealer warranty claims handling with digital processes, trade support and clear repair authorisation workflows from Panda Protect.';
  const canonical = 'https://pandaprotect.co.uk/dealer-portal/claims-handling';

  const managementBenefits = [
    {
      icon: Tag,
      title: 'Competitive pricing',
      body: 'Our rates are structured to protect your margins while maintaining high conversion levels.',
    },
    {
      icon: FileText,
      title: 'Set administration fees, not percentages',
      body: 'Flat-fee pricing keeps your costs fixed regardless of the vehicle’s retail price.',
    },
    {
      icon: LayoutDashboard,
      title: 'Monthly financial statements',
      body: 'Automated reports delivered every month to simplify your accounting and performance tracking.',
    },
    {
      icon: Headphones,
      title: 'Dealer portal for warranty registrations',
      body: 'Register policies and manage customer data through a single, centralised digital interface.',
    },
    {
      icon: Package,
      title: 'Tailor-made products',
      body: 'Coverage plans built specifically to suit your vehicle inventory and business model.',
    },
    {
      icon: ImageIcon,
      title: 'Personalised promotional material',
      body: 'Co-branded assets that integrate your logo and identity into the sales process.',
    },
  ];

  const differentiators = [
    {
      icon: UserCheck,
      title: 'Allocated claims manager',
      body: 'A dedicated contact handles your account to ensure consistent communication and faster approvals.',
    },
    {
      icon: Clock,
      title: 'Repairs authorised today, paid tomorrow',
      body: 'Funds reach your account the day after a claim is approved — guaranteed within 24 hours.',
    },
    {
      icon: ShieldCheck,
      title: 'We do warranties differently',
      body: 'A transparent, easy-to-use model designed to move beyond standard industry restrictions.',
    },
    {
      icon: Users,
      title: 'Dealers trust us to fix what others broke',
      body: 'We step in to restore service standards for dealers let down by previous providers.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Dealer Claims Handling Warranty',
          provider: { '@type': 'Organization', name: 'Panda Protect' },
          areaServed: 'GB',
          description: pageDescription,
        })}</script>
      </Helmet>
      <DealerPublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 via-white to-amber-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-5">
            <Headphones className="w-4 h-4" /> Your Warranty Partner
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 mb-5">
            Your Warranty Partner
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Why hundreds of UK dealers entrust us as their warranty partner — providing aftercare to
            over 7,000 new customers every month.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/dealer-portal/signup?plan=claims-handling"
              className="inline-flex items-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Become a Partner Dealer <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/dealer-portal/full-warranty"
              className="inline-flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-800 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Compare Full Warranty
            </Link>
          </div>
        </div>
      </section>

      {/* Simplified Warranty Management */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Simplified warranty management
            </h2>
            <p className="text-gray-600 text-lg">
              We provide the pricing, tools and support you need to manage warranties without the
              usual administrative headaches.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {managementBenefits.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-[#eb4b00]/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-[#eb4b00]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What makes us different */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              What makes us different
            </h2>
            <p className="text-gray-600 text-lg">
              We move beyond standard industry restrictions to focus on fast approvals and
              transparent dealer support.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {differentiators.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#eb4b00]/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#eb4b00]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Hundreds of dealers trust us because we make warranties work
          </h2>
          <p className="text-gray-600 text-lg">
            Our growing UK dealer network relies on us because we prioritise functional coverage
            over complex fine print.
          </p>
        </div>
      </section>

      {/* How it works (kept brief) */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Sliders, title: 'You set the terms', body: 'Choose excess, labour rates and claim limits that suit your business.' },
              { icon: Headphones, title: 'We handle claims', body: 'Customers call our dedicated team. We assess and approve the repair.' },
              { icon: PoundSterling, title: 'Paid within 24 hours', body: 'Approved repair funds reach your account the very next day — guaranteed.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="w-11 h-11 rounded-xl bg-[#eb4b00]/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-[#eb4b00]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DealerFAQSection bgClassName="bg-gray-50" />
      <DealerFAQSchema />

      {/* CTA */}
      <section className="py-16 bg-[#0f1729]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <Award className="w-10 h-10 text-[#eb4b00] mx-auto mb-3" />
          <h2 className="text-3xl font-bold mb-3">Make us your warranty partner</h2>
          <p className="text-white/80 mb-6">
            Sign up in 60 seconds. No setup fees. Dedicated claims manager from day one.
          </p>
          <Link
            to="/dealer-portal/signup?plan=claims-handling"
            className="inline-flex items-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-7 py-3.5 rounded-lg transition-colors"
          >
            Become a Dealer <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ClaimsHandlingService;
