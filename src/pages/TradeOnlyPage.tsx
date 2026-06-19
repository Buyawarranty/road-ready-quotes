import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Check,
  ArrowRight,
  Mail,
  Phone,
  Shield,
  TrendingUp,
  HandshakeIcon,
  Zap,
  PoundSterling,
  Wrench,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { Button } from '@/components/ui/button';

/**
 * Generic trade-only landing page.
 *
 * Rendered for every former-retail public URL so that any traffic landing on
 * the old retail routes sees Panda Protect trade-focused content and is
 * directed to the dealer signup, not the retail funnel.
 *
 * Per-route title/intro is derived from the current pathname so the same
 * component serves /what-is-covered, /claims, /van-warranty, /warranty-types,
 * etc. Bespoke pages can be added later for the highest-traffic routes.
 */

type RouteCopy = {
  title: string;
  subtitle: string;
  intro: string;
};

const DEFAULT_COPY: RouteCopy = {
  title: 'Trade warranties for UK motor dealers',
  subtitle: 'Panda Protect is a trade-only warranty programme.',
  intro:
    'This section is part of the Panda Protect dealer programme. We work exclusively with franchised, independent and used-car dealers to provide branded warranty cover for the vehicles you sell. Retail customers cannot buy direct.',
};

const ROUTE_COPY: Record<string, RouteCopy> = {
  '/what-is-covered': {
    title: 'What dealer warranty cover includes',
    subtitle: 'Comprehensive mechanical and electrical cover for the cars you sell.',
    intro:
      'Panda Protect dealer warranties cover the major mechanical and electrical components of the vehicles on your forecourt — engine, gearbox, drivetrain, electrics, cooling, fuel and steering — with claim limits and labour rates designed for trade. Sign up to see the full cover schedule and dealer pricing.',
  },
  '/claims': {
    title: 'Dealer-handled claims, fast turnaround',
    subtitle: 'A claims process built around your workshop, not the end customer.',
    intro:
      'Our claims team works directly with your service department or chosen repairer. Funds are released on authorisation, not on completion, so you keep cars moving and customers happy. Become a Panda Protect dealer to access the claims portal.',
  },
  '/make-a-claim': {
    title: 'Already a Panda Protect dealer? Lodge a claim',
    subtitle: 'Dealer claims are submitted via the dealer portal.',
    intro:
      'If you sold a vehicle with a Panda Protect dealer warranty, please submit the claim through your dealer portal so we can dispatch funds straight to your workshop. Not yet on the programme? Apply below.',
  },
  '/cancel-warranty': {
    title: 'Cancel or amend a dealer-issued warranty',
    subtitle: 'For dealers managing their issued policies.',
    intro:
      'Dealer-issued warranty cancellations and amendments are handled inside the dealer portal. If you need help, email hello@pandaprotect.co.uk and we will action it the same working day.',
  },
  '/warranty-transfer': {
    title: 'Transfer cover when a vehicle changes hands',
    subtitle: 'Keep cover live when the car moves to its next owner.',
    intro:
      'Panda Protect warranties can be transferred between owners by the issuing dealer. The full transfer process is documented in the dealer portal — sign up or sign in below.',
  },
  '/contact-us': {
    title: 'Talk to the Panda Protect trade team',
    subtitle: 'We support UK motor dealers — not retail buyers.',
    intro:
      'Whether you want to join the programme, ask about cover, or need help on an existing policy, email hello@pandaprotect.co.uk and we will be back to you on the same working day.',
  },
  '/complaints': {
    title: 'Complaints handling for dealers',
    subtitle: 'How to raise a concern with Panda Protect.',
    intro:
      'If you are a dealer or end customer with a concern about a Panda Protect product, please email hello@pandaprotect.co.uk with the policy or registration number. We acknowledge complaints within one working day and aim to resolve within 14 days.',
  },
  '/warranty-plan': {
    title: 'Panda Protect dealer warranty plans',
    subtitle: 'Trade-only cover tiers for franchised and independent dealers.',
    intro:
      'We offer flexible cover tiers — Basic, Essential, Elite — designed for the kind of stock you sell, with dealer-friendly claim limits, labour rates and exclusions. Pricing is shown inside the dealer portal once you are approved.',
  },
  '/discount-promo-offers': {
    title: 'Dealer programme offers',
    subtitle: 'Volume pricing and onboarding offers for new dealers.',
    intro:
      'We run regular onboarding promotions for dealers joining the Panda Protect programme. Sign up and our team will share the current offers and your volume tier.',
  },
  '/buy-a-used-car-warranty-reliable-warranties': {
    title: 'Reliable used-car warranties for forecourts',
    subtitle: 'Branded warranty cover for the used cars you sell.',
    intro:
      'Add Panda Protect cover to every used car on your forecourt. Protect your margin from comeback costs and give customers confidence at handover. Trade only — not available to retail buyers.',
  },
  '/van-warranty': {
    title: 'Van warranties for dealers',
    subtitle: 'Light commercial vehicle cover for stock you sell.',
    intro:
      'Panda Protect offers van-specific cover for dealers selling LCVs — panel vans, crew vans and light commercials — with claim limits and labour rates set for commercial workshops.',
  },
  '/ev-warranty': {
    title: 'EV warranties for dealers',
    subtitle: 'Cover for the electric vehicles on your forecourt.',
    intro:
      'EV-specific cover including high-voltage components, drivetrain and charging systems. Designed for dealers selling battery-electric and PHEV stock.',
  },
  '/motorbike-repair-warranty-uk-warranties': {
    title: 'Motorbike warranties for dealers',
    subtitle: 'Trade cover for the bikes you sell.',
    intro:
      'Panda Protect offers motorbike-specific warranty cover for UK motorcycle dealers — road bikes, sports, adventure and scooters.',
  },
  '/motorcycle-warranty': {
    title: 'Motorcycle warranties for dealers',
    subtitle: 'Trade cover for the bikes you sell.',
    intro:
      'Panda Protect offers motorcycle-specific warranty cover for UK motorcycle dealers — road bikes, sports, adventure and scooters.',
  },
  '/car-extended-warranty': {
    title: 'Extended car warranties dealers can offer at point of sale',
    subtitle: 'White-labelled cover for the cars you sell.',
    intro:
      'Offer Panda Protect extended warranties to your customers at handover. Tiered cover, fast claims, dealer-friendly margins.',
  },
  '/used-car-warranty-uk': {
    title: 'Used-car warranties for UK dealers',
    subtitle: 'Trade-only warranty programme.',
    intro:
      'Panda Protect equips UK used-car dealers with branded warranty cover, dealer claims handling and margin-friendly volume pricing.',
  },
  '/warranty-types': {
    title: 'Warranty cover by vehicle type',
    subtitle: 'Cover designed for every kind of stock dealers sell.',
    intro:
      'From city runarounds to performance, vans, EVs, hybrids and motorbikes — Panda Protect tailors cover to the stock your forecourt sells. Sign up to see the cover schedule per vehicle type.',
  },
};

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Protect your margin',
    body: 'Eliminate comeback costs and after-sale workshop hits with cover that pays the repairer, not the customer.',
  },
  {
    icon: Zap,
    title: 'Fast claims',
    body: 'Funds released on authorisation — typically within 24 hours — so cars move and customers stay happy.',
  },
  {
    icon: HandshakeIcon,
    title: 'White-label friendly',
    body: 'Sell warranties under your forecourt brand. Your customer relationship, our underwriting.',
  },
  {
    icon: PoundSterling,
    title: 'Dealer-friendly margins',
    body: 'Volume tiers and onboarding offers keep your cost per car low while you add a high-margin revenue stream.',
  },
  {
    icon: Wrench,
    title: 'Workshop-friendly',
    body: 'Claims pay your workshop direct. No customer paperwork, no chasing reimbursements.',
  },
  {
    icon: Shield,
    title: 'FCA-aligned',
    body: 'Our cover and sales process aligns with FCA Consumer Duty expectations for warranty distribution.',
  },
];

