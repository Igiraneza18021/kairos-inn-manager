import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl font-bold">Staff Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage bookings, rooms, messages, and reviews.
              </p>
            </div>
            <Badge className="uppercase">{primaryRole}</Badge>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="bookings">
          <TabsList className="flex w-full flex-wrap gap-1">
            <TabsTrigger value="bookings">
              <CalendarCheck className="mr-1.5 h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="rooms">
              <BedDouble className="mr-1.5 h-4 w-4" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="mr-1.5 h-4 w-4" />
              Reviews
            </TabsTrigger>
            {canSeeTransactions && (
              <TabsTrigger value="transactions">💰 Transactions</TabsTrigger>
            )}
            {canManageStaff && (
              <TabsTrigger value="staff">
                <Users className="mr-1.5 h-4 w-4" />
                Staff
              </TabsTrigger>
            )}
            {isOwner && <TabsTrigger value="passkeys">🔑 Passkeys</TabsTrigger>}
          </TabsList>

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

  useEffect(() => {
    load();
  }, []);

  const update = async (id: string, status: Booking["status"]) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}.`);
    load();
  };

  const list = bookings.filter((b) => (filter === "all" ? true : b.status === filter));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "confirmed", "completed", "cancelled", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm capitalize ${
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{b.guest_name}</span>
                    <Badge variant={b.status === "pending" ? "default" : "secondary"} className="capitalize">
                      {b.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {b.check_in} → {b.check_out} · {b.num_guests} guest(s)
                  </div>
                  <div className="mt-1 text-sm">
                    <a href={`tel:${b.guest_phone}`} className="text-primary hover:underline">
                      {b.guest_phone}
                    </a>
                    {b.guest_email && <span className="text-muted-foreground"> · {b.guest_email}</span>}
                  </div>
                  {b.notes && <p className="mt-2 text-sm text-foreground">📝 {b.notes}</p>}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    RWF {Number(b.total_price).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {b.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => update(b.id, "confirmed")}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => update(b.id, "cancelled")}>
                      <XCircle className="mr-1 h-4 w-4" /> Decline
                    </Button>
                  </>
                )}
                {b.status === "confirmed" && (
                  <>
                    <Button size="sm" onClick={() => update(b.id, "completed")}>
                      Mark completed
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => update(b.id, "cancelled")}>
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
  useEffect(() => {
    load();
  }, []);

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{r.display_name}</div>
              <div className="text-sm text-muted-foreground">
                Room {r.room_number} · {r.room_type === "family_suite" ? "Family Suite" : "Standard"} ·
                RWF {Number(r.price_per_night).toLocaleString()}/night
              </div>
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={r.active ? "outline" : "default"}
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
                  className="w-32"
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
  key: string;            // either user_id or guest_session_id
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
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.key]);

  const openConv = (c: Conversation) => {
    setActive(c);
    loadThread(c);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !body.trim()) return;
    const payload = active.isGuest
      ? {
          body: body.trim(),
          sender_id: me,
          guest_session_id: active.key,
          guest_name: active.name,
          guest_phone: active.phone,
        }
      : {
          body: body.trim(),
          sender_id: me,
          conversation_user_id: active.key,
        };
    const { error } = await supabase.from("messages").insert(payload);
    if (error) return toast.error(error.message);
    setBody("");
    loadThread(active);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
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
              <span className="font-medium text-foreground truncate">{c.name}</span>
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
                      mine
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
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
  useEffect(() => {
    load();
  }, []);

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
    load();
  };

  return (
    <div className="space-y-3">
      {reviews.length === 0 && <p className="text-muted-foreground">No reviews yet.</p>}
      {reviews.map((r) => (
        <article key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold">{r.guest_name}</div>
              <div className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
            </div>
            <Badge variant={r.approved ? "default" : "secondary"}>
              {r.approved ? "Visible" : "Pending"}
            </Badge>
          </div>
          {r.comment && <p className="mt-2 text-sm text-foreground">{r.comment}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {r.approved ? (
              <Button size="sm" variant="outline" onClick={() => setApproved(r.id, false)}>
                Hide
              </Button>
            ) : (
              <Button size="sm" onClick={() => setApproved(r.id, true)}>
                Approve
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => remove(r.id)}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ─────────────────  Staff management (manager only)  ───────────────── */
function StaffPanel() {
  const [people, setPeople] = useState<(Profile & { roles: string[] })[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("id, full_name, phone");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const map: Record<string, string[]> = {};
    (roles as RoleRow[] | null)?.forEach((r) => {
      map[r.user_id] = [...(map[r.user_id] ?? []), r.role];
    });
    setPeople(((profs as Profile[]) ?? []).map((p) => ({ ...p, roles: map[p.id] ?? [] })));
  };
  useEffect(() => {
    load();
  }, []);

  const grant = async (uid: string, role: "staff" | "manager") => {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error(error.message);
    toast.success(`Granted ${role}.`);
    load();
  };
  const revoke = async (uid: string, role: "staff" | "manager") => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success(`Revoked ${role}.`);
    load();
  };

  const filtered = people.filter(
    (p) =>
      !search ||
      (p.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.phone ?? "").includes(search),
  );

  return (
    <div className="space-y-4">
      <div>
        <Label>Find a user by name or phone</Label>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
        <p className="mt-1 text-xs text-muted-foreground">
          Tip: ask the person to sign up first at <Link to="/auth" className="text-primary underline">/auth</Link>,
          then promote them here.
        </p>
      </div>
      <div className="space-y-3">
        {filtered.map((p) => {
          const isStaff = p.roles.includes("staff");
          const isManager = p.roles.includes("manager");
          return (
            <article key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{p.full_name || "(no name)"}</div>
                  <div className="text-sm text-muted-foreground">{p.phone}</div>
                  <div className="mt-1 flex gap-1">
                    {p.roles.map((r) => (
                      <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isStaff ? (
                    <Button size="sm" onClick={() => grant(p.id, "staff")}>Make staff</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => revoke(p.id, "staff")}>
                      Remove staff
                    </Button>
                  )}
                  {!isManager ? (
                    <Button size="sm" onClick={() => grant(p.id, "manager")}>Make manager</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => revoke(p.id, "manager")}>
                      Remove manager
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
