import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — Kairos Inn" },
      { name: "description", content: "Manage your Kairos Inn bookings and profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null } | null>(
    null,
  );
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/auth" });
        return;
      }
      const uid = sess.session.user.id;
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      setProfile(p);
      const roles = r?.map((x) => x.role) ?? [];
      setRole(roles.includes("manager") ? "manager" : roles.includes("staff") ? "staff" : "guest");
      setLoading(false);
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Loading...</div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-3xl font-bold">My Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{profile?.full_name || "Guest"}</span>
          {role && (
            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide">
              {role}
            </span>
          )}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            to="/rooms"
            className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="font-serif text-lg font-bold">Book a room</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse available rooms and make a reservation.
            </p>
          </Link>

          {(role === "staff" || role === "manager") && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-lg font-bold">Staff Dashboard</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage bookings, rooms, and messages. (Coming in next update.)
              </p>
            </div>
          )}
        </div>

        <div className="mt-10">
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
