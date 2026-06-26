import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { dealerFaqCategories, dealerFaqsFlat, type DealerFaqItem } from '@/data/dealerFaqs';

interface DealerFAQSectionProps {
  heading?: string;
  intro?: string;
  bgClassName?: string;
  /** When true, render a single soft section with a limited set of questions and a 'View all' link. */
  compact?: boolean;
  /** IDs of questions to show in compact mode. Defaults to a sensible top-5. */
  compactIds?: string[];
  /** Link target for 'View all FAQs' in compact mode. */
  viewAllHref?: string;
}

const DEFAULT_COMPACT_IDS = [
  'process-warranty-myself',
  'warranty-claim-happens',
  'support-included',
  'warranty-documents-when',
  'contact-warranty-support',
];

const DealerFAQSection: React.FC<DealerFAQSectionProps> = ({
  heading,
  intro,
  bgClassName = 'bg-white',
  compact = false,
  compactIds = DEFAULT_COMPACT_IDS,
  viewAllHref = '/faq/traders',
}) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  const renderAnswer = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) =>
      part.match(urlRegex) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#eb4b00] hover:underline font-medium">{part}</a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const renderItem = (q: DealerFaqItem) => {
    const isOpen = openId === q.id;
    return (
      <div
        key={q.id}
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 border-l-4 border-l-[#eb4b00]"
      >
        <button
          onClick={() => toggle(q.id)}
          aria-expanded={isOpen}
          className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <span className="font-bold text-base sm:text-lg text-gray-900 pr-4">{q.question}</span>
          <ChevronDown
            className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 text-[#eb4b00] ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ease-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-5 pb-5 pt-1">
            <p className="text-base leading-relaxed whitespace-pre-line text-gray-700">{renderAnswer(q.answer)}</p>
          </div>
        </div>
      </div>
    );
  };

  if (compact) {
    const items = compactIds
      .map((id) => dealerFaqsFlat.find((q) => q.id === id))
      .filter((q): q is DealerFaqItem => Boolean(q));
    const mid = Math.ceil(items.length / 2);
    const left = items.slice(0, mid);
    const right = items.slice(mid);
    return (
      <section className={`py-14 ${bgClassName}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              {heading ?? 'Common questions from dealers'}
            </h2>
            {intro && <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">{intro}</p>}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-4">{left.map(renderItem)}</div>
            <div className="space-y-4">{right.map(renderItem)}</div>
          </div>
          <div className="text-center mt-8">
            <Link to={viewAllHref} className="inline-flex items-center text-sm font-semibold text-[#eb4b00] hover:underline">
              View all FAQs →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-16 ${bgClassName}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            <span className="text-[#eb4b00]">{heading ?? "FAQ's"}</span>
          </h2>
          {intro && (
            <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">{intro}</p>
          )}
        </div>

        <div className="space-y-12 max-w-6xl mx-auto">
          {dealerFaqCategories.map((cat) => {
            const mid = Math.ceil(cat.questions.length / 2);
            const left = cat.questions.slice(0, mid);
            const right = cat.questions.slice(mid);
            return (
              <div key={cat.id}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#eb4b00] mb-5 text-center sm:text-left">
                  {cat.category}
                </h3>
                <div className="grid lg:grid-cols-2 gap-5">
                  <div className="space-y-5">{left.map(renderItem)}</div>
                  <div className="space-y-5">{right.map(renderItem)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DealerFAQSection;
