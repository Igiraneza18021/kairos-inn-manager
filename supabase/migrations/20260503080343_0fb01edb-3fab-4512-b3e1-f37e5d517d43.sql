
-- Grant execute on helper functions to fix "permission denied for function is_staff"
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- ── Bookings: allow anonymous ──
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users create own bookings" ON public.bookings;
CREATE POLICY "Anyone can create booking"
ON public.bookings
FOR INSERT
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- booking_rooms: relax insert so anon flow works (booking row was just inserted)
DROP POLICY IF EXISTS "Users create own booking rooms" ON public.booking_rooms;
CREATE POLICY "Anyone create booking rooms for existing booking"
ON public.booking_rooms
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_rooms.booking_id)
);

-- ── Reviews: allow anonymous ──
ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users create own reviews" ON public.reviews;
CREATE POLICY "Anyone can submit review"
ON public.reviews
FOR INSERT
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- ── Messages: support anonymous guests via session id ──
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN conversation_user_id DROP NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS guest_session_id text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS guest_phone text;

DROP POLICY IF EXISTS "Users send in own conversation" ON public.messages;
DROP POLICY IF EXISTS "Users view own conversation" ON public.messages;
DROP POLICY IF EXISTS "Recipients mark read" ON public.messages;
DROP POLICY IF EXISTS "Staff send in any conversation" ON public.messages;

CREATE POLICY "Anyone can send a message"
ON public.messages
FOR INSERT
WITH CHECK (
  -- Anonymous guest: must include a session id and not impersonate a user
  (sender_id IS NULL AND guest_session_id IS NOT NULL AND conversation_user_id IS NULL)
  -- Authenticated guest: in their own conversation
  OR (auth.uid() IS NOT NULL AND auth.uid() = sender_id AND auth.uid() = conversation_user_id)
  -- Staff: in any conversation
  OR (is_staff(auth.uid()) AND auth.uid() = sender_id)
);

CREATE POLICY "Guests view their conversation"
ON public.messages
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = conversation_user_id)
  OR is_staff(auth.uid())
  -- Anonymous: client filters by guest_session_id locally; we expose rows that have one
  OR (auth.uid() IS NULL AND guest_session_id IS NOT NULL)
);

-- ── Public availability lookup (no booking details exposed) ──
CREATE OR REPLACE FUNCTION public.get_unavailable_room_ids(_check_in date, _check_out date)
RETURNS TABLE(room_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT br.room_id
  FROM public.booking_rooms br
  JOIN public.bookings b ON b.id = br.booking_id
  WHERE b.status <> 'cancelled'
    AND b.check_in < _check_out
    AND b.check_out > _check_in;
$$;

GRANT EXECUTE ON FUNCTION public.get_unavailable_room_ids(date, date) TO anon, authenticated;
