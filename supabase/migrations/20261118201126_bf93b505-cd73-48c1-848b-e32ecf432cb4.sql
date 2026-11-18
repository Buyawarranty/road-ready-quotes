ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE OR REPLACE FUNCTION public.guard_dealer_delete_flag() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') THEN
    RAISE EXCEPTION 'Only Super Admin can delete dealers';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_dealer_delete_flag ON public.dealers;
CREATE TRIGGER guard_dealer_delete_flag BEFORE UPDATE ON public.dealers FOR EACH ROW EXECUTE FUNCTION public.guard_dealer_delete_flag();