import React, { useEffect, useState } from 'react';
import { RotateCw, ShieldCheck } from 'lucide-react';

type QuickSecurityCheckProps = {
  /** Increments each time the parent rejects the answer; shows a prompt. */
  attempted?: number;
  /** Called whenever whether the typed answer matches the sum changes. */
  onAnswerChange: (verified: boolean) => void;
};

const makeSum = () => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
};

/**
 * A one-line sum a person can answer instantly, used to keep spam robots out
 * of website call-back requests. The question is deliberately bold so it is
 * the first thing a visitor reads.
 */
const QuickSecurityCheck: React.FC<QuickSecurityCheckProps> = ({ attempted = 0, onAnswerChange }) => {
  const [sum, setSum] = useState(makeSum);
  const [value, setValue] = useState('');

  const trimmed = value.trim();
  const verified = trimmed !== '' && Number(trimmed) === sum.answer;
  const showPrompt = attempted > 0 && !verified;
  const prompt =
    trimmed === ''
      ? 'Please answer the quick security check to continue.'
      : "That answer isn't right — please try the sum again.";

  useEffect(() => {
    onAnswerChange(verified);
  }, [verified, onAnswerChange]);

  const refresh = () => {
    setSum(makeSum());
    setValue('');
  };

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
        <p className="text-sm font-bold text-foreground">Quick security check</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label htmlFor="quick-security-check" className="text-base font-bold text-foreground">
          What is {sum.a} + {sum.b}?
        </label>
        <input
          id="quick-security-check"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
          aria-invalid={showPrompt ? true : undefined}
          className="h-10 w-16 rounded-lg border-2 border-border bg-background px-2 text-center text-base font-bold text-foreground outline-none transition-colors focus:border-brand-orange"
        />
        <button
          type="button"
          onClick={refresh}
          aria-label="Ask a different sum"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {showPrompt ? (
        <p className="mt-2 text-sm font-medium text-red-500" role="alert">
          {prompt}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Just a quick sum so we know you're a person, not a spam robot.
        </p>
      )}
    </div>
  );
};

export default QuickSecurityCheck;
