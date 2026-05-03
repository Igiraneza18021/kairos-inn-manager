
-- Ensure anon/authenticated roles have table-level privileges (RLS still applies)
GRANT INSERT, SELECT ON public.bookings TO anon, authenticated;
GRANT INSERT, SELECT ON public.booking_rooms TO anon, authenticated;

-- Replace the insert policy with a simpler, permissive one for guest bookings
DROP POLICY IF EXISTS "Anyone can create booking" ON public.bookings;
CREATE POLICY "Anyone can create booking"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL) OR (auth.uid() = user_id)
);
