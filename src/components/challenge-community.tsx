"use client";

import { FormEvent, useState } from "react";
import { MessageSquare, Timer } from "lucide-react";

import { getCsrfTokenFromCookie } from "@/lib/csrf-client";

type Discussion = {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  likes: number;
  createdAt: string;
};

type Submission = {
  id: string;
  userName: string;
  runtimeMs: number;
  memoryMb: number;
  score: number;
  status: "passed" | "failed";
  createdAt: string;
};

type Props = {
  slug: string;
  initialDiscussions: Discussion[];
  initialSubmissions: Submission[];
  currentUserId: string | null;
};

export function ChallengeCommunity({ slug, initialDiscussions, initialSubmissions, currentUserId }: Props) {
  const [discussions, setDiscussions] = useState<Discussion[]>(initialDiscussions);
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [discussionRes, submissionsRes] = await Promise.all([
      fetch(`/api/challenges/${slug}/discussions`, { credentials: "include" }),
      fetch(`/api/challenges/${slug}/submissions`, { credentials: "include" }),
    ]);

    const discussionData = (await discussionRes.json()) as { discussions: Discussion[] };
    const submissionData = (await submissionsRes.json()) as { submissions: Submission[] };

    setDiscussions(discussionData.discussions ?? []);
    setSubmissions(submissionData.submissions ?? []);
  };

  const postComment = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const response = await fetch(`/api/challenges/${slug}/discussions`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfTokenFromCookie(),
      },
      body: JSON.stringify({ comment }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Failed to post.");
      return;
    }

    setComment("");
    await load();
  };

  const removeComment = async (discussionId: string) => {
    const response = await fetch(`/api/challenges/${slug}/discussions`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfTokenFromCookie(),
      },
      body: JSON.stringify({ discussionId }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Delete failed.");
      return;
    }

    await load();
  };

  const reportComment = async (discussionId: string) => {
    const response = await fetch(`/api/challenges/${slug}/discussions/report`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfTokenFromCookie(),
      },
      body: JSON.stringify({ discussionId, reason: "Spam / abusive" }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Report failed.");
      return;
    }
  };

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article className="panel rounded-2xl p-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <MessageSquare className="size-5 text-amber-200" /> Discussion Board
        </h3>

        <form onSubmit={postComment} className="mt-3 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your approach..."
            className="h-20 w-full rounded-lg border border-white/20 bg-black/20 p-3 text-sm text-white outline-none focus:border-amber-300/40"
          />
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <button className="cta-secondary rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]" type="submit">
            Post Comment
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {discussions.length === 0 && <p className="text-sm text-slate-300">No discussions yet.</p>}
          {discussions.map((post) => (
            <div key={post.id} className="rounded-xl border border-white/15 bg-black/20 p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="text-slate-200">{post.userName}</span>
                <span>{new Date(post.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-slate-200">{post.comment}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-amber-200">{post.likes} likes</p>
                <div className="flex items-center gap-2">
                  {currentUserId && currentUserId !== post.userId && (
                    <button
                      type="button"
                      onClick={() => {
                        void reportComment(post.id);
                      }}
                      className="rounded-md border border-white/25 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                    >
                      Report
                    </button>
                  )}
                  {currentUserId === post.userId && (
                    <button
                      type="button"
                      onClick={() => {
                        void removeComment(post.id);
                      }}
                      className="rounded-md border border-rose-300/40 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/10"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel rounded-2xl p-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Timer className="size-5 text-amber-200" /> Fastest Submissions
        </h3>
        <button
          type="button"
          onClick={() => {
            void load();
          }}
          className="mt-3 rounded-lg border border-white/20 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
        >
          Refresh
        </button>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/15">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Runtime</th>
                <th className="px-3 py-2">Memory</th>
                <th className="px-3 py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-300" colSpan={4}>
                    No submissions yet.
                  </td>
                </tr>
              )}
              {submissions.map((item) => (
                <tr key={item.id} className="border-t border-white/10 text-slate-200">
                  <td className="px-3 py-2">{item.userName}</td>
                  <td className="px-3 py-2 text-emerald-200">{item.runtimeMs} ms</td>
                  <td className="px-3 py-2">{item.memoryMb} MB</td>
                  <td className="px-3 py-2 text-amber-200">{item.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
