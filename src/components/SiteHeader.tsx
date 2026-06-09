import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X } from "lucide-react";

export function SiteHeader() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id } : null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? { id: data.session.user.id } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const nav = [
    { to: "/", label: "HOME" },
    { to: "/rooms", label: "ROOMS" },
    { to: "/reviews", label: "REVIEWS" },
    { to: "/contact", label: "CONTACT" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#fbf9f4]/95 text-[#2c2520] backdrop-blur-md shadow-sm">
      {/* Visual Accent: Thin gold top-bar accent */}
      <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#af8f52] to-transparent" />

      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        {/* Logo container with ancient frame hover effect */}
        <Link to="/" className="transition-transform duration-300 hover:scale-105">
          <div className="p-1 border border-transparent hover:border-[#af8f52]/40 rounded-sm">
            <Logo />
          </div>
        </Link>

        {/* Navigation for Desktop */}
        <nav className="hidden items-center gap-2 md:flex font-serif tracking-widest text-xs font-semibold">
          {nav.map((n, idx) => (
            <div key={n.to} className="flex items-center">
              {idx > 0 && <span className="mx-3 text-[#af8f52]/40 text-[9px]">◆</span>}
              <Link
                to={n.to}
                className="relative py-1 text-[#2c2520]/80 transition-colors duration-300 hover:text-[#af8f52]"
                activeProps={{ className: "text-[#af8f52] after:scale-x-100" }}
              >
                {n.label}
                {/* Elegant underline animation */}
                <span className="absolute bottom-0 left-0 h-[1px] w-full scale-x-0 bg-[#af8f52] transition-transform duration-300 origin-center hover:scale-x-100" />
              </Link>
            </div>
          ))}

          {/* Premium Metallic Button styling */}
          <div className="ml-6 pl-6 border-l border-[#af8f52]/20">
            {user ? (
              <Link to="/account">
                <Button size="sm" className="bg-gradient-to-b from-[#c5a86a] to-[#af8f52] text-[#fbf9f4] font-serif tracking-wider hover:brightness-110 shadow-sm rounded-none border border-[#af8f52]">
                  MY ACCOUNT
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-gradient-to-b from-[#c5a86a] to-[#af8f52] text-[#fbf9f4] font-serif tracking-wider hover:brightness-110 shadow-sm rounded-none border border-[#af8f52]">
                  SIGN IN
                </Button>
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile Toggle Button */}
        <button
          className="rounded p-2 text-[#2c2520] hover:text-[#af8f52] md:hidden transition-colors"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Visual Accent: Ancient Double Border at header base */}
      <div className="w-full border-b border-[#af8f52]/20">
        <div className="w-full border-b-[3px] border-[#af8f52]/5" />
      </div>

      {/* Mobile Menu Panel */}
      {open && (
        <div className="border-t border-[#af8f52]/20 bg-[#fbf9f4] shadow-inner md:hidden font-serif tracking-widest text-center">
          <div className="mx-auto flex flex-col gap-2 px-6 py-4">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded py-3 text-sm font-medium transition-colors hover:bg-[#af8f52]/10 hover:text-[#af8f52]"
              >
                {n.label}
              </Link>
            ))}
            <div className="h-[1px] my-2 bg-gradient-to-r from-transparent via-[#af8f52]/30 to-transparent" />
            {user ? (
              <Link to="/account" onClick={() => setOpen(false)}>
                <Button className="w-full bg-gradient-to-b from-[#c5a86a] to-[#af8f52] text-[#fbf9f4] rounded-none" size="sm">
                  MY ACCOUNT
                </Button>
              </Link>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button className="w-full bg-gradient-to-b from-[#c5a86a] to-[#af8f52] text-[#fbf9f4] rounded-none" size="sm">
                  SIGN IN
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}