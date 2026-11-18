import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { pandaLogoUrl } from '@/lib/pandaLogo';
import { CheckCircle2, Loader2 } from 'lucide-react';

const PartnerCheckoutSuccess: React.FC = () => {
  const [params] = useSearchParams();
  const [state, setState] = useState<{ loading: boolean; error?: string; registration?: string; email?: string }>({ loading: true });
  useEffect(() => {
    let tries = 0;
    const run = async () => {
      const { data, error } = await supabase.functions.invoke('partner-confirm-payment', { body: { session_id: params.get('session_id') } });
      if (data?.confirmed) return setState({ loading: false, registration: data.registration, email: data.email });
      if (++tries < 4) return setTimeout(run, 3000);
      setState({ loading: false, error: data?.error || error?.message || 'We are still confirming your payment.' });
    };
    run();
  }, [params]);
  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Warranty confirmed | Panda Protect</title><meta name="robots" content="noindex" /></Helmet>
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <img src={pandaLogoUrl} alt="Panda Protect" className="mx-auto h-10 w-auto" />
        {state.loading && <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-muted-foreground" />}
        {!state.loading && !state.error && (<>
          <CheckCircle2 className="mx-auto mt-8 h-14 w-14 text-primary" />
          <h1 className="mt-3 text-2xl font-bold">Your warranty is confirmed</h1>
          <p className="mt-2 text-muted-foreground">Cover for {state.registration} is now in place. Your documents have been emailed to {state.email}.</p>
        </>)}
        {state.error && <p className="mt-8 text-sm text-muted-foreground">{state.error} Your payment is safe — if you have no email within an hour, call 0330 229 6547 or email support@pandaprotect.co.uk.</p>}
      </div>
    </div>
  );
};
export default PartnerCheckoutSuccess;
