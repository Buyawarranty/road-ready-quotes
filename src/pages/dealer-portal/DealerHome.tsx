import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight,
  BarChart2,
  BatteryCharging,
  Bike,
  Car,
  Check,
  ChevronDown,
  Globe,
  Headphones,
  LifeBuoy,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  PoundSterling,
  Repeat,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
  UserCircle2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/OptimizedImage';
import { supabase } from '@/integrations/supabase/client';
import pandaVehiclesImage from '@/assets/car-warranty-panda-vehicles.png';
import dealerGrowthImage from '@/assets/panda-dealer-growth.png';
import coveredPartsImage from '@/assets/panda-covered-parts.png';
import pandaHeroImage from '@/assets/panda-hero.png';

const HOME_FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I register my dealership for a trade account?',
    a: 'Complete our online dealer application form. Once we verify your motor trade business, your account is usually activated within 24 hours with full access to the dealer portal, pricing tools and resources.',
  },
  {
    q: 'How quickly can I issue a warranty to a customer?',
    a: 'Once your account is approved, you can generate a warranty policy in under 60 seconds from your dealer dashboard — ready for same-day handover with the vehicle.',
  },
  {
    q: 'Do you require minimum monthly sales volumes?',
    a: 'No. Our partner programme is flexible — there are no minimum sales volumes or long-term commitments. Full dealer terms are available in the portal after registration.',
  },
  {
    q: 'How do claims and payouts work?',
    a: 'Claims are handled quickly with instant payouts to any VAT-registered UK garage. Your customers can use their own local garage, keeping them happy and your reputation strong.',
  },
  {
    q: 'What vehicles can I cover?',
    a: 'Cars, vans and motorbikes — petrol, diesel, hybrid and electric — up to 15 years old and 150,000 miles. Enter a registration in the quote tool for instant pricing.',
  },
  {
    q: 'Can I set my own margins and pricing?',
    a: 'Yes. The dealer portal includes pricing and margin controls so you can set customer-facing prices that work for your business, with performance tracking built in.',
  },
];

const COVERAGE_ROWS = [
  {
    icon: Car,
    title: 'Petrol & Diesel Vehicles',
    tone: 'black',
    items: [
      'Engine & turbo unit — pistons, crankshaft, timing chains, rocker assembly and more',
      'Gearbox, clutch and differential — all internal components',
      'Drive shafts, C.V. joints and braking system',
      'Cooling system, fuel system and engine electrics',
    ],
    note: 'Turbo cover ceases at 7 years or 80,000 miles. One clutch repair per warranty period.',
  },
  {
    icon: BatteryCharging,
    title: 'Hybrid & PHEV Vehicles',
    tone: 'slate',
    items: [
      'Everything listed for petrol & diesel vehicles',
      'Hybrid battery pack and battery management system',
      'Inverter, converter and hybrid drive motor',
      'Regenerative braking components',
    ],
    note: 'Cover applies to manufacturer-fitted hybrid systems.',
  },
  {
    icon: Zap,
    title: 'Electric vehicles (EVs)',
    tone: 'orange',
    items: [
      'Electric drive motor and reduction gearbox',
      'High-voltage battery and battery management system',
      'On-board charger and charging port',
      'EV cooling and power electronics',
    ],
    note: 'Battery degradation from normal use is not covered.',
  },
  {
    icon: Bike,
    title: 'Motorcycles (Petrol, Hybrid, EV)',
    tone: 'green',
    items: [
      'Engine internals — pistons, crankshaft, valves and cam chain',
      'Gearbox, clutch and final drive',
      'Electrical system, ECU and ignition',
      'Cooling and fuel systems',
    ],
    note: 'Cover available for road-registered bikes within age and mileage limits.',
  },
  {
    icon: X,
    title: "What's not covered",
    tone: 'pink',
    items: [
      'Wear and tear items — tyres, brake pads, wipers and bulbs',
      'Routine servicing and periodic replacement parts',
      'Accidental damage, frost or overheating damage',
      'Dual mass flywheel, wiring looms, alarms and immobilisers',
    ],
    note: 'Full exclusions list is provided with every policy document.',
  },
  {
    icon: Settings,
    title: 'Modifications and Your Cover',
    tone: 'cream',
    items: [
      'Manufacturer-approved accessories are covered as standard',
      'Non-approved or customised parts are excluded from cover',
      'Performance tuning or remapping may affect eligibility',
      'Always declare modifications at quote stage',
    ],
    note: 'Undeclared modifications can invalidate a claim.',
  },
  {
    icon: ShieldCheck,
    title: 'Exclusions: High-Performance Cars',
    tone: 'blue',
    items: [
      'High-performance, high-end and luxury models are excluded',
      'Includes Audi R8, RS models and e-tron GT',
      'Similar specification or servicing requirements also excluded',
      'Newer versions of excluded models are not eligible',
    ],
    note: 'Unsure about a vehicle? Run the registration through the quote tool.',
  },
] as const;

