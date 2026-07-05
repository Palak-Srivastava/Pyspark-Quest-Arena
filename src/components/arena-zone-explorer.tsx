"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ArenaZoneSort = "recommended" | "difficulty" | "popularity";

type LobbyZone = {
  id: string;
  name: string;
  description: string;
  levelBand: string;
  bgClass: string;
  icon: string;
  totalQuestions: number;
  matchedQuestions: number;
  popularityScore: number;
  completionPercent: number;
};

type Props = {
  initialZones: LobbyZone[];
  companies: string[];
};

export function ArenaZoneExplorer({ initialZones, companies }: Props) {
  const [company, setCompany] = useState("All");
  const [sort, setSort] = useState<ArenaZoneSort>("recommended");
  const [zones, setZones] = useState<LobbyZone[]>(initialZones);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ company, sort });
    setLoading(true);

    void fetch(`/api/arena/zones?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((payload: { zones: LobbyZone[] }) => {
        if (active) {
          setZones(payload.zones ?? []);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [company, sort]);

  return (
    <section className="space-y-4">
      <div className="panel rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="hud-title text-sm text-sky-100">Zone Discovery Filters</h2>
          <span className="text-xs text-slate-400">{loading ? "Refreshing..." : `${zones.length} zones`}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Filter by Company</span>
            <select
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-white outline-none"
            >
              <option value="All">All Companies</option>
              {companies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Sort Zones</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ArenaZoneSort)}
              className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-white outline-none"
            >
              <option value="recommended">Recommended</option>
              <option value="difficulty">Difficulty Band</option>
              <option value="popularity">Popularity</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {zones.map((zone) => (
          <article key={zone.id} className={`zone-card ${zone.bgClass} relative overflow-hidden rounded-2xl border border-white/15 p-5`}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/55" />
            <div className="relative z-10">
              <p className="text-2xl">{zone.icon}</p>
              <h3 className="mt-2 text-2xl font-bold text-white">{zone.name}</h3>
              <p className="mt-2 text-sm text-slate-200/90">{zone.description}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-white/95">{zone.levelBand}</span>
                <span className="rounded-full border border-emerald-200/35 bg-emerald-500/20 px-3 py-1 text-emerald-100">
                  {zone.matchedQuestions} matched
                </span>
                <span className="rounded-full border border-sky-200/30 bg-sky-500/15 px-3 py-1 text-sky-100">
                  popularity {zone.popularityScore}
                </span>
                <span className="rounded-full border border-amber-200/30 bg-amber-500/15 px-3 py-1 text-amber-100">
                  solved {zone.completionPercent}%
                </span>
              </div>

              <Link
                href={`/arena/${zone.id}`}
                className="mt-5 inline-flex rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Enter Zone
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
