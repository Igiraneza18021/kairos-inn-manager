import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const createBookingInput = z.object({
  userId: z.string().uuid().nullable(),
  groupId: z.string().min(1).max(120),
  guestName: z.string().min(1).max(120),
  guestPhone: z.string().min(1).max(40),
  guestEmail: z.string().email().nullable(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numGuests: z.number().int().min(1).max(6),
  totalPrice: z.number().nonnegative(),
  notes: z.string().nullable(),
  roomIds: z.array(z.string().uuid()).min(1),
});

function datesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB;
}

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => createBookingInput.parse(input))
  .handler(async ({ data }) => {
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from("rooms")
      .select("id, active")
      .in("id", data.roomIds);

    if (roomsError) throw new Error(roomsError.message);
    if (!rooms || rooms.length !== data.roomIds.length || rooms.some((room) => !room.active)) {
      throw new Error("One or more selected rooms are not available right now.");
    }

    const { data: roomLinks, error: linksError } = await supabaseAdmin
      .from("booking_rooms")
      .select("booking_id, room_id")
      .in("room_id", data.roomIds);

    if (linksError) throw new Error(linksError.message);

    const bookingIds = [...new Set((roomLinks ?? []).map((link) => link.booking_id))];

    if (bookingIds.length > 0) {
      const { data: existingBookings, error: bookingsError } = await supabaseAdmin
        .from("bookings")
        .select("id, status, check_in, check_out")
        .in("id", bookingIds);

      if (bookingsError) throw new Error(bookingsError.message);

      const activeBookingIds = new Set(
        (existingBookings ?? [])
          .filter(
            (booking) =>
              booking.status !== "cancelled" &&
              datesOverlap(booking.check_in, booking.check_out, data.checkIn, data.checkOut),
          )
          .map((booking) => booking.id),
      );

      if ((roomLinks ?? []).some((link) => activeBookingIds.has(link.booking_id))) {
        throw new Error("That room is no longer available for those dates.");
      }
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: data.userId,
        group_id: data.groupId,
        guest_name: data.guestName.trim(),
        guest_phone: data.guestPhone.trim(),
        guest_email: data.guestEmail,
        check_in: data.checkIn,
        check_out: data.checkOut,
        num_guests: data.numGuests,
        total_price: data.totalPrice,
        status: "pending",
        notes: data.notes,
      })
      .select("id")
      .single();

    if (bookingError || !booking) throw new Error(bookingError?.message || "Could not create booking.");

    const { error: bookingRoomsError } = await supabaseAdmin.from("booking_rooms").insert(
      data.roomIds.map((roomId) => ({
        booking_id: booking.id,
        room_id: roomId,
      })),
    );

    if (bookingRoomsError) {
      await supabaseAdmin.from("bookings").delete().eq("id", booking.id);
      throw new Error(bookingRoomsError.message);
    }

    return { bookingId: booking.id };
  });