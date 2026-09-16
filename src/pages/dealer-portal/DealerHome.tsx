import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight,
  Award,
  BarChart2,
  BarChart3,
  Check,
  ChevronDown,
  Clock,
  HandshakeIcon,
  Headphones,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  PoundSterling,
  Shield,
  TrendingUp,
  UserCircle2,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/OptimizedImage';
import pandaVehiclesImage from '@/assets/car-warranty-panda-vehicles.png';

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

const DealerHome = () => {
  const navigate = useNavigate();
  const [reg, setReg] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openService, setOpenService] = useState<number | null>(0);

  const handleRegSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = reg.trim().toUpperCase().replace(/\s+/g, ' ');
    navigate(`/dealer-portal/coming-soon${cleaned ? `?reg=${encodeURIComponent(cleaned)}` : ''}`);
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
    { icon: PoundSterling, title: 'High Profit Margins', body: 'Competitive rates and great commission' },
    { icon: Zap, title: 'Fast & Simple', body: 'Quote, issue and manage policies in minutes' },
    { icon: Shield, title: 'Flexible Products', body: 'A range of levels to suit every customer' },
    { icon: Headphones, title: 'Dealer Support', body: 'Dedicated account managers' },
    { icon: BarChart2, title: 'Powerful Tools', body: 'Track performance and grow your sales' },
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
            <p className="home-eyebrow">For UK motor dealers</p>
            <p className="home-kicker">Trader Warranty Solutions</p>
            <h1>
              Sell more warranties. <span>Grow your business.</span>
            </h1>
            <p className="home-hero-description">Instant quotes. Flexible cover. Fast issuance. Everything you need to protect your customers and boost your bottom line.</p>

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
              src={pandaVehiclesImage}
              alt="Panda Protect warranty cover for cars, vans and motorbikes"
              priority
              width={1200}
              height={800}
            />
            <div className="home-vehicle-types" aria-label="Eligible vehicle types">
              <span>Cars</span><span>Vans</span><span>Hybrid</span><span>EV</span><span>Motorbikes</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-trust-strip" aria-label="Why dealers choose Panda Protect">
        <div className="home-shell home-benefit-row">
          {benefits.map(({ icon: Icon, title, body }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <div><h2>{title}</h2><p>{body}</p></div>
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

      <section id="why-us" className="home-story-section">
        <div className="home-shell home-story-grid">
          <div className="home-story-image"><OptimizedImage src={pandaVehiclesImage} alt="Panda Protect supporting UK motor dealers" width={1200} height={800} /></div>
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
          <div className="home-plan-image"><OptimizedImage src={pandaVehiclesImage} alt="Flexible Panda Protect warranty plans" width={1200} height={800} /></div>
        </div>
      </section>

      <section className="home-included-section">
        <div className="home-shell">
          <header className="home-section-heading">
            <h2>Easy Claims, <span>Fast Payouts</span></h2>
            <p>Claims made easy and quick — keep your customers happy and your reputation strong. No hassle, instant payouts to VAT-registered UK garages.</p>
          </header>
          <div className="home-included-grid">
              {[
              { icon: Zap, title: 'Quick claims', body: 'Quick claims with instant payouts' },
              { icon: Wrench, title: 'Local repairs', body: 'Repairs at any VAT-registered UK garage' },
              { icon: Shield, title: 'Unlimited claims', body: 'Unlimited claims during cover period' },
            ].map(({ icon: Icon, title, body }) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{body}</p></article>)}
          </div>
          <Button asChild className="home-primary-button"><Link to="/dealer-portal/signup">Become a dealer <ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      </section>

      <section className="home-stats-section">
        <div className="home-shell">
          <header className="home-section-heading"><h2>Dealer support that keeps business moving</h2></header>
          <div className="home-stats-grid">
            {[
              { icon: Clock, label: '60s Sign-Up' },
              { icon: Wrench, label: '1,400+ Parts' },
              { icon: Award, label: '5-Star Rated' },
              { icon: Users, label: '20k+ Customers' },
            ].map(({ icon: Icon, label }) => <article key={label}><Icon aria-hidden="true" /><strong>{label}</strong></article>)}
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
          <header className="home-section-heading"><p>Dealer support & resources</p><h2>Everything you need in one place</h2></header>
          <div className="home-resource-grid">
            {[
              { title: 'Dealer Benefits & Pricing', body: 'Trade pricing, margins and commission structures explained.', to: '/dealer-portal/full-warranty' },
              { title: 'Plan Documents & Cover', body: 'What is covered, terms and conditions and policy wording.', to: '/what-is-covered' },
              { title: 'Claims & Dealer FAQs', body: 'How claims work, payout timings and answers for motor traders.', to: '/faq/traders' },
            ].map((item) => <Link key={item.title} to={item.to}><h3>{item.title}</h3><p>{item.body}</p><span>View resource <ArrowRight aria-hidden="true" /></span></Link>)}
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