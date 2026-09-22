import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Mail,
  Phone,
  ShieldCheck,
  Upload,
  Ban,
  Headphones,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { Button } from '@/components/ui/button';

const PLATINUM_PDF = '/Platinum-Warranty-Plan-v2.4.pdf';
const TANDC_PDF = '/Terms-and-Conditions-v2.3.pdf';
const CLAIMS_EMAIL = 'hello@pandaprotect.co.uk';
const CLAIMS_PHONE = '0330 229 5045';
const WHATSAPP_URL = 'https://wa.me/message/SPQPJ6O3UBF5B1';

const SectionKicker: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500 mb-3">{children}</p>
);

const SAFE_HANDS = [
  {
    icon: Clock,
    title: 'Quick response',
    body: 'We respond to claims quickly and fairly, with no unnecessary delays.',
  },
  {
    icon: ShieldCheck,
    title: 'UK-based team',
    body: 'Our UK-based claims team is here to guide you every step of the way.',
  },
  {
    icon: FileText,
    title: 'Simple process',
    body: 'We keep things simple - no confusing jargon or hidden terms.',
  },
];

const WHAT_YOU_NEED = [
  'Your vehicle registration',
  'A brief description of the issue',
  'Any supporting documents, garage report or invoice',
];

const MakeAClaim: React.FC = () => {
  const [confirmed, setConfirmed] = useState(false);

  const canonical = 'https://pandaprotect.co.uk/make-a-claim/';

  return (
    <>
      <Helmet>
        <title>Make a Claim | Panda Protect Warranty Claims</title>
        <meta
          name="description"
          content="Making a claim is simple and supportive. Start your claim online in about 3 minutes, or talk to our UK-based claims team. Claims team open Monday to Friday, 9am to 5pm."
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content="Make a Claim | Panda Protect Warranty Claims" />
        <meta
          property="og:description"
          content="Simple and supportive claims. Start your claim online in about 3 minutes, or talk to our UK-based claims team."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <DealerPublicHeader />

      <main className="bg-background min-h-screen">
        {/* ================= HERO ================= */}
        <section className="py-10 sm:py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
                <Clock className="h-4 w-4" />
                Claims team open Monday-Friday, 9am-5pm
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
              Making a claim
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-6">Simple and supportive.</p>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">

              We know that vehicle issues can be stressful, but making a claim shouldn&apos;t be. At
              Panda Protect, we&apos;ve made the process clear, quick and customer focused - so you
              get the help you need without the hassle.
            </p>
          </div>
        </section>

        {/* ================= ACTIVE COVER NOTICE ================= */}
        <section className="pb-10 sm:pb-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-green-200 bg-green-50 px-5 sm:px-6 py-5">
              <p className="flex items-center gap-2 font-semibold text-green-800 mb-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Your warranty cover is now active.
              </p>
              <p className="text-sm sm:text-base text-green-900/80 leading-relaxed">
                Please note that claims can be submitted after your first{' '}
                <strong className="text-green-900">14 days of continuous cover.</strong> Full
                details can be found in your policy documents.
              </p>
            </div>
          </div>
        </section>

        {/* ================= WHY YOU'RE IN SAFE HANDS ================= */}
        <section className="pb-14 sm:pb-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionKicker>Why you&apos;re in safe hands</SectionKicker>
            <div className="grid sm:grid-cols-3 gap-4 mt-2">
              {SAFE_HANDS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-card border rounded-2xl p-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1.5">{title}</h3>

                  <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= WHAT YOU'LL NEED ================= */}
        <section className="pb-14 sm:pb-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionKicker>What you&apos;ll need</SectionKicker>
            <div className="bg-card border rounded-2xl p-6 mt-2">
              <ul className="space-y-3">
                {WHAT_YOU_NEED.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="h-5 w-5 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-foreground/90 text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Already submitted */}
            <div className="mt-4 bg-card border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1">Already submitted a claim?</h3>

                <p className="text-muted-foreground text-sm leading-relaxed">
                  Just upload extra evidence (photos, reports, invoices) to your existing claim.
                </p>
              </div>
              <Button
                asChild
                className="bg-[#1e293b] hover:bg-[#0f172a] text-white font-semibold whitespace-nowrap"
              >
                <Link to="/customer-dashboard/">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload evidence
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ================= START YOUR CLAIM ================= */}
        <section className="pb-16 sm:pb-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Start your claim</h2>

            <p className="text-muted-foreground mb-8">Takes about 3 minutes.</p>

            <div className="rounded-3xl border bg-card shadow-sm p-5 sm:p-8">
              {/* Before you begin */}
              <div className="flex items-start gap-4 mb-7">
                <div className="h-11 w-11 rounded-full bg-slate-800 text-white flex items-center justify-center flex-shrink-0">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">Before you begin</h3>

                  <p className="text-muted-foreground text-sm sm:text-base">
                    Please take a moment to review this important information.
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {/* No refund */}
                <div className="rounded-2xl bg-orange-50 border border-orange-100 p-5 flex gap-4">
                  <div className="h-9 w-9 rounded-full bg-orange-500/15 text-orange-600 flex items-center justify-center flex-shrink-0">
                    <Ban className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">No refund after submitting</h4>

                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      Once you submit a claim, your warranty will no longer be eligible for
                      cancellation or refund. Our claims team begins reviewing your case straight
                      away, including assessing your claim and working with approved garages on your
                      behalf. These costs are incurred as soon as the process starts and cannot be
                      recovered.
                    </p>
                  </div>
                </div>

                {/* Cover stays active */}
                <div className="rounded-2xl bg-green-50 border border-green-100 p-5 flex gap-4">
                  <div className="h-9 w-9 rounded-full bg-green-600/15 text-green-700 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">Your cover stays active</h4>

                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      This is standard practice across the warranty industry and is outlined in your
                      policy terms. Your warranty cover will continue as normal for the remainder of
                      your policy period - submitting a claim will not reduce or affect your ongoing
                      protection.
                    </p>
                  </div>
                </div>

                {/* Not sure */}
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 flex gap-4">
                  <div className="h-9 w-9 rounded-full bg-blue-600/15 text-blue-700 flex items-center justify-center flex-shrink-0">
                    <Headphones className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
                      Not sure? We&apos;re here to help
                    </h4>

                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-3">
                      Our friendly team can answer any questions before you proceed.
                    </p>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-foreground">
                      <a href={`tel:${CLAIMS_PHONE.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Phone className="h-4 w-4" />
                        {CLAIMS_PHONE}
                      </a>
                      <span className="hidden sm:inline text-muted-foreground">|</span>
                      <a href={`mailto:${CLAIMS_EMAIL}`} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors break-all">
                        <Mail className="h-4 w-4" />
                        {CLAIMS_EMAIL}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important documents */}
              <h4 className="text-base sm:text-lg font-semibold text-foreground mb-1">Important documents</h4>
              <p className="text-muted-foreground text-sm mb-4">
                Please review the relevant documents before submitting your claim.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mb-7">
                <a
                  href={PLATINUM_PDF}
                  target="_blank"
                  rel="noopener"
                  className="group flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3.5 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold text-foreground text-sm truncate">
                      Platinum Plan
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </a>
                <a
                  href={TANDC_PDF}
                  target="_blank"
                  rel="noopener"
                  className="group flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3.5 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold text-foreground text-sm truncate">
                      Terms &amp; Conditions
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </a>
              </div>

              {/* Confirm checkbox */}
              <label className="flex items-start gap-3 rounded-xl border bg-background px-4 py-4 cursor-pointer select-none hover:border-primary/40 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 flex-shrink-0"
                />
                <span className="text-sm text-foreground/90 leading-relaxed">
                  I confirm the information provided is accurate and that I have read and understood
                  the information above.
                </span>
              </label>
            </div>

            {/* Continue button */}
            <div className="mt-5">
              {confirmed ? (
                <Button
                  asChild
                  size="lg"
                  className="w-full h-12 bg-[#eb4b00] hover:bg-[#d63f00] text-white font-semibold text-base"
                >
                  <Link to="/customer-dashboard/">
                    Continue to claim form
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  disabled
                  size="lg"
                  className="w-full h-12 bg-orange-500/40 text-white/90 font-semibold text-base cursor-not-allowed"
                >
                  Continue to claim form
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              {!confirmed && (
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-3">
                  <Info className="h-3.5 w-3.5" />
                  Please tick the box above to continue.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ================= YOUR REPAIR LIMIT ================= */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionKicker>Your repair limit</SectionKicker>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-5">
              Clear limits, no surprises
            </h2>

            <div className="space-y-4 text-muted-foreground text-base leading-relaxed max-w-2xl mb-8">
              <p>
                Your maximum repair limit is clearly outlined in your warranty email and visible in
                your online account. If a repair exceeds your limit, you can simply top it up.
              </p>
              <p>
                In our experience, this situation is very rare - especially if you&apos;ve selected
                a claim limit that suits your vehicle and driving habits.
              </p>
            </div>
            <div className="rounded-2xl border bg-card px-5 py-4 flex items-center gap-3 max-w-2xl">
              <span className="h-6 w-6 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0">
                <Check className="h-4 w-4" />
              </span>
              <p className="text-sm sm:text-base text-foreground/90 font-medium">
                We cover what we promise - no hidden surprises.
              </p>
            </div>
          </div>
        </section>

        {/* ================= GET IN TOUCH ================= */}
        <section className="py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionKicker>Get in touch</SectionKicker>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
              Talk to our claims team
            </h2>


            <div className="grid sm:grid-cols-2 gap-4">
              <a
                href={`mailto:${CLAIMS_EMAIL}`}
                className="group rounded-2xl border bg-card p-6 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Email us</h3>
                <p className="text-muted-foreground text-sm mb-3">Send your claim details</p>
                <p className="font-semibold text-foreground text-sm break-all group-hover:text-primary transition-colors">
                  {CLAIMS_EMAIL}
                </p>
              </a>
              <a
                href={`tel:${CLAIMS_PHONE.replace(/\s/g, '')}`}
                className="group rounded-2xl border bg-card p-6 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Phone className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Call us</h3>
                <p className="text-muted-foreground text-sm mb-3">Mon-Fri, 9am-5pm</p>
                <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                  {CLAIMS_PHONE}
                </p>
              </a>
            </div>

            <div className="mt-6 rounded-2xl bg-green-50 border border-green-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <p className="text-sm sm:text-base text-green-900 font-medium flex-1">
                Prefer to message? Chat with our team on WhatsApp.
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap"
              >
                WhatsApp Us
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default MakeAClaim;
