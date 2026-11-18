import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Download, FileText, ShieldCheck, type LucideIcon } from 'lucide-react';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import platinumPlanDoc from '@/assets/panda-protect-platinum-warranty-plan.pdf.asset.json';
import termsDoc from '@/assets/panda-protect-terms-and-conditions.pdf.asset.json';

type DealerDocument = {
  title: string;
  description: string;
  url: string;
  filename: string;
  icon: LucideIcon;
};

const DOCUMENTS: DealerDocument[] = [
  {
    title: 'Platinum Warranty Plan',
    description: 'The warranty plan document your customers receive — what is covered, claim limits and how to make a claim.',
    url: platinumPlanDoc.url,
    filename: 'Panda-Protect-Platinum-Warranty-Plan.pdf',
    icon: ShieldCheck,
  },
  {
    title: 'Terms & Conditions',
    description: 'The terms and conditions that apply to every Panda Protect warranty you sell.',
    url: termsDoc.url,
    filename: 'Panda-Protect-Terms-and-Conditions.pdf',
    icon: FileText,
  },
];

const DealerDocuments = () => {
  return (
    <DealerLayout>
      <Helmet>
        <title>Documents | Panda Protect Dealer Portal</title>
        <meta name="description" content="Download the Panda Protect Platinum Warranty Plan and Terms & Conditions documents." />
      </Helmet>

      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-crm-navy sm:text-3xl">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The current warranty documents for every Panda Protect warranty you sell. Download them to share with your customers.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {DOCUMENTS.map((doc) => (
            <a
              key={doc.title}
              href={doc.url}
              download={doc.filename}
              className="group flex flex-col rounded-xl border border-crm-line bg-card p-5 shadow-sm transition-colors hover:border-primary hover:shadow-md"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <doc.icon className="h-6 w-6" />
              </span>
              <span className="mt-4 text-base font-bold text-crm-navy group-hover:text-primary">{doc.title}</span>
              <span className="mt-1 flex-1 text-sm text-muted-foreground">{doc.description}</span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <Download className="h-4 w-4" /> Download PDF
              </span>
            </a>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          These are the same documents attached to the warranty email your customer receives when a warranty is activated.
        </p>
      </div>
    </DealerLayout>
  );
};

export default DealerDocuments;
