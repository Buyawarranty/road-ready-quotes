import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import CustomerQuoteView, { CustomerQuoteViewProps } from '@/components/dealer/journey/CustomerQuoteView';

type Payload = Omit<CustomerQuoteViewProps, 'open' | 'onClose'>;

/** Encode only customer-safe fields. Never pass trade/wholesale values in here. */
export function buildCustomerQuoteUrl(p: Payload) {
  const safe: Payload = {
    vehicle: p.vehicle,
    coverTitle: p.coverTitle,
    coverSubtitle: p.coverSubtitle,
    price: p.price,
    secondaryLabel: p.secondaryLabel,
    secondaryValue: p.secondaryValue,
    specs: p.specs,
    included: p.included,
    dealerName: p.dealerName,
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(safe))));
  return `/customer-quote#${encoded}`;
}

const CustomerQuotePage: React.FC = () => {
  const data = useMemo<Payload | null>(() => {
    try {
      const raw = window.location.hash.slice(1);
      return raw ? JSON.parse(decodeURIComponent(escape(atob(raw)))) : null;
    } catch {
      return null;
    }
  }, []);

  if (!data) {
    return <div className="p-10 text-center text-gray-600">This quote link is no longer available.</div>;
  }

  return (
    <>
      <Helmet>
        <title>Your warranty quote</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <CustomerQuoteView {...data} open onClose={() => window.close()} />
    </>
  );
};

export default CustomerQuotePage;
