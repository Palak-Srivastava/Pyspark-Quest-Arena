"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ProfileApi = {
  userId: string;
  name: string;
  email: string;
  level: number;
  score: number;
  nextLevelScore: number;
  solved: number;
  submissions: number;
  discussions: number;
  winRate: number;
  recentSubmissions: Array<{
    id: string;
    challengeSlug: string;
    score: number;
    runtimeMs: number;
    status: "passed" | "failed";
    createdAt: string;
  }>;
};

type RecommendationItem = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  zoneId: string;
  category: string;
  solvedCount: number;
  acceptance: number;
};

type HeatmapItem = {
  day: string;
  submissions: number;
  solved: number;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileApi | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/profile")
      .then(async (res) => {
        if (!res.ok) {
          return null;
        }
        const data = (await res.json()) as { profile: ProfileApi };
        return data.profile;
      })
      .then((next) => {
        if (active) {
          setProfile(next);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });

    fetch("/api/recommendations", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((data: { recommendations?: RecommendationItem[]; heatmap?: HeatmapItem[] }) => {
        if (active) {
          setRecommendations(data.recommendations ?? []);
          setHeatmap(data.heatmap ?? []);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const progress = useMemo(() => {
    if (!profile) {
      return 0;
    }
    return Math.min(100, Math.round((profile.score / profile.nextLevelScore) * 100));
  }, [profile]);

  if (loading) {
    return <section className="panel rounded-2xl p-6 text-sm text-slate-300">Loading profile...</section>;
  }

  if (!profile) {
    return (
      <section className="panel mx-auto max-w-2xl rounded-3xl p-8 text-center">
        <h1 className="headline text-4xl font-semibold text-white">Login required</h1>
        <p className="mt-3 text-slate-300">Create an account or login to access your real profile, submissions, and rankings.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/login" className="cta-secondary rounded-xl px-4 py-2 text-sm font-semibold">
            Login
          </Link>
          <Link href="/register" className="cta-primary rounded-xl px-4 py-2 text-sm font-semibold">
            Register
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="panel rounded-3xl p-6">
        <p className="hud-title text-xs text-sky-100">Operator Dashboard</p>
        <h1 className="headline text-4xl font-semibold text-white">Player Profile</h1>
        <p className="mt-2 text-slate-300">Track your growth from beginner missions to interview-level raids.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Level</p>
          <p className="mt-2 text-2xl font-bold text-amber-200">{profile.level}</p>
        </article>
        <article className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Solved</p>
          <p className="mt-2 text-2xl font-bold text-emerald-200">{profile.solved}</p>
        </article>
        <article className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Submissions</p>
          <p className="mt-2 text-2xl font-bold text-sky-200">{profile.submissions}</p>
        </article>
        <article className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Discussion Posts</p>
          <p className="mt-2 text-2xl font-bold text-fuchsia-200">{profile.discussions}</p>
        </article>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="panel lg:col-span-2 rounded-2xl p-6">
          <p className="text-sm uppercase tracking-widest text-slate-400">Agent</p>
          <h2 className="headline mt-1 text-3xl font-semibold text-white">{profile.name}</h2>
          <p className="text-amber-200">Arena Operator</p>
          <p className="mt-1 text-xs text-slate-400">{profile.email}</p>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
              <span>Level {profile.level} Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {profile.score} / {profile.nextLevelScore} score
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-400">Win Rate</p>
              <p className="text-xl font-semibold text-emerald-200">{profile.winRate}%</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-400">Total Score</p>
              <p className="text-xl font-semibold text-sky-200">{profile.score}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-400">Attempts</p>
              <p className="text-xl font-semibold text-amber-200">{profile.submissions}</p>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white">Performance Badges</h3>
            <ul className="mt-3 space-y-2">
              <li className="rounded-lg border border-amber-200/35 bg-amber-100/10 px-3 py-2 text-sm text-amber-100">Runtime Racer</li>
              <li className="rounded-lg border border-emerald-200/35 bg-emerald-100/10 px-3 py-2 text-sm text-emerald-100">Consistent Solver</li>
              <li className="rounded-lg border border-sky-200/35 bg-sky-100/10 px-3 py-2 text-sm text-sky-100">Discussion Helper</li>
            </ul>
          </div>

          <div className="panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {profile.recentSubmissions.length === 0 && <li className="rounded-lg bg-white/5 px-3 py-2">No submissions yet.</li>}
              {profile.recentSubmissions.map((item) => (
                <li key={item.id} className="rounded-lg bg-white/5 px-3 py-2">
                  <span className="text-white">{item.challengeSlug}</span> · {item.status} · {item.runtimeMs}ms · +{item.score}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white">Recommended Next Questions</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {recommendations.length === 0 && <li className="rounded-lg bg-white/5 px-3 py-2">Solve a few questions to unlock recommendations.</li>}
            {recommendations.slice(0, 6).map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <Link href={`/questions/${item.id}`} className="text-white hover:underline">{item.title}</Link>
                <p className="mt-1 text-xs text-slate-400">{item.difficulty} · {item.category} · {item.acceptance}% acceptance</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white">Submission Heatmap (60 days)</h3>
          <div className="mt-3 grid grid-cols-10 gap-1">
            {heatmap.length === 0 && <p className="col-span-10 text-sm text-slate-400">No activity yet.</p>}
            {heatmap.map((item) => {
              const intensity = Math.min(4, item.submissions);
              const classes = ["bg-white/5", "bg-emerald-900/40", "bg-emerald-800/50", "bg-emerald-700/60", "bg-emerald-500/70"];
              return (
                <div
                  key={item.day}
                  className={`h-5 rounded ${classes[intensity]}`}
                  title={`${item.day}: ${item.submissions} submissions, ${item.solved} solved`}
                />
              );
            })}
          </div>
        </article>
      </section>
    </section>
  );
}
