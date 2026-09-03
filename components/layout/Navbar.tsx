"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { PortalRing } from "@/components/ui/PortalRing";
import { MobileMenu } from "./MobileMenu";

const NAV_LINKS = [{ href: "/characters", label: "Characters" }];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-border bg-surface/80 sticky top-0 z-40 border-b shadow-[0_1px_0_0_var(--glow-accent)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-display flex items-center gap-2.5 text-base tracking-wide">
          <PortalRing size={26} />
          <span className="text-glow text-foreground">
            RICK<span className="text-accent">&</span>MORTY
          </span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground/80 hover:text-accent font-display text-xs font-semibold tracking-[0.2em] uppercase transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="border-border inline-flex h-9 w-9 items-center justify-center rounded-full border"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={NAV_LINKS} />
    </header>
  );
}
