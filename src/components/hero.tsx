"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Shield, Trophy } from "lucide-react";

export function Hero() {
  return (
    <section className="panel relative overflow-hidden rounded-3xl p-8 md:p-12">
      <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(32,52,84,0.45),rgba(11,17,30,0.2),rgba(74,46,16,0.35))]" />
      <div className="absolute right-0 top-0 hidden h-full w-[45%] border-l border-white/10 bg-[radial-gradient(circle_at_70%_30%,rgba(246,180,80,.22),transparent_52%)] lg:block" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 grid gap-8 lg:grid-cols-[1.25fr,0.75fr]"
      >
        <div>
          <span className="accent-pill mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            <Shield className="size-3.5" /> BG Arena Mode
          </span>
          <h1 className="headline text-5xl font-semibold leading-[1.06] text-white md:text-7xl">
            Drop in. Solve fast. Survive the PySpark battleground.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Mission-based coding arena inspired by tactical battle HUDs: zone themes, ranked ladders, live discussions, and fastest-submission records.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/arena"
              className="glow-ring cta-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition hover:brightness-110"
            >
              Deploy to Arena
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/challenges/escape-null-temple"
              className="cta-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition hover:bg-white/10"
            >
              Practice Mission
              <PlayCircle className="size-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
          <h3 className="hud-title text-xs text-sky-100">Live Ops Panel</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <p className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span>Season Tier</span>
              <strong className="text-amber-200">Platinum II</strong>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span>Today&apos;s Raid</span>
              <strong>Optimizer Wasteland</strong>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span>Top Reward</span>
              <strong className="inline-flex items-center gap-1 text-amber-200">
                <Trophy className="size-4" /> 540 XP
              </strong>
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
