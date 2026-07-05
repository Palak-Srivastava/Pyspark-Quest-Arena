"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Filter, Search, Users } from "lucide-react";

import type { Difficulty } from "@/data/mock";
import { QuestionBookmarkButton } from "@/components/question-bookmark-button";

type QuestionItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  zoneId: string;
  challengeSlug: string;
  acceptance: number;
  bestRuntimeMs: number;
  solvedCount: number;
  companyTags: string[];
  solvedByMe?: boolean;
  bookmarked?: boolean;
};

type QuestionResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: QuestionItem[];
};

type Props = {
  zoneId: string;
  initialData: QuestionResponse;
  companies: string[];
  initialProgressPercent?: number;
};

const difficultyOptions: Array<Difficulty | "All"> = ["All", "Beginner", "Intermediate", "Advanced", "Interview"];

export function ZoneQuestionBrowser({ zoneId, initialData, companies, initialProgressPercent = 0 }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty | "All">("All");
  const [company, setCompany] = useState<string>("All");
  const [sort, setSort] = useState<"recommended" | "difficulty" | "solved" | "acceptance">("recommended");
  const [savedOnly, setSavedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<QuestionResponse>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(initialData.pageSize),
      difficulty,
      company,
      sort,
      search,
      savedOnly: savedOnly ? "1" : "0",
    });

    setLoading(true);
    fetch(`/api/arena/${zoneId}/questions?${params.toString()}`, {
      credentials: "include",
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((payload: QuestionResponse) => {
        setData(payload);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [company, difficulty, initialData.pageSize, page, savedOnly, search, sort, zoneId]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(data.total / data.pageSize)), [data.pageSize, data.total]);

  return (
    <div className="space-y-4">
      <section className="panel rounded-2xl p-4">
        <div className="mb-4 flex items-center justify-between gap-2 text-sm text-sky-100">
          <span className="inline-flex items-center gap-2">
            <Filter className="size-4" /> Question Filters
          </span>
          <span className="text-xs text-emerald-200">Solved by me: {initialProgressPercent}%</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Difficulty</span>
            <select
              value={difficulty}
              onChange={(event) => {
                setDifficulty(event.target.value as Difficulty | "All");
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-white outline-none"
            >
              {difficultyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Company</span>
            <select
              value={company}
              onChange={(event) => {
                setCompany(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-white outline-none"
            >
              <option value="All">All</option>
              {companies.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Sort By</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as "recommended" | "difficulty" | "solved" | "acceptance");
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-white outline-none"
            >
              <option value="recommended">Recommended</option>
              <option value="difficulty">Difficulty</option>
              <option value="solved">Most Solved</option>
              <option value="acceptance">Highest Acceptance</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Search</span>
            <div className="flex items-center rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-white">
              <Search className="mr-2 size-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search title, company, topic"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Saved</span>
            <select
              value={savedOnly ? "saved" : "all"}
              onChange={(event) => {
                setSavedOnly(event.target.value === "saved");
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-white outline-none"
            >
              <option value="all">All Questions</option>
              <option value="saved">Saved Only</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-slate-300">
          <span>{data.total} questions found</span>
          <span>{loading ? "Refreshing..." : `Page ${data.page} of ${totalPages}`}</span>
        </div>

        <div className="divide-y divide-white/10">
          {data.items.map((question) => (
            <div key={question.id} className="px-4 py-4 transition hover:bg-white/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={`/questions/${question.id}`} className="max-w-4xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100">
                      {question.difficulty}
                    </span>
                    <span className="rounded-full border border-sky-300/25 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-100">
                      {question.category}
                    </span>
                    {question.companyTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200">
                        {tag}
                      </span>
                    ))}
                    {question.solvedByMe && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] text-emerald-100">
                        <CheckCircle2 className="size-3.5" /> Solved by me
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{question.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm text-slate-300">{question.description}</p>
                </Link>

                <div className="grid min-w-[220px] gap-2 text-right text-sm text-slate-300">
                  <span>{question.acceptance}% accepted</span>
                  <span>{question.bestRuntimeMs} ms best runtime</span>
                  <span className="inline-flex items-center justify-end gap-1 text-emerald-200">
                    <Users className="size-4" /> {question.solvedCount} solved
                  </span>
                  <div className="ml-auto">
                    <QuestionBookmarkButton questionId={question.id} initialBookmarked={Boolean(question.bookmarked)} compact />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {data.items.length === 0 && <div className="px-4 py-10 text-center text-slate-300">No questions matched this filter set.</div>}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}