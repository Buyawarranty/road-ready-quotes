
CREATE TABLE public.dealer_admin_marketing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealer_admin_marketing_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketing contacts" ON public.dealer_admin_marketing_contacts
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_dealer_admin_marketing_contacts_updated
BEFORE UPDATE ON public.dealer_admin_marketing_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dealer_admin_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  audience TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealer_admin_email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email campaigns" ON public.dealer_admin_email_campaigns
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_dealer_admin_email_campaigns_updated
BEFORE UPDATE ON public.dealer_admin_email_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dealer_admin_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  session_id TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealer_admin_page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert page views" ON public.dealer_admin_page_views
FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read page views" ON public.dealer_admin_page_views
FOR SELECT USING (public.is_admin(auth.uid()));
CREATE INDEX idx_dealer_admin_page_views_viewed_at ON public.dealer_admin_page_views(viewed_at DESC);
CREATE INDEX idx_dealer_admin_page_views_path ON public.dealer_admin_page_views(path);
