"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { QuestionBookmarkButton } from "@/components/question-bookmark-button";

type BookmarkItem = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  zoneId: string;
  category: string;
  solvedCount: number;
  bookmarkedAt: string;
};

export default function BookmarksPage() {
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/questions/bookmarks?detailed=1", {
      cache: "no-store",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: { bookmarks?: BookmarkItem[] }) => setItems(data.bookmarks ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-4">
      <header className="panel rounded-3xl p-6">
        <h1 className="headline text-4xl font-semibold text-white">Saved Questions</h1>
        <p className="mt-2 text-slate-300">Quick access to your bookmarked interview questions.</p>
      </header>

      {loading && <div className="panel rounded-2xl p-4 text-sm text-slate-300">Loading bookmarks...</div>}

      {!loading && items.length === 0 && (
        <div className="panel rounded-2xl p-6 text-slate-300">
          No saved questions yet. Visit any zone and click Save to bookmark questions.
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="panel rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Link href={`/questions/${item.id}`} className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100">
                    {item.difficulty}
                  </span>
                  <span className="rounded-full border border-sky-300/25 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-100">
                    {item.category}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200">
                    {item.zoneId}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.description}</p>
              </Link>
              <div className="text-right">
                <p className="text-xs text-slate-400">{item.solvedCount} solved</p>
                <p className="mb-2 text-xs text-slate-500">saved {new Date(item.bookmarkedAt).toLocaleString()}</p>
                <QuestionBookmarkButton questionId={item.id} initialBookmarked />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
