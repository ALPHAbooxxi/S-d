-- ============================================
-- SVD STICKERTAUSCH – Chat/Trade Sync Migration
-- Fuehre dieses SQL einmal im Supabase SQL Editor aus
-- ============================================

BEGIN;

ALTER TABLE public.trade_requests
  DROP CONSTRAINT IF EXISTS trade_requests_status_check;

ALTER TABLE public.trade_requests
  ADD CONSTRAINT trade_requests_status_check
  CHECK (status IN ('offen', 'akzeptiert', 'abgelehnt', 'erledigt', 'storniert'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trade_requests'
      AND policyname = 'Beteiligte können Trade Requests löschen'
  ) THEN
    EXECUTE '
      CREATE POLICY "Beteiligte können Trade Requests löschen"
      ON public.trade_requests FOR DELETE
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Beteiligte können Nachrichten löschen'
  ) THEN
    EXECUTE '
      CREATE POLICY "Beteiligte können Nachrichten löschen"
      ON public.messages FOR DELETE
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
    ';
  END IF;
END $$;

COMMIT;
