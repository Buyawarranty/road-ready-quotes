INSERT INTO public.user_roles (user_id, role)
VALUES ('15da9cd0-0855-463e-aeab-ceec6c3f472d', 'super_admin')
ON CONFLICT DO NOTHING;

UPDATE public.admin_users
SET role = 'super_admin', is_active = true
WHERE user_id = '15da9cd0-0855-463e-aeab-ceec6c3f472d';