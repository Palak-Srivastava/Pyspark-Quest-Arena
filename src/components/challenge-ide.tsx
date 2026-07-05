"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Play, Send, XCircle } from "lucide-react";

import { getCsrfTokenFromCookie } from "@/lib/csrf-client";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

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
