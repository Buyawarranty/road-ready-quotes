import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, UserCog, Plug, Wrench, FileText, LifeBuoy, Users, ArrowRight, Mail, Info } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';

type FAQItem = { q: string; a: React.ReactNode; plain: string };
type Pillar = {
  id: string;
  title: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FAQItem[];
};

const PILLARS: Pillar[] = [
  {
    id: 'account-setup',
    title: 'Account Setup & Onboarding',
    short: 'Register, login & partner terms',
    icon: UserCog,
    items: [
      {
        q: 'How can a motor trade dealer complete their registration for a new trade account?',
        plain: 'To register for a Panda Protect dealer account, simply complete our online dealer application form. Once we verify your motor trade business and dealership details, your account is usually activated within 24 hours. After approval, you will have full access to our dealer portal, partner programme, warranty tools, and dealer resources.',
        a: (
          <>
            To register for a Panda Protect dealer account, simply complete our{' '}
            <Link to="/dealer-portal/signup" className="text-[#eb4b00] underline font-semibold">online dealer application form</Link>.
            Once we verify your motor trade business and dealership details, your account is usually activated within{' '}
            <strong>24 hours</strong>. After approval, you will have full access to our dealer portal, partner programme,
            warranty tools, and dealer resources.
          </>
        ),
      },
      {
        q: 'Where do I access the motor trade login and my dedicated dealer dashboard?',
        plain: 'You can access the motor trade login from the Panda Protect website. After entering your approved login details, you will be taken to your dealer dashboard. From there, you can issue warranties, manage claims, view policy information, track performance, and access dealer support.',
        a: (
          <>
            You can access the{' '}
            <Link to="/dealer-portal/login" className="text-[#eb4b00] underline font-semibold">motor trade login</Link>{' '}
            from the Panda Protect website. After entering your approved login details, you will be taken to your dealer
            dashboard. From there, you can issue warranties, manage claims, view policy information, track performance,
            and access dealer support.
          </>
        ),
      },
      {
        q: 'What are the primary dealer terms and conditions for your partner programme?',
        plain: 'Our partner programme is designed to be flexible for UK motor trade businesses. We do not require minimum monthly sales volumes or long-term commitments. Full dealer terms, pricing structures, and compliance information are available within the dealer portal after registration.',
        a: 'Our partner programme is designed to be flexible for UK motor trade businesses. We do not require minimum monthly sales volumes or long-term commitments. Full dealer terms, pricing structures, and compliance information are available within the dealer portal after registration.',
      },
    ],
  },
  {
    id: 'portal-integration',
    title: 'Portal Integration & AutoTrader',
    short: 'Dealer portal & DMS workflows',
    icon: Plug,
    items: [
      {
        q: 'Does your dealer portal integrate with the AutoTrader portal?',
        plain: 'Our dealer portal is designed to fit smoothly into existing dealership workflows. While all warranty policies are managed through Panda Protect, the system works alongside platforms such as AutoTrader and other dealer management tools, helping reduce administration and improve efficiency.',
        a: 'Our dealer portal is designed to fit smoothly into existing dealership workflows. While all warranty policies are managed through Panda Protect, the system works alongside platforms such as AutoTrader and other dealer management tools, helping reduce administration and improve efficiency.',
      },
      {
        q: 'What advanced digital tools does the Panda Protect motor trade portal offer?',
        plain: 'The Panda Protect motor trade portal includes instant warranty policy generation, dealer dashboard and performance tracking, dealer pricing and margin controls, claims management and tracking, and access to dealer support and resources.',
        a: (
          <>
            The Panda Protect motor trade portal includes a range of tools designed for busy dealerships, including:
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Instant warranty policy generation</li>
              <li>Dealer dashboard and performance tracking</li>
              <li>Dealer pricing and margin controls</li>
              <li>Claims management and tracking</li>
              <li>Access to dealer support and resources</li>
            </ul>
            <p className="mt-3">These features help dealers manage warranties quickly and efficiently from one central platform.</p>
          </>
        ),
      },
    ],
  },
  {
    id: 'claims-payouts',
    title: 'Claims, Processing & Instant Payouts',
    short: 'Quick claims & fast payments',
    icon: Wrench,
    items: [
      {
        q: 'How does the Quick Claims process operate for approved trade partners?',
        plain: 'To start a claim, simply navigate to the dedicated "Make a Claim" section located directly on our website\'s homepage. Dealers and approved VAT-registered repairers can access this submission portal 24/7. Our engineering team reviews all submitted data promptly to deliver swift repair authorizations and minimize customer vehicle downtime.',
        a: (
          <>
            To start a claim, simply navigate to the dedicated{' '}
            <Link to="/make-a-claim/" className="text-[#eb4b00] underline font-semibold">"Make a Claim"</Link>{' '}
            section located directly on our website's homepage. Dealers and approved VAT-registered repairers can access
            this submission portal <strong>24/7</strong>. Our engineering team reviews all submitted data promptly to
            deliver swift repair authorisations and minimise customer vehicle downtime.
          </>
        ),
      },
      {
        q: 'Do you offer Fast Payouts on approved warranty claims?',
        plain: 'Yes. Once a claim has been approved and the repair invoice has been submitted, payment is processed directly to the repairing garage or dealership. Our Fast Payout process helps support cash flow and ensures repairs can be completed without unnecessary delays.',
        a: 'Yes. Once a claim has been approved and the repair invoice has been submitted, payment is processed directly to the repairing garage or dealership. Our Fast Payout process helps support cash flow and ensures repairs can be completed without unnecessary delays.',
      },
      {
        q: 'What happens if there is a warranty claim?',
        plain: 'If a warranty claim is needed, simply contact our team with the details of the issue. We will guide you through the claims process and help coordinate the next steps.',
        a: 'If a warranty claim is needed, simply contact our team with the details of the issue. We will guide you through the claims process and help coordinate the next steps.',
      },
    ],
  },
  {
    id: 'commercial-terms',
    title: 'Commercial Terms & Insurance',
    short: 'Warranty variants & cover scope',
    icon: FileText,
    items: [
      {
        q: 'What variants of dealer warranties does Panda Protect offer?',
        plain: 'We offer a range of dealer warranties designed for used cars, commercial vehicles, and specialist stock. Our cover plans can be tailored to match your specific forecourt profile, protecting qualifying vehicles up to 15 years old or 150,000 miles at the time of policy inception. Dealers can choose warranty terms, claim limits, and levels of cover that best match their forecourt inventory.',
        a: (
          <>
            We offer a range of dealer warranties designed for used cars, commercial vehicles, and specialist stock. Our
            cover plans can be tailored to match your specific forecourt profile, protecting qualifying vehicles up to{' '}
            <strong>15 years old</strong> or <strong>150,000 miles</strong> at the time of policy inception. Dealers can
            choose warranty terms, claim limits, and levels of cover that best match their forecourt inventory.
          </>
        ),
      },
      {
        q: 'Do you provide combined motor trade insurance or quote comparisons?',
        plain: 'Panda Protect specialises in dealer warranties and warranty administration. While we do not provide motor trade insurance directly, we offer guidance and resources to help dealerships understand motor trade insurance options, compare providers, and stay informed about developments within the UK motor trade sector.',
        a: 'Panda Protect specialises in dealer warranties and warranty administration. While we do not provide motor trade insurance directly, we offer guidance and resources to help dealerships understand motor trade insurance options, compare providers, and stay informed about developments within the UK motor trade sector.',
      },
      {
        q: 'How does this help my dealership?',
        plain: 'Our warranty service helps your dealership save time, reduce paperwork, and give customers added confidence when purchasing from you. It also supports better profit margins by allowing you to offer added-value warranty cover without having to manage the full administration and support process yourself.',
        a: 'Our warranty service helps your dealership save time, reduce paperwork, and give customers added confidence when purchasing from you. It also supports better profit margins by allowing you to offer added-value warranty cover without having to manage the full administration and support process yourself.',
      },
    ],
  },
  {
    id: 'support-resources',
    title: 'Support & Trade Resources',
    short: 'UK team, docs & dealer help',
    icon: LifeBuoy,
    items: [
      {
        q: 'What level of dealer support can I expect?',
        plain: 'Every Panda Protect partner has direct access to our UK-based team. Our friendly, helpful staff are always here to assist you with technical warranty queries, claims guidance, account management, or portal troubleshooting. Support is quickly reachable via phone, email, or through your portal dashboard.',
        a: 'Every Panda Protect partner has direct access to our UK-based team. Our friendly, helpful staff are always here to assist you with technical warranty queries, claims guidance, account management, or portal troubleshooting. Support is quickly reachable via phone, email, or through your portal dashboard.',
      },
      {
        q: 'Where can I find the latest motor trade news and dealer resources?',
        plain: 'The dealer resources section of our portal includes updates on motor trade warranty news, industry developments, compliance changes, and practical dealership guidance. These resources are designed to help dealers stay informed and make the most of their warranty programme.',
        a: 'The dealer resources section of our portal includes updates on motor trade warranty news, industry developments, compliance changes, and practical dealership guidance. These resources are designed to help dealers stay informed and make the most of their warranty programme.',
      },
      {
        q: 'How do you support dealerships as a warranty provider?',
        plain: 'As a trusted warranty provider, we help dealerships offer a simple and professional warranty service without the added paperwork. We manage the warranty registration, prepare and issue the warranty documents, and provide support if a customer needs to make a warranty claim.',
        a: 'As a trusted warranty provider, we help dealerships offer a simple and professional warranty service without the added paperwork. We manage the warranty registration, prepare and issue the warranty documents, and provide support if a customer needs to make a warranty claim.',
      },
      {
        q: 'Do I need to process the warranty myself?',
        plain: 'No. We process the warranty on your behalf, so there is no paperwork for your dealership to complete.',
        a: 'No. We process the warranty on your behalf, so there is no paperwork for your dealership to complete.',
      },
      {
        q: 'Is warranty support included for dealerships?',
        plain: 'Yes. Warranty support is included for dealerships. Our team will handle the warranty documents and assist with the claims process when required.',
        a: 'Yes. Warranty support is included for dealerships. Our team will handle the warranty documents and assist with the claims process when required.',
      },
      {
        q: 'What does your team handle?',
        plain: 'We handle the warranty registration, prepare and issue the warranty documents, and provide support if a warranty claim needs to be made.',
        a: 'We handle the warranty registration, prepare and issue the warranty documents, and provide support if a warranty claim needs to be made.',
      },
      {
        q: 'When will I receive the warranty documents?',
        plain: 'Once the warranty has been processed, we will send the relevant warranty documents directly to you for your records and also to your customer.',
        a: 'Once the warranty has been processed, we will send the relevant warranty documents directly to you for your records and also to your customer.',
      },
      {
        q: 'Do I need to complete any forms?',
        plain: 'No. We take care of the warranty paperwork for you. If we need any additional information, our team will contact you directly.',
        a: 'No. We take care of the warranty paperwork for you. If we need any additional information, our team will contact you directly.',
      },
      {
        q: 'Who do I contact for warranty support?',
        plain: 'Please get in touch with our friendly support team, and we will be happy to help. We will review the claim and guide you through the warranty process from start to finish.',
        a: 'Please get in touch with our friendly support team, and we will be happy to help. We will review the claim and guide you through the warranty process from start to finish.',
      },
    ],
  },
  {
    id: 'retail-private',
    title: 'Retail & Private Driver',
    short: 'Consumer warranty information',
    icon: Users,
    items: [
      {
        q: 'Can private individuals buy an extended car warranty directly from Panda Protect?',
        plain: 'No, Panda Protect operates strictly as a business-to-business (B2B) platform offering specialized warranty solutions for motor trade professionals, commercial networks, and vehicle dealerships. If you are a private consumer, individual driver, or retail customer looking to secure an extended warranty for your personal car, van, EV, or motorcycle, please visit our consumer retail site Buy A Warranty (https://pandaprotect.co.uk/). Buy A Warranty provides direct-to-consumer vehicle protection plans with transparent retail pricing.',
        a: (
          <>
            No, Panda Protect operates strictly as a{' '}
            <strong>business-to-business (B2B)</strong> platform offering specialized warranty solutions for motor trade
            professionals, commercial networks, and vehicle dealerships.
            <p className="mt-3">
              If you are a private consumer, individual driver, or retail customer looking to secure an extended warranty
              for your personal car, van, EV, or motorcycle, please visit our consumer retail site{' '}
              <a href="https://pandaprotect.co.uk/" target="_blank" rel="noopener noreferrer" className="text-[#eb4b00] underline font-semibold">Buy A Warranty</a>.
            </p>
            <p className="mt-3">Buy A Warranty provides direct-to-consumer vehicle protection plans with transparent retail pricing.</p>
          </>
        ),
      },
    ],
  },
];

