import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CalendarCheck,
  BedDouble,
  MessageSquare,
  Star,
  Users,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff Dashboard — Kairos Inn" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});

type Booking = {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes: string | null;
  created_at: string;
};

type Room = {
  id: string;
  room_number: string;
  display_name: string;
  room_type: "standard" | "family_suite";
  price_per_night: number;
  active: boolean;
  description: string | null;
};

type ReviewRow = {
  id: string;
  guest_name: string;
  rating: number;
  comment: string | null;
  approved: boolean;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type AppRole = "guest" | "staff" | "manager" | "owner" | "accountant" | "receptionist";

type RoleRow = {
  user_id: string;
  role: AppRole;
};

type Transaction = {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  description: string;
  booking_id: string | null;
  recorded_by: string;
  created_at: string;
};

type PasskeyRow = { role: AppRole; passkey: string };

function StaffPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const isOwner = roles.includes("owner");
  const isManager = roles.includes("manager");
  const isAccountant = roles.includes("accountant");
  const canSeeTransactions = isOwner || isManager || isAccountant;
  const canManageStaff = isOwner || isManager;
  const primaryRole: AppRole = isOwner
    ? "owner"
    : isManager
      ? "manager"
      : isAccountant
        ? "accountant"
        : roles.includes("receptionist")
          ? "receptionist"
          : "staff";

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/auth" });
        return;
      }
      const uid = sess.session.user.id;
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const list = (r?.map((x) => x.role) ?? []) as AppRole[];
      const allowed: AppRole[] = ["staff", "manager", "owner", "accountant", "receptionist"];
      if (!list.some((x) => allowed.includes(x))) {
        toast.error("Staff access only.");
        navigate({ to: "/account" });
        return;
      }
      setRoles(list);
      setReady(true);
    })();
  }, [navigate]);

  if (!ready) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-5xl px-4 py-16 text-muted-foreground">Loading...</div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      {/* ── Header ── */}
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-2xl font-bold sm:text-3xl">Staff Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage bookings, rooms, messages, and reviews.
              </p>
            </div>
            <Badge className="uppercase">{primaryRole}</Badge>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <Tabs defaultValue="bookings">
          {/* Scrollable tab bar — no wrapping, swipe on mobile */}
          <div className="overflow-x-auto">
            <TabsList className="inline-flex min-w-full gap-1 sm:w-full sm:flex-wrap">
              <TabsTrigger value="bookings" className="shrink-0 text-xs sm:text-sm">
                <CalendarCheck className="mr-1.5 h-4 w-4" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="rooms" className="shrink-0 text-xs sm:text-sm">
                <BedDouble className="mr-1.5 h-4 w-4" />
                Rooms
              </TabsTrigger>
              <TabsTrigger value="messages" className="shrink-0 text-xs sm:text-sm">
                <MessageSquare className="mr-1.5 h-4 w-4" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="reviews" className="shrink-0 text-xs sm:text-sm">
                <Star className="mr-1.5 h-4 w-4" />
                Reviews
              </TabsTrigger>
              {canSeeTransactions && (
                <TabsTrigger value="transactions" className="shrink-0 text-xs sm:text-sm">
                  💰 Transactions
                </TabsTrigger>
              )}
              {canManageStaff && (
                <TabsTrigger value="staff" className="shrink-0 text-xs sm:text-sm">
                  <Users className="mr-1.5 h-4 w-4" />
                  Staff
                </TabsTrigger>
              )}
              {isOwner && (
                <TabsTrigger value="passkeys" className="shrink-0 text-xs sm:text-sm">
                  🔑 Passkeys
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="bookings" className="mt-6">
            <BookingsPanel />
          </TabsContent>
          <TabsContent value="rooms" className="mt-6">
            <RoomsPanel canEdit={isOwner || isManager} />
          </TabsContent>
          <TabsContent value="messages" className="mt-6">
            <MessagesPanel />
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <ReviewsPanel />
          </TabsContent>
          {canSeeTransactions && (
            <TabsContent value="transactions" className="mt-6">
              <TransactionsPanel canEdit={isOwner || isManager} />
            </TabsContent>
          )}
          {canManageStaff && (
            <TabsContent value="staff" className="mt-6">
              <StaffPanel isOwner={isOwner} />
            </TabsContent>
          )}
          {isOwner && (
            <TabsContent value="passkeys" className="mt-6">
              <PasskeysPanel />
            </TabsContent>
          )}
        </Tabs>
      </section>
    </SiteLayout>
  );
}

