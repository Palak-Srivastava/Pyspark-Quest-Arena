"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lightbulb,
  Play,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";

import { getCsrfTokenFromCookie } from "@/lib/csrf-client";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type ChallengeIdeProps = {
  title: string;
  challengeSlug: string;
  questionId?: string;
};

type TestCaseResult = {
  id: string;
  name: string;
  visibility: "public" | "hidden";
  passed: boolean;
  inputSummary?: string;
  expectedSummary?: string;
  failureReason?: string;
};

type AiReview = {
  verdict: "passed" | "failed";
  confidence: number;
  summary: string;
  rubric: {
    correctness: number;
    performance: number;
    sparkPractices: number;
    codeQuality: number;
  };
  suggestions: string[];
};

type RunResult = {
  source: "local" | "server";
  status: "passed" | "failed";
  score: number;
  runtimeMs?: number;
  memoryMb?: number;
  engine?: string;
  fallbackReason?: string;
  checks?: {
    hasSolve: boolean;
    hasTransform: boolean;
    avoidsCollect: boolean;
    avoidsPandas: boolean;
  };
  tests?: {
    total: number;
    passed: number;
    public: { total: number; passed: number };
    hidden: { total: number; passed: number };
    results?: TestCaseResult[];
  };
  aiReview?: AiReview | null;
  aiReviewEnforced?: boolean;
};