function copyForPath(pathname: string): RouteCopy {
  const cleaned = pathname.replace(/\/+$/, '') || '/';
  // direct hit
  if (ROUTE_COPY[cleaned]) return ROUTE_COPY[cleaned];
  // prefix hits (e.g. /warranty-types/bmw-warranty)
  if (cleaned.startsWith('/warranty-types/')) return ROUTE_COPY['/warranty-types'];
  if (cleaned.startsWith('/car-extended-warranty/')) return ROUTE_COPY['/car-extended-warranty'];
  return DEFAULT_COPY;
}

type MetaCopy = { title: string; description: string };

const META_BY_PATH: Record<string, MetaCopy> = {
  '/what-is-covered': {
    title: 'Dealer Warranty Cover Explained | Panda Protect',
    description:
      'See what dealer vehicle warranty cover can include, from mechanical and electrical components to key exclusions, claim rules and policy terms.',
  },
  '/claims': {
    title: 'Dealer Warranty Claims Management | Panda Protect',
    description:
      'Support dealership customers with a clear warranty claims process, repair authorisation guidance and trade-focused claims management from Panda Protect.',
  },
  '/make-a-claim': {
    title: 'Make a Dealer Warranty Claim | Panda Protect',
    description:
      'Start a dealer vehicle warranty claim online and get guidance on repair details, documents, approvals and next steps for covered vehicles.',
  },
  '/cancel-warranty': {
    title: 'Dealer Warranty Cancellation Guide | Panda Protect',
    description:
      'Clear cancellation information for dealer-issued warranties, including eligibility, required details, refunds and policy administration steps.',
  },
  '/warranty-transfer': {
    title: 'Transfer Dealer Vehicle Warranty | Panda Protect',
    description:
      'Learn how eligible dealer vehicle warranties can be transferred to a new keeper, supporting resale value and continuity of warranty cover.',
  },
  '/contact-us': {
    title: 'Contact Dealer Warranty Support | Panda Protect',
    description:
      'Contact Panda Protect for dealer warranty support, trade partner enquiries, claims assistance, portal access and warranty administration help.',
  },
  '/complaints': {
    title: 'Dealer Warranty Complaints Process | Panda Protect',
    description:
      'Raise or manage a dealer warranty complaint with Panda Protect through a clear process for issue tracking, response handling and resolution.',
  },
  '/warranty-plan': {
    title: 'Dealer Warranty Plans UK | Panda Protect',
    description:
      'Compare dealer warranty plans for used vehicles, vans, EVs and motorcycles with trade-focused cover levels and clear claims support.',
  },
  '/buy-a-used-car-warranty-reliable-warranties': {
    title: 'Used Car Dealer Warranty Solutions | Panda Protect',
    description:
      'Warranty solutions for used car dealers who want to offer customers added protection, stronger confidence and a supported claims journey.',
  },
  '/discount-promo-offers': {
    title: 'Dealer Warranty Offers and Trade Pricing | Panda Protect',
    description:
      'View trade warranty offers, dealer pricing information and promotional support designed for motor dealers and dealership warranty programmes.',
  },
  '/van-warranty': {
    title: 'Dealer Van Warranty Solutions UK | Panda Protect',
    description:
      'Dealer van warranty solutions for motor trade partners selling used vans, helping protect customers from eligible mechanical repair costs.',
  },
  '/ev-warranty': {
    title: 'Dealer EV Warranty Solutions UK | Panda Protect',
    description:
      'Trade EV warranty solutions for dealers selling electric and hybrid vehicles, with cover guidance, policy support and claims handling.',
  },
  '/motorbike-repair-warranty-uk-warranties': {
    title: 'Motorbike Dealer Warranty Products | Panda Protect',
    description:
      'Motorbike dealer warranty products for trade partners selling motorcycles, with repair cover options and claims support for eligible vehicles.',
  },
  '/motorcycle-warranty': {
    title: 'Dealer Motorcycle Warranty UK | Panda Protect',
    description:
      'Dealer motorcycle warranty solutions for UK motor trade partners, helping support customer confidence after motorcycle and motorbike sales.',
  },
  '/car-extended-warranty': {
    title: 'Dealer Extended Car Warranty UK | Panda Protect',
    description:
      'Extended car warranty products for dealers who want to offer customers longer protection on eligible used vehicles and supported repairs.',
  },
  '/used-car-warranty-uk': {
    title: 'Used Car Dealer Warranty UK | Panda Protect',
    description:
      'Used car dealer warranty solutions for UK dealerships, built to support customer confidence, aftersales revenue and efficient claims handling.',
  },
  '/warranty-types': {
    title: 'Dealer Warranty Product Types | Panda Protect',
    description:
      'Explain dealer warranty product types, cover levels and vehicle protection options for motor trade partners and dealership customers.',
  },
};

