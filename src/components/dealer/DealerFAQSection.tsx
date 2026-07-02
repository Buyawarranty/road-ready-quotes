import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { dealerFaqCategories } from '@/data/dealerFaqs';

interface DealerFAQSectionProps {
  /** Heading text. Defaults to "Frequently asked questions". */
  heading?: string;
  /** Optional intro paragraph under the heading. */
  intro?: string;
  /** Background colour class. Defaults to bg-white. */
  bgClassName?: string;
}

const DealerFAQSection: React.FC<DealerFAQSectionProps> = ({
  heading = 'Frequently asked questions',
  intro,
  bgClassName = 'bg-white',
}) => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <section className={`py-12 sm:py-16 ${bgClassName}`}>
      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3">{heading}</h2>
          {intro && (
            <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">{intro}</p>
          )}
        </div>

        <div className="space-y-10">
          {dealerFaqCategories.map((cat) => (
            <div key={cat.id}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#eb4b00] mb-4">
                {cat.category}
              </h3>
              <div className="space-y-3">
                {cat.questions.map((q) => {
                  const isOpen = openId === q.id;
                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-orange-300 shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => toggle(q.id)}
                      aria-expanded={isOpen}
                      className="w-full px-5 py-4 text-left flex items-center justify-between text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-base sm:text-lg pr-4">{q.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 text-[#eb4b00] ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-out ${
                        isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="px-5 pb-5 bg-white border-t border-gray-100">
                        <p className="text-base leading-relaxed pt-4 whitespace-pre-line text-gray-700">
                          {q.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DealerFAQSection;
