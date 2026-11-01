CREATE TABLE public.trade_warranty_signup_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signup_id UUID NOT NULL REFERENCES public.trade_warranty_signups(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_warranty_signup_notes TO authenticated;
GRANT ALL ON public.trade_warranty_signup_notes TO service_role;

ALTER TABLE public.trade_warranty_signup_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage signup notes"
  ON public.trade_warranty_signup_notes
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX trade_warranty_signup_notes_signup_idx
  ON public.trade_warranty_signup_notes (signup_id, created_at DESC);

CREATE TRIGGER update_trade_warranty_signup_notes_updated_at
  BEFORE UPDATE ON public.trade_warranty_signup_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();