type SubmissionJobPoll = {
  error?: string;
  status?: "queued" | "running" | "completed" | "failed" | "timed_out";
  result?: RunResult & { error?: string };
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

const starterCode = `from pyspark.sql import functions as F

def solve(input_df):
    # TODO: implement your transformation
    result_df = (
        input_df
        # .filter(F.col("value").isNotNull())
        # .groupBy("category").agg(F.count("*").alias("cnt"))
    )
    return result_df
`;

function runLocalChecks(code: string): RunResult {
  const hasSolve = /def\s+solve\s*\(/.test(code);
  const hasTransform = /(groupBy|withColumn|join|agg|window|select|filter)/.test(code);
  const avoidsCollect = !/collect\s*\(/.test(code);
  const avoidsPandas = !/toPandas\s*\(/.test(code);
  const checks = { hasSolve, hasTransform, avoidsCollect, avoidsPandas };

  const testCases: TestCaseResult[] = [
    {
      id: "c1",
      name: "solve() function defined",
      visibility: "public",
      inputSummary: "Your code must define a solve(input_df) function",
      expectedSummary: "def solve(input_df): ... return result_df",
      passed: hasSolve,
      failureReason: !hasSolve ? "Wrap your logic inside def solve(input_df): and return the result DataFrame" : undefined,
    },
    {
      id: "c2",
      name: "PySpark transformation used",
      visibility: "public",
      inputSummary: "Code must use at least one PySpark DataFrame operation",
      expectedSummary: "Use: groupBy(), filter(), withColumn(), join(), agg(), or select()",
      passed: hasTransform,
      failureReason: !hasTransform ? "Add a PySpark operation — try groupBy(), filter(), or withColumn()" : undefined,
    },
    {
      id: "c3",
      name: "No .collect() call",
      visibility: "public",
      inputSummary: "Code must not pull all data to the Python driver with .collect()",
      expectedSummary: "Keep data distributed — no .collect() allowed",
      passed: avoidsCollect,
      failureReason: !avoidsCollect
        ? ".collect() moves all data to the Python driver — remove it and use DataFrame operations throughout"
        : undefined,
    },
    {
      id: "c4",
      name: "No .toPandas() call",
      visibility: "hidden",
      inputSummary: "Code must not convert the DataFrame to Pandas",
      expectedSummary: "Stay in PySpark — no .toPandas() allowed",
      passed: avoidsPandas,
      failureReason: !avoidsPandas
        ? ".toPandas() breaks distributed execution — use native PySpark functions instead"
        : undefined,
    },
  ];

  const totalPassed = testCases.filter((c) => c.passed).length;
  const publicCases = testCases.filter((c) => c.visibility === "public");
  const hiddenCases = testCases.filter((c) => c.visibility === "hidden");

  return {
    source: "local",
    status: totalPassed === testCases.length ? "passed" : "failed",
    score: Math.round((totalPassed / testCases.length) * 100),
    checks,
    tests: {
      total: testCases.length,
      passed: totalPassed,
      public: { total: publicCases.length, passed: publicCases.filter((c) => c.passed).length },
      hidden: { total: hiddenCases.length, passed: hiddenCases.filter((c) => c.passed).length },
      results: testCases,
    },
  };
}

// ─── Mini UI components ──────────────────────────────────────────────────────

function StatBadge({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${accent ? "border-amber-200/25 bg-amber-200/10" : "border-white/10 bg-white/5"}`}
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${accent ? "text-amber-200" : "text-white"}`}>{value}</p>
    </div>
  );
}

function CheckRow({ label, passed, reason }: { label: string; passed: boolean; reason?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2">
      {passed ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-400" />
      )}
      <div>
        <p className={`text-xs font-medium ${passed ? "text-emerald-200" : "text-rose-200"}`}>{label}</p>
        {!passed && reason && <p className="mt-0.5 text-xs text-slate-400">{reason}</p>}
      </div>
    </div>
  );
}

function TestCaseCard({ tc }: { tc: TestCaseResult }) {
  const [open, setOpen] = useState(!tc.passed);

  if (tc.visibility === "hidden") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2">
        <EyeOff className="size-3.5 shrink-0 text-slate-500" />
        <span className="text-xs text-slate-400">{tc.name}</span>
        <span className="ml-auto">
          {tc.passed ? (
            <CheckCircle2 className="size-3.5 text-emerald-400" />
          ) : (
            <XCircle className="size-3.5 text-rose-400" />
          )}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border ${tc.passed ? "border-emerald-400/20 bg-emerald-900/10" : "border-rose-400/20 bg-rose-900/10"}`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {tc.passed ? (
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
        ) : (
          <XCircle className="size-3.5 shrink-0 text-rose-400" />
        )}
        <span className={`flex-1 text-xs font-semibold ${tc.passed ? "text-emerald-200" : "text-rose-200"}`}>
          {tc.name}
        </span>
        <Eye className="size-3 text-slate-500" />
      </button>

      {open && (
        <div className="space-y-2 border-t border-white/8 px-3 pb-3 pt-2">
          {tc.inputSummary && (
            <div>
              <p className="text-xs font-semibold text-slate-400">Input</p>
              <p className="mt-0.5 text-xs text-slate-300">{tc.inputSummary}</p>
            </div>
          )}
          {tc.expectedSummary && (
            <div>
              <p className="text-xs font-semibold text-slate-400">Expected Output</p>
              <p className="mt-0.5 text-xs text-slate-300">{tc.expectedSummary}</p>
            </div>
          )}
          {!tc.passed && tc.failureReason && (
            <div className="rounded border border-rose-400/20 bg-rose-900/25 px-2 py-1.5">
              <p className="flex items-center gap-1 text-xs font-semibold text-rose-300">
                <AlertTriangle className="size-3" /> Why it failed
              </p>
              <p className="mt-0.5 text-xs text-rose-200">{tc.failureReason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RubricBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-bold text-white">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChallengeIde({ title, challengeSlug, questionId }: ChallengeIdeProps) {
  const [code, setCode] = useState(starterCode);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "passed" | "failed">("idle");
  const [activeTab, setActiveTab] = useState<"results" | "tests" | "ai" | "schema">("results");

  const expectedSchema = useMemo(
    () => `root
 |-- category: string (nullable = true)
 |-- metric: long (nullable = false)
 |-- updated_at: timestamp (nullable = true)`,
    [],
  );

  const runCode = async (submit: boolean) => {
    setStatus("running");
    setActiveTab("results");

    if (!submit) {
      await sleep(600);
      const result = runLocalChecks(code);
      setRunResult(result);
      setStatus(result.status);
      return;
    }

    const response = await fetch(`/api/challenges/${challengeSlug}/submit`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfTokenFromCookie(),
      },
      body: JSON.stringify({ code, questionId: questionId ?? `${challengeSlug}-manual` }),
    });

    const data = (await response.json()) as { error?: string; jobId?: string; pollUrl?: string };

    if (!response.ok || !data.jobId || !data.pollUrl) {
      setStatus("failed");
      setRunResult({ source: "server", status: "failed", score: 0 });
      return;
    }

    let finalResult: RunResult | undefined;
    for (let attempt = 0; attempt < 40; attempt++) {
      await sleep(750);
      const pollResponse = await fetch(data.pollUrl, { method: "GET", credentials: "include" });
      const pollData = (await pollResponse.json()) as SubmissionJobPoll;

      if (!pollResponse.ok) {
        setStatus("failed");
        setRunResult({ source: "server", status: "failed", score: 0 });
        return;
      }

      if (pollData.status === "completed" && pollData.result) {
        finalResult = { ...pollData.result, source: "server" };
        break;
      }

      if (pollData.status === "failed" || pollData.status === "timed_out") {
        setStatus("failed");
        setRunResult({ source: "server", status: "failed", score: 0 });
        return;
      }
    }

    if (!finalResult) {
      setStatus("failed");
      setRunResult({ source: "server", status: "failed", score: 0 });
      return;
    }

    setRunResult(finalResult);
    setStatus(finalResult.status);
    if (finalResult.aiReview) setActiveTab("ai");
    else if ((finalResult.tests?.passed ?? 0) < (finalResult.tests?.total ?? 0)) setActiveTab("tests");
  };

  const heuristicSuggestions = useMemo((): string[] => {
    if (!runResult) return [];
    const s: string[] = [];
    if (runResult.checks) {
      if (!runResult.checks.hasSolve) s.push("Wrap your logic in def solve(input_df): and return the result DataFrame");
      if (!runResult.checks.hasTransform) s.push("Add a PySpark operation: groupBy(), filter(), withColumn(), join(), or agg()");
      if (!runResult.checks.avoidsCollect) s.push("Remove .collect() — it collapses the distributed dataset to the driver node");
      if (!runResult.checks.avoidsPandas) s.push("Remove .toPandas() — keep execution distributed with native PySpark functions");
    }
    if (s.length === 0 && runResult.status === "failed") {
      s.push("Check the Test Cases tab to see which specific inputs are failing");
    }
    if (s.length === 0 && runResult.status === "passed") {
      s.push("Consider adding .explain() to inspect the physical query plan");
      s.push("Use .cache() or .persist() when you reuse a DataFrame in multiple operations");
      s.push("Partition data on join keys to reduce shuffle and improve performance");
    }
    return s;
  }, [runResult]);

  const testsLabel = runResult?.tests ? `Tests ${runResult.tests.passed}/${runResult.tests.total}` : "Tests";

  return (
    <div className="panel overflow-hidden rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
      {/* ── IDE header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#15181f] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
          <p className="ml-3 text-sm font-semibold text-slate-100">PySpark Mission IDE — {title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { void runCode(false); }}
            disabled={status === "running"}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-50"
          >
            <Play className="size-3.5" /> Run
          </button>
          <button
            onClick={() => { void runCode(true); }}
            disabled={status === "running"}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200/35 bg-amber-200/15 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-200/25 disabled:opacity-50"
          >
            <Send className="size-3.5" /> Submit
          </button>
        </div>
      </div>

      {/* ── Monaco editor ── */}
      <MonacoEditor
        height="420px"
        defaultLanguage="python"
        value={code}
        onChange={(value) => setCode(value ?? "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 16 },
        }}
      />

      {/* ── Bottom panel ── */}
      <div className="border-t border-white/10 bg-[#12151c]">
        {/* Tab bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <div className="flex items-center gap-1">
            {(
              [
                { id: "results", label: "Results" },
                { id: "tests", label: testsLabel },
                { id: "ai", label: runResult?.aiReview ? "AI Review ✦" : "Hints" },
                { id: "schema", label: "Schema" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab.id ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs">
            {status === "running" && <span className="animate-pulse text-sky-300">Running checks…</span>}
            {status === "passed" && (
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <CheckCircle2 className="size-3.5" /> Passed
              </span>
            )}
            {status === "failed" && (
              <span className="inline-flex items-center gap-1 text-rose-300">
                <XCircle className="size-3.5" /> Failed
              </span>
            )}
          </span>
        </div>

        {/* Tab content */}
        <div className="max-h-72 overflow-y-auto p-4">

          {/* ── RESULTS ── */}
          {activeTab === "results" && (
            <div className="space-y-3">
              {!runResult && status !== "running" && (
                <p className="text-xs text-slate-500">
                  Click <strong className="text-slate-300">Run</strong> to check your code locally, or{" "}
                  <strong className="text-slate-300">Submit</strong> to run full evaluation and save to the leaderboard.
                </p>
              )}
              {status === "running" && <p className="animate-pulse text-xs text-sky-300">Evaluating your code…</p>}
              {runResult && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        runResult.status === "passed"
                          ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-300"
                          : "border-rose-400/30 bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {runResult.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">
                      {runResult.source === "local"
                        ? "Local pre-check — submit to record on leaderboard"
                        : `Server eval · ${runResult.engine ?? "heuristic"}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <StatBadge label="Score" value={String(runResult.score)} accent />
                    <StatBadge label="Tests" value={`${runResult.tests?.passed ?? 0}/${runResult.tests?.total ?? 0}`} />
                    {runResult.runtimeMs != null && <StatBadge label="Runtime" value={`${runResult.runtimeMs} ms`} />}
                    {runResult.memoryMb != null && <StatBadge label="Memory" value={`${runResult.memoryMb} MB`} />}
                  </div>

                  {runResult.checks && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Code Quality</p>
                      <CheckRow label="def solve(input_df) defined" passed={runResult.checks.hasSolve} reason="Add def solve(input_df): to wrap your solution" />
                      <CheckRow label="Uses PySpark transformations" passed={runResult.checks.hasTransform} reason="Add groupBy(), filter(), withColumn(), join(), or agg()" />
                      <CheckRow label="No .collect() call" passed={runResult.checks.avoidsCollect} reason="Remove .collect() — use DataFrame operations throughout" />
                      <CheckRow label="No .toPandas() call" passed={runResult.checks.avoidsPandas} reason="Remove .toPandas() — keep execution distributed" />
                    </div>
                  )}

                  {runResult.fallbackReason && (
                    <p className="text-xs text-amber-300">⚠ {runResult.fallbackReason}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── TEST CASES ── */}
          {activeTab === "tests" && (
            <div className="space-y-4">
              {!runResult && (
                <p className="text-xs text-slate-500">Run or Submit your code to see test case results.</p>
              )}
              {runResult?.tests && (
                <>
                  {runResult.tests.public.total > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Public Tests — {runResult.tests.public.passed}/{runResult.tests.public.total} passed
                      </p>
                      {runResult.tests.results
                        ?.filter((tc) => tc.visibility === "public")
                        .map((tc) => <TestCaseCard key={tc.id} tc={tc} />)}
                    </div>
                  )}
                  {runResult.tests.hidden.total > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Hidden Tests — {runResult.tests.hidden.passed}/{runResult.tests.hidden.total} passed
                      </p>
                      {runResult.tests.results
                        ?.filter((tc) => tc.visibility === "hidden")
                        .map((tc) => <TestCaseCard key={tc.id} tc={tc} />)}
                      <p className="text-xs text-slate-600 italic">Hidden test inputs are not disclosed — use the hints and public test patterns to infer the expected behavior.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── AI REVIEW / HINTS ── */}
          {activeTab === "ai" && (
            <div className="space-y-3">
              {runResult?.aiReview ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Sparkles className="size-4 text-amber-300" />
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                        runResult.aiReview.verdict === "passed"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      AI: {runResult.aiReview.verdict.toUpperCase()} ({runResult.aiReview.confidence}% confidence)
                    </span>
                    {runResult.aiReviewEnforced && (
                      <span className="text-xs text-rose-300">Enforced</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{runResult.aiReview.summary}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rubric</p>
                    <RubricBar label="Correctness" value={runResult.aiReview.rubric.correctness} />
                    <RubricBar label="Performance" value={runResult.aiReview.rubric.performance} />
                    <RubricBar label="Spark Practices" value={runResult.aiReview.rubric.sparkPractices} />
                    <RubricBar label="Code Quality" value={runResult.aiReview.rubric.codeQuality} />
                  </div>
                  {runResult.aiReview.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <Lightbulb className="size-3.5 text-amber-300" /> Suggestions
                      </p>
                      <ul className="space-y-1">
                        {runResult.aiReview.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                            <span className="mt-0.5 shrink-0 text-amber-400">→</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="size-4 text-amber-300" />
                    <p className="text-xs font-semibold text-slate-300">
                      {runResult ? "Improvement Hints" : "Run your code first to see hints"}
                    </p>
                  </div>
                  {heuristicSuggestions.length > 0 ? (
                    <ul className="space-y-1.5">
                      {heuristicSuggestions.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-xs text-slate-300"
                        >
                          <span className="mt-0.5 shrink-0 text-amber-400">→</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    !runResult && (
                      <p className="text-xs text-slate-500">Click Run or Submit to get code improvement hints.</p>
                    )
                  )}
                  {runResult && !runResult.aiReview && (
                    <p className="text-xs italic text-slate-600">
                      💡 Add <code className="text-slate-400">OPENAI_API_KEY</code> and{" "}
                      <code className="text-slate-400">AI_REVIEW_ENABLED=true</code> in Vercel env vars to enable
                      AI-powered code review with rubric scoring.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SCHEMA ── */}
          {activeTab === "schema" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expected Output Schema</p>
              <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-200">
                {expectedSchema}
              </pre>
              <p className="text-xs text-slate-500">
                Your <code className="text-slate-400">solve()</code> function must return a DataFrame matching this
                schema.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


type ChallengeIdeProps = {
  title: string;
  challengeSlug: string;
  questionId?: string;
};

type SubmissionResult = {
  error?: string;
  status?: "passed" | "failed";
  runtimeMs?: number;
  memoryMb?: number;
  score?: number;
  engine?: "safe-sandbox" | "heuristic";
  fallbackReason?: string;
  tests?: {
    total: number;
    passed: number;
    public: { total: number; passed: number };
    hidden: { total: number; passed: number };
  };
  aiReview?: {
    verdict: "passed" | "failed";
    confidence: number;
    summary: string;
    rubric: {
      correctness: number;
      performance: number;
      sparkPractices: number;
      codeQuality: number;
    };
    suggestions: string[];
  } | null;
  aiReviewEnforced?: boolean;
};

type SubmissionJobPoll = {
  error?: string;
  status?: "queued" | "running" | "completed" | "failed" | "timed_out";
  result?: SubmissionResult;
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const starterCode = `from pyspark.sql import functions as F

def solve(input_df):
    # TODO: implement your transformation
    result_df = (
        input_df
        # .filter(F.col("value").isNotNull())
        # .groupBy("category").agg(F.count("*").alias("cnt"))
    )
    return result_df
`;

function evaluateCode(code: string) {
  const hasFn = code.includes("def solve") || code.includes("lambda");
  const hasSpark = code.includes("F.") || code.includes("groupBy") || code.includes("withColumn");
  const avoidsCollect = !code.includes("collect(");

  const testsPassed = Number(hasFn) + Number(hasSpark) + Number(avoidsCollect);
  const total = 3;

  return {
    testsPassed,
    total,
    score: Math.round((testsPassed / total) * 100),
    status: testsPassed === total ? "passed" : "failed",
  } as const;
}

export function ChallengeIde({ title, challengeSlug, questionId }: ChallengeIdeProps) {
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState("Run your code to see simulated test results.");
  const [status, setStatus] = useState<"idle" | "running" | "passed" | "failed">("idle");
  const [activeTab, setActiveTab] = useState<"results" | "schema">("results");

  const expectedSchema = useMemo(
    () => `root
 |-- category: string (nullable = true)
 |-- metric: long (nullable = false)
 |-- updated_at: timestamp (nullable = true)`,
    [],
  );

  const runCode = async (submit = false) => {
    setStatus("running");

    window.setTimeout(async () => {
      const result = evaluateCode(code);
      const finalStatus = result.status;

      if (submit) {
        const response = await fetch(`/api/challenges/${challengeSlug}/submit`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfTokenFromCookie(),
          },
          body: JSON.stringify({ code, questionId: questionId ?? `${challengeSlug}-manual` }),
        });

        const data = (await response.json()) as { error?: string; jobId?: string; pollUrl?: string };

        if (!response.ok) {
          setStatus("failed");
          setOutput(data.error ?? "Submission failed.");
          return;
        }

        if (!data.jobId || !data.pollUrl) {
          setStatus("failed");
          setOutput("Submission queue failed to initialize.");
          return;
        }

        let finalResult: SubmissionResult | undefined;
        for (let attempt = 0; attempt < 40; attempt += 1) {
          await sleep(750);
          const pollResponse = await fetch(data.pollUrl, { method: "GET", credentials: "include" });
          const pollData = (await pollResponse.json()) as SubmissionJobPoll;

          if (!pollResponse.ok) {
            setStatus("failed");
            setOutput(pollData.error ?? "Submission polling failed.");
            return;
          }

          if (pollData.status === "completed") {
            finalResult = pollData.result;
            break;
          }

          if (pollData.status === "failed" || pollData.status === "timed_out") {
            setStatus("failed");
            setOutput(pollData.error ?? "Submission execution failed.");
            return;
          }
        }

        if (!finalResult) {
          setStatus("failed");
          setOutput("Submission is taking too long. Please retry shortly.");
          return;
        }

        setStatus((finalResult.status ?? finalStatus) as "passed" | "failed");
        setOutput(
          `Submit completed for ${title}\n` +
            `Server Score: ${finalResult.score ?? result.score}\n` +
            `Tests: ${finalResult.tests?.passed ?? 0}/${finalResult.tests?.total ?? 0} (public ${finalResult.tests?.public.passed ?? 0}/${finalResult.tests?.public.total ?? 0}, hidden ${finalResult.tests?.hidden.passed ?? 0}/${finalResult.tests?.hidden.total ?? 0})\n` +
            `Runtime: ${finalResult.runtimeMs ?? 0} ms\n` +
            `Memory: ${finalResult.memoryMb ?? 0} MB\n` +
            `Status: ${finalResult.status ?? finalStatus}\n` +
            `Engine: ${finalResult.engine ?? "heuristic"}${finalResult.fallbackReason ? `\nNote: ${finalResult.fallbackReason}` : ""}` +
            `${finalResult.aiReview ? `\nAI Review (${finalResult.aiReviewEnforced ? "enforced" : "advisory"}): ${finalResult.aiReview.verdict} (${finalResult.aiReview.confidence}%)\nAI Summary: ${finalResult.aiReview.summary}` : ""}`,
        );
        return;
      }

      setStatus(finalStatus);
      setOutput(
        `Run completed for ${title}\n` +
          `Tests: ${result.testsPassed}/${result.total}\n` +
          `Score: ${result.score}%\n` +
          (finalStatus === "passed"
            ? "Local checks passed. Submit to record benchmark on leaderboard."
            : "Some checks failed. Verify transformation logic and avoid costly actions."),
      );
    }, 900);
  };

  return (
    <div className="panel overflow-hidden rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#15181f] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
          <p className="ml-3 text-sm font-semibold text-slate-100">PySpark Mission IDE</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              void runCode(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <Play className="size-3.5" /> Run
          </button>
          <button
            onClick={() => {
              void runCode(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200/35 bg-amber-200/15 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-200/25"
          >
            <Send className="size-3.5" /> Submit
          </button>
        </div>
      </div>

      <MonacoEditor
        height="420px"
        defaultLanguage="python"
        value={code}
        onChange={(value) => setCode(value ?? "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 16 },
        }}
      />

      <div className="border-t border-white/10 bg-[#12151c] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("results")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeTab === "results" ? "bg-white/15 text-white" : "text-slate-300"
              }`}
            >
              Results
            </button>
            <button
              onClick={() => setActiveTab("schema")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeTab === "schema" ? "bg-amber-200/20 text-amber-100" : "text-slate-300"
              }`}
            >
              Expected Schema
            </button>
          </div>

          <span className="text-xs text-slate-400">
            {status === "running" && "Running checks..."}
            {status === "passed" && (
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <CheckCircle2 className="size-3.5" /> Passed
              </span>
            )}
            {status === "failed" && (
              <span className="inline-flex items-center gap-1 text-rose-300">
                <XCircle className="size-3.5" /> Failed
              </span>
            )}
          </span>
        </div>

        <pre className="max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-200">
          {activeTab === "results" ? output : expectedSchema}
        </pre>
      </div>
    </div>
  );
}
