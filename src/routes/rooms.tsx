import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, Bath, BedDouble, Fan, Coffee, Briefcase } from "lucide-react";
import roomStandard from "@/assets/room-standard.jpg";
import roomFamily from "@/assets/room-family.jpg";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms & Rates — Kairos Inn, Karangazi" },
      {
        name: "description",
        content:
          "Standard rooms at RWF 25,000/night and a Family Suite at RWF 110,000/night at Kairos Inn, Karangazi. WiFi, breakfast, private bath included.",
      },
      { property: "og:title", content: "Rooms & Rates — Kairos Inn" },
      {
        property: "og:description",
        content: "Browse our rooms and book your stay in Karangazi, Rwanda.",
      },
    ],
  }),
  component: RoomsPage,
});

type RoomCard = {
  key: string;
  title: string;
  price: number;
  description: string;
  image: string;
  bookHref: string;
};

function RoomsPage() {
  const [available, setAvailable] = useState<{ standard: number; family: boolean } | null>(null);

  useEffect(() => {
    // Just fetch counts of active rooms — booking-availability check comes later
    supabase
      .from("rooms")
      .select("room_type")
      .eq("active", true)
      .then(({ data }) => {
        if (!data) return;
        setAvailable({
          standard: data.filter((r) => r.room_type === "standard").length,
          family: data.filter((r) => r.room_type === "family_suite").length >= 2,
        });
      });
  }, []);

  const cards: RoomCard[] = [
    {
      key: "standard",
      title: "Standard Room",
      price: 25000,
      description:
        "A comfortable single room with a fan, private bathroom, work desk, wardrobe and free WiFi. Breakfast included.",
      image: roomStandard,
      bookHref: "/book?type=standard",
    },
    {
      key: "family",
      title: "Family Suite (112A + 112B)",
      price: 110000,
      description:
        "Two connected rooms booked together — two beds, two private bathrooms. Ideal for families or small groups.",
      image: roomFamily,
      bookHref: "/book?type=family_suite",
    },
  ];

  const amenities = [Wifi, Fan, Bath, BedDouble, Briefcase, Coffee];
  const amenityLabels = ["WiFi", "Fan", "Private Bath", "Bed", "Work Desk", "Breakfast"];

  return (
    <SiteLayout>
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="font-serif text-4xl font-bold text-foreground">Rooms & Rates</h1>
          <p className="mt-2 text-muted-foreground">
            All rooms include free WiFi, fan, private bathroom, work desk, wardrobe, and breakfast.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          {cards.map((c) => (
            <article
              key={c.key}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
            >
              <img
                src={c.image}
                alt={c.title}
                loading="lazy"
                width={1280}
                height={896}
                className="h-64 w-full object-cover"
              />
              <div className="p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-serif text-2xl font-bold text-foreground">{c.title}</h2>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">
                      RWF {c.price.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">per night</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {amenities.map((Icon, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      {amenityLabels[i]}
                    </span>
                  ))}
                </div>

                {c.key === "standard" && available && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {available.standard} standard rooms available (101–111).
                  </p>
                )}

                <div className="mt-6">
                  <Link to={c.bookHref}>
                    <Button className="w-full sm:w-auto">Book this room</Button>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
