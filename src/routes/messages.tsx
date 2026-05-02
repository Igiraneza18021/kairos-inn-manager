import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Chat with Reception — Kairos Inn" },
      { name: "description", content: "Message Kairos Inn reception directly from your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MessagesPage,
});

type Msg = {
  id: string;
  body: string;
  sender_id: string;
  conversation_user_id: string;
  created_at: string;
};

function MessagesPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<string>("");
  const [thread, setThread] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/auth" });
        return;
      }
      const uid = sess.session.user.id;
      setMe(uid);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_user_id", uid)
        .order("created_at", { ascending: true });
      setThread((data as Msg[]) ?? []);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!me) return;
    const ch = supabase
      .channel(`guest-msgs-${me}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_user_id=eq.${me}` },
        (payload) => setThread((prev) => [...prev, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !me) return;
    const { error } = await supabase.from("messages").insert({
      body: body.trim(),
      sender_id: me,
      conversation_user_id: me,
    });
    if (error) return toast.error(error.message);
    setBody("");
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-serif text-2xl font-bold">Chat with Reception</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We typically reply within a few minutes during reception hours.
        </p>

        <div className="mt-6 flex h-[65vh] flex-col rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {thread.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Say hello — we'd love to help with your stay.
              </p>
            )}
            {thread.map((m) => {
              const mine = m.sender_id === me;
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
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message..."
            />
            <Button type="submit">Send</Button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