/* ─────────────────  Bookings  ───────────────── */
function BookingsPanel() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("pending");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    setBookings((data as Booking[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, status: Booking["status"]) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}.`);
    load();
  };

  const list = bookings.filter((b) => (filter === "all" ? true : b.status === filter));

  return (
    <div>
      {/* Horizontally scrollable filter pills */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(["pending", "confirmed", "completed", "cancelled", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm capitalize ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-muted-foreground">No bookings.</p>
      ) : (
        <div className="space-y-3">
          {list.map((b) => (
            <article key={b.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              {/* Top row: name + price */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{b.guest_name}</span>
                    <Badge
                      variant={b.status === "pending" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {b.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {b.check_in} → {b.check_out} · {b.num_guests} guest(s)
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                    <a href={`tel:${b.guest_phone}`} className="text-primary hover:underline">
                      {b.guest_phone}
                    </a>
                    {b.guest_email && (
                      <span className="break-all text-muted-foreground">{b.guest_email}</span>
                    )}
                  </div>
                  {b.notes && <p className="mt-2 text-sm text-foreground">📝 {b.notes}</p>}
                </div>
                {/* Price — on its own line on very small screens */}
                <div className="shrink-0 text-right">
                  <div className="text-base font-bold text-primary sm:text-lg">
                    RWF {Number(b.total_price).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                {b.status === "pending" && (
                  <>
                    <Button size="sm" className="flex-1 sm:flex-none" onClick={() => update(b.id, "confirmed")}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => update(b.id, "cancelled")}
                    >
                      <XCircle className="mr-1 h-4 w-4" /> Decline
                    </Button>
                  </>
                )}
                {b.status === "confirmed" && (
                  <>
                    <Button size="sm" className="flex-1 sm:flex-none" onClick={() => update(b.id, "completed")}>
                      Mark completed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => update(b.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────  Rooms  ───────────────── */
function RoomsPanel({ canEdit }: { canEdit: boolean }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const load = async () => {
    const { data } = await supabase.from("rooms").select("*").order("room_number");
    setRooms((data as Room[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const updateField = async (id: string, patch: Partial<Room>) => {
    const { error } = await supabase.from("rooms").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  };

  return (
    <div className="space-y-3">
      {rooms.map((r) => (
        <article key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">{r.display_name}</div>
              <div className="text-sm text-muted-foreground">
                Room {r.room_number} · {r.room_type === "family_suite" ? "Family Suite" : "Standard"} ·{" "}
                RWF {Number(r.price_per_night).toLocaleString()}/night
              </div>
            </div>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={r.active ? "outline" : "default"}
                  className="flex-1 sm:flex-none"
                  onClick={() => updateField(r.id, { active: !r.active })}
                >
                  {r.active ? "Mark out of service" : "Reactivate"}
                </Button>
                <Input
                  type="number"
                  defaultValue={r.price_per_night}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (n && n !== r.price_per_night) updateField(r.id, { price_per_night: n });
                  }}
                  className="w-28 sm:w-32"
                />
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

/* ─────────────────  Messages (staff side)  ───────────────── */
type MsgRow = {
  id: string;
  body: string;
  sender_id: string | null;
  conversation_user_id: string | null;
  guest_session_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  created_at: string;
};

type Conversation = {
  key: string;
  isGuest: boolean;
  name: string;
  phone: string | null;
  last: string;
  at: string;
};

function MessagesPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [thread, setThread] = useState<MsgRow[]>([]);
  const [body, setBody] = useState("");
  const [me, setMe] = useState<string>("");
  // On mobile: show list or thread, not both
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMe(data.session?.user.id ?? ""));
  }, []);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("messages")
      .select("conversation_user_id, guest_session_id, guest_name, guest_phone, body, created_at")
      .order("created_at", { ascending: false });
    if (!data) return;

    const seen = new Set<string>();
    const list: Conversation[] = [];
    const userIds: string[] = [];

    for (const m of data) {
      const isGuest = !m.conversation_user_id && !!m.guest_session_id;
      const key = isGuest ? (m.guest_session_id as string) : (m.conversation_user_id as string | null);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!isGuest) userIds.push(key);
      list.push({
        key,
        isGuest,
        name: m.guest_name || (isGuest ? "Guest" : "Member"),
        phone: m.guest_phone ?? null,
        last: m.body,
        at: m.created_at,
      });
    }

    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);
      const map = new Map<string, Profile>();
      profs?.forEach((p) => map.set(p.id, p as Profile));
      for (const c of list) {
        if (!c.isGuest) {
          const p = map.get(c.key);
          if (p) {
            c.name = p.full_name || "Member";
            c.phone = p.phone ?? c.phone;
          }
        }
      }
    }
    setConversations(list);
  };

  const loadThread = async (c: Conversation) => {
    const q = supabase.from("messages").select("*").order("created_at", { ascending: true });
    const { data } = c.isGuest
      ? await q.eq("guest_session_id", c.key)
      : await q.eq("conversation_user_id", c.key);
    setThread((data as MsgRow[]) ?? []);
  };

  useEffect(() => {
    loadConversations();
    const ch = supabase
      .channel("staff-msgs")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        loadConversations();
        if (active) loadThread(active);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.key]);

  const openConv = (c: Conversation) => {
    setActive(c);
    loadThread(c);
    setMobileView("thread");
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !body.trim()) return;
    const payload = active.isGuest
      ? { body: body.trim(), sender_id: me, guest_session_id: active.key, guest_name: active.name, guest_phone: active.phone }
      : { body: body.trim(), sender_id: me, conversation_user_id: active.key };
    const { error } = await supabase.from("messages").insert(payload);
    if (error) return toast.error(error.message);
    setBody("");
    loadThread(active);
  };

  return (
    <>
      {/* ── Mobile: stacked views with back button ── */}
      <div className="md:hidden">
        {mobileView === "list" ? (
          <div className="rounded-xl border border-border bg-card p-2">
            {conversations.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">No conversations yet.</p>
            )}
            {conversations.map((c) => (
              <button
                key={c.key}
                onClick={() => openConv(c)}
                className={`block w-full rounded-lg p-3 text-left text-sm transition ${
                  active?.key === c.key ? "bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">{c.name}</span>
                  {c.isGuest && <Badge variant="secondary" className="text-[10px]">Guest</Badge>}
                </div>
                {c.phone && <div className="text-xs text-primary">{c.phone}</div>}
                <div className="truncate text-xs text-muted-foreground">{c.last}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-[70vh] flex-col rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border p-3">
              <button
                onClick={() => setMobileView("list")}
                className="text-sm text-primary hover:underline"
              >
                ← Back
              </button>
              <span className="font-semibold text-sm">{active?.name}</span>
              {active?.phone && (
                <a href={`tel:${active.phone}`} className="ml-auto text-sm text-primary hover:underline">
                  {active.phone}
                </a>
              )}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {thread.map((m) => {
                const mine = !!m.sender_id && m.sender_id === me;
                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {m.body}
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
              <Input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a reply..."
                className="flex-1"
              />
              <Button type="submit" size="sm">Send</Button>
            </form>
          </div>
        )}
      </div>

      {/* ── Desktop: side-by-side ── */}
      <div className="hidden md:grid md:grid-cols-[280px_1fr] md:gap-4">
        <aside className="rounded-xl border border-border bg-card p-2">
          {conversations.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">No conversations yet.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.key}
              onClick={() => openConv(c)}
              className={`block w-full rounded-lg p-2 text-left text-sm transition ${
                active?.key === c.key ? "bg-primary/10" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">{c.name}</span>
                {c.isGuest && <Badge variant="secondary" className="text-[10px]">Guest</Badge>}
              </div>
              {c.phone && <div className="text-xs text-primary">{c.phone}</div>}
              <div className="truncate text-xs text-muted-foreground">{c.last}</div>
            </button>
          ))}
        </aside>
        <div className="flex h-[60vh] flex-col rounded-xl border border-border bg-card">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Pick a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="border-b border-border p-3 text-sm">
                <span className="font-semibold">{active.name}</span>
                {active.phone && (
                  <a href={`tel:${active.phone}`} className="ml-2 text-primary hover:underline">
                    {active.phone}
                  </a>
                )}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {thread.map((m) => {
                  const mine = !!m.sender_id && m.sender_id === me;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      {m.body}
                    </div>
                  );
                })}
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
                <Input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type a reply..."
                />
                <Button type="submit">Send</Button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────  Reviews moderation  ───────────────── */
function ReviewsPanel() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    setReviews((data as ReviewRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const setApproved = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("reviews").update({ approved }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(approved ? "Approved" : "Hidden");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-3">
      {reviews.length === 0 && <p className="text-muted-foreground">No reviews yet.</p>}
      {reviews.map((r) => (
        <article key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.guest_name}</span>
                <span className="text-sm text-yellow-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                <Badge variant={r.approved ? "default" : "secondary"}>
                  {r.approved ? "Approved" : "Hidden"}
                </Badge>
              </div>
              {r.comment && <p className="mt-2 text-sm text-foreground">{r.comment}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={r.approved ? "outline" : "default"}
              className="flex-1 sm:flex-none"
              onClick={() => setApproved(r.id, !r.approved)}
            >
              {r.approved ? "Hide" : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 sm:flex-none"
              onClick={() => remove(r.id)}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ─────────────────  Transactions  ───────────────── */
function TransactionsPanel({ canEdit }: { canEdit: boolean }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    amount: "",
    payment_date: "",
    payment_method: "cash",
    description: "",
    booking_id: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("payment_date", { ascending: false });
    setTransactions((data as Transaction[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    const { error } = await supabase.from("transactions").insert({
      amount: Number(form.amount),
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      description: form.description,
      booking_id: form.booking_id || null,
      recorded_by: uid,
    });
    if (error) return toast.error(error.message);
    toast.success("Transaction recorded.");
    setForm({ amount: "", payment_date: "", payment_method: "cash", description: "", booking_id: "" });
    load();
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">Record Transaction</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Amount (RWF)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Method</Label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <Label>Booking ID (optional)</Label>
              <Input
                value={form.booking_id}
                onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
          </div>
          <Button type="submit" className="mt-4 w-full sm:w-auto">
            Save Transaction
          </Button>
        </form>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((t) => (
            <article key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.description}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t.payment_date} · {t.payment_method}
                    {t.booking_id && ` · Booking: ${t.booking_id}`}
                  </div>
                </div>
                <div className="shrink-0 text-right font-bold text-primary">
                  RWF {Number(t.amount).toLocaleString()}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────  Staff management  ───────────────── */
function StaffPanel({ isOwner }: { isOwner: boolean }) {
  const [users, setUsers] = useState<{ profile: Profile; roles: AppRole[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: roleRows } = await supabase.from("user_roles").select("user_id, role");
    if (!roleRows) { setLoading(false); return; }

    const uids = [...new Set(roleRows.map((r) => r.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone").in("id", uids);

    const map = new Map<string, { profile: Profile; roles: AppRole[] }>();
    profiles?.forEach((p) => map.set(p.id, { profile: p as Profile, roles: [] }));
    roleRows.forEach((r) => {
      const entry = map.get(r.user_id);
      if (entry) entry.roles.push(r.role as AppRole);
    });
    setUsers([...map.values()]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const removeRole = async (userId: string, role: AppRole) => {
    if (!confirm(`Remove role "${role}" from this user?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success("Role removed.");
    load();
  };

  return (
    <div className="space-y-3">
      {loading && <p className="text-muted-foreground">Loading...</p>}
      {users.map(({ profile, roles }) => (
        <article key={profile.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{profile.full_name || "Unnamed"}</div>
              {profile.phone && <div className="text-sm text-muted-foreground">{profile.phone}</div>}
            </div>
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <div key={role} className="flex items-center gap-1">
                  <Badge variant="secondary" className="capitalize">{role}</Badge>
                  {isOwner && (
                    <button
                      onClick={() => removeRole(profile.id, role)}
                      className="text-destructive hover:opacity-70"
                      title={`Remove ${role}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ─────────────────  Passkeys  ───────────────── */
function PasskeysPanel() {
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [form, setForm] = useState<{ role: AppRole; passkey: string }>({ role: "staff", passkey: "" });

  const load = async () => {
    const { data } = await supabase.from("role_passkeys").select("role, passkey");
    setPasskeys((data as PasskeyRow[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("role_passkeys")
      .upsert({ role: form.role, passkey: form.passkey }, { onConflict: "role" });
    if (error) return toast.error(error.message);
    toast.success("Passkey saved.");
    load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Set Role Passkey</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {(["staff", "receptionist", "accountant", "manager"] as AppRole[]).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Passkey</Label>
            <Input
              type="password"
              value={form.passkey}
              onChange={(e) => setForm({ ...form, passkey: e.target.value })}
              required
            />
          </div>
        </div>
        <Button type="submit" className="mt-4 w-full sm:w-auto">Save Passkey</Button>
      </form>

      <div className="space-y-2">
        {passkeys.map((p) => (
          <div key={p.role} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
            <Badge className="capitalize">{p.role}</Badge>
            <span className="font-mono text-sm tracking-widest text-muted-foreground">••••••••</span>
          </div>
        ))}
      </div>
    </div>
  );
}
