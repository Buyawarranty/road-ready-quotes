ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS vehicle_stock integer;
UPDATE public.dealers d SET vehicle_stock = b.vehicle_stock
FROM public.bdm_dealerships b WHERE b.dealer_id = d.id AND d.vehicle_stock IS NULL AND b.vehicle_stock IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_dealer_website_to_bdm() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bdm_dealerships SET website = NEW.website, vehicle_stock = NEW.vehicle_stock
  WHERE dealer_id = NEW.id AND (website IS DISTINCT FROM NEW.website OR vehicle_stock IS DISTINCT FROM NEW.vehicle_stock);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_bdm_website_to_dealer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.dealer_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' OR OLD.dealer_id IS DISTINCT FROM NEW.dealer_id THEN
    UPDATE public.bdm_dealerships b SET website = coalesce(b.website, d.website), vehicle_stock = coalesce(b.vehicle_stock, d.vehicle_stock)
    FROM public.dealers d WHERE b.id = NEW.id AND d.id = NEW.dealer_id
      AND ((b.website IS NULL AND d.website IS NOT NULL) OR (b.vehicle_stock IS NULL AND d.vehicle_stock IS NOT NULL));
    UPDATE public.dealers SET website = coalesce(NEW.website, website), vehicle_stock = coalesce(NEW.vehicle_stock, vehicle_stock)
    WHERE id = NEW.dealer_id AND ((NEW.website IS NOT NULL AND website IS DISTINCT FROM NEW.website) OR (NEW.vehicle_stock IS NOT NULL AND vehicle_stock IS DISTINCT FROM NEW.vehicle_stock));
    RETURN NEW;
  END IF;
  UPDATE public.dealers SET website = NEW.website, vehicle_stock = NEW.vehicle_stock
  WHERE id = NEW.dealer_id AND (website IS DISTINCT FROM NEW.website OR vehicle_stock IS DISTINCT FROM NEW.vehicle_stock);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_dealer_website_to_bdm() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_bdm_website_to_dealer() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_dealer_website_sync ON public.dealers;
CREATE TRIGGER trg_dealer_website_sync AFTER UPDATE OF website, vehicle_stock ON public.dealers
FOR EACH ROW WHEN (OLD.website IS DISTINCT FROM NEW.website OR OLD.vehicle_stock IS DISTINCT FROM NEW.vehicle_stock)
EXECUTE FUNCTION public.sync_dealer_website_to_bdm();
DROP TRIGGER IF EXISTS trg_bdm_website_sync ON public.bdm_dealerships;
CREATE TRIGGER trg_bdm_website_sync AFTER INSERT OR UPDATE OF website, vehicle_stock, dealer_id ON public.bdm_dealerships
FOR EACH ROW EXECUTE FUNCTION public.sync_bdm_website_to_dealer();