const DealerHome = () => {
  const navigate = useNavigate();
  const [reg, setReg] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openService, setOpenService] = useState<number | null>(0);
  const [openCoverage, setOpenCoverage] = useState<number | null>(null);

  const handleRegSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = reg.trim().toUpperCase().replace(/\s+/g, ' ');
    if (cleaned) {
      localStorage.setItem('dealerPendingReg', cleaned.replace(/\s+/g, ''));
    }
    const regParam = cleaned ? `?reg=${encodeURIComponent(cleaned)}` : '';
    // If the visitor is already signed in, take them straight into the dealer
    // portal quote flow; otherwise send them to dealer registration.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      navigate(`/dealer-portal/quote/vehicle${regParam}`);
    } else {
      navigate(`/dealer-portal/signup${regParam}`);
    }
  };

  const pageTitle = 'Dealer Extended Warranties UK | Motor Trade Warranty Programme';
  const pageDescription =
    "Boost dealer profits today. Offer extended warranties from 20p a day, sign up in 60 seconds and start earning with the UK's trusted dealer warranty partner.";
  const canonical = 'https://pandaprotect.co.uk/dealer-portal/';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Dealer Extended Warranty Programme',
    provider: { '@type': 'Organization', name: 'Panda Protect', url: 'https://pandaprotect.co.uk' },
    areaServed: 'GB',
    audience: { '@type': 'BusinessAudience', audienceType: 'Motor Trade Dealers' },
    description: pageDescription,
  };

  const benefits = [
    { icon: PoundSterling, title: 'High Profit Margins' },
    { icon: Zap, title: 'Fast & Simple' },
    { icon: Shield, title: 'Flexible Products' },
    { icon: Headphones, title: 'Dealer Support' },
    { icon: BarChart2, title: 'Powerful Tools' },
  ];

  const serviceRows = [
    {
      title: 'Full Warranty Cover',
      subtitle: 'We handle claims AND pay the repairs',
      body: 'A fully insured extended warranty for your customers. Zero risk to your dealership — we cover every approved repair payout.',
      items: ['All parts, labour & VAT included', 'Nationwide UK repair network', '24/7 claims for your customers'],
      to: '/dealer-portal/full-warranty',
    },
    {
      title: 'Claims Handling Only',
      subtitle: 'We handle claims · You fund the repairs',
      body: 'Run your own dealer-paid warranty. You keep full control of pricing and terms — we look after every customer call.',
      items: ['You set excess, labour & claim limits', '24/7 UK claims team', 'From just £1/month per policy'],
      to: '/dealer-portal/claims-handling',
    },
  ];

  return (
    <div className="public-marketing-page public-dealer-home min-h-screen">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <DealerPublicHeader />

      <section className="home-hero">
        <div className="home-shell home-hero-grid">
          <div className="home-hero-copy">
            <p className="home-kicker">Trade Warranties for UK Motor Dealers</p>
            <h1>
              Sell more warranties. <span>Grow your business.</span>
            </h1>
            <ul className="home-hero-bullets" aria-label="Dealer benefits">
              <li><Check aria-hidden="true" /><span>Instant quotes <span className="home-bullet-sep">•</span> Flexible cover <span className="home-bullet-sep">•</span> Fast payouts</span></li>
              <li><Check aria-hidden="true" /><span>Protect your customers <span className="home-bullet-sep">•</span> Boost your bottom line</span></li>
            </ul>
            <p className="home-hero-eligibility">Cover for vehicles up to <strong>150,000 miles</strong> and <strong>15 years old</strong>.</p>

            <form className="home-reg-form" onSubmit={handleRegSubmit} aria-label="Vehicle registration lookup">
              <div className="home-reg-input">
                <span className="home-reg-country" aria-hidden="true">GB<br /><small>UK</small></span>
                <input
                  id="hero-reg"
                  type="text"
                  autoComplete="off"
                  maxLength={10}
                  value={reg}
                  onChange={(event) => setReg(event.target.value.toUpperCase())}
                  placeholder="ENTER REG"
                  aria-label="Vehicle registration"
                />
              </div>
              <Button type="submit" className="home-primary-button">
                Get Quote <ArrowRight aria-hidden="true" />
              </Button>
            </form>
            <p className="home-secure-copy"><Lock aria-hidden="true" /> Secure DVLA lookup – no manual data entry</p>

            <div className="home-support-card">
              <Link to="/dealer-portal/login"><UserCircle2 aria-hidden="true" /> Already a dealer? Dealer Login</Link>
              <Link to="/dealer-portal/signup">Not signed up yet? Become a Dealer <ArrowRight aria-hidden="true" /></Link>
            </div>
          </div>

          <div className="home-hero-visual">
            <OptimizedImage
              src={pandaHeroImage}
              alt="Panda Protect warranty cover for cars, vans and motorbikes"
              priority
              width={1500}
              height={1000}
            />
            <div className="home-vehicle-types" aria-label="Eligible vehicle types">
              <span>Cars</span><span>Vans</span><span>Hybrid</span><span>EV</span><span>Motorbikes</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-trust-strip" aria-label="Why dealers choose Panda Protect">
        <div className="home-shell home-benefit-row">
          {benefits.map(({ icon: Icon, title }) => (
            <article key={title}>
              <span className="home-benefit-icon"><Icon aria-hidden="true" /></span>
              <h2>{title}</h2>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cover-intro">
        <div className="home-shell">
          <header className="home-section-heading home-section-heading-left">
            <p>Two ways to work with us</p>
            <h2>Pick the service that fits your business</h2>
            <span>Whether you want a fully insured warranty or just expert claims handling — we've got you covered.</span>
          </header>
          <div className="home-cover-grid">
            <article>
              <Shield aria-hidden="true" />
              <h3>Full Warranty Cover</h3>
              <p>We handle claims AND pay the repairs</p>
              <ul>{serviceRows[0].items.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
            </article>
            <article>
              <Headphones aria-hidden="true" />
              <h3>Claims Handling Only</h3>
              <p>We handle claims · You fund the repairs</p>
              <ul>{serviceRows[1].items.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
            </article>
            <aside>
              <OptimizedImage src={pandaVehiclesImage} alt="Panda Protect dealer warranty services" width={1200} height={800} />
              <Button asChild className="home-primary-button"><Link to="/dealer-portal/signup">Start today <ArrowRight aria-hidden="true" /></Link></Button>
            </aside>
          </div>
        </div>
      </section>

      <section className="home-service-accordion">
        <div className="home-shell home-narrow">
          <header className="home-section-heading">
            <p>Two ways to work with us</p>
            <h2><span>Every dealer supported.</span> Your way.</h2>
            <small>Choose the service model that works for your dealership.</small>
          </header>
          <div className="home-service-rows">
            {serviceRows.map((service, index) => {
              const open = openService === index;
              return (
                <article key={service.title} className={`home-service-row home-service-row-${index + 1}`}>
                  <button type="button" onClick={() => setOpenService(open ? null : index)} aria-expanded={open}>
                    <span><Shield aria-hidden="true" />{service.title}</span>
                    <ChevronDown className={open ? 'rotate-180' : ''} aria-hidden="true" />
                  </button>
                  {open && (
                    <div>
                      <p><strong>{service.subtitle}</strong> {service.body}</p>
                      <Link to={service.to}>Explore this service <ArrowRight aria-hidden="true" /></Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <Button asChild className="home-primary-button"><Link to="/dealer-portal/signup">Quick dealer sign-up <ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      </section>

      <section className="home-coverage-section">
        <div className="home-shell home-narrow">
          <header className="home-section-heading">
            <p className="home-coverage-badge"><ShieldCheck aria-hidden="true" />Full Coverage Details</p>
            <h2><span>Every Part Covered.</span> Drive Worry-Free</h2>
            <small>From engine to electrics, see exactly what's protected</small>
          </header>
          <div className="home-coverage-rows">
            {COVERAGE_ROWS.map((row, index) => {
              const open = openCoverage === index;
              const Icon = row.icon;
              return (
                <article key={row.title} className={`home-coverage-row home-coverage-row-${row.tone}`}>
                  <button type="button" onClick={() => setOpenCoverage(open ? null : index)} aria-expanded={open}>
                    <span><Icon aria-hidden="true" />{row.title}</span>
                    <ChevronDown className={open ? 'rotate-180' : ''} aria-hidden="true" />
                  </button>
                  {open && (
                    <div>
                      <ul>
                        {row.items.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}
                      </ul>
                      <p className="home-coverage-note">{row.note}</p>
                      <Link to="/warranty-plan">Full cover details <ArrowRight aria-hidden="true" /></Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="why-us" className="home-story-section">
        <div className="home-shell home-story-grid">
          <div className="home-story-image"><OptimizedImage src={dealerGrowthImage} alt="Panda Protect mascot and a motor dealer reviewing warranty sales on a laptop" width={1200} height={800} /></div>
          <div>
            <p className="home-eyebrow">Grow sales with dealer extended warranties</p>
            <h2>Grow Sales with Dealer Extended Warranties</h2>
            <p>Unlock extra profit on every car. Our dealer programme is designed to maximise dealer margins and drive more sales — easily.</p>
            <ul>
              {[
                'Exclusive trade warranty pricing and competitive commissions on every policy you sell.',
                'Adding a warranty closes deals faster and increases customer confidence at point of sale.',
                '60-second onboarding via the dealer portal — start selling warranties the same day.',
                'Cover for 1,400+ mechanical and electrical parts, backed by a 5-star rated UK provider.',
                'Premium dealer pricing, bulk discounts and a dealer programme that pays.',
                'Manage quotes, warranties and claims in one place. Real-time tracking and analytics.',
              ].map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}
            </ul>
            <Button asChild className="home-secondary-button"><Link to="/warranty-plan">Discover why dealers choose us <ArrowRight aria-hidden="true" /></Link></Button>
          </div>
        </div>
      </section>

      <section className="home-plan-section">
        <div className="home-shell home-plan-grid">
          <div>
            <p className="home-eyebrow">Three simple steps</p>
            <h2>Join Our Dealer Programme – Start Earning Today</h2>
            <ul>
              {[
                { icon: UserCircle2, title: 'Free Dealer Sign-Up', body: 'Register your dealership in 60 seconds. No setup fees, no contracts.' },
                { icon: Zap, title: 'Quote in Seconds', body: 'Use the dealer portal to generate instant warranty quotes for any vehicle.' },
                { icon: TrendingUp, title: 'Start Earning', body: 'Sell warranties from 20p a day and grow your dealership profits.' },
              ].map(({ icon: Icon, title, body }) => <li key={title}><Icon aria-hidden="true" /><span><strong>{title}</strong>{body}</span></li>)}
            </ul>
          </div>
          <div className="home-plan-image"><OptimizedImage src={coveredPartsImage} alt="Car showing covered mechanical and electrical parts" width={1200} height={800} /></div>
        </div>
      </section>

      <section className="home-included-section">
        <div className="home-shell">
          <header className="home-section-heading">
            <p>Dealer benefits</p>
            <h2>Easy Claims, <span>Fast Payouts</span></h2>
            <p>Claims made easy and quick — keep your customers happy and your reputation strong. No hassle, instant payouts to VAT-registered UK garages.</p>
          </header>
          <div className="home-included-grid">
              {[
              { icon: Zap, title: 'Quick claims', body: 'Instant payouts to the repairing garage — no long waits or paperwork.' },
              { icon: Wrench, title: 'Local repairs', body: 'Your customers can use any VAT-registered UK garage, wherever they are.' },
              { icon: Shield, title: 'Unlimited claims', body: 'As many claims as needed while the vehicle is under cover.' },
            ].map(({ icon: Icon, title, body }) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{body}</p></article>)}
          </div>
          <div className="home-included-cta">
            <Button asChild className="home-primary-button"><Link to="/dealer-portal/signup">Become a dealer <ArrowRight aria-hidden="true" /></Link></Button>
            <p>Free to join · No setup fees · 60-second sign-up</p>
          </div>
        </div>
      </section>

      <section className="home-stats-section">
        <div className="home-shell">
          <header className="home-section-heading">
            <p>Extra protection</p>
            <h2>Additional <span>Cover Options</span></h2>
            <p>Bolt-on extras you can add to any warranty quote.</p>
          </header>
          <div className="home-stats-grid">
            {[
              { icon: LifeBuoy, title: 'Vehicle Recovery', body: 'Help whenever you need it.' },
              { icon: Globe, title: 'Europe Cover', body: 'Drive with confidence across Europe.' },
              { icon: Car, title: 'Vehicle Rental', body: 'Replacement vehicle when yours is off the road.' },
              { icon: Repeat, title: 'Transfer Cover', body: 'Coverage continues when you change ownership.' },
              { icon: Settings, title: 'Bespoke Warranty', body: 'Tailored cover for your specific needs.' },
            ].map(({ icon: Icon, title, body }) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="home-faq-section">
        <div className="home-shell home-narrow">
          <header className="home-section-heading"><h2>FAQ<span>'s</span></h2><p>Quick answers to the questions we hear most from motor traders.</p></header>
          <div className="home-faq-grid">
            {HOME_FAQS.map((item, index) => {
              const open = openFaq === index;
              return (
                <article key={item.q} className={open ? 'is-open' : ''}>
                  <button type="button" onClick={() => setOpenFaq(open ? null : index)} aria-expanded={open}>
                    <span>{item.q}</span><ChevronDown className={open ? 'rotate-180' : ''} aria-hidden="true" />
                  </button>
                  {open && <p>{item.a}</p>}
                </article>
              );
            })}
          </div>
          <Button asChild className="home-primary-button"><Link to="/faq/traders">View all FAQs <ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      </section>

      <section id="resources" className="home-resource-section">
        <div className="home-shell">
          <header className="home-section-heading"><p>Dealer support &amp; resources</p><h2>Everything you need in one place</h2><p>Guides, plan documents and answers — built for motor traders.</p></header>
          <div className="home-resource-grid">
            {[
              { icon: PoundSterling, tone: 'orange', title: 'Dealer Benefits & Pricing', body: 'Trade pricing, margins and commission structures explained.', to: '/dealer-portal/full-warranty' },
              { icon: ShieldCheck, tone: 'green', title: 'Plan Documents & Cover', body: 'What is covered, terms and conditions and policy wording.', to: '/what-is-covered' },
              { icon: LifeBuoy, tone: 'blue', title: 'Claims & Dealer FAQs', body: 'How claims work, payout timings and answers for motor traders.', to: '/faq/traders' },
            ].map((item) => (
              <Link key={item.title} to={item.to} className={`home-resource-card home-resource-card-${item.tone}`}>
                <span className="home-resource-icon"><item.icon aria-hidden="true" /></span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span className="home-resource-link">View resource <ArrowRight aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="home-closing-cta">
        <div className="home-shell">
          <h2>Partner with a Trusted UK Warranty Provider</h2>
          <p>Talk to our dealer team about exclusive motor trade warranty deals and onboarding.</p>
          <div>
            <Button asChild className="home-primary-button"><Link to="/dealer-portal/signup">Dealer programme sign up <ArrowRight aria-hidden="true" /></Link></Button>
            <a href="tel:03302295045"><Phone aria-hidden="true" />0330 229 5045</a>
            <a href="https://wa.me/message/SPQPJ6O3UBF5B1" target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" />WhatsApp us</a>
            <a href="mailto:dealers@pandaprotect.co.uk" className="sr-only"><Mail aria-hidden="true" />dealers@pandaprotect.co.uk</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DealerHome;