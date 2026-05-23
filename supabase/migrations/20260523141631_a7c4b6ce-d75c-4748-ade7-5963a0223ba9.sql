
-- 1. Realtime for excursoes
ALTER TABLE public.excursoes REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'excursoes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.excursoes';
  END IF;
END $$;

-- 2. Storage bucket for banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('excursao-banners', 'excursao-banners', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
DROP POLICY IF EXISTS "Banner public read" ON storage.objects;
CREATE POLICY "Banner public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'excursao-banners');

DROP POLICY IF EXISTS "Authenticated upload banners" ON storage.objects;
CREATE POLICY "Authenticated upload banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'excursao-banners' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update banners" ON storage.objects;
CREATE POLICY "Authenticated update banners"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'excursao-banners' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated delete banners" ON storage.objects;
CREATE POLICY "Authenticated delete banners"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'excursao-banners' AND auth.uid() IS NOT NULL);
