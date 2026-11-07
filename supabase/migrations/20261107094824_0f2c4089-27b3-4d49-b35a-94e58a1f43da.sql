ALTER TABLE public.dealer_admin_discount_codes ADD COLUMN min_order_amount numeric NOT NULL DEFAULT 0, ADD COLUMN campaign_source text;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dealer_admin_discount_codes TO authenticated;
GRANT ALL ON public.dealer_admin_discount_codes TO service_role;
DROP POLICY "Admins manage discount codes" ON public.dealer_admin_discount_codes;
CREATE POLICY "Panda admins manage dealer codes" ON public.dealer_admin_discount_codes FOR ALL TO authenticated USING (public.bdm_is_town_admin(auth.uid())) WITH CHECK (public.bdm_is_town_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.validate_dealer_promo_settings() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 NEW.code := upper(trim(NEW.code));
 IF NEW.code !~ '^[A-Z0-9_-]{3,40}$' THEN RAISE EXCEPTION 'Use 3–40 letters, numbers, hyphens or underscores for the code.'; END IF;
 IF NEW.discount_type NOT IN ('percent','fixed') OR NEW.discount_value <= 0 OR (NEW.discount_type='percent' AND NEW.discount_value>100) THEN RAISE EXCEPTION 'Enter a valid discount amount (percentage up to 100).'; END IF;
 IF NEW.usage_limit IS NOT NULL AND NEW.usage_limit<1 THEN RAISE EXCEPTION 'Usage limit must be at least one.'; END IF;
 IF NEW.min_order_amount<0 THEN RAISE EXCEPTION 'Minimum spend must be zero or more.'; END IF;
 IF NEW.discount_type='fixed' THEN NEW.min_order_amount := greatest(350,NEW.min_order_amount); END IF;
 IF NEW.valid_from IS NOT NULL AND NEW.valid_until IS NOT NULL AND NEW.valid_until<=NEW.valid_from THEN RAISE EXCEPTION 'End date must follow the start date.'; END IF;
 NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER validate_dealer_promo_settings BEFORE INSERT OR UPDATE ON public.dealer_admin_discount_codes FOR EACH ROW EXECUTE FUNCTION public.validate_dealer_promo_settings();
CREATE TABLE public.dealer_promo_redemptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code_id uuid NOT NULL REFERENCES public.dealer_admin_discount_codes(id) ON DELETE RESTRICT, dealer_id uuid NOT NULL REFERENCES public.dealers(id), customer_id uuid NOT NULL, code text NOT NULL, base_amount numeric NOT NULL, discount_amount numeric NOT NULL, final_amount numeric NOT NULL, status text NOT NULL DEFAULT 'reserved', expires_at timestamptz NOT NULL DEFAULT now()+interval '35 minutes', stripe_session_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.dealer_promo_redemptions TO authenticated;
GRANT ALL ON public.dealer_promo_redemptions TO service_role;
ALTER TABLE public.dealer_promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Panda admins read dealer promo usage" ON public.dealer_promo_redemptions FOR SELECT TO authenticated USING (public.bdm_is_town_admin(auth.uid()));
CREATE INDEX dealer_promo_reservations ON public.dealer_promo_redemptions(code_id,status,expires_at);
CREATE OR REPLACE FUNCTION public.dealer_promo_amount(p_code text,p_dealer_id uuid,p_base numeric,p_customer_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c public.dealer_admin_discount_codes; used integer; discount numeric; r uuid; BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_base IS NULL OR p_base<=0 OR NOT EXISTS(SELECT 1 FROM public.dealers WHERE id=p_dealer_id) THEN RAISE EXCEPTION 'Invalid dealer checkout'; END IF;
 SELECT * INTO c FROM public.dealer_admin_discount_codes WHERE code=upper(trim(p_code)) FOR UPDATE;
 IF NOT FOUND OR NOT c.is_active THEN RAISE EXCEPTION 'Promo code is unavailable.'; END IF;
 IF (c.valid_from IS NOT NULL AND c.valid_from>now()) OR (c.valid_until IS NOT NULL AND c.valid_until<=now()) THEN RAISE EXCEPTION 'Promo code is outside its valid dates.'; END IF;
 SELECT count(*) INTO used FROM public.dealer_promo_redemptions WHERE code_id=c.id AND status='reserved' AND expires_at>now();
 IF c.usage_limit IS NOT NULL AND c.times_used+used>=c.usage_limit THEN RAISE EXCEPTION 'Promo code has reached its usage limit.'; END IF;
 IF p_base<greatest(c.min_order_amount,CASE WHEN c.discount_type='fixed' THEN 350 ELSE 0 END) THEN RAISE EXCEPTION 'This code requires a minimum spend of £%.',greatest(c.min_order_amount,CASE WHEN c.discount_type='fixed' THEN 350 ELSE 0 END); END IF;
 discount := round(CASE WHEN c.discount_type='percent' THEN p_base*c.discount_value/100 ELSE c.discount_value END,2);
 IF p_base-discount<greatest(50,p_base*0.5) THEN RAISE EXCEPTION 'This code exceeds the permitted discount for this warranty.'; END IF;
 IF p_customer_id IS NOT NULL THEN
 INSERT INTO public.dealer_promo_redemptions(code_id,dealer_id,customer_id,code,base_amount,discount_amount,final_amount) VALUES(c.id,p_dealer_id,p_customer_id,c.code,p_base,discount,p_base-discount) RETURNING id INTO r;
 END IF;
 RETURN jsonb_build_object('code',c.code,'discount_amount',discount,'total',p_base-discount,'redemption_id',r); END; $$;
REVOKE ALL ON FUNCTION public.dealer_promo_amount(text,uuid,numeric,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dealer_promo_amount(text,uuid,numeric,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.complete_dealer_promo(p_redemption_id uuid,p_session_id text,p_amount numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.dealer_promo_redemptions; BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO r FROM public.dealer_promo_redemptions WHERE id=p_redemption_id FOR UPDATE;
 IF NOT FOUND OR r.stripe_session_id IS DISTINCT FROM p_session_id OR r.final_amount IS DISTINCT FROM p_amount THEN RAISE EXCEPTION 'Promo payment does not match the checkout.'; END IF;
 IF r.status='used' THEN RETURN; END IF;
 IF r.status<>'reserved' THEN RAISE EXCEPTION 'Promo reservation is unavailable'; END IF;
 UPDATE public.dealer_promo_redemptions SET status='used',updated_at=now() WHERE id=r.id;
 UPDATE public.dealer_admin_discount_codes SET times_used=times_used+1 WHERE id=r.code_id;
 END; $$;
REVOKE ALL ON FUNCTION public.complete_dealer_promo(uuid,text,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_dealer_promo(uuid,text,numeric) TO service_role;