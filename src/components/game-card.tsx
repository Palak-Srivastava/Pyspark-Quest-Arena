import Link from "next/link";
import { Clock3, Star } from "lucide-react";

import { type Challenge } from "@/data/mock";

type Props = {
  challenge: Challenge;
};

const difficultyClass: Record<Challenge["difficulty"], string> = {
  Beginner: "text-emerald-200 bg-emerald-500/10 border-emerald-200/25",
  Intermediate: "text-sky-200 bg-sky-500/10 border-sky-200/25",
  Advanced: "text-amber-200 bg-amber-500/10 border-amber-200/25",
  Interview: "text-rose-200 bg-rose-500/10 border-rose-200/25",
};

export function GameCard({ challenge }: Props) {
  return (
    <article className="panel group rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-200/35 hover:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-3">
        <span className="pill rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.12em]">{challenge.theme}</span>
        <span className={`rounded-full border px-3 py-1 text-xs ${difficultyClass[challenge.difficulty]}`}>
          {challenge.difficulty}
        </span>
      </div>

      <h3 className="headline mt-4 text-2xl font-semibold text-white group-hover:text-amber-100">{challenge.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-slate-300">{challenge.story}</p>

      <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-2">
          <Star className="size-3 text-amber-200" /> {challenge.xp} XP
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-2">
          <Clock3 className="size-3 text-sky-200" /> {challenge.estMinutes}m
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-2">{challenge.completionRate}% clear</span>
      </div>

      <Link
        href={`/challenges/${challenge.id}`}
        className="cta-primary hud-title mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-xs font-semibold transition hover:brightness-110"
      >
        Start Mission
      </Link>
    </article>
  );
}
