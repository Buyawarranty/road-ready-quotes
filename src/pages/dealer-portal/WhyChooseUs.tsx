import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Car,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  Headphones,
  Landmark,
  PoundSterling,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import DealerPublicFooter from '@/components/dealer/DealerPublicFooter';
import { OptimizedImage } from '@/components/OptimizedImage';
import pandaHeroImage from '@/assets/panda-hero-optimized.webp';
import dealerGrowthImage from '@/assets/panda-dealer-growth-optimized.webp';

const reasons = [
  { icon: Settings2, title: 'Warranty administration', body: 'Simple, streamlined warranty administration so you can focus on selling cars.' },
  { icon: ClipboardCheck, title: 'Warranty claims management', body: 'Fast, fair and efficient claims handling to keep your customers on the road.' },
  { icon: ShieldCheck, title: 'FCA compliant warranty', body: 'FCA-compliant processes and fair customer journeys that give your dealership confidence.' },
  { icon: Users, title: 'Dealer retention solutions', body: 'Improve customer loyalty and generate more long-term service and aftersales revenue.' },
  { icon: Tag, title: 'White label warranty', body: 'Flexible white label warranty solutions presented around your dealership brand.' },
  { icon: BarChart3, title: 'Warranty partner for dealers', body: 'A long-term partner invested in your success, with dedicated UK dealer support.' },
];

const programmes = [
  { icon: Car, title: 'Independent dealer warranty', points: ['Tailored for independent dealers', 'Flexible cover options', 'Boost used car sales'] },
  { icon: ShieldCheck, title: 'Dealer warranty scheme', points: ['Comprehensive protection', 'Competitive pricing', 'Ideal for used car dealers'], featured: true },
  { icon: Building2, title: 'Franchise dealer warranty', points: ['Scalable programmes', 'White label options', 'Dedicated account support'] },
];

const processSteps = [
  { icon: ReceiptText, title: 'Get a quote', body: 'Instant online quotes or speak to our team.' },
  { icon: Users, title: 'Sell with confidence', body: 'Offer your customers comprehensive cover.' },
  { icon: Wrench, title: 'Claims when needed', body: 'We handle the claims process quickly and fairly.' },
  { icon: ShieldCheck, title: 'Happy customers', body: 'Get them back on the road and keep them coming back.' },
];

const protectionProducts = [
  { icon: Settings2, title: 'Mechanical breakdown cover', body: 'Reliable cover for major mechanical and electrical faults' },
  { icon: FileCheck2, title: 'Vehicle service contracts', body: 'Flexible service plans for used vehicles' },
  { icon: ShieldCheck, title: 'Extended warranty solutions', body: 'Longer-term protection for added peace of mind' },
  { icon: Sparkles, title: 'Dealer added value products', body: 'Create extra revenue with complementary products' },
  { icon: Car, title: 'Used car protection plans', body: 'Tailored protection for your used stock' },
  { icon: Landmark, title: 'F&I products and dealer finance', body: 'Integrate protection products with your finance offering' },
];

const resources = [
  { icon: ShieldCheck, title: 'Best trade warranty provider UK', body: 'What to look for when choosing a warranty partner for your dealership.' },
  { icon: FileCheck2, title: 'FCA compliant warranty provider', body: 'What compliance means and why it matters for your dealership.' },
  { icon: PoundSterling, title: 'Dealer warranty costs', body: 'A practical guide to warranty pricing, value and profitability.' },
  { icon: Wrench, title: 'Warranty claims management for dealers', body: 'How a clear claims process supports dealers and customers.' },
  { icon: TrendingUp, title: 'Used car sales strategies', body: 'Ways to sell more used cars with valuable warranty cover.' },
  { icon: Users, title: 'Dealer customer retention', body: 'Turn one-time buyers into loyal, returning customers.' },
];

const faqs = [
  { q: 'What types of dealer warranty programmes do you offer?', a: 'We offer flexible warranty programmes for independent dealers, franchise dealerships and used car retailers, including fully covered warranties, white label warranty options and scalable dealer warranty schemes.' },
  { q: 'Are your warranties FCA compliant?', a: 'Yes. Our processes and products are designed around FCA-compliant standards and a fair customer journey, helping dealers operate with confidence.' },
  { q: 'How does the warranty claims process work?', a: 'Our claims team manages the process efficiently and fairly. Dealers and customers can submit a claim quickly, and we guide them through any information needed.' },
  { q: 'Can I use a white label warranty for my dealership?', a: 'Yes. We offer white label warranty solutions for dealers who want to present a branded warranty programme to their customers.' },
  { q: 'What’s the difference between a manufacturer and dealer warranty?', a: 'A manufacturer warranty is usually included by the vehicle manufacturer, while a dealer warranty is supplied by the dealership or a warranty partner to provide used car protection and customer confidence.' },
  { q: 'Do you offer warranty products for independent dealers?', a: 'Yes. We work with independent dealers, used car specialists and franchise groups, offering flexible warranty products for different dealership sizes and stock profiles.' },
  { q: 'How can dealer warranties help increase my sales and profitability?', a: 'Dealer warranties improve used car buyer confidence, create upsell opportunities, support aftersales revenue and help increase overall dealership profitability.' },
  { q: 'Is there a setup fee or minimum volume?', a: 'We work with a wide range of dealers and keep joining straightforward. Speak to our dealer team about the most suitable arrangement for your business and sales volume.' },
];

