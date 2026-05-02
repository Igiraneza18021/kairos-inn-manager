import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Wifi, BedDouble, Bath, Coffee, Fan, Briefcase, MapPin, Star } from "lucide-react";
import hero from "@/assets/hero-motel.jpg";
import roomStandard from "@/assets/room-standard.jpg";
import roomFamily from "@/assets/room-family.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kairos Inn — Comfortable Motel in Karangazi, Nyagatare, Rwanda" },
      {
        name: "description",
        content:
          "Book a clean, affordable room at Kairos Inn in Karangazi, Nyagatare District. Free WiFi, breakfast included, family suites available. Reserve online today.",
      },
      { property: "og:title", content: "Kairos Inn — Karangazi, Rwanda" },
      {
        property: "og:description",
        content:
          "Affordable, comfortable motel rooms in Karangazi. Free WiFi & breakfast included.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const amenities = [
  { icon: Wifi, label: "Free WiFi" },
  { icon: Fan, label: "Fan" },
  { icon: Bath, label: "Private Bathroom" },
  { icon: BedDouble, label: "Comfortable Bed" },
  { icon: Briefcase, label: "Work Desk" },
  { icon: Coffee, label: "Breakfast Included" },
];

function HomePage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={hero}
          alt="Kairos Inn motel exterior at golden hour"
          width={1920}
          height={1088}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-foreground/70 via-foreground/40 to-foreground/70" />
        <div className="mx-auto flex min-h-[78vh] max-w-6xl flex-col items-start justify-center px-4 py-20 text-background">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-background/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <MapPin className="h-3.5 w-3.5" /> Karangazi · Nyagatare · Rwanda
          </span>
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-6xl">
            Welcome to Kairos Inn
          </h1>
          <p className="mt-4 max-w-xl text-lg text-background/90">
            A warm, restful place to stay in Eastern Rwanda. Clean rooms, friendly service,
            breakfast included.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/rooms">
              <Button size="lg" className="bg-primary text-primary-foreground hover:opacity-90">
                View Rooms & Book
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-background/40 bg-background/10 text-background hover:bg-background/20"
              >
                Contact Reception
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            Everything you need
          </h2>
          <p className="mt-2 text-muted-foreground">
            Every room comes with the essentials for a comfortable stay.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {amenities.map((a) => (
            <div
              key={a.label}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 text-center shadow-sm"
            >
              <a.icon className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">{a.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Rooms preview */}
      <section className="bg-secondary/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                Our Rooms
              </h2>
              <p className="mt-2 text-muted-foreground">Simple pricing. No surprises.</p>
            </div>
            <Link to="/rooms" className="hidden md:inline">
              <Button variant="outline">See all rooms</Button>
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <img
                src={roomStandard}
                alt="Standard room at Kairos Inn"
                loading="lazy"
                className="h-56 w-full object-cover"
              />
              <div className="p-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-xl font-bold">Standard Room</h3>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">RWF 25,000</div>
                    <div className="text-xs text-muted-foreground">per night</div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  11 rooms available (101–111). Single bed, private bathroom, breakfast included.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <img
                src={roomFamily}
                alt="Family Suite at Kairos Inn"
                loading="lazy"
                className="h-56 w-full object-cover"
              />
              <div className="p-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-xl font-bold">Family Suite</h3>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">RWF 110,000</div>
                    <div className="text-xs text-muted-foreground">per night</div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Two connected rooms (112A + 112B), two beds, two bathrooms. Perfect for families.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center md:hidden">
            <Link to="/rooms">
              <Button variant="outline">See all rooms</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Star className="mx-auto h-8 w-8 text-accent" />
        <h2 className="mt-3 font-serif text-3xl font-bold">Local hospitality, real comfort</h2>
        <p className="mt-4 text-muted-foreground">
          Kairos Inn is run by locals who care about every guest. Whether you're traveling for work,
          visiting family, or passing through Nyagatare, we'll make sure you feel at home.
        </p>
        <div className="mt-8">
          <Link to="/rooms">
            <Button size="lg">Reserve Your Room</Button>
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
