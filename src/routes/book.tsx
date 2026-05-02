import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const searchSchema = z.object({
  type: z.enum(["standard", "family_suite"]).optional(),
});

export const Route = createFileRoute("/book")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Book a Room — Kairos Inn, Karangazi" },
      {
        name: "description",
        content:
          "Reserve a room at Kairos Inn in Karangazi, Nyagatare. Pick your dates and confirm in seconds.",
      },
    ],
  }),
  component: BookPage,
});

type Room = {
  id: string;
  room_number: string;
  display_name: string;
  room_type: "standard" | "family_suite";
  price_per_night: number;
  group_id: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

function nights(checkIn: string, checkOut: string) {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function BookPage() {
  const { type = "standard" } = useSearch({ from: "/book" });
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set());
  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(tomorrow());
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [numGuests, setNumGuests] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auth check — redirect to /auth with redirect back
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setSignedIn(true);
      setAuthChecked(true);
      // Prefill from profile
      supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", data.session.user.id)
        .maybeSingle()
        .then(({ data: p }) => {
          if (p?.full_name) setGuestName(p.full_name);
          if (p?.phone) setGuestPhone(p.phone);
        });
      setGuestEmail(data.session.user.email ?? "");
    });
  }, [navigate]);

  // Load rooms of the chosen type
  useEffect(() => {
    if (!signedIn) return;
    supabase
      .from("rooms")
      .select("id, room_number, display_name, room_type, price_per_night, group_id")
      .eq("active", true)
      .eq("room_type", type)
      .order("room_number")
      .then(({ data }) => {
        if (data) {
          setRooms(data as Room[]);
          if (type === "family_suite" && data.length) {
            setSelectedRoomId(data[0].id); // suite is auto-selected (we book both)
          }
        }
      });
  }, [signedIn, type]);

  // Compute unavailable rooms for chosen dates (overlap with confirmed/pending bookings)
  useEffect(() => {
    if (!signedIn || !checkIn || !checkOut) return;
    if (nights(checkIn, checkOut) <= 0) return;

    (async () => {
      // Fetch bookings overlapping the date range that are not cancelled
      const { data: overlapping } = await supabase
        .from("bookings")
        .select("id, check_in, check_out, status")
        .neq("status", "cancelled")
        .lt("check_in", checkOut)
        .gt("check_out", checkIn);

      if (!overlapping?.length) {
        setUnavailableIds(new Set());
        return;
      }
      const ids = overlapping.map((b) => b.id);
      const { data: br } = await supabase
        .from("booking_rooms")
        .select("room_id, booking_id")
        .in("booking_id", ids);
      setUnavailableIds(new Set(br?.map((x) => x.room_id) ?? []));
    })();
  }, [signedIn, checkIn, checkOut]);

  if (!authChecked) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Loading...</div>
      </SiteLayout>
    );
  }

  const n = nights(checkIn, checkOut);
  const isFamily = type === "family_suite";
  const familyRooms = isFamily ? rooms : [];
  const familyUnavailable = isFamily && familyRooms.some((r) => unavailableIds.has(r.id));
  const pricePerNight = isFamily ? 110000 : 25000;
  const total = pricePerNight * n;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (n <= 0) {
      toast.error("Check-out must be after check-in.");
      return;
    }

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      navigate({ to: "/auth" });
      return;
    }
    const userId = sess.session.user.id;
    const groupId = crypto.randomUUID();

    let roomIds: string[] = [];
    if (isFamily) {
      if (familyRooms.length < 2) {
        toast.error("Family suite is not available right now.");
        return;
      }
      if (familyUnavailable) {
        toast.error("Family suite is already booked for those dates.");
        return;
      }
      roomIds = familyRooms.map((r) => r.id);
    } else {
      if (!selectedRoomId) {
        toast.error("Please pick a room.");
        return;
      }
      if (unavailableIds.has(selectedRoomId)) {
        toast.error("That room is no longer available for those dates.");
        return;
      }
      roomIds = [selectedRoomId];
    }

    setSubmitting(true);
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        user_id: userId,
        group_id: groupId,
        guest_name: guestName,
        guest_phone: guestPhone,
        guest_email: guestEmail || null,
        check_in: checkIn,
        check_out: checkOut,
        num_guests: numGuests,
        total_price: total,
        status: "pending",
        notes: notes || null,
      })
      .select("id")
      .single();

    if (error || !booking) {
      setSubmitting(false);
      toast.error(error?.message || "Could not create booking.");
      return;
    }

    const { error: brError } = await supabase
      .from("booking_rooms")
      .insert(roomIds.map((rid) => ({ booking_id: booking.id, room_id: rid })));

    setSubmitting(false);
    if (brError) {
      toast.error(brError.message);
      return;
    }
    toast.success("Booking request sent! Reception will confirm shortly.");
    navigate({ to: "/account" });
  };

  return (
    <SiteLayout>
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            Book {isFamily ? "the Family Suite" : "a Standard Room"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick your dates and confirm. Reception will approve your booking shortly.
          </p>
          <div className="mt-3 flex gap-2 text-sm">
            <Link
              to="/book"
              search={{ type: "standard" }}
              className={`rounded-full border px-3 py-1 ${type === "standard" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}
            >
              Standard · RWF 25,000
            </Link>
            <Link
              to="/book"
              search={{ type: "family_suite" }}
              className={`rounded-full border px-3 py-1 ${isFamily ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}
            >
              Family Suite · RWF 110,000
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm md:grid-cols-2"
        >
          <div>
            <Label htmlFor="ci">Check-in</Label>
            <Input
              id="ci"
              type="date"
              min={today()}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="co">Check-out</Label>
            <Input
              id="co"
              type="date"
              min={checkIn}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              required
            />
          </div>

          {!isFamily && (
            <div className="md:col-span-2">
              <Label>Choose a room</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {rooms.map((r) => {
                  const taken = unavailableIds.has(r.id);
                  const active = selectedRoomId === r.id;
                  return (
                    <button
                      type="button"
                      key={r.id}
                      disabled={taken}
                      onClick={() => setSelectedRoomId(r.id)}
                      className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                        taken
                          ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                          : active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary"
                      }`}
                    >
                      Room {r.room_number}
                    </button>
                  );
                })}
              </div>
              {!rooms.length && (
                <p className="mt-2 text-sm text-muted-foreground">No standard rooms found.</p>
              )}
            </div>
          )}

          {isFamily && (
            <div className="md:col-span-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium text-foreground">Family Suite (rooms 112A + 112B)</p>
              <p className="mt-1 text-muted-foreground">
                Both connected rooms are reserved together. Two beds, two private bathrooms.
              </p>
              {familyUnavailable && (
                <p className="mt-2 text-sm text-destructive">
                  Sorry — the Family Suite is taken for those dates.
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="gn">Full name</Label>
            <Input id="gn" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="gp">Phone</Label>
            <Input id="gp" type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ge">Email (optional)</Label>
            <Input id="ge" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ng">Number of guests</Label>
            <Input
              id="ng"
              type="number"
              min={1}
              max={isFamily ? 6 : 2}
              value={numGuests}
              onChange={(e) => setNumGuests(Math.max(1, Number(e.target.value)))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="nt">Notes (optional)</Label>
            <Textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Arrival time, special requests..." />
          </div>

          <div className="md:col-span-2 flex flex-col-reverse items-stretch justify-between gap-4 border-t border-border pt-4 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">
              {n} night{n === 1 ? "" : "s"} ·{" "}
              <span className="font-bold text-foreground">RWF {total.toLocaleString()}</span>{" "}
              total
            </p>
            <Button type="submit" size="lg" disabled={submitting || n <= 0}>
              {submitting ? "Submitting..." : "Request booking"}
            </Button>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}
