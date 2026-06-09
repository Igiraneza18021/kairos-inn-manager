import { createFileRoute } from "@tanstack/react-router";
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
  const [reviews, setReviews] = useState<Review[]>([]);
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
    if (!name.trim()) return toast.error("Please add your name.");
    setSubmitting(true);
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id ?? null;
    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      guest_name: name.trim(),
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
      <div className="bg-[#fbf9f4] text-[#2c2520] min-h-screen">
        
        {/* --- PAGE HEADER --- */}
        <section className="bg-[#faf6ee] border-b border-[#af8f52]/20">
          <div className="mx-auto max-w-5xl px-6 py-14 text-center md:text-left">
            <span className="text-xs font-bold tracking-[0.3em] text-[#af8f52] block mb-2">CHRONICLES</span>
            <h1 className="font-serif text-4xl font-normal tracking-wide text-[#2c2520] md:text-5xl">
              Guest Testimonials
            </h1>
            <div className="w-16 h-[1px] bg-[#af8f52] my-4 mx-auto md:mx-0" />
            
            {avg && (
              <div className="mt-2 flex items-center justify-center md:justify-start gap-2 font-serif text-sm text-muted-foreground">
                <span>An average of</span>
                <span className="font-semibold text-[#af8f52] px-1.5 py-0.5 bg-[#2c2520] text-[#fbf9f4] text-xs tracking-wider">
                  {avg} / 5 STARS
                </span>
                <span>compiled from {reviews.length} preserved entry recorded.</span>
              </div>
            )}
          </div>
        </section>

        {/* --- CONTENT WORKSPACE --- */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-12 md:grid-cols-[1fr_340px] items-start">
            
            {/* Reviews Stream Container */}
            <div className="space-y-8">
              {reviews.length === 0 && (
                <div className="text-center py-12 border border-dashed border-[#af8f52]/20 p-6">
                  <p className="font-serif italic text-muted-foreground">The chronicle is currently empty. Be the first to grace our ledger.</p>
                </div>
              )}
              
              {reviews.map((r) => (
                <article 
                  key={r.id} 
                  className="relative rounded-none border border-[#af8f52]/20 bg-[#fbf9f4] p-6 transition-all hover:border-[#af8f52]/40"
                >
                  {/* Structural Corner Accent Decoration */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#af8f52]/40" />
                  
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#af8f52]/10 pb-3">
                    <div className="font-serif text-lg font-medium tracking-wide text-[#2c2520]">
                      {r.guest_name}
                    </div>
                    <div className="tracking-widest text-xs text-[#af8f52] select-none">
                      {"★".repeat(r.rating)}
                      <span className="text-[#af8f52]/20">{"★".repeat(5 - r.rating)}</span>
                    </div>
                  </div>
                  
                  {r.comment && (
                    <p className="mt-4 font-serif text-sm italic text-[#2c2520]/90 leading-relaxed pl-3 border-l border-[#af8f52]/20">
                      “{r.comment}”
                    </p>
                  )}
                  
                  <div className="mt-4 text-[10px] font-sans uppercase tracking-[0.15em] text-muted-foreground/80 text-right">
                    Recorded on {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </article>
              ))}
            </div>

            {/* Inscription Form Panel (Aside Ledger) */}
            <aside className="rounded-none border border-[#af8f52]/20 bg-[#faf6ee] p-6 shadow-sm sticky top-24">
              <div className="text-center mb-6">
                <h2 className="font-serif text-xl font-normal text-[#2c2520]">Sign the Ledger</h2>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <div className="w-8 h-[1px] bg-[#af8f52]/30" />
                  <span className="text-[#af8f52] text-[8px]">◆</span>
                  <div className="w-8 h-[1px] bg-[#af8f52]/30" />
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4 font-serif">
                <div>
                  <Label htmlFor="rn" className="text-xs uppercase tracking-wider font-semibold text-[#2c2520]/80">Your Name</Label>
                  <Input 
                    id="rn" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    className="mt-1.5 rounded-none border-[#af8f52]/20 bg-[#fbf9f4] focus-visible:ring-[#af8f52] text-sm text-[#2c2520]"
                  />
                </div>
                
                <div>
                  <Label className="text-xs uppercase tracking-wider font-semibold text-[#2c2520]/80 block">Stature Rating</Label>
                  <div className="mt-2 flex gap-1 bg-[#fbf9f4] p-2 border border-[#af8f52]/20 justify-center">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setRating(n)}
                        aria-label={`${n} stars`}
                        className="transition-transform active:scale-95"
                      >
                        <Star
                          className={`h-5 w-5 transition-colors ${n <= rating ? "fill-[#af8f52] text-[#af8f52]" : "text-[#af8f52]/20"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="rc" className="text-xs uppercase tracking-wider font-semibold text-[#2c2520]/80">Your Commentary</Label>
                  <Textarea 
                    id="rc" 
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)} 
                    placeholder="Share your stay experience details..."
                    className="mt-1.5 rounded-none border-[#af8f52]/20 bg-[#fbf9f4] focus-visible:ring-[#af8f52] text-sm text-[#2c2520] min-h-[100px] resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full bg-gradient-to-b from-[#c5a86a] to-[#af8f52] text-[#fbf9f4] font-serif tracking-widest rounded-none py-5 border border-[#af8f52] hover:brightness-110 shadow-sm transition-all text-xs"
                >
                  {submitting ? "PRESERVING..." : "INScribe REVIEW"}
                </Button>
              </form>
            </aside>

          </div>
        </section>

      </div>
    </SiteLayout>
  );
}