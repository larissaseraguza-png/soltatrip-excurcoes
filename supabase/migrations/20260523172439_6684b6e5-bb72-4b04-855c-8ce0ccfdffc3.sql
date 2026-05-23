-- 1) user_roles: remove self-insert; role assignment happens via SECURITY DEFINER triggers/functions
DROP POLICY IF EXISTS "Users insert own role" ON public.user_roles;

-- 2) storage.objects: tighten banners policies
DROP POLICY IF EXISTS "Authenticated delete banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload banners" ON storage.objects;
DROP POLICY IF EXISTS "Banner public read" ON storage.objects;

CREATE POLICY "Banner owner upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'excursao-banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Banner owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'excursao-banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'excursao-banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Banner owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'excursao-banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner can list own files; public read of objects by URL doesn't depend on SELECT policy for public buckets
CREATE POLICY "Banner owner list"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'excursao-banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Realtime: deny direct access to realtime.messages (broadcast/presence channels).
-- postgres_changes subscriptions continue to work and respect table RLS.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='realtime' AND c.relname='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "deny all broadcast/presence" ON realtime.messages';
    EXECUTE 'CREATE POLICY "deny all broadcast/presence" ON realtime.messages FOR ALL TO authenticated, anon USING (false) WITH CHECK (false)';
  END IF;
END$$;

-- 4) Revoke EXECUTE from anon on all SECURITY DEFINER public functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, public', r.nspname, r.proname, r.args);
  END LOOP;
END$$;
