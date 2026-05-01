import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Kairos Inn, Karangazi" },
      {
        name: "description",
        content:
          "Get in touch with Kairos Inn reception in Karangazi, Nyagatare District. Call, WhatsApp, or email us to ask about availability.",
      },
      { property: "og:title", content: "Contact Kairos Inn" },
      {
        property: "og:description",
        content: "Reach Kairos Inn reception by phone, WhatsApp, or email.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="font-serif text-4xl font-bold text-foreground">Contact Reception</h1>
          <p className="mt-2 text-muted-foreground">
            We're here to help with bookings, questions, or special requests.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="tel:+250793081660"
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
          >
            <Phone className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold text-foreground">Call us</div>
              <div className="text-sm text-muted-foreground">+250 793 081 660</div>
            </div>
          </a>
          <a
            href="https://wa.me/250793081660"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
          >
            <MessageCircle className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold text-foreground">WhatsApp</div>
              <div className="text-sm text-muted-foreground">Chat with us instantly</div>
            </div>
          </a>
          <a
            href="mailto:hello@kairosinn.rw"
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
          >
            <Mail className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold text-foreground">Email</div>
              <div className="text-sm text-muted-foreground">hello@kairosinn.rw</div>
            </div>
          </a>
          <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold text-foreground">Visit us</div>
              <div className="text-sm text-muted-foreground">
                Karangazi, Nyagatare District, Eastern Province, Rwanda
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
