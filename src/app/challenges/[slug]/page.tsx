export const dynamic = 'force-dynamic';

import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ChevronLeft, Code2, Sparkles, Swords, Target } from "lucide-react";

import { ChallengeCommunity } from "@/components/challenge-community";
import { ChallengeIde } from "@/components/challenge-ide";
import { challenges } from "@/data/mock";
import { getDiscussionByChallenge, getSubmissionsByChallenge } from "@/lib/db";
import { ACCESS_COOKIE } from "@/lib/session";

function getCurrentUserIdFromAccessToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1] ?? "", "base64url").toString("utf8")) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ChallengePage({ params }: Props) {
  const { slug } = await params;
  const challenge = challenges.find((item) => item.id === slug);

  if (!challenge) {
    notFound();
  }

  const initialDiscussions = await getDiscussionByChallenge(slug);
  const initialSubmissions = await getSubmissionsByChallenge(slug);
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  const currentUserId = getCurrentUserIdFromAccessToken(token);

  return (
    <div className="space-y-6">
      <Link href="/arena" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
        <ChevronLeft className="size-4" /> Back to Arena
      </Link>

      <section className="panel rounded-3xl p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="pill rounded-full px-3 py-1 text-xs">
            {challenge.theme}
          </span>
          <span className="pill rounded-full px-3 py-1 text-xs">
            {challenge.difficulty}
          </span>
          <span className="accent-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs">
            <Swords className="size-3.5" /> Live Mission
          </span>
        </div>
        <h1 className="headline mt-4 text-4xl font-semibold text-white md:text-5xl">{challenge.title}</h1>
        <p className="mt-3 max-w-4xl text-slate-200">{challenge.story}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="lg:col-span-2 space-y-4">
          <div className="panel rounded-2xl p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Target className="size-5 text-amber-200" /> Mission Objective
            </h2>
            <p className="mt-3 text-slate-300">{challenge.objective}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="pill rounded-full px-3 py-1">{challenge.estMinutes} minutes</span>
              <span className="pill rounded-full px-3 py-1">{challenge.completionRate}% completion rate</span>
              <span className="accent-pill rounded-full px-3 py-1">{challenge.xp} XP reward</span>
            </div>
          </div>

          <ChallengeIde title={challenge.title} challengeSlug={slug} />
        </article>

        <aside className="space-y-4">
          <div className="panel rounded-2xl p-5">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <Sparkles className="size-4 text-amber-200" /> Rewards
            </h3>
            <p className="mt-2 text-sm text-slate-300">{challenge.xp} XP + one arena badge on first clear.</p>
          </div>
          <div className="panel rounded-2xl p-5">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <Code2 className="size-4 text-amber-200" /> Match Rules
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>All hidden test cases must pass</li>
              <li>Avoid `collect()` for full-table logic</li>
              <li>Bonus points for efficient plans</li>
            </ul>
          </div>

          <div className="panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">Sample Input Columns</p>
            <pre className="mt-2 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-slate-200">{`event_id: string
user_id: string
event_ts: timestamp
category: string
value: double`}</pre>
          </div>
        </aside>
      </section>

      <ChallengeCommunity
        slug={slug}
        initialDiscussions={initialDiscussions}
        initialSubmissions={initialSubmissions}
        currentUserId={currentUserId}
      />
    </div>
  );
}
