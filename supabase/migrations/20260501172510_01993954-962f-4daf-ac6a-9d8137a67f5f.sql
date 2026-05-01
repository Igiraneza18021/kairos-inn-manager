
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('guest', 'staff', 'manager');

-- Booking status enum
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Room type enum
CREATE TYPE public.room_type AS ENUM ('standard', 'family_suite');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table — security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer, bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- is_staff helper (staff or manager)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('staff', 'manager')
  )
$$;

-- Rooms
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL UNIQUE,
  room_type room_type NOT NULL DEFAULT 'standard',
  display_name TEXT NOT NULL,
  description TEXT,
  price_per_night NUMERIC(10,2) NOT NULL,
  group_id TEXT, -- for connected rooms (e.g., 'family_suite_112')
  is_bookable_individually BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL, -- groups multiple rooms in one reservation (family suite)
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  num_guests INT NOT NULL DEFAULT 1,
  total_price NUMERIC(10,2) NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Booking rooms (link table — supports family suite with 2 rooms)
CREATE TABLE public.booking_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_rooms ENABLE ROW LEVEL SECURITY;

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Messages (guest <-> reception chat)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- always the guest's user_id
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_by_recipient BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_conversation ON public.messages(conversation_user_id, created_at);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_dates ON public.bookings(check_in, check_out);

-- ============== RLS POLICIES ==============

-- Profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff view all profiles" ON public.profiles FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff view all roles" ON public.user_roles FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'manager'));

-- Rooms (public read)
CREATE POLICY "Anyone views rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Managers manage rooms" ON public.rooms FOR ALL USING (public.has_role(auth.uid(), 'manager'));

-- Bookings
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff view all bookings" ON public.bookings FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Users create own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pending bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Staff update bookings" ON public.bookings FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete bookings" ON public.bookings FOR DELETE USING (public.is_staff(auth.uid()));

-- Booking rooms
CREATE POLICY "Users view own booking rooms" ON public.booking_rooms FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));
CREATE POLICY "Staff view all booking rooms" ON public.booking_rooms FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Users create own booking rooms" ON public.booking_rooms FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));
CREATE POLICY "Staff manage booking rooms" ON public.booking_rooms FOR ALL USING (public.is_staff(auth.uid()));

-- Reviews
CREATE POLICY "Anyone views approved reviews" ON public.reviews FOR SELECT USING (approved = true);
CREATE POLICY "Users view own reviews" ON public.reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff view all reviews" ON public.reviews FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Users create own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff manage reviews" ON public.reviews FOR ALL USING (public.is_staff(auth.uid()));

-- Messages
CREATE POLICY "Users view own conversation" ON public.messages FOR SELECT
  USING (auth.uid() = conversation_user_id);
CREATE POLICY "Staff view all messages" ON public.messages FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Users send in own conversation" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND auth.uid() = conversation_user_id);
CREATE POLICY "Staff send in any conversation" ON public.messages FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = sender_id);
CREATE POLICY "Recipients mark read" ON public.messages FOR UPDATE
  USING (auth.uid() = conversation_user_id OR public.is_staff(auth.uid()));

-- ============== TRIGGERS ==============

-- Auto-create profile + assign role on signup. First user = manager, others = guest.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  SELECT COUNT(*) INTO user_count FROM public.user_roles WHERE role = 'manager';
  IF user_count = 0 THEN
    assigned_role := 'manager';
  ELSE
    assigned_role := 'guest';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_bookings BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
