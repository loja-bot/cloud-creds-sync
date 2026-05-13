-- Add UPDATE/DELETE policies for verification-docs (upsert needs UPDATE)
CREATE POLICY "Users can update own verification docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own verification docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);