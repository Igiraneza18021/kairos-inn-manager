import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Create Account — Kairos Inn" },
      {
        name: "description",
        content: "Sign in to manage your bookings at Kairos Inn, or create a new account.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/account" });
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const passkey = String(fd.get("passkey") ?? "").trim();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: String(fd.get("full_name")),
          phone: String(fd.get("phone")),
        },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (passkey) {
      const { data: granted, error: pkErr } = await supabase.rpc("redeem_role_passkey", {
        _passkey: passkey,
      });
      if (pkErr) toast.error(`Passkey: ${pkErr.message}`);
      else if (granted) toast.success(`Account created. Role granted: ${granted}`);
    } else {
      toast.success("Account created! You're now signed in.");
    }
    setLoading(false);
    navigate({ to: "/account" });
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-1 font-serif text-2xl font-bold text-foreground">Welcome</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Sign in or create an account to book and manage your stay.
          </p>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="si-pw">Password</Label>
                  <Input
                    id="si-pw"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div>
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" name="full_name" required />
                </div>
                <div>
                  <Label htmlFor="su-phone">Phone</Label>
                  <Input id="su-phone" name="phone" type="tel" required placeholder="+250 ..." />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="su-pw">Password</Label>
                  <Input
                    id="su-pw"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
                </div>
                <div>
                  <Label htmlFor="su-passkey">Staff passkey (optional)</Label>
                  <Input id="su-passkey" name="passkey" placeholder="Leave blank if you're a guest" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Only enter this if a manager gave you a passkey.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </SiteLayout>
  );
}
