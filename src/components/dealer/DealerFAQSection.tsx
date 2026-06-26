import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { dealerFaqCategories } from '@/data/dealerFaqs';

interface DealerFAQSectionProps {
  heading?: string;
  intro?: string;
  bgClassName?: string;
}

const DealerFAQSection: React.FC<DealerFAQSectionProps> = ({
  heading = "FAQ's",
  intro,
  bgClassName = 'bg-white',
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

  return (
    <section className={`py-16 ${bgClassName}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            <span className="text-[#eb4b00]">{heading}</span>
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
            const renderItem = (q: { id: string; question: string; answer: string }) => {
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
