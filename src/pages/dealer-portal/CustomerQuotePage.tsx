import React, { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import CustomerQuoteView from '@/components/dealer/journey/CustomerQuoteView';
import { decodeCustomerQuote } from '@/lib/customerQuoteSharing';
export { buildCustomerQuoteUrl } from '@/lib/customerQuoteSharing';

const CustomerQuotePage: React.FC = () => {
  const data = useMemo(() => decodeCustomerQuote(window.location.hash), []);
  useEffect(() => {
    if (!data || new URLSearchParams(window.location.search).get('print') !== '1') return;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (!data) {
    return <div className="p-10 text-center text-muted-foreground">This quote link is no longer available.</div>;
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
