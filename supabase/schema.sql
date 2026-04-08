-- ============================================
-- SVD STICKERTAUSCH – Datenbank-Schema
-- Supabase (PostgreSQL)
-- ============================================

-- Benutzerprofile (erweitert Supabase Auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  contact_method TEXT DEFAULT 'platform' CHECK (contact_method IN ('platform','whatsapp','telefon','persoenlich')),
  contact_info TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sticker-Sammlung (welche Sticker hat ein User, mit Anzahl)
CREATE TABLE public.user_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sticker_number INT NOT NULL CHECK (sticker_number >= 1 AND sticker_number <= 708),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sticker_number)
);

-- Angebote / Inserate (Tausch oder Verkauf)
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('tausch','verkauf','suche')),
  -- tausch = will tauschen
  -- verkauf = will für Geld verkaufen
  -- suche = sucht bestimmte Sticker
  sticker_numbers INT[] NOT NULL,
  -- Bei 'tausch'/'verkauf': Sticker die angeboten werden
  -- Bei 'suche': Sticker die gesucht werden
  description TEXT,
  price_per_sticker DECIMAL(5,2), -- Preis pro Sticker (nur bei Verkauf)
  price_total DECIMAL(6,2), -- Gesamtpreis (nur bei Verkauf)
  status TEXT DEFAULT 'aktiv' CHECK (status IN ('aktiv','reserviert','abgeschlossen','storniert')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tausch-Anfragen / Nachrichten
CREATE TABLE public.trade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('tausch','kauf')),
  offered_stickers INT[], -- Sticker die der Sender zum Tausch anbietet
  requested_stickers INT[], -- Sticker die der Sender haben möchte
  offered_price DECIMAL(6,2), -- Geld-Angebot (bei Kauf)
  message TEXT,
  status TEXT DEFAULT 'offen' CHECK (status IN ('offen','akzeptiert','abgelehnt','erledigt','storniert')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nachrichten / Chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_request_id UUID REFERENCES public.trade_requests(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.push_subscriptions (
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

-- ============================================
-- Indizes für Performance
-- ============================================

CREATE INDEX idx_user_stickers_user ON public.user_stickers(user_id);
CREATE INDEX idx_user_stickers_number ON public.user_stickers(sticker_number);
CREATE INDEX idx_offers_user ON public.offers(user_id);
CREATE INDEX idx_offers_type_status ON public.offers(offer_type, status);
CREATE INDEX idx_offers_stickers ON public.offers USING GIN(sticker_numbers);
CREATE INDEX idx_trade_requests_sender_updated_at ON public.trade_requests(sender_id, updated_at DESC);
CREATE INDEX idx_trade_requests_receiver_updated_at ON public.trade_requests(receiver_id, updated_at DESC);
CREATE INDEX idx_trade_requests_offer ON public.trade_requests(offer_id);
CREATE INDEX idx_messages_sender_created_at ON public.messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_receiver_created_at ON public.messages(receiver_id, created_at DESC);
CREATE INDEX idx_messages_trade_request_created_at ON public.messages(trade_request_id, created_at DESC) WHERE trade_request_id IS NOT NULL;
CREATE INDEX idx_messages_unread ON public.messages(receiver_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profile: Jeder kann Profile sehen, nur eigenes bearbeiten
CREATE POLICY "Profiles sind öffentlich lesbar"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "User kann eigenes Profil bearbeiten"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "User kann eigenes Profil erstellen"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Sticker: Jeder kann Sammlungen sehen (für Matching), nur eigene bearbeiten
CREATE POLICY "Sticker-Sammlungen sind öffentlich lesbar"
  ON public.user_stickers FOR SELECT
  USING (true);

CREATE POLICY "User kann eigene Sticker bearbeiten"
  ON public.user_stickers FOR ALL
  USING (auth.uid() = user_id);

-- Angebote: Alle können lesen, nur eigene erstellen/bearbeiten
CREATE POLICY "Angebote sind öffentlich lesbar"
  ON public.offers FOR SELECT
  USING (true);

CREATE POLICY "User kann eigene Angebote verwalten"
  ON public.offers FOR ALL
  USING (auth.uid() = user_id);

-- Trade Requests: Sender und Empfänger können sehen
CREATE POLICY "Trade Requests für Beteiligte sichtbar"
  ON public.trade_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "User kann Trade Requests erstellen"
  ON public.trade_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Beteiligte können Trade Requests updaten"
  ON public.trade_requests FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Beteiligte können Trade Requests löschen"
  ON public.trade_requests FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Nachrichten: Sender und Empfänger können lesen
CREATE POLICY "Nachrichten für Beteiligte sichtbar"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "User kann Nachrichten senden"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Empfänger kann Nachrichten als gelesen markieren"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Beteiligte können Nachrichten löschen"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "User kann eigene Push Subscriptions lesen"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User kann eigene Push Subscriptions speichern"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User kann eigene Push Subscriptions aktualisieren"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "User kann eigene Push Subscriptions loeschen"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Trigger: updated_at automatisch setzen
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_stickers_updated_at BEFORE UPDATE ON public.user_stickers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER offers_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trade_requests_updated_at BEFORE UPDATE ON public.trade_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Trigger: Profil automatisch bei User-Registrierung erstellen
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Hilfsfunktionen
-- ============================================

-- Funktion: Alle User mit bestimmtem Sticker als Duplikat finden
CREATE OR REPLACE FUNCTION find_users_with_duplicate(target_sticker INT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  quantity INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT us.user_id, p.username, p.display_name, us.quantity
  FROM public.user_stickers us
  JOIN public.profiles p ON p.id = us.user_id
  WHERE us.sticker_number = target_sticker
    AND us.quantity > 1;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Ungelesene Nachrichten zählen
CREATE OR REPLACE FUNCTION get_unread_count(target_user UUID)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM public.messages
    WHERE receiver_id = target_user AND NOT is_read
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Realtime aktivieren (für Chat)
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_requests;
