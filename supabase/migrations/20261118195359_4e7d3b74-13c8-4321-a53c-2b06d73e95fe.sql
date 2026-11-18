ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS website text;

UPDATE public.dealers d SET website = b.website
FROM public.bdm_dealerships b WHERE b.dealer_id = d.id AND d.website IS NULL AND b.website IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_dealer_website_to_bdm() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bdm_dealerships SET website = NEW.website
  WHERE dealer_id = NEW.id AND website IS DISTINCT FROM NEW.website;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.sync_bdm_website_to_dealer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.dealer_id IS NOT NULL THEN
    UPDATE public.dealers SET website = NEW.website
    WHERE id = NEW.dealer_id AND website IS DISTINCT FROM NEW.website;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_dealer_website_to_bdm() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_bdm_website_to_dealer() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_dealer_website_sync ON public.dealers;
CREATE TRIGGER trg_dealer_website_sync AFTER UPDATE OF website ON public.dealers
FOR EACH ROW WHEN (OLD.website IS DISTINCT FROM NEW.website) EXECUTE FUNCTION public.sync_dealer_website_to_bdm();
DROP TRIGGER IF EXISTS trg_bdm_website_sync ON public.bdm_dealerships;
CREATE TRIGGER trg_bdm_website_sync AFTER INSERT OR UPDATE OF website, dealer_id ON public.bdm_dealerships
FOR EACH ROW EXECUTE FUNCTION public.sync_bdm_website_to_dealer();