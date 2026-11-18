CREATE TABLE public.dealer_warranty_email_templates (
  template_key text PRIMARY KEY,
  subject text NOT NULL,
  heading text NOT NULL,
  introduction text NOT NULL,
  closing_text text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.dealer_warranty_email_templates TO service_role;

ALTER TABLE public.dealer_warranty_email_templates ENABLE ROW LEVEL SECURITY;

INSERT INTO public.dealer_warranty_email_templates (
  template_key,
  subject,
  heading,
  introduction,
  closing_text
) VALUES (
  'dealer_warranty',
  'Your vehicle warranty — {{registration}}',
  'Your warranty is confirmed',
  '{{dealer_name}} has arranged a Panda Protect warranty for your vehicle. Here are your warranty details:',
  'Thank you for choosing Panda Protect.'
);