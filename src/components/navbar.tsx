"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { AuthCta } from "@/components/auth-cta";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/arena", label: "Arena" },
  { href: "/bookmarks", label: "Bookmarks" },
  { href: "/open-source", label: "Open Source" },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((data: { user: { isAdmin?: boolean } | null }) => {
        setIsAdmin(data.user?.isAdmin === true);
      })
      .catch(() => {});
  }, [pathname]);

  const visibleLinks = links.filter((link) => !link.adminOnly || isAdmin);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1424]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Sparkles className="size-4 text-amber-200" />
          <span className="hud-title text-sm font-bold tracking-[0.18em]">Spark Quest Arena</span>
        </Link>

        <nav className="flex items-center gap-2">
          {visibleLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] transition",
                  active
                    ? "accent-pill shadow-[0_0_20px_rgba(246,180,80,0.25)]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <AuthCta />
      </div>
    </header>
  );
}
