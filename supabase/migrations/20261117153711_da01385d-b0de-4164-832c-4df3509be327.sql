REVOKE ALL ON FUNCTION public.bdm_portfolio_link() FROM public, anon, authenticated;
CREATE INDEX bdm_portfolio_dealer_idx ON public.bdm_portfolio(dealer_id);