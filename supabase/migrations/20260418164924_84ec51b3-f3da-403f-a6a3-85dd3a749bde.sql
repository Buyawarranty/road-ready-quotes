INSERT INTO public.dealers (user_id, email, name, company_name, phone)
VALUES ('4f3ce1e6-3226-44d7-aa1e-83b6b4e39b4c', 'digital@buyawarranty.co.uk', 'Digital Admin', 'Buy A Warranty', NULL)
ON CONFLICT (user_id) DO NOTHING;