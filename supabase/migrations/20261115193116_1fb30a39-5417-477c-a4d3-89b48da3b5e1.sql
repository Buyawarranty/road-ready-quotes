UPDATE public.email_templates
SET
  name = regexp_replace(name, '\mGold\M', 'Platinum', 'gi'),
  subject = regexp_replace(subject, '\mGold\M', 'Platinum', 'gi'),
  content = regexp_replace(content::text, '\mGold\M', 'Platinum', 'gi')::jsonb,
  updated_at = now()
WHERE coalesce(name, '') ~* '\mGold\M'
   OR coalesce(subject, '') ~* '\mGold\M'
   OR coalesce(content::text, '') ~* '\mGold\M';