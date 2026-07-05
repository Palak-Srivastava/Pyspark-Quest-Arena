"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ArenaZoneCard } from "@/components/arena-zone-card";
import { Hero } from "@/components/hero";
import { arenaZones, questionCategories } from "@/data/mock";

type Overview = {
  activeUsers: number;
  totalQuestions: number;
  totalDiscussions: number;
  totalSubmissions: number;
};

export default function Home() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/overview", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { overview: Overview }) => {
        if (active) {
          setOverview(data.overview);
        }
      })
      .catch(() => {
        if (active) {
          setOverview({ activeUsers: 0, totalQuestions: 0, totalDiscussions: 0, totalSubmissions: 0 });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <Hero />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="panel rounded-2xl p-4">
          <p className="hud-title text-[10px] text-slate-400">Active Players</p>
          <p className="headline mt-2 text-3xl font-semibold text-white">{overview?.activeUsers ?? "-"}</p>
        </article>
        <article className="panel rounded-2xl p-4">
          <p className="hud-title text-[10px] text-slate-400">Question Bank</p>
          <p className="headline mt-2 text-3xl font-semibold text-amber-200">{overview?.totalQuestions ?? "-"}</p>
        </article>
        <article className="panel rounded-2xl p-4">
          <p className="hud-title text-[10px] text-slate-400">Discussion Posts</p>
          <p className="headline mt-2 text-3xl font-semibold text-sky-200">{overview?.totalDiscussions ?? "-"}</p>
        </article>
        <article className="panel rounded-2xl p-4">
          <p className="hud-title text-[10px] text-slate-400">Submissions Logged</p>
          <p className="headline mt-2 text-3xl font-semibold text-emerald-200">{overview?.totalSubmissions ?? "-"}</p>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="hud-title text-sm text-sky-100">Arena Zones</h2>
          <Link href="/arena" className="cta-secondary rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
            Open Arena Lobby
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {arenaZones.map((zone) => (
            <ArenaZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      </section>

      <section className="panel rounded-3xl p-6">
        <h3 className="hud-title text-sm text-sky-100">Category Coverage</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {questionCategories.map((category) => (
            <article key={category.name} className="rounded-xl border border-white/15 bg-black/20 p-4">
              <p className="text-sm font-semibold text-white">{category.name}</p>
              <p className="mt-2 text-2xl font-bold text-amber-200">{category.total}</p>
              <p className="mt-1 text-xs text-slate-300">{category.levels.join(" • ")}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
