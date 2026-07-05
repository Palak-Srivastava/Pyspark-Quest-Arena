"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";

import { getCsrfTokenFromCookie } from "@/lib/csrf-client";

type Props = {
  questionId: string;
  initialBookmarked?: boolean;
  compact?: boolean;
};

export function QuestionBookmarkButton({ questionId, initialBookmarked = false, compact = false }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const toggleBookmark = async () => {
    setLoading(true);
    const method = bookmarked ? "DELETE" : "POST";
    const response = await fetch("/api/questions/bookmarks", {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfTokenFromCookie(),
      },
      body: JSON.stringify({ questionId }),
    });

    if (response.ok) {
      setBookmarked(!bookmarked);
    }

    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={toggleBookmark}
      disabled={loading}
      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition ${
        bookmarked
          ? "border-amber-200/50 bg-amber-200/15 text-amber-100"
          : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
      } ${loading ? "opacity-50" : ""}`}
      title={bookmarked ? "Remove bookmark" : "Save bookmark"}
    >
      <Bookmark className={`${compact ? "size-3.5" : "size-4"} ${bookmarked ? "fill-current" : ""}`} />
      {compact ? null : bookmarked ? "Saved" : "Save"}
    </button>
  );
}
