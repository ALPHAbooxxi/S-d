-- ============================================
-- SVD STICKERTAUSCH – Push Notifications Migration
-- Fuehre dieses SQL einmal im Supabase SQL Editor aus
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'User kann eigene Push Subscriptions lesen'
  ) THEN
    EXECUTE '
      CREATE POLICY "User kann eigene Push Subscriptions lesen"
      ON public.push_subscriptions FOR SELECT
      USING (auth.uid() = user_id)
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'User kann eigene Push Subscriptions speichern'
  ) THEN
    EXECUTE '
      CREATE POLICY "User kann eigene Push Subscriptions speichern"
      ON public.push_subscriptions FOR INSERT
      WITH CHECK (auth.uid() = user_id)
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'User kann eigene Push Subscriptions aktualisieren'
  ) THEN
    EXECUTE '
      CREATE POLICY "User kann eigene Push Subscriptions aktualisieren"
      ON public.push_subscriptions FOR UPDATE
      USING (auth.uid() = user_id)
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'User kann eigene Push Subscriptions loeschen'
  ) THEN
    EXECUTE '
      CREATE POLICY "User kann eigene Push Subscriptions loeschen"
      ON public.push_subscriptions FOR DELETE
      USING (auth.uid() = user_id)
    ';
  END IF;
END $$;

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
