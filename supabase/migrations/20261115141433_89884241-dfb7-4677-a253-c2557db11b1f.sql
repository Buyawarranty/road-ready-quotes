ALTER TABLE public.dealer_admin_discount_codes ADD COLUMN allow_any_discount boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.validate_dealer_promo_settings() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 NEW.code := upper(trim(NEW.code));
 IF NEW.code !~ '^[A-Z0-9_-]{3,40}$' THEN RAISE EXCEPTION 'Use 3–40 letters, numbers, hyphens or underscores for the code.'; END IF;
 IF NEW.discount_type NOT IN ('percent','fixed') OR NEW.discount_value <= 0 OR (NEW.discount_type='percent' AND NEW.discount_value>100) THEN RAISE EXCEPTION 'Enter a valid discount amount (percentage up to 100).'; END IF;
 IF NEW.usage_limit IS NOT NULL AND NEW.usage_limit<1 THEN RAISE EXCEPTION 'Usage limit must be at least one.'; END IF;
 IF NEW.min_order_amount<0 THEN RAISE EXCEPTION 'Minimum spend must be zero or more.'; END IF;
 IF NEW.discount_type='fixed' AND NOT NEW.allow_any_discount THEN NEW.min_order_amount := greatest(350,NEW.min_order_amount); END IF;
 IF NEW.valid_from IS NOT NULL AND NEW.valid_until IS NOT NULL AND NEW.valid_until<=NEW.valid_from THEN RAISE EXCEPTION 'End date must follow the start date.'; END IF;
 NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.dealer_promo_amount(p_code text,p_dealer_id uuid,p_base numeric,p_customer_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c public.dealer_admin_discount_codes; used integer; discount numeric; r uuid; minspend numeric; BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_base IS NULL OR p_base<=0 OR NOT EXISTS(SELECT 1 FROM public.dealers WHERE id=p_dealer_id) THEN RAISE EXCEPTION 'Invalid dealer checkout'; END IF;
 SELECT * INTO c FROM public.dealer_admin_discount_codes WHERE code=upper(trim(p_code)) FOR UPDATE;
 IF NOT FOUND OR NOT c.is_active THEN RAISE EXCEPTION 'Promo code is unavailable.'; END IF;
 IF (c.valid_from IS NOT NULL AND c.valid_from>now()) OR (c.valid_until IS NOT NULL AND c.valid_until<=now()) THEN RAISE EXCEPTION 'Promo code is outside its valid dates.'; END IF;
 SELECT count(*) INTO used FROM public.dealer_promo_redemptions WHERE code_id=c.id AND status='reserved' AND expires_at>now();
 IF c.usage_limit IS NOT NULL AND c.times_used+used>=c.usage_limit THEN RAISE EXCEPTION 'Promo code has reached its usage limit.'; END IF;
 minspend := CASE WHEN c.allow_any_discount THEN c.min_order_amount ELSE greatest(c.min_order_amount,CASE WHEN c.discount_type='fixed' THEN 350 ELSE 0 END) END;
 IF p_base<minspend THEN RAISE EXCEPTION 'This code requires a minimum spend of £%.',minspend; END IF;
 discount := least(p_base, round(CASE WHEN c.discount_type='percent' THEN p_base*c.discount_value/100 ELSE c.discount_value END,2));
 IF NOT c.allow_any_discount AND p_base-discount<greatest(50,p_base*0.5) THEN RAISE EXCEPTION 'This code exceeds the permitted discount for this warranty.'; END IF;
 IF p_customer_id IS NOT NULL THEN
 INSERT INTO public.dealer_promo_redemptions(code_id,dealer_id,customer_id,code,base_amount,discount_amount,final_amount) VALUES(c.id,p_dealer_id,p_customer_id,c.code,p_base,discount,p_base-discount) RETURNING id INTO r;
 END IF;
 RETURN jsonb_build_object('code',c.code,'discount_amount',discount,'total',p_base-discount,'redemption_id',r); END; $$;
REVOKE ALL ON FUNCTION public.dealer_promo_amount(text,uuid,numeric,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dealer_promo_amount(text,uuid,numeric,uuid) TO service_role;