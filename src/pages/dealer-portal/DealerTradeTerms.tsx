import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTradeTerms } from '@/hooks/useTradeTerms';

const DealerTradeTerms: React.FC = () => {
  const { terms } = useTradeTerms();
  return (
  <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-3xl">
      <Link to="/dealer-portal" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-crm-blue"><ArrowLeft className="h-4 w-4" /> Panda Protect dealer portal</Link>
      <header className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <FileText className="mb-4 h-9 w-9 text-crm-orange" />
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Panda Protect dealers</p>
        <h1 className="mt-2 text-3xl font-extrabold text-crm-navy sm:text-4xl">Trade Terms & Conditions</h1>
        <p className="mt-3 text-muted-foreground">Terms version {terms.version}. These terms explain the dealer introductory offer, invoicing authorisation and qualifying use.</p>
      </header>
      <div className="mt-6 space-y-5">
        {terms.sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-xl font-bold text-crm-navy">{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 leading-relaxed text-muted-foreground">{paragraph}</p>)}
          </section>
        ))}
      </div>
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">The applicable warranty plan documents and <Link to="/terms/" className="font-semibold text-crm-blue underline">Panda Protect warranty terms</Link> provide the full coverage and claims conditions.</p>
    </div>
  </main>
  );
};

export default DealerTradeTerms;
