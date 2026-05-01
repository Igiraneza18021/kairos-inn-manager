import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { MapPin, Phone, Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            A warm, comfortable stay in Karangazi, Nyagatare District, Eastern Rwanda.
          </p>
        </div>
        <div className="text-sm">
          <h3 className="mb-3 font-semibold text-foreground">Visit Us</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Karangazi, Nyagatare District, Eastern Province, Rwanda</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <a href="tel:+250793081660" className="hover:text-foreground">
                +250 793 081 660
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:hello@kairosinn.rw" className="hover:text-foreground">
                hello@kairosinn.rw
              </a>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <h3 className="mb-3 font-semibold text-foreground">Quick Links</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li><Link to="/rooms" className="hover:text-foreground">Rooms</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Kairos Inn. All rights reserved.</span>
          <span>
            Created by{" "}
            <a
              href="https://wa.me/250793081660"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Pi-Productions
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
