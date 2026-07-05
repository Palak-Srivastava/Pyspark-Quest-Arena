export const dynamic = 'force-dynamic';

import { ArenaZoneExplorer } from "@/components/arena-zone-explorer";
import { GameCard } from "@/components/game-card";
import { challenges, questionCategories } from "@/data/mock";
import { getAllCompanies, getArenaLobbyZones } from "@/lib/db";

export default async function ArenaPage() {
  const [initialZones, companies] = await Promise.all([
    getArenaLobbyZones({ company: "All", sort: "recommended" }),
    Promise.resolve(getAllCompanies()),
  ]);

  return (
    <section className="space-y-6">
      <header className="panel rounded-3xl p-6">
        <h1 className="hud-title text-sm text-sky-100">Battlefield Lobby</h1>
        <p className="headline mt-2 text-4xl font-semibold text-white">PySpark Game Arena</p>
        <p className="mt-2 text-slate-300">Every zone has its own theme, mission style, and difficulty band. Pick your drop location.</p>
      </header>

      <ArenaZoneExplorer initialZones={initialZones} companies={companies} />

      <section className="panel rounded-2xl p-5">
        <h2 className="hud-title text-sm text-sky-100">Category Routing</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {questionCategories.map((category) => (
            <article key={category.name} className="rounded-xl border border-white/15 bg-black/20 p-3">
              <p className="text-sm font-semibold text-white">{category.name}</p>
              <p className="mt-1 text-xs text-slate-300">{category.levels.join(" • ")}</p>
              <p className="mt-2 text-lg font-bold text-amber-200">{category.total} questions</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="hud-title mb-3 text-sm text-sky-100">Featured Missions</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {challenges.map((challenge) => (
          <GameCard key={challenge.id} challenge={challenge} />
        ))}
        </div>
      </section>
    </section>
  );
}
