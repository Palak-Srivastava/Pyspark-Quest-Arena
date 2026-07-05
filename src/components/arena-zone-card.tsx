import Link from "next/link";

import { type ArenaZone } from "@/data/mock";

type Props = {
  zone: ArenaZone;
};

export function ArenaZoneCard({ zone }: Props) {
  return (
    <article className={`zone-card ${zone.bgClass} relative overflow-hidden rounded-2xl border border-white/15 p-5`}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/55" />
      <div className="relative z-10">
        <p className="text-2xl">{zone.icon}</p>
        <h3 className="mt-2 text-2xl font-bold text-white">{zone.name}</h3>
        <p className="mt-2 text-sm text-slate-200/90">{zone.description}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-white/95">{zone.levelBand}</span>
          <span className="rounded-full border border-emerald-200/35 bg-emerald-500/20 px-3 py-1 text-emerald-100">
            {zone.questionCount} missions
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
  );
}
