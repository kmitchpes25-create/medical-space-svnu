
CREATE POLICY "uploads_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'uploads' AND public.is_admin())
  WITH CHECK (bucket_id = 'uploads' AND public.is_admin());
