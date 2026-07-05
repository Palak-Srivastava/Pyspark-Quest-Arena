"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const raw = await response.text();
    let data: { error?: string } = {};
    if (raw) {
      try {
        data = JSON.parse(raw) as { error?: string };
      } catch {
        data = {};
      }
    }

    if (!response.ok) {
      setError(data.error ?? "Registration failed. Please verify AUTH_SECRET and SUPABASE_DB_URL in .env.local.");
      return;
    }

    router.push("/profile");
    router.refresh();
  };

  return (
    <section className="mx-auto max-w-md space-y-4">
      <header className="panel rounded-2xl p-6">
        <p className="hud-title text-xs text-sky-100">Create Account</p>
        <h1 className="headline mt-2 text-4xl font-semibold text-white">Register</h1>
        <p className="mt-2 text-slate-300">Create your player account and start tracking your progress.</p>
      </header>

      <form onSubmit={onSubmit} className="panel space-y-4 rounded-2xl p-6">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
          className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/50"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/50"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/50"
          required
        />

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <button type="submit" className="cta-primary w-full rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.1em]">
          Register
        </button>

        <p className="text-sm text-slate-300">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-200 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </section>
  );
}
