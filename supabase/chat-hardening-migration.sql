-- ============================================
-- SVD STICKERTAUSCH - Chat Security/Performance Hardening
-- Fuehre dieses SQL einmal im Supabase SQL Editor aus.
-- ============================================

BEGIN;

-- Query patterns used by the chat:
-- - all messages between two users ordered by created_at
-- - unread messages for the current receiver
-- - all trades between two users ordered by updated_at
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created_at
  ON public.messages(sender_id, receiver_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender_created_at
  ON public.messages(receiver_id, sender_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread_created_at
  ON public.messages(receiver_id, created_at DESC, id DESC)
  WHERE NOT is_read;

CREATE INDEX IF NOT EXISTS idx_trade_requests_sender_receiver_updated_at
  ON public.trade_requests(sender_id, receiver_id, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_trade_requests_receiver_sender_updated_at
  ON public.trade_requests(receiver_id, sender_id, updated_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.trade_collection_applications (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_request_id UUID NOT NULL REFERENCES public.trade_requests(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, trade_request_id)
);

ALTER TABLE public.trade_collection_applications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.trade_collection_applications
  TO authenticated;

CREATE INDEX IF NOT EXISTS idx_trade_collection_applications_user_applied_at
  ON public.trade_collection_applications(user_id, applied_at DESC);

DROP POLICY IF EXISTS "User kann eigene Trade-Sammlungseintraege lesen" ON public.trade_collection_applications;
DROP POLICY IF EXISTS "User kann eigene Trade-Sammlungseintraege speichern" ON public.trade_collection_applications;
DROP POLICY IF EXISTS "User kann eigene Trade-Sammlungseintraege aktualisieren" ON public.trade_collection_applications;
DROP POLICY IF EXISTS "User kann eigene Trade-Sammlungseintraege loeschen" ON public.trade_collection_applications;

CREATE POLICY "User kann eigene Trade-Sammlungseintraege lesen"
  ON public.trade_collection_applications FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "User kann eigene Trade-Sammlungseintraege speichern"
  ON public.trade_collection_applications FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "User kann eigene Trade-Sammlungseintraege aktualisieren"
  ON public.trade_collection_applications FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "User kann eigene Trade-Sammlungseintraege loeschen"
  ON public.trade_collection_applications FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- RLS policies: wrap auth.uid() in SELECT so Postgres can evaluate it once per query.
DROP POLICY IF EXISTS "Trade Requests für Beteiligte sichtbar" ON public.trade_requests;
DROP POLICY IF EXISTS "User kann Trade Requests erstellen" ON public.trade_requests;
DROP POLICY IF EXISTS "Beteiligte können Trade Requests updaten" ON public.trade_requests;
DROP POLICY IF EXISTS "Beteiligte können Trade Requests löschen" ON public.trade_requests;

CREATE POLICY "Trade Requests für Beteiligte sichtbar"
  ON public.trade_requests FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

CREATE POLICY "User kann Trade Requests erstellen"
  ON public.trade_requests FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = sender_id);

CREATE POLICY "Beteiligte können Trade Requests updaten"
  ON public.trade_requests FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id)
  WITH CHECK ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

CREATE POLICY "Beteiligte können Trade Requests löschen"
  ON public.trade_requests FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

DROP POLICY IF EXISTS "Nachrichten für Beteiligte sichtbar" ON public.messages;
DROP POLICY IF EXISTS "User kann Nachrichten senden" ON public.messages;
DROP POLICY IF EXISTS "Empfänger kann Nachrichten als gelesen markieren" ON public.messages;
DROP POLICY IF EXISTS "Beteiligte können Nachrichten löschen" ON public.messages;

CREATE POLICY "Nachrichten für Beteiligte sichtbar"
  ON public.messages FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

CREATE POLICY "User kann Nachrichten senden"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = sender_id);

CREATE POLICY "Empfänger kann Nachrichten als gelesen markieren"
  ON public.messages FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = receiver_id)
  WITH CHECK ((SELECT auth.uid()) = receiver_id);

CREATE POLICY "Beteiligte können Nachrichten löschen"
  ON public.messages FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

-- Only is_read should be mutable from the browser client.
REVOKE UPDATE
  ON public.messages
  FROM authenticated;

GRANT UPDATE (is_read)
  ON public.messages
  TO authenticated;

-- Safer read-receipt API: users can only mark messages as read when they are the receiver.
CREATE OR REPLACE FUNCTION public.mark_messages_read(message_ids UUID[])
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.messages
  SET is_read = TRUE
  WHERE id = ANY(message_ids)
    AND receiver_id = (SELECT auth.uid())
    AND NOT is_read;
$$;

REVOKE ALL ON FUNCTION public.mark_messages_read(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID[]) TO authenticated;

COMMIT;
