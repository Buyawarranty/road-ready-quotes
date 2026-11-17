CREATE TABLE public.bdm_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bdm_user_id uuid NOT NULL,
  dealership_id uuid REFERENCES public.bdm_dealerships(id) ON DELETE SET NULL,
  dealer_id uuid REFERENCES public.dealers(id) ON DELETE SET NULL,
  dealership_name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  town text,
  postcode text,
  onboarded_at date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'onboarding',
  next_follow_up_at date,
  follow_up_action text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bdm_portfolio_owner_idx ON public.bdm_portfolio(bdm_user_id);
CREATE INDEX bdm_portfolio_dealership_idx ON public.bdm_portfolio(dealership_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bdm_portfolio TO authenticated;
GRANT ALL ON public.bdm_portfolio TO service_role;
ALTER TABLE public.bdm_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio view" ON public.bdm_portfolio FOR SELECT TO authenticated
USING (bdm_user_id = auth.uid() OR public.bdm_is_manager(auth.uid()) OR public.bdm_is_town_admin(auth.uid()));
CREATE POLICY "Portfolio add" ON public.bdm_portfolio FOR INSERT TO authenticated
WITH CHECK (public.bdm_is_staff(auth.uid()) AND (bdm_user_id = auth.uid() OR public.bdm_is_manager(auth.uid()) OR public.bdm_is_town_admin(auth.uid())));
CREATE POLICY "Portfolio edit" ON public.bdm_portfolio FOR UPDATE TO authenticated
USING (bdm_user_id = auth.uid() OR public.bdm_is_manager(auth.uid()) OR public.bdm_is_town_admin(auth.uid()))
WITH CHECK (bdm_user_id = auth.uid() OR public.bdm_is_manager(auth.uid()) OR public.bdm_is_town_admin(auth.uid()));
CREATE POLICY "Portfolio remove" ON public.bdm_portfolio FOR DELETE TO authenticated
USING (bdm_user_id = auth.uid() OR public.bdm_is_town_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.bdm_portfolio_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d text := regexp_replace(coalesce(NEW.phone,''), '\D', '', 'g');
BEGIN
  NEW.updated_at := now();
  IF NEW.dealership_id IS NULL THEN
    SELECT id INTO NEW.dealership_id FROM bdm_dealerships b
    WHERE (length(d) >= 9 AND right(b.phone_digits, 9) = right(d, 9))
       OR (NEW.email IS NOT NULL AND lower(b.email) = lower(trim(NEW.email)))
       OR (lower(trim(b.name)) = lower(trim(NEW.dealership_name)) AND lower(coalesce(b.town,'')) = lower(coalesce(trim(NEW.town),'')))
    ORDER BY b.created_at LIMIT 1;
  END IF;
  IF NEW.dealer_id IS NULL AND NEW.dealership_id IS NOT NULL THEN
    SELECT dealer_id INTO NEW.dealer_id FROM bdm_dealerships WHERE id = NEW.dealership_id;
  END IF;
  IF NEW.dealer_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO NEW.dealer_id FROM dealers WHERE lower(email) = lower(trim(NEW.email)) LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bdm_portfolio_link_trg BEFORE INSERT OR UPDATE ON public.bdm_portfolio
FOR EACH ROW EXECUTE FUNCTION public.bdm_portfolio_link();

CREATE OR REPLACE FUNCTION public.bdm_portfolio_owners(p_ids uuid[])
RETURNS TABLE(dealership_id uuid, owner_name text, onboarded_at date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (p.dealership_id) p.dealership_id,
    coalesce(nullif(trim(concat_ws(' ', a.first_name, a.last_name)), ''), a.email, 'another BDM'),
    p.onboarded_at
  FROM bdm_portfolio p
  LEFT JOIN LATERAL (SELECT first_name, last_name, email FROM admin_users WHERE user_id = p.bdm_user_id LIMIT 1) a ON true
  WHERE p.dealership_id = ANY(p_ids) AND public.bdm_is_staff(auth.uid())
  ORDER BY p.dealership_id, p.onboarded_at;
$$;
REVOKE ALL ON FUNCTION public.bdm_portfolio_owners(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bdm_portfolio_owners(uuid[]) TO authenticated;