const BRAND_META: Record<string, MetaCopy> = {
  '/car-extended-warranty/': {
    title: 'Brand-Specific Dealer Warranty Cover | Panda Protect',
    description:
      'Create brand-specific dealer warranty landing pages for eligible used vehicles, supporting search visibility and trade warranty enquiries.',
  },
  '/warranty-types/': {
    title: 'Dealer Warranty Types by Brand | Panda Protect',
    description:
      'Target brand-specific dealer warranty searches with cover information, claims guidance and vehicle warranty options for used vehicle stock.',
  },
};

function metaForPath(pathname: string, fallback: RouteCopy): MetaCopy {
  const cleaned = pathname.replace(/\/+$/, '') || '/';
  if (META_BY_PATH[cleaned]) return META_BY_PATH[cleaned];
  for (const prefix of Object.keys(BRAND_META)) {
    if (cleaned.startsWith(prefix) && cleaned !== prefix.replace(/\/$/, '')) {
      return BRAND_META[prefix];
    }
  }
  return {
    title: `${fallback.title} | Panda Protect`,
    description: fallback.intro.slice(0, 155),
  };
}

const TradeOnlyPage: React.FC = () => {
  const { pathname } = useLocation();
  const copy = copyForPath(pathname);
  const meta = metaForPath(pathname, copy);

  const canonical = `https://pandaprotect.co.uk${pathname.endsWith('/') ? pathname : pathname + '/'}`;

  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <DealerPublicHeader />

      <main className="bg-background min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Trade-only warranty programme
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
              {copy.title}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-6 max-w-3xl mx-auto">
              {copy.subtitle}
            </p>
            <p className="text-base sm:text-lg text-foreground/80 mb-10 max-w-3xl mx-auto leading-relaxed">
              {copy.intro}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="text-base">
                <Link to="/dealer-portal/signup">
                  Become a Panda Protect dealer
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <a href="mailto:hello@pandaprotect.co.uk">
                  <Mail className="mr-2 h-5 w-5" />
                  hello@pandaprotect.co.uk
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Benefits grid */}
        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-3">
                Why dealers choose Panda Protect
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                A warranty programme designed around how dealers actually sell cars.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {BENEFITS.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-lg">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Checklist */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-card border rounded-2xl p-8 sm:p-12 shadow-sm">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 text-center">
                What dealers get on the programme
              </h2>
              <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  'Branded warranty packs ready at handover',
                  'Live dealer portal for quotes and policies',
                  'Claims paid direct to your workshop',
                  'Volume-tier pricing and onboarding offers',
                  'Same-working-day support from a trade team',
                  'FCA-aligned sales and cover documentation',
                  'No retail competition — we never sell to your customers direct',
                  'Optional warranty transfer between owners',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to add warranty revenue to every sale?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Sign up in 60 seconds. Our trade team will be in touch the same working day with
              pricing and onboarding.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="text-base">
                <Link to="/dealer-portal/signup">
                  Become a Panda Protect dealer
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <a href="mailto:hello@pandaprotect.co.uk">
                  <Mail className="mr-2 h-5 w-5" />
                  Email the trade team
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <footer className="border-t bg-muted/30 py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
            <p className="mb-2">
              Panda Protect is a trade-only motor warranty programme for UK dealers.
            </p>
            <p>
              Dealer support:{' '}
              <a className="text-primary hover:underline" href="mailto:hello@pandaprotect.co.uk">
                hello@pandaprotect.co.uk
              </a>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
};

export default TradeOnlyPage;
