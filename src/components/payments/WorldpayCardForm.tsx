import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Lock, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WORLDPAY_CHECKOUT_ID, WORLDPAY_SDK_URL, WORLDPAY_ENVIRONMENT } from '@/config/worldpay';

declare global {
  interface Window {
    Worldpay?: any;
  }
}

let sdkPromise: Promise<void> | null = null;

const loadSdk = (): Promise<void> => {
  if (window.Worldpay?.checkout) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WORLDPAY_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load the Worldpay card SDK')));
      return;
    }
    const script = document.createElement('script');
    script.src = WORLDPAY_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the Worldpay card SDK'));
    document.head.appendChild(script);
  });
  return sdkPromise;
};

interface Props {
  /** Amount shown on the pay button, in pounds. */
  amountPounds: number;
  disabled?: boolean;
  submitLabel?: string;
  /** Called with the one-time Worldpay card session href and the cardholder name. */
  onSession: (sessionHref: string, cardholderName: string) => Promise<void> | void;
}

const fieldShell =
  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors ' +
  '[&.is-onfocus]:border-ring [&.is-onfocus]:ring-2 [&.is-onfocus]:ring-ring [&.is-onfocus]:ring-offset-2 ' +
  '[&.is-invalid]:border-destructive [&.is-valid]:border-emerald-500 ' +
  '[&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0';

const WorldpayCardForm: React.FC<Props> = ({ amountPounds, disabled, submitLabel, onSession }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const checkoutRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardholder, setCardholder] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!WORLDPAY_CHECKOUT_ID) return;

    loadSdk()
      .then(() => {
        if (cancelled || !formRef.current) return;
        window.Worldpay.checkout.init(
          {
            id: WORLDPAY_CHECKOUT_ID,
            form: '#worldpay-card-form',
            fields: {
              pan: { selector: '#worldpay-pan', placeholder: '4444 3333 2222 1111' },
              expiry: { selector: '#worldpay-expiry', placeholder: 'MM/YY' },
              cvv: { selector: '#worldpay-cvv', placeholder: '123' },
            },
            styles: {
              input: {
                'font-size': '14px',
                'font-family': 'inherit',
                color: 'hsl(var(--foreground))',
                'line-height': '24px',
              },
              'input.is-invalid': { color: 'hsl(var(--destructive))' },
            },
            enablePanFormatting: true,
          },
          (err: any, checkout: any) => {
            if (cancelled) return;
            if (err) {
              console.error('Worldpay SDK init error', err);
              setError('Could not start the secure card form. Please refresh and try again.');
              return;
            }
            checkoutRef.current = checkout;
            setReady(true);
          },
        );
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Could not load the secure card form');
      });

    return () => {
      cancelled = true;
      try {
        checkoutRef.current?.remove?.();
      } catch {
        /* noop */
      }
      checkoutRef.current = null;
    };
  }, []);

  // The SDK toggles `is-valid` on the form element as the fields validate.
  useEffect(() => {
    if (!ready || !formRef.current) return;
    const el = formRef.current;
    const sync = () => setFormValid(el.classList.contains('is-valid'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [ready]);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!checkoutRef.current || submitting || disabled) return;
      setError(null);
      setSubmitting(true);
      checkoutRef.current.generateSessionState(async (err: any, sessionState: any) => {
        if (err) {
          console.error('Worldpay session error', err);
          setError('Please check the card details and try again.');
          setSubmitting(false);
          return;
        }
        const href = Array.isArray(sessionState) ? sessionState[0] : sessionState;
        try {
          await onSession(String(href), cardholder.trim());
          try {
            checkoutRef.current?.clearForm?.(() => undefined);
          } catch {
            /* noop */
          }
        } catch (e: any) {
          setError(e?.message || 'Payment failed. Please try again.');
        } finally {
          setSubmitting(false);
        }
      });
    },
    [cardholder, disabled, onSession, submitting],
  );

  if (!WORLDPAY_CHECKOUT_ID) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Worldpay card form not configured — add your Access Checkout ID as{' '}
          <code className="font-mono">VITE_WORLDPAY_CHECKOUT_ID</code> to enable in-app card payments.
        </span>
      </div>
    );
  }

  return (
    <form id="worldpay-card-form" ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="worldpay-cardholder" className="text-xs">
          Name on card
        </Label>
        <Input
          id="worldpay-cardholder"
          value={cardholder}
          onChange={(e) => setCardholder(e.target.value)}
          placeholder="J Smith"
          className="h-10"
          maxLength={60}
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Card number</Label>
        <div id="worldpay-pan" className={fieldShell} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Expiry date</Label>
          <div id="worldpay-expiry" className={fieldShell} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Security code</Label>
          <div id="worldpay-cvv" className={fieldShell} />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={!ready || !formValid || submitting || disabled}
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4 mr-2" />
        )}
        {submitLabel || `Take payment £${(amountPounds || 0).toFixed(2)}`}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="w-3 h-3" />
        Card details are captured directly by Worldpay
        {WORLDPAY_ENVIRONMENT === 'sandbox' ? ' (sandbox)' : ''} — they never reach our servers.
      </p>
    </form>
  );
};

export default WorldpayCardForm;
