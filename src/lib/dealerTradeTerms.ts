export const DEALER_TRADE_TERMS_VERSION = '2026-11-15-v1';

export const DEALER_TRADE_TERMS_SUMMARY = [
  {
    title: 'Buy one, get the next one free',
    description: "Every paid warranty earns your next warranty free (up to 3 years' duration), while the offer is running.",
  },
  {
    title: '30-day invoicing',
    description: 'Available to request after 6 paid warranties with no cancellations or refunds, subject to approval and account status.',
  },
  {
    title: 'Eligible use',
    description: 'Trade benefits apply to qualifying dealer purchases only.',
  },
];

export const DEALER_FULL_TRADE_TERMS = [
  {
    title: '1. Buy one, get the next one free',
    paragraphs: [
      "While the offer is running, each paid warranty (not cancelled or refunded) earns the dealership one free warranty, with cover up to 3 years' duration, applied automatically at checkout.",
      'Free warranties do not count as paid purchases and do not earn further free warranties. Panda Protect may end or change the offer at any time; free warranties already issued stay in place.',
    ],
  },
  {
    title: '2. Thirty-day dealer invoicing',
    paragraphs: [
      'A dealership may request 30-day invoicing after completing 6 paid warranties with no cancellations or refunds. Reaching this threshold makes the dealership eligible to request credit; it does not activate invoicing automatically.',
      'Panda Protect must authorise the request before invoicing is switched on. Approval also depends on the dealership remaining active and its account status, including any overdue balances.',
      'Once authorised, the dealer can choose Activate now and pay later at checkout. The warranty is issued immediately and added to the dealer account, with payment due within 30 days. Overdue invoices can pause further invoice purchases until the balance is cleared.',
    ],
  },
  {
    title: '3. Eligible dealer use',
    paragraphs: [
      'Trade benefits and trade pricing apply only to qualifying purchases made through an approved Panda Protect dealer account for dealer customers.',
    ],
  },
  {
    title: '4. Acceptance and warranty terms',
    paragraphs: [
      'The authorised dealer user must review and accept these Trade Terms & Conditions before the dealership issues its first warranty. Acceptance is recorded against the dealership and the person accepting.',
      'Vehicle eligibility, coverage, exclusions, claims and cancellations are governed by the warranty plan documents and the applicable Panda Protect warranty terms supplied with the quote and policy.',
    ],
  },
];

export type TradeTermsSummaryItem = { title: string; description: string };
export type TradeTermsSection = { title: string; paragraphs: string[] };
export type TradeTerms = { version: string; summary: TradeTermsSummaryItem[]; sections: TradeTermsSection[] };

export const DEFAULT_TRADE_TERMS: TradeTerms = {
  version: DEALER_TRADE_TERMS_VERSION,
  summary: DEALER_TRADE_TERMS_SUMMARY,
  sections: DEALER_FULL_TRADE_TERMS,
};

/** Latest published version from admin, falling back to the built-in first version. */
export async function fetchCurrentTradeTerms(client: any): Promise<TradeTerms> {
  const { data } = await client.from('dealer_trade_terms_versions')
    .select('version, summary, sections').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data || !Array.isArray(data.summary) || !Array.isArray(data.sections)) return DEFAULT_TRADE_TERMS;
  return data as TradeTerms;
}
