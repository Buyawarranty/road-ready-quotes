CREATE POLICY "Dealers can upload own claim files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dealer-admin-claims'
  AND (storage.foldername(name))[1] IN (
    SELECT d.id::text FROM public.dealers d WHERE d.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Dealers can view own claim files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dealer-admin-claims'
  AND (storage.foldername(name))[1] IN (
    SELECT d.id::text FROM public.dealers d WHERE d.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Dealers can remove own claim files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dealer-admin-claims'
  AND (storage.foldername(name))[1] IN (
    SELECT d.id::text FROM public.dealers d WHERE d.user_id = (SELECT auth.uid())
  )
);