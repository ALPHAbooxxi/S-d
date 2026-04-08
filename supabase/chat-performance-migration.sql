-- ============================================
-- SVD STICKERTAUSCH – Chat Performance Migration
-- Fuehre dieses SQL einmal im Supabase SQL Editor aus
-- ============================================

BEGIN;

DROP INDEX IF EXISTS public.idx_trade_requests_sender;
DROP INDEX IF EXISTS public.idx_trade_requests_receiver;
DROP INDEX IF EXISTS public.idx_messages_sender;
DROP INDEX IF EXISTS public.idx_messages_receiver;

CREATE INDEX IF NOT EXISTS idx_trade_requests_sender_updated_at
  ON public.trade_requests(sender_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_requests_receiver_updated_at
  ON public.trade_requests(receiver_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created_at
  ON public.messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_created_at
  ON public.messages(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_trade_request_created_at
  ON public.messages(trade_request_id, created_at DESC)
  WHERE trade_request_id IS NOT NULL;

COMMIT;
