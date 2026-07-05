import { evaluateSubmission } from "@/lib/benchmark";

type JudgeCase = {
  id: string;
  name: string;
  visibility: "public" | "hidden";
  inputSummary: string;
  expectedSummary: string;
  requiredPatterns?: string[];
};

type EngineInput = {
  code: string;
  language: "python";
  testCases: JudgeCase[];
  mode?: "safe-sandbox" | "heuristic";
};

type EngineOutput = ReturnType<typeof evaluateSubmission> & {
  engine?: "safe-sandbox" | "heuristic";
  fallbackReason?: string;
};

type SandboxWorkerResponse = {
  status: "passed" | "failed";
  runtimeMs: number;
  memoryMb: number;
  score: number;
  checks?: ReturnType<typeof evaluateSubmission>["checks"];
  tests?: ReturnType<typeof evaluateSubmission>["tests"];
};

async function runInSandboxWorker(input: EngineInput): Promise<EngineOutput> {
  const workerUrl = process.env.SANDBOX_RUNNER_URL;
  if (!workerUrl) {
    const fallback = evaluateSubmission(input.code, input.testCases);
    return { ...fallback, engine: "heuristic", fallbackReason: "SANDBOX_RUNNER_URL is not configured." };
  }

  try {
    const response = await fetch(`${workerUrl.replace(/\/$/, "")}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-runner-token": process.env.SANDBOX_RUNNER_TOKEN ?? "",
      },
      body: JSON.stringify({
        language: input.language,
        code: input.code,
        testCases: input.testCases,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const fallback = evaluateSubmission(input.code, input.testCases);
      return {
        ...fallback,
        engine: "heuristic",
        fallbackReason: `Sandbox worker returned HTTP ${response.status}.`,
      };
    }

    const payload = (await response.json()) as SandboxWorkerResponse;
    const fallback = evaluateSubmission(input.code, input.testCases);

    return {
      ...fallback,
      ...payload,
      checks: payload.checks ?? fallback.checks,
      tests: payload.tests ?? fallback.tests,
      engine: "safe-sandbox",
    };
  } catch {
    const fallback = evaluateSubmission(input.code, input.testCases);
    return {
      ...fallback,
      engine: "heuristic",
      fallbackReason: "Sandbox worker unavailable. Using local heuristic evaluator.",
    };
  }
}

/**
 * Execution engine facade.
 * - safe-sandbox: reserved for containerized spark-runner integration.
 * - heuristic: deterministic local evaluator used today.
 */
export async function runSubmission(input: EngineInput) {
  if (input.mode === "safe-sandbox") {
    return runInSandboxWorker(input);
  }

  return {
    ...evaluateSubmission(input.code, input.testCases),
    engine: "heuristic" as const,
  };
}
