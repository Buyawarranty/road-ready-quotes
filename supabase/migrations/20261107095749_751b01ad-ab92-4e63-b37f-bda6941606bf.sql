CREATE OR REPLACE FUNCTION public.set_dealer_signup_status(p_signup_id uuid,p_status text,p_actor uuid,p_notes text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s public.trade_warranty_signups; was_approved boolean; BEGIN
 IF auth.role()<>'service_role' OR NOT public.bdm_is_town_admin(p_actor) THEN RAISE EXCEPTION 'Only Admin or Super Admin can change approval.'; END IF;
 IF p_status NOT IN ('new','pending','needs_info','contacted','qualified','closed','approved','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 SELECT * INTO s FROM public.trade_warranty_signups WHERE id=p_signup_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Signup not found'; END IF;
 was_approved := s.status='approved' OR s.approved_at IS NOT NULL;
 IF p_status='approved' AND s.dealer_id IS NULL THEN RAISE EXCEPTION 'Approve this signup to create its dealer account first.'; END IF;
 IF s.dealer_id IS NOT NULL AND (was_approved OR p_status='approved') THEN
 UPDATE public.dealers SET status=CASE WHEN p_status='approved' THEN 'active' ELSE 'pending' END WHERE id=s.dealer_id;
 END IF;
 UPDATE public.trade_warranty_signups SET status=p_status::public.trade_warranty_signup_status, approved_at=CASE WHEN p_status='approved' THEN coalesce(s.approved_at,now()) ELSE NULL END,rejected_at=CASE WHEN p_status='rejected' THEN now() ELSE NULL END,reviewed_by=p_actor,decision_notes=p_notes,updated_at=now() WHERE id=s.id;
 INSERT INTO public.trade_warranty_signup_notes(signup_id,note_text,created_by) VALUES(s.id,'Status changed from '||s.status||' to '||p_status||CASE WHEN p_notes IS NOT NULL THEN E'\n'||p_notes ELSE '' END,p_actor);
 RETURN jsonb_build_object('status',p_status,'withdrawn',was_approved AND p_status<>'approved','dealer_id',s.dealer_id); END; $$;
REVOKE ALL ON FUNCTION public.set_dealer_signup_status(uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_dealer_signup_status(uuid,text,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.protect_dealer_approval_status() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF auth.role()='authenticated' AND NOT public.bdm_is_town_admin(auth.uid()) AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN RAISE EXCEPTION 'Approval and account ownership are managed by the admin team.'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER protect_dealer_approval_status BEFORE INSERT OR UPDATE ON public.dealers FOR EACH ROW EXECUTE FUNCTION public.protect_dealer_approval_status();