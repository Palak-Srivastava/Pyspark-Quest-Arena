"use client";

import { useEffect, useState } from "react";

type LeaderboardRow = {
  rank: number;
  player: string;
  score: number;
  solved: number;
  attempts: number;
  bestRuntimeMs: number;
  tier: string;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data: { leaderboard: LeaderboardRow[] }) => {
        if (active) {
          setRows(data.leaderboard);
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
  }, []);

  return (
    <section className="space-y-6">
      <header className="panel rounded-3xl p-6">
        <p className="hud-title text-xs text-sky-100">Global Competitive Rank</p>
        <h1 className="headline mt-2 text-4xl font-semibold text-white">Live Leaderboard</h1>
        <p className="mt-2 text-slate-300">Updated from real submissions and benchmark results across all missions.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Players Ranked</p>
          <p className="mt-2 text-3xl font-bold text-sky-200">{rows.length}</p>
        </article>
        <article className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Top Score</p>
          <p className="mt-2 text-3xl font-bold text-amber-200">{rows[0]?.score ?? 0}</p>
        </article>
        <article className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Fastest Runtime</p>
          <p className="mt-2 text-3xl font-bold text-emerald-200">
            {rows.length > 0 ? `${Math.min(...rows.map((r) => (r.bestRuntimeMs || Number.POSITIVE_INFINITY))).toString()} ms` : "-"}
          </p>
        </article>
      </section>

      <div className="panel overflow-hidden rounded-2xl">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-[0.12em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Solved</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Best Runtime</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-4 text-slate-300" colSpan={7}>
                  Loading leaderboard...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-slate-300" colSpan={7}>
                  No submissions yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={`${row.rank}-${row.player}`} className="border-b border-white/5 text-slate-200 hover:bg-white/5">
                <td className="px-4 py-3 font-bold">#{row.rank}</td>
                <td className="px-4 py-3">{row.player}</td>
                <td className="px-4 py-3 text-amber-200">{row.tier}</td>
                <td className="px-4 py-3 font-semibold">{row.score}</td>
                <td className="px-4 py-3">{row.solved}</td>
                <td className="px-4 py-3">{row.attempts}</td>
                <td className="px-4 py-3 text-emerald-200">{row.bestRuntimeMs ? `${row.bestRuntimeMs} ms` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
