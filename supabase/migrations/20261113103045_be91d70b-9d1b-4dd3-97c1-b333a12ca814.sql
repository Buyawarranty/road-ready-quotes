CREATE OR REPLACE FUNCTION public.has_admin_tab(_user_id uuid, _tab text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users
    WHERE user_id = _user_id AND is_active = true AND archived_at IS NULL
      AND (permissions ->> ('tab_' || _tab)) = 'true');
$$;
CREATE POLICY "Staff with Dealers section can view signups" ON public.trade_warranty_signups
  FOR SELECT TO authenticated USING (public.has_admin_tab(auth.uid(), 'dealer-dealers'));
CREATE POLICY "Staff with Dealers section can update signups" ON public.trade_warranty_signups
  FOR UPDATE TO authenticated USING (public.has_admin_tab(auth.uid(), 'dealer-dealers'));
CREATE POLICY "Staff with Dealers section can view dealers" ON public.dealers
  FOR SELECT TO authenticated USING (public.has_admin_tab(auth.uid(), 'dealer-dealers'));