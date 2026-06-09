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
        "A carefully designed single sanctuary featuring natural cooling, private stone bath, custom wood work desk, dedicated wardrobe, and high-speed connection. Complete with a traditional fresh breakfast served daily.",
      image: roomStandard,
      bookHref: "/book?type=standard",
    },
    {
      key: "family",
      title: "Family Suite (112A + 112B)",
      price: 110000,
      description:
        "Two interconnected private structural quarters reserved together. Outfitted with premium dual bedding and twin individual private baths. Masterfully arranged for families or traveling companions.",
      image: roomFamily,
      bookHref: "/book?type=family_suite",
    },
  ];

  const amenities = [Wifi, Fan, Bath, BedDouble, Briefcase, Coffee];
  const amenityLabels = ["WiFi", "Cooling Fan", "Private Bath", "Plush Bed", "Work Desk", "Breakfast"];

  return (
    <SiteLayout>
      <div className="bg-[#fbf9f4] text-[#2c2520] min-h-screen">
        
        {/* --- PAGE HEADER --- */}
        <section className="bg-[#faf6ee] border-b border-[#af8f52]/20">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center md:text-left">
            <span className="text-xs font-bold tracking-[0.3em] text-[#af8f52] block mb-2">ACCOMMODATIONS</span>
            <h1 className="font-serif text-4xl font-normal tracking-wide text-[#2c2520] md:text-5xl">
              Our Rooms & Rates
            </h1>
            <div className="w-16 h-[1px] bg-[#af8f52] my-4 mx-auto md:mx-0" />
            <p className="max-w-2xl font-serif italic text-sm text-muted-foreground leading-relaxed">
              Every private quarter is provisioned with curated modern essentials, woven seamlessly with authentic regional comfort and a fresh morning breakfast.
            </p>
          </div>
        </section>

        {/* --- ROOMS LIST --- */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 md:grid-cols-2">
            {cards.map((c) => (
              <article
                key={c.key}
                className="overflow-hidden rounded-none border border-[#af8f52]/20 bg-[#fbf9f4] transition-all duration-300 hover:border-[#af8f52] hover:shadow-md flex flex-col"
              >
                {/* Image Container with Price Badge */}
                <div className="relative overflow-hidden group">
                  <img
                    src={c.image}
                    alt={c.title}
                    loading="lazy"
                    width={1280}
                    height={896}
                    className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-[0.95]"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-4 right-4 bg-[#2c2520] border border-[#af8f52] px-4 py-2 text-center shadow-md">
                    <span className="font-serif text-sm font-semibold text-[#e0cfb3] tracking-wider block">
                      RWF {c.price.toLocaleString()}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-[#fbf9f4]/60 block mt-0.5">
                      per night
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="font-serif text-2xl font-normal text-[#2c2520] mb-3">
                      {c.title}
                    </h2>
                    <p className="font-serif text-sm italic text-muted-foreground leading-relaxed mb-6">
                      {c.description}
                    </p>

                    {/* Classic Architectural Grid Amenities */}
                    <div className="border-t border-b border-[#af8f52]/10 py-4 my-6">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-[#af8f52] block mb-3 uppercase">Suite Provisions:</span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                        {amenities.map((Icon, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-[#2c2520]/80">
                            <Icon className="h-4 w-4 text-[#af8f52]/80 shrink-0" />
                            <span className="font-serif text-xs font-medium tracking-wide">
                              {amenityLabels[i]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footnote & Action Button */}
                  <div>
                    {c.key === "standard" && available && (
                      <div className="flex items-center gap-2 mb-4 bg-[#faf6ee] border border-[#af8f52]/10 p-2.5 text-center justify-center">
                        <span className="text-[#af8f52] text-[9px]">◆</span>
                        <p className="font-serif text-xs italic text-[#af8f52]">
                          {available.standard} structural standard rooms currently active (Suites 101–111)
                        </p>
                        <span className="text-[#af8f52] text-[9px]">◆</span>
                      </div>
                    )}

                    <div className="mt-4">
                      <Link to={c.bookHref}>
                        <Button className="w-full bg-gradient-to-b from-[#c5a86a] to-[#af8f52] text-[#fbf9f4] font-serif tracking-widest rounded-none py-6 border border-[#af8f52] hover:brightness-110 transition-all shadow-sm">
                          ARRANGE RESERVATION
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

      </div>
    </SiteLayout>
  );
}