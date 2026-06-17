import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check, ShieldCheck, Wrench, PoundSterling, Headphones, Award, Users } from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import DealerFAQSection from '@/components/dealer/DealerFAQSection';
import DealerFAQSchema from '@/components/dealer/DealerFAQSchema';

const FullWarrantyService = () => {
  const pageTitle = 'Dealer Vehicle Warranty Programme | Panda Protect';
  const pageDescription =
    'Join a dealer vehicle warranty programme that helps motor retailers offer added value, improve retention and support aftersales revenue.';
  const canonical = 'https://pandaprotect.co.uk/dealer-portal/full-warranty';

  const features = [
    'All mechanical & electrical components covered',
    'Parts, labour & VAT included in every claim',
    'Nationwide UK repair network',
    '24/7 claims assistance for your customers',
    'Customer choice of excess, term and claim limit',
    'Optional add-ons: EV battery, recovery, hire car',
  ];

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <DealerPublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-orange-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-5">
            <ShieldCheck className="w-4 h-4" /> Service 1 of 2 · Fully Covered
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 mb-5">
            Full Warranty Cover
            <br />
            <span className="text-[#eb4b00]">We pay the repairs.</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Offer your customers a fully insured extended warranty. We handle every claim and we pay
            the repair payouts — you focus on selling cars.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/dealer-portal/signup?plan=full-warranty"
              className="inline-flex items-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Sign up for Full Warranty <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/dealer-portal/claims-handling"
              className="inline-flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-800 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Compare Claims Handling
            </Link>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">What's included</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
                <span className="text-gray-800 font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'Customer buys', body: 'You sell the warranty with the car. Instant policy issue.' },
              { icon: Wrench, title: 'They claim', body: 'Customer contacts our 24/7 claims team. We approve & assign a garage.' },
              { icon: PoundSterling, title: 'We pay', body: 'We settle the repair invoice directly with the garage. No cost to you.' },
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

      <DealerFAQSection bgClassName="bg-white" />
      <DealerFAQSchema />

      {/* CTA */}
      <section className="py-16 bg-[#0f1729]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <Award className="w-10 h-10 text-[#eb4b00] mx-auto mb-3" />
          <h2 className="text-3xl font-bold mb-3">Ready to offer fully insured warranties?</h2>
          <p className="text-white/80 mb-6">Sign up in 60 seconds. No setup fees. Start selling today.</p>
          <Link
            to="/dealer-portal/signup?plan=full-warranty"
            className="inline-flex items-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-7 py-3.5 rounded-lg transition-colors"
          >
            Become a Dealer <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default FullWarrantyService;
