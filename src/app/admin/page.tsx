"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminQuestion = {
  id: string;
  title: string;
  difficulty: string;
  zoneId: string;
  category: string;
  companyTags: string[];
  solvedCount: number;
  acceptance: number;
};

type ModerationItem = {
  discussionId: string;
  comment: string;
  challengeSlug: string;
  reportCount: number;
  latestReason: string;
  latestReportedAt: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [reports, setReports] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth guard — redirect non-admins immediately
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((data: { user: { isAdmin?: boolean } | null }) => {
        if (!data.user?.isAdmin) {
          router.replace("/");
        } else {
          setAuthChecked(true);
        }
      })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    let active = true;
    const params = new URLSearchParams({ search, limit: "200" });
    setLoading(true);

    void fetch(`/api/admin/questions?${params.toString()}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data: { items: AdminQuestion[] }) => {
        if (active) {
          setItems(data.items ?? []);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    void fetch("/api/admin/moderation", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { items: ModerationItem[] }) => {
        if (active) {
          setReports(data.items ?? []);
        }
      });

    return () => {
      active = false;
    };
  }, [search, authChecked]);

  if (!authChecked) {
    return (
      <section className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-400">Verifying access…</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="panel rounded-3xl p-6">
        <h1 className="headline text-3xl font-semibold text-white">Admin Content Studio</h1>
        <p className="mt-2 text-slate-300">Review question quality, metadata balance, and discover weak content quickly.</p>
      </header>

      <section className="panel rounded-2xl p-4">
        <label className="text-sm text-slate-300">Search title or category</label>
        <input
          className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="e.g. join, window, late arriving"
        />
      </section>

      <section className="panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-slate-300">
          <span>{items.length} questions</span>
          <span>{loading ? "Refreshing..." : "Catalog ready"}</span>
        </div>
        <div className="divide-y divide-white/10">
          {items.map((item) => (
            <article key={item.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-100">{item.difficulty}</span>
                <span className="rounded-full border border-sky-300/30 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-100">{item.category}</span>
                <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-slate-200">{item.zoneId}</span>
              </div>
              <h3 className="mt-2 text-white">{item.id} · {item.title}</h3>
              <p className="mt-1 text-xs text-slate-400">{item.companyTags.join(" • ")} · solved {item.solvedCount} · acceptance {item.acceptance}%</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel overflow-hidden rounded-2xl">
        <div className="border-b border-white/10 px-4 py-3 text-xs text-slate-300">Moderation Queue</div>
        <div className="divide-y divide-white/10">
          {reports.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">No flagged discussions.</div>}
          {reports.map((item) => (
            <article key={item.discussionId} className="px-4 py-3">
              <p className="text-xs text-rose-200">{item.reportCount} reports · {item.challengeSlug}</p>
              <p className="mt-1 text-sm text-slate-200">{item.comment}</p>
              <p className="mt-1 text-xs text-slate-400">Reason: {item.latestReason}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
