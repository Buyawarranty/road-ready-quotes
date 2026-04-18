-- Trigger function: auto-create dealer row on auth signup if metadata indicates dealer signup
CREATE OR REPLACE FUNCTION public.handle_new_dealer_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when signup metadata includes dealer_name or company_name
  IF (NEW.raw_user_meta_data ? 'dealer_name') OR (NEW.raw_user_meta_data ? 'company_name') THEN
    INSERT INTO public.dealers (user_id, email, name, company_name, phone)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'dealer_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'Unknown'),
      NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_dealer ON auth.users;
CREATE TRIGGER on_auth_user_created_dealer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_dealer_user();

-- Backfill: any auth user with dealer metadata but no dealer row
INSERT INTO public.dealers (user_id, email, name, company_name, phone)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'dealer_name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'company_name', 'Unknown'),
  u.raw_user_meta_data->>'phone'
FROM auth.users u
LEFT JOIN public.dealers d ON d.user_id = u.id
WHERE d.id IS NULL
  AND ((u.raw_user_meta_data ? 'dealer_name') OR (u.raw_user_meta_data ? 'company_name'));