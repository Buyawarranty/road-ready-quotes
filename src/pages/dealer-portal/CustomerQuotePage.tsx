import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import CustomerQuoteView from '@/components/dealer/journey/CustomerQuoteView';
import DealerFieldError from '@/components/dealer/DealerFieldError';
import WarrantyOptionRow from '@/components/dealer/journey/WarrantyOptionRow';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Settings, Link2, MessageCircle, Mail } from 'lucide-react';
import { decodeCustomerQuote, adjustableQuotePrice, customerQuoteMessage } from '@/lib/customerQuoteSharing';
export { buildCustomerQuoteUrl } from '@/lib/customerQuoteSharing';

const CustomerQuotePage: React.FC = () => {
  const data = useMemo(() => decodeCustomerQuote(window.location.hash), []);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const payQuoteId = params.get('pay');
  const paid = params.get('paid') === '1';
  const cancelled = params.get('cancelled') === '1';
  const [selected, setSelected] = useState(data?.adjustable?.selected || []);
  const [extras, setExtras] = useState(data?.adjustable?.selectedExtras || []);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!data || new URLSearchParams(window.location.search).get('print') !== '1') return;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (!data) {
    return <div className="p-10 text-center text-muted-foreground">This quote link is no longer available.</div>;
  }

  const adjustable = data.adjustable;
  const price = adjustable ? adjustableQuotePrice(adjustable, selected, extras) : data.price;
  const specs = adjustable ? [data.specs[0], ...adjustable.groups.map((g, i) => ({ label: g.label, value: g.options.find(o => o.value === selected[i])?.label || '' }))].filter(Boolean) : data.specs;
  const included = adjustable ? [...adjustable.baseIncluded, ...adjustable.extras.filter(e => extras.includes(e.key)).map(e => e.label)] : data.included;
  const controls = adjustable ? <div className="customer-quote-tools mb-6 border-b border-crm-line pb-4">
    <h2 className="mb-2 text-sm font-bold">Choose your cover</h2>
    {adjustable.groups.map((group, i) => <WarrantyOptionRow key={group.label} icon={Settings} label={group.label} helper="" options={group.options} value={selected[i]} onChange={value => setSelected(current => current.map((v, j) => j === i ? value : v))} />)}
    <div className="mt-3 space-y-2">{adjustable.extras.map(extra => <label key={extra.key} className="flex items-center gap-2 text-sm"><Checkbox checked={extras.includes(extra.key)} onCheckedChange={checked => setExtras(current => checked ? [...current, extra.key] : current.filter(k => k !== extra.key))} /><span className="min-w-0 flex-1">{extra.label}</span><span>+£{extra.price.toFixed(2)}</span></label>)}</div>
  </div> : undefined;
  const shareUrl = window.location.href;
  const shareMessage = customerQuoteMessage({ ...data, price, specs, included }, shareUrl);
  const mailto = `mailto:?subject=${encodeURIComponent(`Your warranty quote${data.dealerName ? ` from ${data.dealerName}` : ''}`)}&body=${encodeURIComponent(shareMessage)}`;
  const shareSection = <section className="customer-quote-tools rounded-lg border border-crm-line bg-card p-5 sm:p-6" aria-label="Share this quote">
    <h2 className="mb-1 flex items-center gap-2 text-base font-bold"><Link2 className="h-5 w-5 text-crm-orange" />Share this quote</h2>
    <p className="mb-4 text-xs text-muted-foreground">Copy the link and paste it anywhere, or send it on WhatsApp or email. Anyone opening it sees the customer price only.</p>
    <div className="flex flex-wrap items-stretch gap-2">
      <input readOnly value={shareUrl} aria-label="Quote link" onFocus={event => event.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-md border border-crm-line bg-muted/60 px-3 text-xs text-muted-foreground" />
      <Button variant="outline" className="h-11 shrink-0 font-bold" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); } }}><Link2 />{copied ? 'Copied' : 'Copy link'}</Button>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Button variant="outline" className="h-11 font-bold" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank', 'noopener,noreferrer')}><MessageCircle />WhatsApp</Button>
      <Button variant="outline" className="h-11 font-bold" asChild><a href={mailto}><Mail />Email</a></Button>
    </div>
    {copied && <p className="mt-3 text-xs font-bold text-crm-green">Link copied — paste it anywhere.</p>}
  </section>;
  return (
    <>
      <Helmet>
        <title>Customer Quote</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <CustomerQuoteView {...data} price={price} specs={specs} included={included} quoteControls={controls} shareSection={shareSection} open onClose={() => window.close()} paymentSection={(payQuoteId || paid) ? <div>
        {paid ? <div className="rounded-lg border border-crm-green bg-crm-green/10 p-4 text-center">
          <p className="text-sm font-bold text-crm-green">Payment received — thank you.</p>
          <p className="mt-1 text-xs text-muted-foreground">Your dealer will confirm your warranty documents shortly.</p>
        </div> : <div className="rounded-lg border border-crm-line bg-card p-4 text-center">
          {cancelled && <DealerFieldError>Payment was cancelled. You can try again below.</DealerFieldError>}
          <Button className="w-full sm:w-auto" disabled={paying} onClick={async () => {
            setPaying(true); setPayError('');
            const { data: res, error } = await supabase.functions.invoke('customer-create-checkout', { body: { quote_id: payQuoteId, return_url: window.location.href } });
            setPaying(false);
            if (error || !res?.checkout_url) { setPayError(res?.error || 'Could not start payment — please contact your dealer.'); return; }
            window.location.href = res.checkout_url;
          }}><CreditCard /> {paying ? 'Redirecting…' : `Pay £${price.toFixed(2)} now`}</Button>
          <p className="mt-2 text-[11px] text-muted-foreground">Secure card payment powered by Stripe.</p>
          {payError && <DealerFieldError>{payError}</DealerFieldError>}
        </div>}
      </div> : undefined} />
    </>
  );
};

export default CustomerQuotePage;
