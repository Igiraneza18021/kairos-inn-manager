import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star } from "lucide-react";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Guest Reviews — Kairos Inn, Karangazi" },
      {
        name: "description",
        content: "Read what guests say about Kairos Inn in Karangazi, Nyagatare. Share your own experience.",
      },
      { property: "og:title", content: "Guest Reviews — Kairos Inn" },
    ],
  }),
  component: ReviewsPage,
});

type Review = {
  id: string;
  guest_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

function ReviewsPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id, guest_name, rating, comment, created_at")
      .eq("approved", true)
      .order("created_at", { ascending: false });
    setReviews((data as Review[]) ?? []);
  };

  useEffect(() => {
    load();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSignedIn(true);
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.session.user.id)
          .maybeSingle()
          .then(({ data: p }) => p?.full_name && setName(p.full_name));
      }
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      navigate({ to: "/auth" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: sess.session.user.id,
      guest_name: name.trim() || "Guest",
      rating,
      comment: comment.trim() || null,
      approved: false,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thank you! Your review will appear after reception approves it.");
    setComment("");
  };

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <SiteLayout>
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="font-serif text-3xl font-bold md:text-4xl">Guest Reviews</h1>
          {avg && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{avg}/5</span> from {reviews.length} guest
              {reviews.length === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {reviews.length === 0 && (
              <p className="text-muted-foreground">Be the first to leave a review!</p>
            )}
            {reviews.map((r) => (
              <article key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{r.guest_name}</div>
                  <div className="text-amber-500">
                    {"★".repeat(r.rating)}
                    <span className="text-muted-foreground/50">{"★".repeat(5 - r.rating)}</span>
                  </div>
                </div>
                {r.comment && <p className="mt-2 text-sm text-foreground">{r.comment}</p>}
                <div className="mt-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-serif text-lg font-bold">Leave a review</h2>
            {!signedIn ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Please <Link to="/auth" className="text-primary underline">sign in</Link> to share your experience.
              </p>
            ) : (
              <form onSubmit={submit} className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="rn">Your name</Label>
                  <Input id="rn" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <Label>Rating</Label>
                  <div className="mt-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setRating(n)}
                        aria-label={`${n} stars`}
                      >
                        <Star
                          className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="rc">Comment (optional)</Label>
                  <Textarea id="rc" value={comment} onChange={(e) => setComment(e.target.value)} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Submitting..." : "Submit review"}
                </Button>
              </form>
            )}
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
