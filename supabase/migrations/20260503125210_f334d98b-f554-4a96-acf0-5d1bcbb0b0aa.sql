GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT SELECT, INSERT ON public.bookings TO anon, authenticated;
GRANT SELECT, INSERT ON public.booking_rooms TO anon, authenticated;
GRANT SELECT, INSERT ON public.messages TO anon, authenticated;
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_unavailable_room_ids(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_booking_with_rooms(
  _user_id uuid,
  _group_id text,
  _guest_name text,
  _guest_phone text,
  _guest_email text,
  _check_in date,
  _check_out date,
  _num_guests integer,
  _total_price numeric,
  _notes text,
  _room_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking_id uuid;
  _room_id uuid;
BEGIN
  IF _guest_name IS NULL OR btrim(_guest_name) = '' THEN
    RAISE EXCEPTION 'Guest name is required';
  END IF;

  IF _guest_phone IS NULL OR btrim(_guest_phone) = '' THEN
    RAISE EXCEPTION 'Guest phone is required';
  END IF;

  IF _check_in IS NULL OR _check_out IS NULL OR _check_out <= _check_in THEN
    RAISE EXCEPTION 'Check-out must be after check-in';
  END IF;

  IF _room_ids IS NULL OR array_length(_room_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one room must be selected';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_rooms br
    JOIN public.bookings b ON b.id = br.booking_id
    WHERE br.room_id = ANY(_room_ids)
      AND b.status <> 'cancelled'
      AND b.check_in < _check_out
      AND b.check_out > _check_in
  ) THEN
    RAISE EXCEPTION 'One or more selected rooms are no longer available for those dates';
  END IF;

  INSERT INTO public.bookings (
    user_id,
    group_id,
    guest_name,
    guest_phone,
    guest_email,
    check_in,
    check_out,
    num_guests,
    total_price,
    status,
    notes
  ) VALUES (
    _user_id,
    _group_id,
    btrim(_guest_name),
    btrim(_guest_phone),
    NULLIF(btrim(COALESCE(_guest_email, '')), ''),
    _check_in,
    _check_out,
    GREATEST(COALESCE(_num_guests, 1), 1),
    _total_price,
    'pending',
    NULLIF(btrim(COALESCE(_notes, '')), '')
  ) RETURNING id INTO _booking_id;

  FOREACH _room_id IN ARRAY _room_ids LOOP
    INSERT INTO public.booking_rooms (booking_id, room_id)
    VALUES (_booking_id, _room_id);
  END LOOP;

  RETURN _booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_with_rooms(uuid, text, text, text, text, date, date, integer, numeric, text, uuid[]) TO anon, authenticated;