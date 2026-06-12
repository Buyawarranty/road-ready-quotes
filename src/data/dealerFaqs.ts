// Single source of truth for Panda Protect dealer / motor trade FAQs.
// Used by DealerFAQSection (visible accordion) and DealerFAQSchema (JSON-LD).
// Keeping schema text identical to visible text complies with Google's FAQPage guidance.

export type DealerFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type DealerFaqCategory = {
  id: string;
  category: string;
  questions: DealerFaqItem[];
};

export const dealerFaqCategories: DealerFaqCategory[] = [
  {
    id: 'account-setup',
    category: 'Account setup & onboarding',
    questions: [
      {
        id: 'dealer-registration',
        question: 'How can a motor trade dealer complete their registration for a new trade account?',
        answer:
          'To register for a Panda Protect dealer account, simply complete our online dealer application form. Once we verify your motor trade business and dealership details, your account is usually activated within 24 hours. After approval, you will have full access to our dealer portal, partner programme, warranty tools, and dealer resources.',
      },
      {
        id: 'dealer-login',
        question: 'Where do I access the motor trade login and my dedicated dealer dashboard?',
        answer:
          'You can access the motor trade login from the Panda Protect website. After entering your approved login details, you will be taken to your dealer dashboard. From there, you can issue warranties, manage claims, view policy information, track performance, and access dealer support.',
      },
      {
        id: 'dealer-terms',
        question: 'What are the primary dealer terms and conditions for your partner programme?',
        answer:
          'Our partner programme is designed to be flexible for UK motor trade businesses. We do not require minimum monthly sales volumes or long-term commitments. Full dealer terms, pricing structures, and compliance information are available within the dealer portal after registration.',
      },
    ],
  },
  {
    id: 'portal-integration',
    category: 'Portal integration & AutoTrader',
    questions: [
      {
        id: 'autotrader-integration',
        question: 'Does your dealer portal integrate with the AutoTrader portal?',
        answer:
          'Our dealer portal is designed to fit smoothly into existing dealership workflows. While all warranty policies are managed through Panda Protect, the system works alongside platforms such as AutoTrader and other dealer management tools, helping reduce administration and improve efficiency.',
      },
      {
        id: 'portal-tools',
        question: 'What advanced digital tools does the Panda Protect motor trade portal offer?',
        answer:
          'The Panda Protect motor trade portal includes a range of tools designed for busy dealerships, including: Instant warranty policy generation, Dealer dashboard and performance tracking, Dealer pricing and margin controls, Claims management and tracking, and Access to dealer support and resources. These features help dealers manage warranties quickly and efficiently from one central platform.',
      },
    ],
  },
  {
    id: 'claims-payouts',
    category: 'Claims, processing & instant payouts',
    questions: [
      {
        id: 'quick-claims',
        question: 'How does the Quick Claims process operate for approved trade partners?',
        answer:
          'To start a claim, simply navigate to the dedicated "Make a Claim" section located directly on our website\'s homepage. Dealers and approved VAT-registered repairers can access this submission portal 24/7. Our engineering team reviews all submitted data promptly to deliver swift repair authorisations and minimise customer vehicle downtime.',
      },
      {
        id: 'fast-payouts',
        question: 'Do you offer Fast Payouts on approved warranty claims?',
        answer:
          'Yes. Once a claim has been approved and the repair invoice has been submitted, payment is processed directly to the repairing garage or dealership. Our Fast Payout process helps support cash flow and ensures repairs can be completed without unnecessary delays.',
      },
    ],
  },
  {
    id: 'commercial-terms',
    category: 'Commercial terms & insurance',
    questions: [
      {
        id: 'warranty-variants',
        question: 'What variants of dealer warranties does Panda Protect offer?',
        answer:
          'We offer a range of dealer warranties designed for used cars, commercial vehicles, and specialist stock. Our cover plans can be tailored to match your specific forecourt profile, protecting qualifying vehicles up to 15 years old or 150,000 miles at the time of policy inception. Dealers can choose warranty terms, claim limits, and levels of cover that best match their forecourt inventory.',
      },
      {
        id: 'motor-trade-insurance',
        question: 'Do you provide combined motor trade insurance or quote comparisons?',
        answer:
          'Panda Protect specialises in dealer warranties and warranty administration. While we do not provide motor trade insurance directly, we offer guidance and resources to help dealerships understand motor trade insurance options, compare providers, and stay informed about developments within the UK motor trade sector.',
      },
    ],
  },
  {
    id: 'support-resources',
    category: 'Support & trade resources',
    questions: [
      {
        id: 'dealer-support',
        question: 'What level of dealer support can I expect?',
        answer:
          'Every Panda Protect partner has direct access to our UK-based team. Our friendly, helpful staff are always here to assist you with technical warranty queries, claims guidance, account management, or portal troubleshooting. Support is quickly reachable via phone, email, or through your portal dashboard.',
      },
      {
        id: 'trade-news',
        question: 'Where can I find the latest motor trade news and dealer resources?',
        answer:
          'The dealer resources section of our portal includes updates on motor trade warranty news, industry developments, compliance changes, and practical dealership guidance. These resources are designed to help dealers stay informed and make the most of their warranty programme.',
      },
    ],
  },
  {
    id: 'dealer-warranty-service',
    category: 'Dealer warranty service & admin',
    questions: [
      {
        id: 'how-support-dealerships',
        question: 'How do you support dealerships as a warranty provider?',
        answer:
          'As a trusted warranty provider, we help dealerships offer a simple and professional warranty service without the added paperwork. We manage the warranty registration, prepare and issue the warranty documents, and provide support if a customer needs to make a warranty claim.',
      },
      {
        id: 'process-warranty-myself',
        question: 'Do I need to process the warranty myself?',
        answer:
          'No. We process the warranty on your behalf, so there is no paperwork for your dealership to complete.',
      },
      {
        id: 'support-included',
        question: 'Is warranty support included for dealerships?',
        answer:
          'Yes. Warranty support is included for dealerships. Our team will handle the warranty documents and assist with the claims process when required.',
      },
      {
        id: 'team-handles',
        question: 'What does your team handle?',
        answer:
          'We handle the warranty registration, prepare and issue the warranty documents, and provide support if a warranty claim needs to be made.',
      },
      {
        id: 'warranty-documents-when',
        question: 'When will I receive the warranty documents?',
        answer:
          'Once the warranty has been processed, we will send the relevant warranty documents directly to you for your records and also to your customer.',
      },
      {
        id: 'complete-any-forms',
        question: 'Do I need to complete any forms?',
        answer:
          'No. We take care of the warranty paperwork for you. If we need any additional information, our team will contact you directly.',
      },
      {
        id: 'warranty-claim-happens',
        question: 'What happens if there is a warranty claim?',
        answer:
          'If a warranty claim is needed, simply contact our team with the details of the issue. We will guide you through the claims process and help coordinate the next steps.',
      },
      {
        id: 'help-my-dealership',
        question: 'How does this help my dealership?',
        answer:
          'Our warranty service helps your dealership save time, reduce paperwork, and give customers added confidence when purchasing from you. It also supports better profit margins by allowing you to offer added-value warranty cover without having to manage the full administration and support process yourself.',
      },
      {
        id: 'contact-warranty-support',
        question: 'Who do I contact for warranty support?',
        answer:
          'Please get in touch with our friendly support team, and we will be happy to help. We will review the claim and guide you through the warranty process from start to finish.',
      },
    ],
  },
];

// Flat list — used by JSON-LD schema.
export const dealerFaqsFlat: DealerFaqItem[] = dealerFaqCategories.flatMap((c) => c.questions);
