CREATE TABLE public.dealer_admin_lead_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'manual',
  record_count INTEGER NOT NULL DEFAULT 0,
  snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_admin_lead_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lead backups"
ON public.dealer_admin_lead_backups
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_dealer_admin_lead_backups_updated_at
BEFORE UPDATE ON public.dealer_admin_lead_backups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dealer_admin_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  invited_by UUID,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_email)
);

ALTER TABLE public.dealer_admin_user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dealer admin user permissions"
ON public.dealer_admin_user_permissions
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_dealer_admin_user_permissions_updated_at
BEFORE UPDATE ON public.dealer_admin_user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();