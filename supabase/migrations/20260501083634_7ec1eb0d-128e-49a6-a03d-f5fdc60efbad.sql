-- Phase 14: Blog Writing + Landing Pages

CREATE TABLE public.dealer_admin_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT[],
  status TEXT NOT NULL DEFAULT 'draft',
  author TEXT,
  featured_image TEXT,
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_admin_blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blog posts" ON public.dealer_admin_blog_posts
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public can read published posts" ON public.dealer_admin_blog_posts
FOR SELECT USING (status = 'published');

CREATE TRIGGER update_dealer_admin_blog_posts_updated_at
BEFORE UPDATE ON public.dealer_admin_blog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dealer_admin_blog_posts_status ON public.dealer_admin_blog_posts(status);
CREATE INDEX idx_dealer_admin_blog_posts_slug ON public.dealer_admin_blog_posts(slug);

CREATE TABLE public.dealer_admin_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  hero_heading TEXT,
  hero_subheading TEXT,
  body_content TEXT NOT NULL DEFAULT '',
  cta_label TEXT,
  cta_url TEXT,
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT[],
  target_location TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_admin_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage landing pages" ON public.dealer_admin_landing_pages
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public can read published landing pages" ON public.dealer_admin_landing_pages
FOR SELECT USING (status = 'published');

CREATE TRIGGER update_dealer_admin_landing_pages_updated_at
BEFORE UPDATE ON public.dealer_admin_landing_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dealer_admin_landing_pages_status ON public.dealer_admin_landing_pages(status);
CREATE INDEX idx_dealer_admin_landing_pages_slug ON public.dealer_admin_landing_pages(slug);

-- Phase 15: Timesheets, Testing logs, Account settings
CREATE TABLE public.dealer_admin_timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  work_date DATE NOT NULL,
  hours_worked NUMERIC(5,2) NOT NULL DEFAULT 0,
  deals_closed INTEGER NOT NULL DEFAULT 0,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_admin_timesheet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all timesheet entries" ON public.dealer_admin_timesheet_entries
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users view their own timesheet entries" ON public.dealer_admin_timesheet_entries
FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER update_dealer_admin_timesheet_entries_updated_at
BEFORE UPDATE ON public.dealer_admin_timesheet_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dealer_admin_timesheet_entries_user ON public.dealer_admin_timesheet_entries(user_id, work_date DESC);

CREATE TABLE public.dealer_admin_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'api',
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  run_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_admin_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage test runs" ON public.dealer_admin_test_runs
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_dealer_admin_test_runs_created ON public.dealer_admin_test_runs(created_at DESC);