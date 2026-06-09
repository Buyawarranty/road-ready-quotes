import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, UserCog, Plug, Wrench, FileText, LifeBuoy, LogIn, ArrowRight, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import WebsiteFooter from '@/components/WebsiteFooter';

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
            <Link to="/dealer-portal/signup" className="text-primary underline font-semibold">online dealer application form</Link>.
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
            <Link to="/dealer-portal/login" className="text-primary underline font-semibold">motor trade login</Link>{' '}
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
            <Link to="/make-a-claim/" className="text-primary underline font-semibold">"Make a Claim"</Link>{' '}
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
];

const FAQTraders: React.FC = () => {
  const [activePillar, setActivePillar] = useState<string>(PILLARS[0].id);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggle = (id: string) => setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const scrollTo = (id: string) => {
    setActivePillar(id);
    const el = sectionRefs.current[id];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Scroll-spy
  useEffect(() => {
    const onScroll = () => {
      const offsets = PILLARS.map((p) => {
        const el = sectionRefs.current[p.id];
        if (!el) return { id: p.id, top: Infinity };
        return { id: p.id, top: Math.abs(el.getBoundingClientRect().top - 120) };
      });
      offsets.sort((a, b) => a.top - b.top);
      if (offsets[0]) setActivePillar(offsets[0].id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <div className="min-h-screen bg-white">
      <SEOHead
        title="Motor Trade Dealer FAQs | Panda Protect"
        description="Motor trade dealer FAQs covering account setup, dealer portal integration with AutoTrader, quick claims, fast payouts, warranty variants and UK dealer support."
        canonical="https://pandaprotect.co.uk/faq/traders"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <DealerPublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-200 text-xs font-semibold tracking-wide uppercase mb-4">
                For Motor Trade Dealers
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
                Dealer FAQs &amp; Trade Partner Resources
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-200 max-w-2xl">
                Everything UK motor trade dealers need to know about onboarding, portal integration, quick claims, fast
                payouts and commercial cover with Panda Protect.
              </p>
              <div className="mt-3 text-sm text-slate-300">
                Looking for retail customer FAQs?{' '}
                <Link to="/faq/" className="underline font-semibold text-white hover:text-orange-200">
                  Switch to consumer FAQs →
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/dealer-portal/login"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-slate-900 font-bold hover:bg-orange-100 transition-colors"
              >
                <LogIn className="h-5 w-5" /> Motor Trade Login
              </Link>
              <Link
                to="/dealer-portal/signup"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors"
              >
                Become a Dealer Partner <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dealer FAQs… e.g. AutoTrader, payouts, claim limit"
                className="pl-12 h-12 bg-white text-slate-900 border-0 rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pillar tabs (mobile) */}
      <div className="lg:hidden border-b border-slate-200 sticky top-[64px] bg-white z-30">
        <div className="overflow-x-auto">
          <div className="flex gap-2 px-4 py-3 min-w-max">
            {PILLARS.map((p) => (
              <button
                key={p.id}
                onClick={() => scrollTo(p.id)}
                className={`px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activePillar === p.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid lg:grid-cols-[260px_1fr] gap-10">
          {/* Sidebar pillars */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">B2B Pillars</div>
              <nav className="space-y-1">
                {PILLARS.map((p) => {
                  const Icon = p.icon;
                  const active = activePillar === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => scrollTo(p.id)}
                      className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg transition-colors border-l-4 ${
                        active
                          ? 'border-orange-500 bg-orange-50 text-slate-900'
                          : 'border-transparent hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${active ? 'text-orange-600' : 'text-slate-500'}`} />
                      <span>
                        <span className="block font-semibold text-sm leading-tight">{p.title}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{p.short}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Support card */}
              <div className="mt-6 rounded-xl bg-slate-900 text-white p-5">
                <div className="text-sm font-bold mb-1">UK Dealer Support</div>
                <p className="text-xs text-slate-300 mb-3">Mon–Fri 9am to 5:30pm</p>
                <a href="tel:03302295045" className="flex items-center gap-2 text-orange-300 font-bold">
                  <Phone className="h-4 w-4" /> 0330 229 5045
                </a>
              </div>
            </div>
          </aside>

          {/* Pillars */}
          <div className="space-y-12">
            {filtered.length === 0 && (
              <div className="rounded-xl border border-slate-200 p-8 text-center text-slate-600">
                No FAQs match <strong>"{query}"</strong>. Try a different search term.
              </div>
            )}

            {filtered.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  id={p.id}
                  ref={(el) => (sectionRefs.current[p.id] = el)}
                  className="scroll-mt-28"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{p.title}</h2>
                  </div>

                  <div className="space-y-3">
                    {p.items.map((item, idx) => {
                      const key = `${p.id}-${idx}`;
                      const open = !!openItems[key];
                      return (
                        <div
                          key={key}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-orange-300 transition-colors"
                        >
                          <button
                            onClick={() => toggle(key)}
                            className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                            aria-expanded={open}
                          >
                            <span className="font-semibold text-slate-900 pr-2">{item.q}</span>
                            <ChevronDown
                              className={`h-5 w-5 flex-shrink-0 text-slate-500 transition-transform ${
                                open ? 'rotate-180 text-orange-600' : ''
                              }`}
                            />
                          </button>
                          <div
                            className={`overflow-hidden transition-all duration-200 ease-out ${
                              open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div className="px-5 pb-5 pt-1 text-slate-700 leading-relaxed border-t border-slate-100">
                              {item.a}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* CTA */}
            <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white p-8 lg:p-10 mt-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Ready to join the Panda Protect dealer network?</h3>
                  <p className="text-orange-50 max-w-xl">
                    Activate your dealer account in 24 hours and start issuing warranties from the same day.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/dealer-portal/signup"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-orange-600 font-bold hover:bg-orange-50"
                  >
                    Apply Now <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/dealer-portal/login"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800"
                  >
                    <LogIn className="h-5 w-5" /> Motor Trade Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
};

export default FAQTraders;