const WhyChooseUs = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const title = 'Why Choose Panda Protect | Trade Warranty Provider for UK Dealers';
  const description = 'Discover Panda Protect dealer warranty solutions: FCA-compliant processes, claims management, white label options and UK support for motor dealers.';
  const canonical = 'https://pandaprotect.co.uk/why-choose-us/';
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'Panda Protect dealer warranty solutions',
        serviceType: 'Trade warranty and dealer warranty services',
        provider: { '@type': 'Organization', name: 'Panda Protect', url: 'https://pandaprotect.co.uk/' },
        areaServed: { '@type': 'Country', name: 'United Kingdom' },
        audience: { '@type': 'BusinessAudience', audienceType: 'UK motor dealers and dealerships' },
        url: canonical,
        description,
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://pandaprotect.co.uk/' },
          { '@type': 'ListItem', position: 2, name: 'Why Choose Us', item: canonical },
        ],
      },
    ],
  };

  return (
    <div className="why-page">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <DealerPublicHeader />

      <main>
        <section className="why-hero">
          <div className="why-shell why-hero-grid">
            <div className="why-hero-copy">
              <p className="why-eyebrow">Why choose Panda Protect</p>
              <h1>A trusted trade warranty <span>provider for UK motor dealers.</span></h1>
              <p className="why-lead">Panda Protect is a leading trade warranty provider helping dealerships across the UK sell more cars with confidence. As a dealer warranty provider, we deliver flexible motor trade warranty solutions with FCA-compliant processes, fast claims and dedicated UK support.</p>
              <div className="why-actions">
                <Button asChild className="why-button why-button-primary"><Link to="/dealer-portal/quote/vehicle">Get a dealer quote <ArrowRight /></Link></Button>
                <Button asChild variant="outline" className="why-button why-button-outline"><Link to="/dealer-portal/signup">Register your dealership</Link></Button>
              </div>
              <ul className="why-reassurance">
                {['Trade only warranty provider', 'FCA compliant', 'UK based support'].map((item) => <li key={item}><Check />{item}</li>)}
              </ul>
            </div>
            <div className="why-hero-visual">
              <OptimizedImage src={pandaHeroImage} alt="Panda Protect supporting UK motor dealers with vehicle warranty solutions" priority width={1200} height={813} sizes="(max-width: 900px) 94vw, 52vw" />
            </div>
          </div>
        </section>

        <section className="why-trust-strip" aria-label="Dealer warranty service benefits">
          <div className="why-shell why-trust-grid">
            {[
              [ShieldCheck, 'FCA compliant', 'and consumer focused'],
              [Zap, 'Quick quotes', 'in minutes'],
              [ClipboardCheck, 'Fast claims', 'management'],
              [Tag, 'White label', 'options available'],
              [PoundSterling, 'No setup fees', 'or hidden costs'],
              [Headphones, 'UK based', 'dealer support'],
            ].map(([Icon, titleText, body]) => {
              const ItemIcon = Icon as React.ComponentType<{ 'aria-hidden'?: boolean }>;
              return <div key={String(titleText)}><span><ItemIcon aria-hidden="true" /></span><p><strong>{String(titleText)}</strong>{String(body)}</p></div>;
            })}
          </div>
        </section>

        <section className="why-section why-reasons">
          <div className="why-shell">
            <div className="why-section-head why-section-head-row">
              <div><p className="why-eyebrow">Why dealers choose us</p><h2>Why dealers choose <span>Panda Protect</span></h2><p>We provide dealership warranty solutions that help you sell more used cars, increase revenue and build long-term customer loyalty.</p></div>
              <Link to="/contact-us/" className="why-text-link">More about us <ArrowRight /></Link>
            </div>
            <div className="why-reason-grid">
              {reasons.map(({ icon: Icon, title: cardTitle, body }) => <article key={cardTitle}><Icon /><h3>{cardTitle}</h3><p>{body}</p><ArrowRight className="why-card-arrow" /></article>)}
            </div>
          </div>
        </section>

        <section className="why-section why-programmes">
          <div className="why-shell why-programme-layout">
            <div className="why-programme-intro">
              <p className="why-eyebrow">Flexible solutions for every dealership</p>
              <h2>Warranty products and programmes <span>for UK dealers.</span></h2>
              <p>From independent dealers to large franchise groups, we provide warranty products for dealerships of all sizes. Our motor trade warranty solutions are flexible, commercially valuable and easy to implement.</p>
              <Button asChild className="why-button why-button-primary"><Link to="/what-is-covered/">View our warranty products <ArrowRight /></Link></Button>
            </div>
            <div className="why-programme-grid">
              {programmes.map(({ icon: Icon, title: cardTitle, points, featured }) => <article key={cardTitle} className={featured ? 'is-featured' : ''}>{featured && <span className="why-popular">Popular</span>}<span className="why-programme-icon"><Icon /></span><h3>{cardTitle}</h3><ul>{points.map((point) => <li key={point}><Check />{point}</li>)}</ul><Link to="/dealer-portal/signup">Learn more <ArrowRight /></Link></article>)}
            </div>
          </div>
        </section>

        <section className="why-process">
          <div className="why-shell">
            <div className="why-section-head why-section-head-row"><div><h2>How dealer warranties work</h2><p>A simple process, designed for dealers and their customers.</p></div><Link to="/make-a-claim/" className="why-text-link">Learn more about the claims process <ArrowRight /></Link></div>
            <ol className="why-process-grid">
              {processSteps.map(({ icon: Icon, title: stepTitle, body }, index) => <li key={stepTitle}><span className="why-step-number">{index + 1}</span><span className="why-step-icon"><Icon /></span><div><h3>{stepTitle}</h3><p>{body}</p></div>{index < processSteps.length - 1 && <ArrowRight className="why-step-arrow" />}</li>)}
            </ol>
          </div>
        </section>

        <section className="why-section why-growth-products">
          <div className="why-shell why-growth-products-grid">
            <div className="why-growth">
              <div className="why-growth-image"><OptimizedImage src={dealerGrowthImage} alt="Panda Protect dealer support helping a dealership grow warranty revenue" width={960} height={686} sizes="(max-width: 900px) 94vw, 46vw" /></div>
              <div className="why-growth-copy"><p className="why-eyebrow">More sales. Happier customers.</p><h2>Grow revenue and <span>customer retention.</span></h2><p>Dealer warranties aren’t just protection — they’re a powerful way to increase dealership profitability. Our dealer aftersales solutions help create warranty revenue, improve customer loyalty and open new service opportunities.</p><ul>{['Sell more used cars with added value', 'Increase warranty profit for dealers', 'Improve customer confidence and loyalty', 'Create long-term service and aftersales revenue'].map((item) => <li key={item}><Check />{item}</li>)}</ul><Button asChild className="why-button why-button-primary"><Link to="/dealer-portal/signup">See the benefits <ArrowRight /></Link></Button></div>
            </div>
            <div className="why-products"><div className="why-products-head"><div><h2>Cover options and protection products</h2><p>Flexible products for a wide range of dealer needs.</p></div><Link to="/what-is-covered/">View all products <ArrowRight /></Link></div><div className="why-product-list">{protectionProducts.map(({ icon: Icon, title: productTitle, body }) => <Link key={productTitle} to="/what-is-covered/"><span><Icon /></span><div><h3>{productTitle}</h3><p>{body}</p></div><ChevronDown /></Link>)}</div></div>
          </div>
        </section>

        <section className="why-section why-resources">
          <div className="why-shell">
            <div className="why-section-head why-section-head-row"><div><h2>Popular topics for dealers</h2><p>Helpful guides and resources for motor dealers.</p></div><Link to="/thewarrantyhub/" className="why-text-link">View all resources <ArrowRight /></Link></div>
            <div className="why-resource-grid">{resources.map(({ icon: Icon, title: resourceTitle, body }) => <Link key={resourceTitle} to="/thewarrantyhub/"><span><Icon /></span><h3>{resourceTitle}</h3><p>{body}</p><ArrowRight className="why-card-arrow" /></Link>)}</div>
          </div>
        </section>

        <section className="why-section why-faq">
          <div className="why-shell">
            <div className="why-section-head why-section-head-row"><div><h2>Frequently asked questions</h2><p>Find answers to common questions about our dealer warranties.</p></div><Link to="/faq/traders/" className="why-text-link">View all FAQs <ArrowRight /></Link></div>
            <div className="why-faq-grid">{faqs.map((faq, index) => { const open = openFaq === index; return <article key={faq.q} className={open ? 'is-open' : ''}><button type="button" aria-expanded={open} onClick={() => setOpenFaq(open ? null : index)}><span>{faq.q}</span><ChevronDown /></button>{open && <p>{faq.a}</p>}</article>; })}</div>
          </div>
        </section>

        <section className="why-final-cta">
          <div className="why-shell"><div><h2>Ready to partner with a trusted UK warranty provider?</h2><p>Join dealers growing their business with Panda Protect.</p></div><div className="why-final-actions"><Button asChild className="why-button why-button-primary"><Link to="/dealer-portal/quote/vehicle">Get a dealer quote <ArrowRight /></Link></Button><Button asChild variant="outline" className="why-button why-button-dark-outline"><Link to="/contact-us/">Speak to our team</Link></Button></div><ul>{['More sales', 'Happier customers', 'Greater profitability', 'A stronger dealership'].map((item) => <li key={item}><Check />{item}</li>)}</ul></div>
        </section>
      </main>

      <DealerPublicFooter />
    </div>
  );
};

export default WhyChooseUs;
