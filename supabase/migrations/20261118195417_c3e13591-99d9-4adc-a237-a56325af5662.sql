CREATE OR REPLACE FUNCTION public.sync_bdm_website_to_dealer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.dealer_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.website IS NULL AND (TG_OP = 'INSERT' OR OLD.dealer_id IS DISTINCT FROM NEW.dealer_id) THEN
    UPDATE public.bdm_dealerships b SET website = d.website FROM public.dealers d
    WHERE b.id = NEW.id AND d.id = NEW.dealer_id AND d.website IS NOT NULL;
    RETURN NEW;
  END IF;
  UPDATE public.dealers SET website = NEW.website
  WHERE id = NEW.dealer_id AND website IS DISTINCT FROM NEW.website;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_bdm_website_to_dealer() FROM public, anon, authenticated;