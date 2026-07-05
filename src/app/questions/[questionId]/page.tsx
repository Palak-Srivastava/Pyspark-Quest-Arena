export const dynamic = 'force-dynamic';

import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BookOpen, CheckCircle2, ChevronLeft, CircleGauge, Lightbulb, Users } from "lucide-react";

import { ChallengeCommunity } from "@/components/challenge-community";
import { ChallengeIde } from "@/components/challenge-ide";
import { QuestionBookmarkButton } from "@/components/question-bookmark-button";
import { getDiscussionByChallenge, getQuestionById, getSubmissionsByChallenge } from "@/lib/db";
import { ACCESS_COOKIE } from "@/lib/session";

// export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ questionId: string }>;
};

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

export default async function QuestionPage({ params }: Props) {
  const { questionId } = await params;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  const currentUserId = getCurrentUserIdFromAccessToken(token);

  const questionData = await getQuestionById(questionId, currentUserId ?? undefined);

  if (!questionData) {
    notFound();
  }

  const question = questionData as any;

  const discussions = await getDiscussionByChallenge(question.challengeSlug);
  const submissions = await getSubmissionsByChallenge(question.challengeSlug);

  return (
    <div className="space-y-6">
      <Link href={`/arena/${question.zoneId}`} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
        <ChevronLeft className="size-4" /> Back to Zone Questions
      </Link>

      {/* Header & Tags */}
      <section className="panel rounded-3xl p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
            {question.difficulty}
          </span>
          <span className="rounded-full border border-sky-300/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-100">
            {question.category}
          </span>
          {question.companyTags?.map((tag: string) => (
            <span key={tag} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-100">
              {tag}
            </span>
          ))}
          {question.solvedByMe && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100">
              <CheckCircle2 className="size-3.5" /> Solved by me
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="headline text-4xl font-semibold text-white">{question.title}</h1>
          <QuestionBookmarkButton questionId={question.id} initialBookmarked={Boolean(question.bookmarked)} />
        </div>
        
        {/* Problem Statement */}
        <div className="mt-4 space-y-2">
          <h2 className="text-lg font-semibold text-slate-200">Problem Statement</h2>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{question.problemStatement}</pre>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-slate-200">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Acceptance</p>
            <p className="mt-2 text-2xl font-semibold text-white">{question.acceptance}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-slate-200">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Solved Players</p>
            <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-white">
              <Users className="size-5 text-emerald-300" /> {question.solvedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-slate-200">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Best Runtime</p>
            <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-white">
              <CircleGauge className="size-5 text-sky-300" /> {question.bestRuntimeMs} ms
            </p>
          </div>
        </div>
      </section>

      {/* Input/Output Schema */}
      {(question.inputSchema || question.outputSchema) && (
        <section className="panel rounded-3xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">Schema Definition</h2>
          
          {question.inputSchema && Array.isArray(question.inputSchema) && (
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Input Tables</h3>
              <div className="space-y-4">
                {question.inputSchema.map((table: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-4 overflow-x-auto">
                    <h4 className="font-mono text-sm font-semibold text-cyan-300 mb-2">{table.name}</h4>
                    <table className="w-full text-xs text-slate-300 mb-3">
                      <thead className="border-b border-white/10">
                        <tr>
                          <th className="text-left py-2 px-2">Column</th>
                          <th className="text-left py-2 px-2">Type</th>
                          <th className="text-left py-2 px-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.columns?.map((col: any, cidx: number) => (
                          <tr key={cidx} className="border-b border-white/5">
                            <td className="py-2 px-2 font-mono text-sky-300">{col.name}</td>
                            <td className="py-2 px-2 text-amber-300">{col.type}</td>
                            <td className="py-2 px-2 text-slate-400">{col.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {table.sampleRows && (
                      <div className="mt-2 p-2 bg-black/50 rounded text-xs text-slate-400">
                        <p className="font-semibold text-slate-200 mb-1">Sample Data:</p>
                        <pre className="overflow-x-auto">{JSON.stringify(table.sampleRows, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {question.outputSchema && Array.isArray(question.outputSchema) && (
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Expected Output</h3>
              <div className="space-y-4">
                {question.outputSchema.map((table: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-4 overflow-x-auto">
                    <h4 className="font-mono text-sm font-semibold text-emerald-300 mb-2">{table.name}</h4>
                    <table className="w-full text-xs text-slate-300">
                      <thead className="border-b border-white/10">
                        <tr>
                          <th className="text-left py-2 px-2">Column</th>
                          <th className="text-left py-2 px-2">Type</th>
                          <th className="text-left py-2 px-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.columns?.map((col: any, cidx: number) => (
                          <tr key={cidx} className="border-b border-white/5">
                            <td className="py-2 px-2 font-mono text-sky-300">{col.name}</td>
                            <td className="py-2 px-2 text-amber-300">{col.type}</td>
                            <td className="py-2 px-2 text-slate-400">{col.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {table.expectedRowCount && (
                      <p className="mt-2 text-xs text-slate-400">Expected: {table.expectedRowCount}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Constraints & Hints */}
      {(question.constraints?.length || question.hints?.length) && (
        <section className="grid gap-6 md:grid-cols-2">
          {question.constraints && question.constraints.length > 0 && (
            <div className="panel rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Constraints</h3>
              <ul className="space-y-2">
                {(question.constraints as string[]).map((constraint: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-amber-300 font-bold">•</span>
                    <span>{constraint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {question.hints && question.hints.length > 0 && (
            <div className="panel rounded-3xl p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <Lightbulb className="size-5 text-yellow-400" />
                Hints
              </h3>
              <ul className="space-y-2">
                {(question.hints as string[]).map((hint: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-sky-300 font-bold">{idx + 1}.</span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Walkthrough */}
      {question.walkthrough && (
        <section className="panel rounded-3xl p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
            <BookOpen className="size-5 text-cyan-400" />
            Solution Walkthrough
          </h3>
          {question.walkthrough.explanation && (
            <p className="text-slate-300 mb-4">{question.walkthrough.explanation}</p>
          )}
          <div className="space-y-3">
            {question.walkthrough.step1 && (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                <p className="text-xs text-cyan-300 font-semibold mb-1">Step 1</p>
                <pre className="font-mono text-sm text-slate-200 overflow-x-auto">{question.walkthrough.step1}</pre>
              </div>
            )}
            {question.walkthrough.step2 && (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                <p className="text-xs text-cyan-300 font-semibold mb-1">Step 2</p>
                <pre className="font-mono text-sm text-slate-200 overflow-x-auto">{question.walkthrough.step2}</pre>
              </div>
            )}
            {question.walkthrough.step3 && (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                <p className="text-xs text-cyan-300 font-semibold mb-1">Step 3</p>
                <pre className="font-mono text-sm text-slate-200 overflow-x-auto">{question.walkthrough.step3}</pre>
              </div>
            )}
          </div>
        </section>
      )}

      {Array.isArray(question.testCases) && question.testCases.some((test: any) => test.visibility === "public") && (
        <section className="panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white">Public Testcases</h3>
          <div className="mt-3 space-y-3">
            {question.testCases
              .filter((test: any) => test.visibility === "public")
              .map((test: any) => (
                <div key={test.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-semibold text-slate-100">{test.name}</p>
                  <p className="mt-1 text-xs text-slate-300">Input: {test.inputSummary}</p>
                  <p className="text-xs text-slate-300">Expected: {test.expectedSummary}</p>
                </div>
              ))}
          </div>
        </section>
      )}

      {question.editorial && (
        <section className="panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white">Editorial</h3>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
            {question.editorial}
          </pre>
        </section>
      )}

      <ChallengeIde title={question.title} challengeSlug={question.challengeSlug} questionId={question.id} />

      <ChallengeCommunity
        slug={question.challengeSlug}
        initialDiscussions={discussions}
        initialSubmissions={submissions}
        currentUserId={currentUserId}
      />
    </div>
  );
}