const FAQTraders: React.FC = () => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({ 'account-setup-0': true });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggle = (id: string) => setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  const togglePillar = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const scrollTo = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: false }));
    const el = sectionRefs.current[id];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return PILLARS;
    const q = query.toLowerCase();
    return PILLARS.map((p) => ({
      ...p,
      items: p.items.filter((i) => i.q.toLowerCase().includes(q) || i.plain.toLowerCase().includes(q)),
    })).filter((p) => p.items.length > 0);
  }, [query]);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PILLARS.flatMap((p) =>
      p.items.map((i) => ({
        '@type': 'Question',
        name: i.q,
        acceptedAnswer: { '@type': 'Answer', text: i.plain },
      }))
    ),
  };

  return (
    <div className="public-static-page public-faq-page min-h-screen bg-[#f6f8fb]">
      <SEOHead
        title="Motor Trade Dealer FAQs | Panda Protect"
        description="Motor trade dealer FAQs covering account setup, dealer portal integration with AutoTrader, quick claims, fast payouts, warranty variants and UK dealer support."
        canonical="https://pandaprotect.co.uk/faq/traders"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <DealerPublicHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#14213d] tracking-tight">
            Frequently asked questions
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Quick answers for motor trade dealers — onboarding, the portal, claims, payouts and support.
          </p>
        </div>

        {/* Search */}
        <form
          className="mt-7 flex items-stretch gap-3 max-w-3xl mx-auto"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a question… (e.g. payouts, AutoTrader, claims)"
              className="w-full h-13 pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white text-[15px] text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-[#eb4b00] focus:ring-2 focus:ring-[#eb4b00]/20 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-6 sm:px-8 rounded-xl bg-[#eb4b00] text-white font-bold text-[15px] shadow-sm hover:bg-[#d43f00] transition-colors"
          >
            Search
          </button>
        </form>

        {/* Category cards */}
        <div className="mt-6 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => scrollTo(p.id)}
                className="flex-shrink-0 min-w-[150px] sm:min-w-0 text-left rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-[#eb4b00] hover:shadow transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-[#fff1e8] text-[#eb4b00] flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-2 font-bold text-[13px] leading-snug text-[#14213d]">{p.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.items.length} questions</div>
              </button>
            );
          })}
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-sm text-slate-500">
          <Info className="h-4 w-4" /> Click a question to expand and see the answer.
        </p>

        {/* Pillars */}
        <div className="mt-5 space-y-5">
          {filtered.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              No FAQs match <strong>"{query}"</strong>. Try a different search term.
            </div>
          )}

          {filtered.map((p) => {
            const Icon = p.icon;
            const isCollapsed = !query.trim() && !!collapsed[p.id];
            return (
              <div
                key={p.id}
                id={p.id}
                ref={(el) => (sectionRefs.current[p.id] = el)}
                className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Pillar header */}
                <button
                  onClick={() => togglePillar(p.id)}
                  className="w-full text-left px-5 sm:px-6 py-5 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                  aria-expanded={!isCollapsed}
                >
                  <div className="h-11 w-11 rounded-xl bg-[#fff1e8] text-[#eb4b00] flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#14213d]">{p.title}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{p.short}</p>
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-slate-500 mr-2 whitespace-nowrap">
                    {p.items.length} questions
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                  />
                </button>

                {/* Questions */}
                {!isCollapsed && (
                  <div className="px-5 sm:px-6 pb-5 space-y-2.5">
                    {p.items.map((item, idx) => {
                      const key = `${p.id}-${idx}`;
                      const open = !!openItems[key];
                      return (
                        <div
                          key={key}
                          className={`rounded-xl border transition-colors ${
                            open
                              ? 'border-[#eb4b00] bg-[#fff8f3]'
                              : 'border-slate-200 bg-white hover:border-[#eb4b00]/50'
                          }`}
                        >
                          <button
                            onClick={() => toggle(key)}
                            className="w-full min-h-12 text-left px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4"
                            aria-expanded={open}
                          >
                            <span className="font-bold text-[15px] text-[#14213d] pr-2">{item.q}</span>
                            <ChevronDown
                              className={`h-5 w-5 flex-shrink-0 text-[#eb4b00] transition-transform ${open ? 'rotate-180' : ''}`}
                            />
                          </button>
                          <div
                            className={`overflow-hidden transition-all duration-200 ease-out ${
                              open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div className="px-4 sm:px-5 pb-5 text-[15px] text-slate-600 leading-relaxed">
                              {item.a}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still need help */}
        <div className="mt-8 rounded-2xl bg-[#ffe9dd] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-11 w-11 rounded-xl bg-white/70 text-[#eb4b00] flex items-center justify-center flex-shrink-0">
            <Mail className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-extrabold text-[#14213d]">Still need help?</h3>
            <p className="text-slate-600 text-[15px] mt-1">
              Our UK-based team is here to help. Get in touch and we'll be happy to assist.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:items-end">
            <Link
              to="/contact-us/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#eb4b00] text-white font-bold hover:bg-[#d43f00] transition-colors shadow-sm"
            >
              Contact us <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/dealer-portal/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white text-[#14213d] border border-slate-200 font-bold hover:border-[#eb4b00] transition-colors text-sm"
            >
              Become a dealer partner
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FAQTraders;
