import { useEffect } from 'react';
import { dealerFaqsFlat } from '@/data/dealerFaqs';

interface DealerFAQSchemaProps {
  /** Unique id for the <script> tag so multiple instances cannot collide. */
  id?: string;
}

/**
 * Injects FAQPage JSON-LD for the Panda Protect dealer FAQs.
 * Question / answer text matches DealerFAQSection visibly on the page.
 */
const DealerFAQSchema = ({ id = 'dealer-faq-schema' }: DealerFAQSchemaProps) => {
  useEffect(() => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: dealerFaqsFlat.map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer,
        },
      })),
    };

    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);

    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, [id]);

  return null;
};

export default DealerFAQSchema;
