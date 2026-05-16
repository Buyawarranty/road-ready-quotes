import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check, Headphones, PoundSterling, Wrench, Sliders, Award, Users } from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';

const ClaimsHandlingService = () => {
  const pageTitle = 'Claims Handling for Dealers | Dealer-Paid Warranty';
  const pageDescription =
    'Run your own dealer-paid warranty — we handle every claim from start to finish, you fund the repairs. Full control, low cost.';
  const canonical = 'https://pandaprotect.co.uk/dealer-portal/claims-handling';

  const features = [
    'You set your own terms, excess and claim limit',
    'We manage every claim from start to finish',
    'Trained UK claims agents — 24/7 phone & email',
    'You fund repair payouts at trade rates',
    'Branded claims portal for your customers',
    'Just £1.20/month per policy — no setup fees',
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
      <section className="bg-gradient-to-br from-orange-50 via-white to-amber-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-5">
            <Headphones className="w-4 h-4" /> Service 2 of 2 · Dealer-Paid
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 mb-5">
            Claims Handling Only
            <br />
            <span className="text-[#eb4b00]">You fund the repairs.</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Run your own warranty programme with our expert claims team behind you. Keep full control
            of pricing and terms — we look after every customer call.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/dealer-portal/signup?plan=claims-handling"
              className="inline-flex items-center gap-2 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Sign up for Claims Handling <ArrowRight className="w-4 h-4" />
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

      {/* What's included */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">What's included</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="w-7 h-7 rounded-full bg-[#eb4b00] flex items-center justify-center shrink-0 mt-0.5">
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
              { icon: Sliders, title: 'You set the terms', body: 'Choose excess, labour rates and claim limits that suit your business.' },
              { icon: Headphones, title: 'We handle calls', body: 'Customer rings us. We assess the claim and book the repair.' },
              { icon: PoundSterling, title: 'You pay the garage', body: 'We send you the approved invoice — you settle at trade cost.' },
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

      {/* CTA */}
      <section className="py-16 bg-[#0f1729]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <Award className="w-10 h-10 text-[#eb4b00] mx-auto mb-3" />
          <h2 className="text-3xl font-bold mb-3">Ready to run your own warranty programme?</h2>
          <p className="text-white/80 mb-6">Sign up in 60 seconds. No setup fees. We handle claims from day one.</p>
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
