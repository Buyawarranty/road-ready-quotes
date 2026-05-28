import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Lock, UserCircle2, Loader2 } from 'lucide-react';
import { useDealerAuth } from '@/hooks/useDealerAuth';

const UK_PLATE_REGEX = /^(?:[A-Z]{2}[0-9]{2}\s?[A-Z]{3}|[A-Z][0-9]{1,3}\s?[A-Z]{3}|[A-Z]{3}\s?[0-9]{1,3}[A-Z]?|[A-Z]{1,3}\s?[0-9]{1,4})$/i;
const PENDING_REG_KEY = 'dealerPendingReg';
const APP_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

/**
 * Embeddable hero widget for WordPress (or any external site).
 * Renders inside an <iframe> and breaks out to the top window on any CTA,
 * landing the user on the right Panda Protect page (login / signup / quote).
 *
 * Query params:
 *  - bg=transparent  → no background
 *  - compact=1       → hide headline + sub-copy, keep form + CTAs only
 *  - theme=dark      → dark CTA card variant
 */
const DealerWidget: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const transparent = params.get('bg') === 'transparent';
  const compact = params.get('compact') === '1';
  const { dealer, loading } = useDealerAuth();

  const [reg, setReg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Auto-resize: notify parent of our height so the iframe can grow with content.
  useEffect(() => {
    const post = () => {
      if (!rootRef.current) return;
      const height = rootRef.current.scrollHeight;
      window.parent?.postMessage({ type: 'panda:resize', height }, '*');
    };
    post();
    const ro = new ResizeObserver(post);
    if (rootRef.current) ro.observe(rootRef.current);
    window.addEventListener('load', post);
    return () => {
      ro.disconnect();
      window.removeEventListener('load', post);
    };
  }, []);

  // Same origin as the iframe → always exists; navigate the top window so
  // the user leaves WordPress and lands on the full Panda Protect page.
  const openTop = (path: string) => {
    const url = `${window.location.origin}${path}`;
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
        return;
      }
    } catch {
      // cross-origin top — fall through
    }
    window.open(url, '_top');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = reg.trim().toUpperCase();
    if (!cleaned) {
      setError('Enter registration number');
      return;
    }
    if (!UK_PLATE_REGEX.test(cleaned)) {
      setError('Enter valid UK registration');
      return;
    }
    setError(null);

    // Mirror DealerRegHero behaviour exactly.
    if (!dealer) {
      try { localStorage.setItem(PENDING_REG_KEY, cleaned); } catch {}
      const qs = new URLSearchParams({ redirect: '/dealer-portal', reg: cleaned });
      openTop(`/dealer-portal/login?${qs.toString()}`);
    } else {
      try { localStorage.removeItem(PENDING_REG_KEY); } catch {}
      openTop(`/dealer-portal/quote/pricing?reg=${encodeURIComponent(cleaned)}`);
    }
  };

  const ctaLabel = loading ? 'Loading…' : dealer ? 'Get Quote' : 'Sign in / Sign up to continue';

  return (
    <div
      ref={rootRef}
      className={transparent ? 'min-h-0' : 'bg-white'}
      style={{ padding: compact ? '16px' : '32px 20px 6px' }}
    >
      <Helmet>
        <title>Panda Protect Dealer Hero</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
        {!compact && (
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight">
              Sell more warranties.
              <br />
              <span className="text-orange-500">Grow your business.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-lg">
              Instant quotes. Flexible cover. Fast issuance. Everything you need
              to protect your customers and boost your bottom line.
            </p>
          </div>
        )}

        <div className={compact ? 'lg:col-span-2' : ''}>
          <form onSubmit={handleSubmit} className="space-y-3 w-full max-w-md" noValidate>
            <p className="text-sm font-bold text-gray-900">Get an instant trade quote</p>

            <div className="flex items-stretch rounded-lg overflow-hidden shadow-lg border-2 border-gray-300">
              <div className="bg-blue-600 text-white font-bold px-3 py-2 flex items-center justify-center min-w-[70px] h-[64px]">
                <div className="flex flex-col items-center">
                  <div className="text-base leading-tight mb-1">🇬🇧</div>
                  <div className="text-sm font-bold leading-none">UK</div>
                </div>
              </div>
              <input
                type="text"
                value={reg}
                onChange={(e) => {
                  setReg(e.target.value.toUpperCase());
                  if (error) setError(null);
                }}
                placeholder="ENTER REG"
                aria-label="Vehicle registration number"
                maxLength={10}
                className="bg-yellow-400 flex-1 text-center text-2xl text-black font-black uppercase tracking-wider h-[64px] placeholder:text-black/40 focus:outline-none focus:ring-4 focus:ring-orange-500/40 px-3"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 font-medium" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-lg flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (<>{ctaLabel} <ArrowRight className="h-5 w-5" /></>)}
            </button>

            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" /> Secure DVLA lookup — no manual data entry
            </p>
          </form>
        </div>
      </div>

      {!compact && (
        <div className="max-w-6xl mx-auto mt-10 bg-slate-900 rounded-2xl p-6 sm:p-8 grid sm:grid-cols-2 gap-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">Already a dealer?</p>
              <p className="text-sm text-slate-300 mb-3">
                Log in to manage quotes, policies and customers.
              </p>
              <button
                onClick={() => openTop('/dealer-portal/login')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors"
              >
                Dealer Login <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">Not signed up yet?</p>
              <p className="text-sm text-slate-300 mb-3">
                Join our dealer network and start selling warranties today.
              </p>
              <button
                onClick={() => openTop('/dealer-portal/signup')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors"
              >
                Become a Dealer <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerWidget;
