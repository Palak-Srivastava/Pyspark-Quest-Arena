"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getCsrfTokenFromCookie } from "@/lib/csrf-client";

type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export function AuthCta() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((data: { user: SessionUser | null }) => {
        if (active) {
          setUser(data.user);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        "x-csrf-token": getCsrfTokenFromCookie(),
      },
    });
    setUser(null);
    window.location.reload();
  };

  if (loading) {
    return <div className="text-xs text-slate-400">Loading...</div>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/profile" className="pill rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em]">
          {user.name}
        </Link>
        <button onClick={logout} className="rounded-full border border-white/20 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="rounded-full border border-white/20 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">
        Login
      </Link>
      <Link href="/register" className="cta-primary rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em]">
        Register
      </Link>
    </div>
  );
}
